# HOTMESS — Server Routes Documentation

**Updated:** 2026-02-11  
**Platform:** Vercel Serverless Functions  
**Base URL:** `https://hotmess.london/api` (production)

---

## Overview

HOTMESS uses Vercel Serverless Functions for backend API routes. All endpoints are located in the `/api` directory and deployed as edge functions.

**Architecture:**
- **Runtime:** Node.js 18.x
- **Timeout:** 10s (Hobby), 60s (Pro)
- **Deployment:** Automatic on push to `main`
- **Rate Limiting:** IP-based middleware (100 req/min)

---

## Authentication

Most endpoints require authentication via Supabase JWT token.

**Auth Header:**
```
Authorization: Bearer <supabase_access_token>
```

**Get Token (Client):**
```javascript
const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;
```

---

## Core Endpoints

### Health & Diagnostics

#### `GET /api/health`
**Purpose:** Health check endpoint  
**Auth:** None  
**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-02-11T15:45:00Z",
  "version": "2.0.0"
}
```

---

### Profile & User Discovery

#### `GET /api/profiles`
**Purpose:** List profiles with filters  
**Auth:** Required  
**Query Params:**
- `page` (number): Page number (default: 1)
- `limit` (number): Results per page (default: 20, max: 100)
- `persona` (string): Filter by persona (listener | social | creator | organizer)
- `tags` (string): Comma-separated tags
- `verified_only` (boolean): Only verified users

**Response:**
```json
{
  "profiles": [
    {
      "id": "uuid",
      "username": "example_user",
      "email": "user@example.com",
      "persona": "social",
      "avatar_url": "https://...",
      "bio": "...",
      "tags": ["tag1", "tag2"],
      "is_verified": true,
      "last_active_at": "2026-02-11T15:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150
  }
}
```

---

#### `GET /api/profile`
**Purpose:** Get single profile by ID or email  
**Auth:** Required  
**Query Params:**
- `id` (uuid): Profile ID
- `email` (string): Profile email

**Response:**
```json
{
  "id": "uuid",
  "username": "example_user",
  "email": "user@example.com",
  "persona": "social",
  "avatar_url": "https://...",
  "bio": "...",
  "tags": ["tag1", "tag2"],
  "is_verified": true,
  "verification_level": "full",
  "can_go_live": true,
  "can_sell": false,
  "last_active_at": "2026-02-11T15:00:00Z"
}
```

---

#### `GET /api/nearby`
**Purpose:** Find nearby users based on location  
**Auth:** Required  
**Query Params:**
- `lat` (number): Latitude (required)
- `lng` (number): Longitude (required)
- `radius` (number): Radius in meters (default: 30000, max: 50000)
- `limit` (number): Results limit (default: 50, max: 100)

**Response:**
```json
{
  "nearby": [
    {
      "profile": {
        "id": "uuid",
        "username": "example_user",
        "avatar_url": "https://..."
      },
      "presence": {
        "mode": "right_now",
        "status": "live",
        "lat": 51.5074,
        "lng": -0.1278,
        "expires_at": "2026-02-11T16:00:00Z"
      },
      "distance_m": 1250,
      "travel_time": {
        "walk": "15 mins",
        "transit": "8 mins",
        "drive": "5 mins"
      }
    }
  ]
}
```

---

### Presence & Location

#### `POST /api/presence/update`
**Purpose:** Update user's live presence  
**Auth:** Required  
**Body:**
```json
{
  "mode": "right_now",
  "lat": 51.5074,
  "lng": -0.1278,
  "minutes": 60
}
```

**Response:**
```json
{
  "success": true,
  "presence": {
    "id": "uuid",
    "user_id": "uuid",
    "mode": "right_now",
    "status": "live",
    "lat": 51.5074,
    "lng": -0.1278,
    "expires_at": "2026-02-11T16:45:00Z"
  }
}
```

---

#### `POST /api/presence/stop`
**Purpose:** Stop user's live presence  
**Auth:** Required  
**Response:**
```json
{
  "success": true,
  "message": "Presence stopped"
}
```

---

### Events

#### `GET /api/events/cron`
**Purpose:** Event scraper cron job (auto-run every 6 hours)  
**Auth:** Vercel Cron header or `EVENT_SCRAPER_CRON_SECRET`  
**Response:**
```json
{
  "success": true,
  "events_scraped": 42,
  "cities": ["London", "Berlin", "NYC"]
}
```

---

#### `POST /api/events/scrape`
**Purpose:** Manual event scraping trigger  
**Auth:** Admin only  
**Body:**
```json
{
  "city": "London"
}
```

**Response:**
```json
{
  "success": true,
  "events": [
    {
      "title": "Pride Night",
      "venue": "The Glory",
      "date": "2026-02-15T22:00:00Z",
      "url": "https://..."
    }
  ]
}
```

---

#### `GET /api/events/diag`
**Purpose:** Event scraper diagnostics  
**Auth:** Admin only  
**Response:**
```json
{
  "sources": {
    "London": ["https://example.com/london.json"]
  },
  "last_run": "2026-02-11T12:00:00Z",
  "total_events": 156
}
```

---

### Routing & Travel Time

#### `GET /api/routing`
**Purpose:** Get directions and travel time between two points  
**Auth:** Required  
**Query Params:**
- `origin_lat` (number): Origin latitude
- `origin_lng` (number): Origin longitude
- `dest_lat` (number): Destination latitude
- `dest_lng` (number): Destination longitude
- `mode` (string): walk | transit | drive (default: walk)

**Response:**
```json
{
  "route": {
    "distance_m": 2400,
    "duration_sec": 1200,
    "duration_text": "20 mins",
    "steps": [
      {
        "instruction": "Head north on Oxford St",
        "distance_m": 500,
        "duration_sec": 300
      }
    ]
  }
}
```

---

#### `GET /api/travel-time`
**Purpose:** Get multi-mode travel time  
**Auth:** Required  
**Query Params:**
- `origin_lat` (number)
- `origin_lng` (number)
- `dest_lat` (number)
- `dest_lng` (number)

**Response:**
```json
{
  "walk": "20 mins",
  "transit": "12 mins",
  "drive": "8 mins"
}
```

---

### Commerce (Shopify)

#### `GET /api/shopify/products`
**Purpose:** List Shopify products  
**Auth:** None (public)  
**Query Params:**
- `limit` (number): Results limit (default: 20)

**Response:**
```json
{
  "products": [
    {
      "id": "gid://shopify/Product/123",
      "title": "HNH Mess Lube 250ml",
      "description": "...",
      "price": "24.99",
      "currency": "GBP",
      "images": ["https://..."],
      "handle": "hnh-mess-lube-250ml"
    }
  ]
}
```

---

#### `GET /api/shopify/product`
**Purpose:** Get single Shopify product  
**Auth:** None (public)  
**Query Params:**
- `handle` (string): Product handle (required)

**Response:**
```json
{
  "product": {
    "id": "gid://shopify/Product/123",
    "title": "HNH Mess Lube 250ml",
    "description": "...",
    "price": "24.99",
    "currency": "GBP",
    "variants": [
      {
        "id": "gid://shopify/ProductVariant/456",
        "title": "250ml",
        "price": "24.99",
        "available": true
      }
    ],
    "images": ["https://..."]
  }
}
```

---

#### `POST /api/shopify/cart/create`
**Purpose:** Create Shopify checkout  
**Auth:** None (public)  
**Body:**
```json
{
  "lines": [
    {
      "merchandiseId": "gid://shopify/ProductVariant/456",
      "quantity": 1
    }
  ]
}
```

**Response:**
```json
{
  "checkout": {
    "id": "gid://shopify/Checkout/789",
    "webUrl": "https://checkout.yourdomain.com/...",
    "totalPrice": "24.99"
  }
}
```

---

### Payments (Stripe)

#### `POST /api/stripe/create-checkout-session`
**Purpose:** Create Stripe checkout session  
**Auth:** Required  
**Body:**
```json
{
  "priceId": "price_xxx",
  "mode": "subscription",
  "successUrl": "https://hotmess.london/success",
  "cancelUrl": "https://hotmess.london/cancel"
}
```

**Response:**
```json
{
  "sessionId": "cs_xxx",
  "url": "https://checkout.stripe.com/..."
}
```

---

#### `POST /api/stripe/webhook`
**Purpose:** Stripe webhook handler  
**Auth:** Stripe signature verification  
**Events Handled:**
- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

**Response:**
```json
{
  "received": true
}
```

---

### AI & Chat

#### `POST /api/ai/chat`
**Purpose:** AI chat with crisis detection  
**Auth:** Optional (for personalization)  
**Body:**
```json
{
  "message": "What is PrEP?",
  "userId": "uuid"
}
```

**Response (Streaming):**
```
data: {"type":"text","content":"PrEP is..."}
data: {"type":"text","content":" a medication..."}
data: {"type":"done"}
```

**Crisis Detection:**
If message contains crisis keywords, injects safety resources automatically.

---

#### `POST /api/ai/scene-scout`
**Purpose:** AI venue recommendations  
**Auth:** Required  
**Body:**
```json
{
  "prompt": "Find me a chill bar in Soho",
  "lat": 51.5074,
  "lng": -0.1278
}
```

**Response:**
```json
{
  "recommendations": [
    {
      "name": "The Glory",
      "type": "bar",
      "vibe": "queer, chill, art",
      "distance_m": 800,
      "reason": "Popular LGBTQ+ bar with art installations"
    }
  ]
}
```

---

#### `POST /api/ai/wingman`
**Purpose:** Dating/social advice  
**Auth:** Required  
**Body:**
```json
{
  "situation": "First date coming up, need advice",
  "userId": "uuid"
}
```

**Response:**
```json
{
  "advice": "Here are some tips for your first date...",
  "tone": "supportive"
}
```

---

### Notifications

#### `GET /api/notifications/process`
**Purpose:** Process pending notifications (cron)  
**Auth:** Vercel Cron header or `OUTBOX_CRON_SECRET`  
**Response:**
```json
{
  "success": true,
  "notifications_sent": 24,
  "via": ["push", "email", "telegram"]
}
```

---

#### `POST /api/notifications/subscribe`
**Purpose:** Subscribe to push notifications  
**Auth:** Required  
**Body:**
```json
{
  "subscription": {
    "endpoint": "https://...",
    "keys": {
      "p256dh": "...",
      "auth": "..."
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "subscriptionId": "uuid"
}
```

---

### Tickets & QR

#### `POST /api/tickets/generate`
**Purpose:** Generate signed QR code for event  
**Auth:** Required  
**Body:**
```json
{
  "eventId": "uuid",
  "userId": "uuid"
}
```

**Response:**
```json
{
  "qrCode": "data:image/png;base64,...",
  "token": "signed_jwt_token"
}
```

---

#### `POST /api/scan`
**Purpose:** Validate and check-in ticket  
**Auth:** Required (organizer only)  
**Body:**
```json
{
  "token": "signed_jwt_token",
  "eventId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "attendee": {
    "id": "uuid",
    "username": "example_user",
    "avatar_url": "https://..."
  },
  "checkedInAt": "2026-02-11T20:00:00Z"
}
```

---

### SoundCloud Integration

#### `GET /api/soundcloud/authorize`
**Purpose:** Initiate SoundCloud OAuth flow  
**Auth:** Required  
**Response:** Redirects to SoundCloud authorization

---

#### `GET /api/soundcloud/callback`
**Purpose:** OAuth callback handler  
**Auth:** None (handles OAuth code exchange)  
**Response:** Redirects to app with success/error

---

#### `POST /api/soundcloud/upload`
**Purpose:** Upload track to SoundCloud  
**Auth:** Required (SoundCloud token must be stored)  
**Body (multipart/form-data):**
- `file`: Audio file
- `title`: Track title
- `description`: Track description

**Response:**
```json
{
  "success": true,
  "track": {
    "id": 123456,
    "permalink_url": "https://soundcloud.com/..."
  }
}
```

---

### Telegram Integration

#### `POST /api/telegram/webhook`
**Purpose:** Telegram bot webhook handler  
**Auth:** Telegram signature verification  
**Body:** Telegram Update object

**Handles:**
- Commands: `/start`, `/help`, `/notify`
- Inline queries
- Message forwarding

**Response:**
```json
{
  "ok": true
}
```

---

#### `POST /api/auth/telegram/verify`
**Purpose:** Verify Telegram Login Widget auth  
**Auth:** None  
**Body:**
```json
{
  "id": 123456,
  "first_name": "John",
  "username": "johndoe",
  "photo_url": "https://...",
  "auth_date": 1234567890,
  "hash": "..."
}
```

**Response:**
```json
{
  "success": true,
  "verified": true,
  "user": {
    "telegramId": 123456,
    "username": "johndoe"
  }
}
```

---

### Safety & Moderation

#### `POST /api/safety/panic`
**Purpose:** Activate panic button  
**Auth:** Required  
**Body:**
```json
{
  "lat": 51.5074,
  "lng": -0.1278
}
```

**Response:**
```json
{
  "success": true,
  "incident": {
    "id": "uuid",
    "status": "active",
    "created_at": "2026-02-11T20:00:00Z"
  }
}
```

---

#### `POST /api/safety/resolve`
**Purpose:** Resolve active panic  
**Auth:** Required  
**Response:**
```json
{
  "success": true,
  "message": "Incident resolved"
}
```

---

### Admin

#### `POST /api/admin/rate-limit/cleanup`
**Purpose:** Clean up rate limit records  
**Auth:** Admin only or `RATE_LIMIT_CLEANUP_SECRET`  
**Response:**
```json
{
  "success": true,
  "recordsDeleted": 1234
}
```

---

#### `GET /api/admin/stats`
**Purpose:** Platform statistics  
**Auth:** Admin only  
**Response:**
```json
{
  "users": {
    "total": 15000,
    "activeToday": 3500,
    "verified": 8000
  },
  "events": {
    "upcoming": 42,
    "totalRSVPs": 1200
  },
  "commerce": {
    "orders": 350,
    "revenue": "12,450.00"
  }
}
```

---

## Rate Limiting

**Implementation:** IP-based middleware in `api/_rateLimit.js`

**Default Limits:**
- 100 requests per minute per IP
- Admin IPs: unlimited
- Bypass with `X-Admin-Secret` header

**Response (429):**
```json
{
  "error": "Rate limit exceeded",
  "retryAfter": 30
}
```

---

## Error Responses

### Standard Error Format
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid auth token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request body/params |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `SERVER_ERROR` | 500 | Internal server error |

---

## Environment Variables

See [ENV_VARS.md](./ENV_VARS.md) for complete list.

**Critical for API Routes:**
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_MAPS_API_KEY`
- `OPENAI_API_KEY`
- `SHOPIFY_STOREFRONT_ACCESS_TOKEN`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

---

## Testing Endpoints

### Local Development
```bash
npm run dev
# API available at http://localhost:5173/api/*
```

### Production
```bash
curl https://hotmess.london/api/health
```

### With Auth
```bash
TOKEN="your_supabase_token"
curl -H "Authorization: Bearer $TOKEN" \
  https://hotmess.london/api/profile?email=user@example.com
```

---

## Cron Jobs (vercel.json)

```json
{
  "crons": [
    {
      "path": "/api/events/cron",
      "schedule": "0 */6 * * *"
    },
    {
      "path": "/api/notifications/process",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

**Schedule Format:** Standard cron syntax  
**Timezone:** UTC

---

## Monitoring

**Recommended Tools:**
- Vercel Analytics (built-in)
- Sentry (error tracking)
- Datadog (APM)

**Key Metrics:**
- Response time (p50, p95, p99)
- Error rate
- Request volume
- Cron success rate

---

## Security Best Practices

1. **Never expose service role key** in client code
2. **Validate all inputs** with Zod or similar
3. **Use rate limiting** on public endpoints
4. **Verify webhook signatures** (Stripe, Telegram)
5. **Sanitize user input** to prevent injection
6. **Use HTTPS** for all requests
7. **Rotate API keys** periodically

---

## References

- [Architecture Documentation](./ARCHITECTURE.md)
- [Database Schema](./DATABASE.md)
- [Environment Variables](./ENV_VARS.md)
- Vercel Docs: https://vercel.com/docs/functions

**Built with 🖤 for the queer nightlife community.**
