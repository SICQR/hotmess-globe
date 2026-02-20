# HOTMESS OS — Integration Validation

**Created:** 2026-02-20  
**Status:** Stage 0 Documentation

This document validates the Supabase + Shopify integration topology.

---

## 1. SUPABASE PROJECT TOPOLOGY

### 1.1 Client Project (PRIMARY)
- **Purpose:** Auth, profiles, realtime, user data, preloved listings
- **URL:** `VITE_SUPABASE_URL`
- **Key:** `VITE_SUPABASE_ANON_KEY` (client-side)
- **Service Key:** `SUPABASE_SERVICE_ROLE_KEY` (server-side only)

### 1.2 Tables Required

| Table | Purpose | RLS | Realtime |
|-------|---------|-----|----------|
| `profiles` | User profiles | ✅ | ✅ |
| `presence_beacons` | Globe live presence | ✅ | ✅ |
| `event_beacons` | Event markers | ✅ | ✅ |
| `messages` | Chat messages | ✅ | ✅ |
| `threads` | Chat threads | ✅ | ✅ |
| `preloved_listings` | User marketplace listings | ✅ | ❌ |
| `cart_items` | User cart (authenticated) | ✅ | ❌ |
| `orders` | Order history | ✅ | ❌ |
| `event_rsvps` | Event RSVPs | ✅ | ❌ |
| `notifications` | User notifications | ✅ | ✅ |
| `follows` | Social follows | ✅ | ❌ |
| `blocks` | Block list | ✅ | ❌ |
| `safety_incidents` | Safety reports | ✅ | ❌ |
| `radio_shows` | Radio schedule | ❌ (public) | ✅ |
| `radio_state` | Live radio state | ❌ (public) | ✅ |

### 1.3 RLS Policy Expectations

**profiles:**
```sql
-- Read: public for basic info, restricted for private fields
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

-- Update: only own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);
```

**preloved_listings:**
```sql
-- Read: all active listings
CREATE POLICY "Active listings are viewable"
  ON preloved_listings FOR SELECT
  USING (status = 'active');

-- Insert: authenticated users
CREATE POLICY "Authenticated users can create listings"
  ON preloved_listings FOR INSERT
  WITH CHECK (auth.uid() = seller_id);

-- Update: only owner
CREATE POLICY "Users can update own listings"
  ON preloved_listings FOR UPDATE
  USING (auth.uid() = seller_id);
```

**messages:**
```sql
-- Read: only thread participants
CREATE POLICY "Users can read own messages"
  ON messages FOR SELECT
  USING (
    auth.uid() IN (
      SELECT participant_id FROM thread_participants 
      WHERE thread_id = messages.thread_id
    )
  );
```

### 1.4 Realtime Publications

```sql
-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE presence_beacons;
ALTER PUBLICATION supabase_realtime ADD TABLE event_beacons;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE radio_state;
```

**Verification Query:**
```sql
SELECT tablename FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
```

---

## 2. AUTH CONFIGURATION

### 2.1 Site URL
```
https://hotmess.app
```
(or Vercel preview domain)

### 2.2 Redirect URLs (Allowlist)
```
https://hotmess.app/**
https://www.hotmess.app/**
https://*.vercel.app/**
http://localhost:5173/**
http://localhost:3000/**
```

### 2.3 OAuth Providers

**Google:**
- [ ] Enabled in Supabase Dashboard
- [ ] Client ID configured
- [ ] Client Secret configured
- [ ] Redirect URI: `https://<project>.supabase.co/auth/v1/callback`

**Telegram:**
- [ ] Bot created via @BotFather
- [ ] Bot username: `VITE_TELEGRAM_BOT_USERNAME`
- [ ] Verification endpoint: `/api/auth/telegram/verify`

### 2.4 Email Configuration
- [ ] SMTP configured (or Supabase default)
- [ ] Confirmation email template
- [ ] Password reset template
- [ ] Redirect URL in templates

---

## 3. SHOPIFY INTEGRATION

### 3.1 Architecture
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│   Vercel    │────▶│   Shopify   │
│   (React)   │     │   Proxy     │     │  Storefront │
└─────────────┘     └─────────────┘     └─────────────┘
                          │
                          ▼
                    Normalized Product
```

### 3.2 Environment Variables
```
SHOPIFY_STOREFRONT_ACCESS_TOKEN=xxx
SHOPIFY_STORE_DOMAIN=hnhmess.myshopify.com
```

### 3.3 Vercel Proxy Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/shopify/products` | GET | List products |
| `/api/shopify/products/:handle` | GET | Single product |
| `/api/shopify/cart` | POST | Create cart |
| `/api/shopify/cart/:id` | GET | Get cart |
| `/api/shopify/cart/:id/lines` | POST | Add to cart |
| `/api/shopify/checkout` | POST | Create checkout URL |

### 3.4 Checkout Handoff

```javascript
// Only hard redirect allowed
const checkoutUrl = await createShopifyCheckout(cartId);
window.location.assign(checkoutUrl); // ONLY external redirect
```

**Return URL:**
```
/checkout/complete?order_id={id}
```

### 3.5 Verification Checklist

- [ ] Storefront API access token valid
- [ ] Store domain correct
- [ ] Products fetch successfully
- [ ] Cart creation works
- [ ] Checkout redirect works
- [ ] Return flow works

---

## 4. DATA FLOW VALIDATION

### 4.1 Market Unified Model

```typescript
// src/lib/data/market.ts
interface Product {
  id: string;                    // 'shopify_123' or 'preloved_456'
  source: 'shopify' | 'preloved';
  title: string;
  price: number;
  currency: string;
  images: string[];
  available: boolean;
  // ... more fields
}
```

### 4.2 Adapter Functions

| Function | Source | Output |
|----------|--------|--------|
| `getShopifyProducts()` | Shopify API | `Product[]` |
| `getPrelovedProducts()` | Supabase | `Product[]` |
| `getAllProducts()` | Both | `Product[]` (merged) |
| `getProductById()` | Auto-detect | `Product` |

### 4.3 Preloved CRUD

| Operation | Function | Table |
|-----------|----------|-------|
| Create | `createListing()` | `preloved_listings` |
| Read | `getPrelovedProducts()` | `preloved_listings` |
| Update | `updateListing()` | `preloved_listings` |
| Delete | `deleteListing()` | `preloved_listings` (soft) |

---

## 5. STORAGE BUCKETS

### 5.1 Required Buckets

| Bucket | Purpose | Public |
|--------|---------|--------|
| `avatars` | Profile photos | ✅ |
| `listings` | Preloved product images | ✅ |
| `chat-media` | Message attachments | ❌ |
| `events` | Event images | ✅ |

### 5.2 Policies

**avatars:**
```sql
CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
```

**listings:**
```sql
CREATE POLICY "Listing images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'listings');

CREATE POLICY "Users can upload to own listings"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'listings' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
```

---

## 6. ENVIRONMENT VARIABLES

### 6.1 Client-Side (VITE_)
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_MAPBOX_TOKEN=pk.xxx
VITE_TELEGRAM_BOT_USERNAME=hotmess_london_bot
VITE_GA_MEASUREMENT_ID=G-xxx
```

### 6.2 Server-Side (Vercel)
```
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SHOPIFY_STOREFRONT_ACCESS_TOKEN=xxx
SHOPIFY_STORE_DOMAIN=hnhmess.myshopify.com
OPENAI_API_KEY=sk-xxx  # For AI features
```

---

## 7. VALIDATION TESTS

### 7.1 Supabase Connection
```bash
# Test anon key
curl -H "apikey: $VITE_SUPABASE_ANON_KEY" \
  "$VITE_SUPABASE_URL/rest/v1/profiles?select=id&limit=1"
```

### 7.2 Shopify Connection
```bash
# Test products endpoint
curl "$APP_URL/api/shopify/products?limit=5"
```

### 7.3 Auth Flow
1. Navigate to /Auth
2. Click "Sign Up"
3. Enter email/password
4. Receive confirmation email
5. Click link
6. Complete boot gates
7. Land on Ghosted

### 7.4 Preloved Flow
1. Navigate to Market
2. Click "Sell"
3. Fill listing form
4. Upload images
5. Submit
6. Verify listing appears
7. Edit listing
8. Delete listing

### 7.5 Shopify Checkout
1. Navigate to Market
2. Filter to "Shop"
3. Add product to cart
4. Open cart
5. Click checkout
6. Verify Shopify checkout loads
7. Complete purchase
8. Verify return flow

---

## 8. KNOWN ISSUES & FIXES

| Issue | Symptom | Fix |
|-------|---------|-----|
| `preloved_listings` not found | 404 on market load | Create table via migration |
| Realtime not working | No live updates | Add to `supabase_realtime` publication |
| Shopify 401 | Products don't load | Check Storefront token |
| Google OAuth fails | Redirect error | Check Site URL + Redirect URLs |
| Images don't upload | Storage error | Create buckets + policies |

---

## 9. MIGRATION CHECKLIST

- [ ] All 15 tables created
- [ ] RLS enabled on all tables
- [ ] Policies created for each table
- [ ] Storage buckets created
- [ ] Storage policies created
- [ ] Realtime publication includes 6 tables
- [ ] Auth providers configured
- [ ] Shopify proxy tested
- [ ] Environment variables in Vercel
