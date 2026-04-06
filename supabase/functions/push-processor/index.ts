import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * push-processor — triggered by Database Webhook on messages INSERT.
 *
 * Logic:
 * 1. Receive new message payload from DB webhook
 * 2. Look up the recipient (all thread participants except sender)
 * 3. Check Supabase Presence — is the recipient online?
 * 4. If OFFLINE → send push notification via OneSignal REST API
 * 5. Also create an in-app notification record
 *
 * Environment secrets required:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   ONESIGNAL_APP_ID, ONESIGNAL_REST_API_KEY
 */

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  schema: string;
  record: {
    id: string;
    thread_id: string;
    sender_email: string;
    sender_name: string | null;
    content: string | null;
    message_type: string;
    media_urls: string[] | null;
    created_at: string;
  };
  old_record: null | Record<string, unknown>;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  // Validate webhook secret (optional but recommended)
  const webhookSecret = Deno.env.get("WEBHOOK_SECRET") ?? "";
  if (webhookSecret) {
    const incomingSecret = req.headers.get("x-webhook-secret") ?? "";
    if (incomingSecret !== webhookSecret) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const oneSignalAppId = Deno.env.get("ONESIGNAL_APP_ID") ?? "";
  const oneSignalApiKey = Deno.env.get("ONESIGNAL_REST_API_KEY") ?? "";

  if (!supabaseUrl || !serviceKey) {
    console.error("[push-processor] Missing Supabase credentials");
    return new Response("Server misconfigured", { status: 500 });
  }

  let payload: WebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  // Only process INSERT events on messages
  if (payload.type !== "INSERT" || payload.table !== "messages") {
    return new Response(JSON.stringify({ skipped: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const message = payload.record;
  const admin = createClient(supabaseUrl, serviceKey);

  // --- 1. Get thread participants ---
  const { data: thread, error: threadErr } = await admin
    .from("chat_threads")
    .select("participant_emails")
    .eq("id", message.thread_id)
    .single();

  if (threadErr || !thread) {
    console.error("[push-processor] Thread not found:", message.thread_id);
    return new Response(JSON.stringify({ error: "Thread not found" }), { status: 404 });
  }

  // Recipients = all participants except the sender
  const recipientEmails = (thread.participant_emails as string[]).filter(
    (email: string) => email !== message.sender_email
  );

  if (recipientEmails.length === 0) {
    return new Response(JSON.stringify({ ok: true, sent: 0, reason: "no recipients" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // --- 2. Check Supabase Presence for each recipient ---
  // We check the Realtime presence channel to see who's online.
  // If a user is NOT in presence → they're offline → send push.
  const onlineEmails = new Set<string>();

  try {
    // Query the User table for online status (is_online flag)
    // This is more reliable than Realtime presence since the flag
    // is updated by the client via heartbeat.
    const { data: onlineUsers } = await admin
      .from("User")
      .select("email")
      .in("email", recipientEmails)
      .eq("is_online", true);

    if (onlineUsers) {
      for (const u of onlineUsers) {
        onlineEmails.add(u.email);
      }
    }
  } catch (err) {
    console.warn("[push-processor] Presence check failed, treating all as offline:", err);
  }

  const offlineEmails = recipientEmails.filter((e: string) => !onlineEmails.has(e));

  console.log(
    `[push-processor] Recipients: ${recipientEmails.length}, ` +
    `Online: ${onlineEmails.size}, Offline: ${offlineEmails.length}`
  );

  if (offlineEmails.length === 0) {
    // All recipients are online — no push needed
    return new Response(JSON.stringify({ ok: true, sent: 0, reason: "all online" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // --- 3. Resolve emails → user IDs for OneSignal external_id targeting ---
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, email")
    .in("email", offlineEmails);

  if (!profiles?.length) {
    console.warn("[push-processor] No profiles found for offline recipients");
    return new Response(JSON.stringify({ ok: true, sent: 0, reason: "no profiles" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // --- 4. Send push via OneSignal REST API ---
  let sent = 0;

  if (oneSignalAppId && oneSignalApiKey) {
    const senderName = message.sender_name || "Someone";
    const messagePreview = message.content
      ? message.content.substring(0, 100)
      : message.message_type === "image"
        ? "Sent a photo"
        : "Sent a message";

    const externalIds = profiles.map((p: { id: string }) => p.id);

    try {
      const oneSignalPayload = {
        app_id: oneSignalAppId,
        include_aliases: {
          external_id: externalIds,
        },
        target_channel: "push",
        headings: { en: senderName },
        contents: { en: messagePreview },
        data: {
          type: "message",
          thread_id: message.thread_id,
          sender_email: message.sender_email,
          message_id: message.id,
        },
        // Android: high priority for instant delivery
        priority: 10,
        // iOS: interrupt for messages
        ios_interruption_level: "time-sensitive",
        // Auto-collapse repeated messages from same thread
        collapse_id: `thread_${message.thread_id}`,
        // TTL: 24 hours
        ttl: 86400,
      };

      const res = await fetch("https://api.onesignal.com/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Key ${oneSignalApiKey}`,
        },
        body: JSON.stringify(oneSignalPayload),
      });

      const result = await res.json();

      if (res.ok) {
        sent = result.recipients || externalIds.length;
        console.log(`[push-processor] OneSignal sent to ${sent} recipients`);
      } else {
        console.error("[push-processor] OneSignal error:", JSON.stringify(result));
      }
    } catch (err) {
      console.error("[push-processor] OneSignal request failed:", err);
    }
  } else {
    // Fallback: use existing VAPID web-push (from notify-push)
    console.warn("[push-processor] OneSignal not configured, falling back to web-push");

    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";

    if (vapidPublicKey && vapidPrivateKey) {
      const webpush = await import("npm:web-push@3");
      webpush.default.setVapidDetails(
        "mailto:hello@hotmessldn.com",
        vapidPublicKey,
        vapidPrivateKey
      );

      const userIds = profiles.map((p: { id: string }) => p.id);
      const { data: subs } = await admin
        .from("push_subscriptions")
        .select("user_id, subscription")
        .in("user_id", userIds);

      if (subs?.length) {
        const senderName = message.sender_name || "Someone";
        const notifData = {
          title: senderName,
          body: message.content?.substring(0, 100) || "New message",
          tag: `thread_${message.thread_id}`,
          icon: "/icons/icon-192.png",
          data: { url: `/ghosted?sheet=chat&threadId=${message.thread_id}` },
        };

        await Promise.allSettled(
          subs.map(async (row: { subscription: string | object }) => {
            try {
              const sub = typeof row.subscription === "string"
                ? JSON.parse(row.subscription)
                : row.subscription;
              await webpush.default.sendNotification(sub, JSON.stringify(notifData));
              sent++;
            } catch (err) {
              console.warn("[push-processor] web-push failed:", err);
            }
          })
        );
      }
    }
  }

  // --- 5. Create in-app notification records ---
  const notificationRecords = profiles.map((p: { id: string; email: string }) => ({
    user_email: p.email,
    type: "message",
    title: message.sender_name || "New message",
    body: message.content?.substring(0, 200) || "Sent a message",
    read: false,
    metadata: {
      thread_id: message.thread_id,
      sender_email: message.sender_email,
      message_id: message.id,
    },
  }));

  const { error: notifErr } = await admin
    .from("notifications")
    .insert(notificationRecords);

  if (notifErr) {
    console.warn("[push-processor] Failed to create notifications:", notifErr.message);
  }

  return new Response(
    JSON.stringify({
      ok: true,
      sent,
      offline: offlineEmails.length,
      online: onlineEmails.size,
      notifications_created: notificationRecords.length,
    }),
    { headers: { "Content-Type": "application/json" } }
  );
});
