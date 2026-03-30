import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * send-push — Supabase Edge Function for web push notifications
 *
 * DEPLOYMENT:
 *   supabase functions deploy send-push
 *
 * ENVIRONMENT SETUP:
 *   Set these in Supabase Dashboard → Settings → Edge Functions environment variables:
 *   - VAPID_PUBLIC_KEY: Your VAPID public key
 *   - VAPID_PRIVATE_KEY: Your VAPID private key
 *   - VAPID_SUBJECT: mailto:your-email@example.com
 *
 * VAPID KEYS:
 *   Generate with: npx web-push generate-vapid-keys
 *   Store in .env.local and Supabase dashboard
 *
 * REQUEST:
 *   POST /functions/v1/send-push
 *   Authorization: Bearer <SERVICE_ROLE_KEY>
 *   Content-Type: application/json
 *   {
 *     "user_id": "uuid",
 *     "title": "Notification title",
 *     "body": "Notification body",
 *     "url": "/ghosted",          // optional, default "/"
 *     "tag": "notif-type",        // optional, dedup tag
 *     "icon": "/icons/icon.png"   // optional, default shown
 *   }
 *
 * RESPONSE:
 *   Success: { "ok": true }
 *   Failure: { "error": "message" }
 */

interface PushPayload {
  user_id: string;
  title: string;
  body: string;
  url?: string;
  tag?: string;
  icon?: string;
}

Deno.serve(async (req: Request) => {
  // Only POST allowed
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // Auth: require service role key in Authorization header
  const authHeader = req.headers.get("Authorization") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!authHeader.startsWith("Bearer ") || authHeader !== `Bearer ${serviceKey}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Parse request body
  let payload: PushPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const {
    user_id,
    title,
    body,
    url = "/",
    tag = "hotmess",
    icon = "/icons/icon-192.png",
  } = payload;

  if (!user_id || !title || !body) {
    return new Response("Missing required fields: user_id, title, body", {
      status: 400,
    });
  }

  // Create Supabase client
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    serviceKey,
  );

  // Get user's push subscription
  const { data: sub, error: subError } = await supabase
    .from("push_subscriptions")
    .select("subscription")
    .eq("user_id", user_id)
    .single();

  if (subError || !sub || !sub.subscription) {
    console.warn(`[send-push] No subscription for user ${user_id}`);
    return new Response(JSON.stringify({ error: "No subscription found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Parse subscription object
  let subscription: any;
  try {
    subscription = typeof sub.subscription === "string"
      ? JSON.parse(sub.subscription)
      : sub.subscription;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid subscription format" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
  const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
  const vapidSubject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@hotmessldn.com";

  if (!vapidPublicKey || !vapidPrivateKey) {
    console.error("[send-push] VAPID keys not configured");
    return new Response(
      JSON.stringify({ error: "Push service not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  // Build notification payload
  const notificationData = {
    title,
    body,
    url,
    tag,
    icon,
  };

  // Import web-push library and send
  try {
    // Dynamically import web-push at runtime
    const webpush = await import("npm:web-push@3");

    // Set VAPID details
    webpush.default.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    // Send push notification
    await webpush.default.sendNotification(
      subscription,
      JSON.stringify(notificationData),
    );

    console.log(`[send-push] Sent to ${user_id}`);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("[send-push] Failed:", errMsg);

    // 410 = subscription expired, 404 = endpoint not found
    if (errMsg.includes("410") || errMsg.includes("404")) {
      // Delete expired subscription silently
      await supabase
        .from("push_subscriptions")
        .delete()
        .eq("user_id", user_id);
    }

    return new Response(JSON.stringify({ error: errMsg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
