import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * notify-push — send web push to a list of target emails.
 *
 * Called from the client with a valid user JWT (anon key + user session).
 * Looks up user_id for each email, finds push subscriptions, sends notifications.
 *
 * POST /functions/v1/notify-push
 * Authorization: Bearer <user-jwt>
 * { emails: string[], title: string, body: string, tag: string, url?: string }
 */

interface Payload {
  emails?: string[];
  user_ids?: string[];
  title: string;
  body: string;
  tag?: string;
  url?: string;
  icon?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const jwt = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
  if (!jwt) return new Response("Unauthorized", { status: 401 });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const anonKey     = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

  // Verify caller is authenticated
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) return new Response("Unauthorized", { status: 401 });

  let payload: Payload;
  try {
    payload = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const {
    emails,
    user_ids,
    title,
    body,
    tag  = "hotmess",
    url  = "/",
    icon = "/icons/icon-192.png",
  } = payload;

  if ((!emails?.length && !user_ids?.length) || !title || !body) {
    return new Response("Missing required fields", { status: 400 });
  }

  const admin = createClient(supabaseUrl, serviceKey);

  // Resolve target user IDs from emails and/or direct user_ids
  const resolvedIds = new Set<string>(user_ids ?? []);

  if (emails?.length) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, email")
      .in("email", emails);
    if (profiles?.length) {
      for (const p of profiles as { id: string }[]) resolvedIds.add(p.id);
    }
  }

  const userIds = [...resolvedIds];
  if (!userIds.length) {
    return new Response(JSON.stringify({ ok: true, sent: 0 }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Fetch push subscriptions
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("user_id, subscription")
    .in("user_id", userIds);

  if (!subs?.length) {
    return new Response(JSON.stringify({ ok: true, sent: 0 }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const vapidPublicKey  = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
  const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
  const vapidSubject    = Deno.env.get("VAPID_SUBJECT") ?? "mailto:hello@hotmessldn.com";

  if (!vapidPublicKey || !vapidPrivateKey) {
    console.error("[notify-push] VAPID keys not set");
    return new Response(JSON.stringify({ error: "Push not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const webpush = await import("npm:web-push@3");
  webpush.default.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

  const notifData = { title, body, tag, icon, data: { url } };
  let sent = 0;
  const expired: string[] = [];

  await Promise.allSettled(
    (subs as { user_id: string; subscription: string | object }[]).map(async (row) => {
      try {
        const sub = typeof row.subscription === "string"
          ? JSON.parse(row.subscription)
          : row.subscription;
        await webpush.default.sendNotification(sub, JSON.stringify(notifData));
        sent++;
      } catch (err) {
        const msg = String(err);
        if (msg.includes("410") || msg.includes("404")) expired.push(row.user_id);
        console.warn(`[notify-push] failed for ${row.user_id}: ${msg}`);
      }
    })
  );

  if (expired.length) {
    await admin.from("push_subscriptions").delete().in("user_id", expired);
    console.log(`[notify-push] cleaned ${expired.length} expired subs`);
  }

  console.log(`[notify-push] sent=${sent}`);
  return new Response(JSON.stringify({ ok: true, sent }), {
    headers: { "Content-Type": "application/json" },
  });
});
