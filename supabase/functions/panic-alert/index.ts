import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * panic-alert — fan SOS out to a user's trusted_contacts via SMS (Twilio).
 *
 * Replaces the legacy version that wrote to kv_store_a670c824 and never
 * actually contacted anyone. New behaviour:
 *
 *   1. Verify caller JWT.
 *   2. Insert a safety_events row (type='sos') for parity with /api/safety/sos.
 *   3. Look up trusted_contacts where notify_on_sos=true.
 *   4. For each contact: pre-write a queued safety_alerts row, dispatch the
 *      message, then update the row to 'delivered' or 'failed' with
 *      error_message so the caller / dashboard knows what happened.
 *   5. SMS via Twilio Messages API (MessagingServiceSid). WhatsApp path is
 *      gated behind TWILIO_WA_CONTENT_SID env var presence — leave coded but
 *      inert until template approval lands.
 *   6. Helplines + concierge link always returned for the UI.
 *
 * POST /functions/v1/panic-alert
 * Authorization: Bearer <user-jwt>
 * { situation?, location_city?, additional_notes?, lat?, lng? }
 */

const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400",
};

const HELPLINES = [
  "999 (UK emergency services)",
  "LGBT+ Switchboard: https://switchboard.lgbt/ | 0300 330 0630",
  "Samaritans: https://www.samaritans.org/ | 116 123",
];
const TELEGRAM_LINK = "https://t.me/hotmess_bot?start=concierge";

const FETCH_TIMEOUT_MS = 10_000;
const MAX_BODY_CHARS = 320;

interface PanicBody {
  situation?: string;
  location_city?: string | null;
  additional_notes?: string | null;
  lat?: number | null;
  lng?: number | null;
}

interface TrustedContact {
  id: string;
  user_id: string;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  notify_on_sos: boolean | null;
}

interface ChannelResult {
  ok: boolean;
  skipped?: boolean;
  providerId?: string | null;
  error?: string;
}

function basicAuth(sid: string, secret: string) {
  const raw = `${sid}:${secret}`;
  return "Basic " + btoa(raw);
}

function resolveTwilioAuth() {
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID")?.trim();
  const apiKeySid = Deno.env.get("TWILIO_API_KEY_SID")?.trim();
  const apiKeySecret = Deno.env.get("TWILIO_API_KEY_SECRET")?.trim();
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN")?.trim();
  if (!accountSid) return { ok: false as const, error: "twilio_account_sid_missing" };
  if (apiKeySid && apiKeySecret) {
    return { ok: true as const, accountSid, authHeader: basicAuth(apiKeySid, apiKeySecret) };
  }
  if (authToken) {
    return { ok: true as const, accountSid, authHeader: basicAuth(accountSid, authToken) };
  }
  return { ok: false as const, error: "twilio_credentials_missing" };
}

function resolveSmsRouting(): Record<string, string> | null {
  const msgService = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID")?.trim();
  if (msgService) return { MessagingServiceSid: msgService };
  const from = (Deno.env.get("TWILIO_FROM_NUMBER") || Deno.env.get("TWILIO_SMS_FROM"))?.trim();
  if (from) return { From: from };
  return null;
}

function normalisePhone(raw: string | null | undefined): string | null {
  const v = String(raw ?? "").trim();
  if (!v) return null;
  if (v.startsWith("+")) return v;
  return "+" + v.replace(/\D/g, "");
}

function clamp(body: string): string {
  if (!body) return "";
  return body.length > MAX_BODY_CHARS ? body.slice(0, MAX_BODY_CHARS - 1) + "…" : body;
}

function buildAlertText(opts: {
  displayName: string;
  situation: string;
  locationCity: string | null | undefined;
  additionalNotes: string | null | undefined;
}): string {
  const name = opts.displayName?.trim() || "A friend";
  const where = opts.locationCity?.trim() || "Location unavailable";
  const notes = opts.additionalNotes?.trim();
  const situation = opts.situation?.trim() || "needs help";
  const tail = notes ? ` Note: ${notes}` : "";
  return `${name} pressed SOS on HOTMESS. ${situation}. ${where}.${tail}`;
}

async function sendSms(to: string, body: string): Promise<ChannelResult> {
  const dest = normalisePhone(to);
  if (!dest) return { ok: false, skipped: true, error: "no_phone" };

  const auth = resolveTwilioAuth();
  if (!auth.ok) return { ok: false, skipped: true, error: auth.error };

  const routing = resolveSmsRouting();
  if (!routing) return { ok: false, skipped: true, error: "twilio_routing_missing" };

  const params = new URLSearchParams({ To: dest, Body: clamp(body), ...routing });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(auth.accountSid)}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: auth.authHeader,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        signal: controller.signal,
        body: params,
      },
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        error: `twilio_${res.status}:${data?.code ?? ""}:${data?.message ?? ""}`.slice(0, 500),
      };
    }
    return { ok: true, providerId: data?.sid ?? null };
  } catch (err) {
    const e = err as { name?: string; message?: string };
    const reason = e?.name === "AbortError" ? "timeout" : (e?.message || "unknown");
    return { ok: false, error: `twilio_fetch_failed:${reason}` };
  } finally {
    clearTimeout(timer);
  }
}

async function sendWhatsApp(to: string, body: string): Promise<ChannelResult> {
  // Inert until WhatsApp Self-Service Sender + template approval clear.
  // Gated on TWILIO_WA_CONTENT_SID env var presence.
  const contentSid = Deno.env.get("TWILIO_WA_CONTENT_SID")?.trim();
  if (!contentSid) return { ok: false, skipped: true, error: "wa_template_pending" };

  const dest = normalisePhone(to);
  if (!dest) return { ok: false, skipped: true, error: "no_phone" };
  const auth = resolveTwilioAuth();
  if (!auth.ok) return { ok: false, skipped: true, error: auth.error };
  const msgService = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID")?.trim();
  if (!msgService) return { ok: false, skipped: true, error: "twilio_routing_missing" };

  const params = new URLSearchParams({
    To: `whatsapp:${dest}`,
    MessagingServiceSid: msgService,
    ContentSid: contentSid,
    ContentVariables: JSON.stringify({ "1": clamp(body) }),
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(auth.accountSid)}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: auth.authHeader,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        signal: controller.signal,
        body: params,
      },
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        error: `twilio_wa_${res.status}:${data?.code ?? ""}:${data?.message ?? ""}`.slice(0, 500),
      };
    }
    return { ok: true, providerId: data?.sid ?? null };
  } catch (err) {
    const e = err as { name?: string; message?: string };
    const reason = e?.name === "AbortError" ? "timeout" : (e?.message || "unknown");
    return { ok: false, error: `twilio_wa_fetch_failed:${reason}` };
  } finally {
    clearTimeout(timer);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }

  const jwt = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
  if (!jwt) {
    return new Response(JSON.stringify({ ok: false, error: "unauthenticated" }), {
      status: 401,
      headers: corsHeaders,
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
  const { data: { user }, error: authErr } = await userClient.auth.getUser();
  if (authErr || !user) {
    return new Response(JSON.stringify({ ok: false, error: "invalid_token" }), {
      status: 401,
      headers: corsHeaders,
    });
  }

  let body: PanicBody = {};
  try {
    if (req.headers.get("content-length") !== "0") body = await req.json();
  } catch {
    // Empty body is fine — SOS works with zero context.
    body = {};
  }

  const admin = createClient(supabaseUrl, serviceKey);

  // Resolve display name for the alert copy.
  const { data: profile } = await admin
    .from("profiles")
    .select("display_name, email")
    .eq("id", user.id)
    .maybeSingle();
  const displayName = (profile?.display_name as string | undefined) ?? "A friend";

  // 1. Persist a safety_events row (parity with /api/safety/sos so dashboards
  //    show every SOS regardless of trigger surface).
  const eventInsert = await admin
    .from("safety_events")
    .insert({
      user_id: user.id,
      type: "sos",
      metadata: {
        trigger: "panic_alert_edge",
        situation: body.situation ?? null,
        location_city: body.location_city ?? null,
        additional_notes: body.additional_notes ?? null,
        lat: body.lat ?? null,
        lng: body.lng ?? null,
      },
    })
    .select("id")
    .maybeSingle();
  const eventId = eventInsert.data?.id ?? null;
  if (eventInsert.error) {
    console.error("[panic-alert] safety_events insert failed:", eventInsert.error.message);
  }

  // 2. Look up trusted contacts opted into SOS notifications.
  const { data: contactsRaw, error: contactsErr } = await admin
    .from("trusted_contacts")
    .select("id, user_id, contact_name, contact_phone, contact_email, notify_on_sos")
    .eq("user_id", user.id)
    .eq("notify_on_sos", true);

  if (contactsErr) {
    console.error("[panic-alert] trusted_contacts query failed:", contactsErr.message);
    return new Response(
      JSON.stringify({
        ok: false,
        error: "trusted_contacts_lookup_failed",
        helplines: HELPLINES,
        telegram_link: TELEGRAM_LINK,
      }),
      { status: 500, headers: corsHeaders },
    );
  }

  const contacts = (contactsRaw ?? []) as TrustedContact[];
  const alertText = buildAlertText({
    displayName,
    situation: body.situation ?? "needs help",
    locationCity: body.location_city ?? null,
    additionalNotes: body.additional_notes ?? null,
  });

  // 3. Fan out per contact. Each gets its own safety_alerts row so the audit
  //    trail captures channel + status + error_message per delivery attempt.
  let contactsNotified = 0;
  let contactsFailed = 0;
  let contactsSkipped = 0;

  await Promise.allSettled(contacts.map(async (contact) => {
    // Choose channel: SMS if phone, WhatsApp fallback if WA template approved,
    // otherwise mark queued+skipped (email path lives in the dispatcher pipeline,
    // not this hot edge function).
    const hasPhone = !!normalisePhone(contact.contact_phone);
    const channel = hasPhone ? "sms" : "email";

    const { data: alertRow, error: insErr } = await admin
      .from("safety_alerts")
      .insert({
        user_id: user.id,
        contact_id: contact.id,
        alert_type: "sos",
        channel,
        status: "queued",
        location_data: body.lat != null && body.lng != null
          ? { lat: body.lat, lng: body.lng, city: body.location_city ?? null }
          : null,
        payload: {
          source: "panic-alert",
          event_id: eventId,
          contact_name: contact.contact_name,
          situation: body.situation ?? null,
          location_city: body.location_city ?? null,
        },
      })
      .select("id")
      .maybeSingle();

    if (insErr || !alertRow?.id) {
      console.error("[panic-alert] safety_alerts insert failed:", insErr?.message);
      contactsFailed++;
      return;
    }

    if (!hasPhone) {
      // Defer email to the existing notification_outbox dispatcher path; this
      // function focuses on the fast SMS/WA hop. Mark as skipped — UI counts
      // only direct delivered alerts.
      await admin.from("safety_alerts")
        .update({ status: "skipped", error_message: "no_phone_email_pipeline_pending" })
        .eq("id", alertRow.id);
      contactsSkipped++;
      return;
    }

    // SMS first; fall back to WhatsApp only if SMS skipped because of routing
    // (e.g. UK destination needing alpha sender pool).
    let result = await sendSms(contact.contact_phone!, alertText);
    if (!result.ok && !result.skipped) {
      // Hard failure (twilio API rejected) — try WA if eligible.
      const wa = await sendWhatsApp(contact.contact_phone!, alertText);
      if (wa.ok) result = wa;
      else if (!result.error) result = wa;
    }

    if (result.ok) {
      await admin.from("safety_alerts")
        .update({
          status: "delivered",
          delivered_at: new Date().toISOString(),
          payload: { provider_id: result.providerId },
        })
        .eq("id", alertRow.id);
      contactsNotified++;
    } else {
      await admin.from("safety_alerts")
        .update({
          status: result.skipped ? "skipped" : "failed",
          error_message: (result.error ?? "unknown_error").slice(0, 500),
        })
        .eq("id", alertRow.id);
      if (result.skipped) contactsSkipped++;
      else contactsFailed++;
    }
  }));

  console.log(
    `[panic-alert] user=${user.id} contacts=${contacts.length} notified=${contactsNotified} failed=${contactsFailed} skipped=${contactsSkipped}`,
  );

  return new Response(
    JSON.stringify({
      ok: true,
      event_id: eventId,
      contacts_total: contacts.length,
      contacts_notified: contactsNotified,
      contacts_failed: contactsFailed,
      contacts_skipped: contactsSkipped,
      helplines: HELPLINES,
      telegram_link: TELEGRAM_LINK,
    }),
    { headers: corsHeaders },
  );
});
