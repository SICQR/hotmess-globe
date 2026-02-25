# Push Notification Setup

Add to Vercel environment variables:
- VITE_VAPID_PUBLIC_KEY=<your public key>
- VAPID_PRIVATE_KEY=<your private key> (server-side only, not VITE_ prefixed)

Generate real keys: npx web-push generate-vapid-keys
