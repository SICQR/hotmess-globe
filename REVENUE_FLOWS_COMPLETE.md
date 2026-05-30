# HotMess Complete Revenue Flows

## EXECUTIVE SUMMARY

HotMess has **12 distinct revenue streams** across subscriptions, transactions, and advertising. The platform is designed as a comprehensive monetization ecosystem.

---

## 1. MEMBERSHIP SUBSCRIPTIONS

### Tiers & Pricing

| Tier | Monthly | Yearly | Savings | Key Features |
|------|---------|--------|---------|--------------|
| **FREE** | £0 | £0 | - | Basic access, 50 messages/day, 1 Go Live/day, ads |
| **PLUS** | £9.99 | £79.99 | 33% | Unlimited, 2x visibility, stealth mode, no ads, 3 boosts/mo |
| **CHROME** | £19.99 | £149.99 | 37% | 5x visibility, Night King, early drops, 10 boosts/mo, VIP events |

### Revenue Model
- **Type**: Recurring (monthly/yearly)
- **Margins**: High
- **Stripe Integration**: ✅ Implemented (`api/stripe/create-checkout-session.js`)

---

## 2. XP PURCHASES (In-App Currency)

| Package | XP | Price | Bonus |
|---------|-----|-------|-------|
| Starter | 500 | £4.99 | 0% |
| Popular | 1,100 | £9.99 | 10% |
| Value | 2,750 | £19.99 | 10% |
| Pro | 6,000 | £34.99 | 20% |
| Ultimate | 15,000 | £79.99 | 20% |

### XP Uses
- Unlock premium content
- Boost listings
- Feature products
- Unlock profile features
- Purchase items in MESSMARKET

---

## 3. MESSMARKET - SELLER FEES

### Commission Structure

| Seller Type | Commission | Requirements |
|-------------|------------|--------------|
| Standard | 10% | None |
| Verified | 8% | ID verified, 10+ sales, 4.5+ rating |
| Volume | 7% | Monthly sales > £5,000 |

### Seller Packages

| Package | Monthly | Features |
|---------|---------|----------|
| **Starter** | FREE | 10 listings, 10% commission, basic dashboard |
| **Pro** | £14.99 | Unlimited listings, 8% commission, 50 radio pre-rolls/mo |
| **Business** | £49.99 | 7% commission, instant payouts, 200 radio pre-rolls/mo, API access |

### Promotional Add-ons

| Promotion | Price | XP Cost | Duration |
|-----------|-------|---------|----------|
| Listing Boost | £2.99 | 500 XP | 24 hours |
| Featured Listing | £9.99 | 1,500 XP | 7 days |
| Homepage Banner | £29.99 | - | 7 days |
| Globe Storefront Pin | £19.99 | - | 30 days |

---

## 4. MESSMARKET - BUYER PROTECTIONS

| Protection | Cost | Coverage |
|------------|------|----------|
| **Standard** | FREE | Escrow, item not received refund, 14-day disputes |
| **Premium** | 5% (min £1.99, max £9.99) | 30-day disputes, return shipping covered, authentication |

### Buyer XP Rewards
- 1 XP per £1 spent
- 25 XP for leaving a review
- 100 XP bonus for first purchase
- 50 XP every 5th purchase

---

## 5. TICKET RESALE MARKETPLACE

### Seller Fees
- **Commission**: 10% of sale price
- **Listing Fee**: FREE
- **Payout**: 24-48 hours after event

### Buyer Fees
- **Service Fee**: 2.5% (min £0.99, max £14.99)
- **Ticket Guarantee**: Included (full refund if invalid/cancelled)

### Anti-Scalping
- **Price Cap**: Max 150% of face value
- **Exceptions**: Sold out events, charity listings

### Seller Tiers

| Tier | Limit | Commission | Requirements |
|------|-------|------------|--------------|
| Casual | 10 tickets/mo | 10% | None |
| Verified | 50 tickets/mo | 8% | ID verified, 5+ sales |
| Professional | Unlimited | 6% | £29.99/mo subscription |

---

## 6. PREMIUM CONTENT (CREATOR ECONOMY)

### Creator Commission

| Status | Platform Fee | Requirements |
|--------|--------------|--------------|
| Standard | 20% | None |
| Verified | 15% | ID verified, 100+ subscribers, £500+ earnings |
| Partner | 10% | Partner program, 1000+ subscribers |

### Content Monetization

| Type | Range | Platform Fee |
|------|-------|--------------|
| Subscriptions | £2.99 - £49.99/mo | 15-20% |
| Content Unlocks | £0.99 - £99.99 | 20% |
| Tips | £0.99+ | 10% |

### Payout
- Minimum: £20
- Schedule: Weekly (Fridays)
- Methods: Bank transfer, PayPal

---

## 7. VENUE & BUSINESS PACKAGES

### Venue Tiers

| Package | Monthly | Yearly | Features |
|---------|---------|--------|----------|
| **Basic** | FREE | - | Directory listing, 3 events/mo |
| **Standard** | £49.99 | £479.99 | Globe pin, unlimited events, 1 QR beacon |
| **Premium** | £149.99 | £1,199.99 | Animated beacon, 5 QR beacons, homepage banner |
| **Enterprise** | Custom | - | Multi-location, unlimited beacons, custom integrations |

---

## 8. GLOBE ADVERTISING

### Beacon Advertising

| Type | Daily | Weekly | Monthly |
|------|-------|--------|---------|
| Standard | £4.99 | £24.99 | £79.99 |
| Enhanced (animated) | £9.99 | £49.99 | £149.99 |
| Premium (large + particles) | £19.99 | £99.99 | £299.99 |

### Banner Advertising

| Placement | Daily | Weekly | Est. Impressions |
|-----------|-------|--------|------------------|
| Homepage Takeover | £99.99 | £499.99 | ~50,000/day |
| Globe Overlay | £79.99 | £399.99 | ~30,000/day |
| Events Banner | £49.99 | £249.99 | ~20,000/day |
| Marketplace Banner | £39.99 | £199.99 | ~15,000/day |
| In-Feed Native | £0.02/impression | Min £50 | Variable |

### Sponsored Content

| Type | Daily | Weekly |
|------|-------|--------|
| Featured Event | £29.99 | £149.99 |
| Featured Profile | £19.99 | £99.99 |
| Push Campaign | £0.05/notification | Min 100 |

---

## 9. RADIO ADVERTISING (RAW CONVICT RECORDS)

### Sponsorship Packages

| Package | Weekly | Monthly | Quarterly | Reach |
|---------|--------|---------|-----------|-------|
| Show Sponsor | £199.99 | £699.99 | £1,799.99 | 5-15K/show |
| Day Part Sponsor | £499.99 | £1,499.99 | - | 20-50K/week |
| Station Sponsor | - | £2,999.99 | £7,999.99 | 100K+/month |

### Ad Spots

| Type | Duration | Per Play | Pack 100 | Pack 500 | Pack 1000 |
|------|----------|----------|----------|----------|-----------|
| Pre-Roll | 30 sec | £0.05 | £39.99 | £174.99 | £299.99 |
| Mid-Roll | 60 sec | £0.08 | £64.99 | £299.99 | £549.99 |
| Post-Roll | 30 sec | £0.03 | £24.99 | £109.99 | £199.99 |
| Live Read | 30-60 sec | £49.99 | - | £199.99 (5) | £349.99 (10) |

### Special Placements

| Type | Hourly | Half-Day | Full-Day |
|------|--------|----------|----------|
| Radio Takeover | £299.99 | £999.99 | £1,799.99 |
| Event Broadcast | - | - | £499.99/event |
| Podcast Sponsor | - | - | £149.99/episode |

### Production Services

| Service | Price |
|---------|-------|
| Custom Jingle (basic) | £299.99 |
| Custom Jingle (premium) | £599.99 |
| Custom Jingle (full) | £999.99 |
| Voice Over (30 sec) | £79.99 |
| Voice Over (60 sec) | £129.99 |
| Ad Copywriting | £49.99 |

### Radio Packages (Bundles)

| Package | Price | Includes | Savings |
|---------|-------|----------|---------|
| **Starter** | £199.99 | 100 pre-roll, 50 post-roll, analytics | 20% |
| **Growth** | £599.99 | 500 pre-roll, 200 mid-roll, 5 live reads, 15s jingle | 30% |
| **Premium** | £1,499.99 | 1 week sponsorship, 1000 pre-roll, 500 mid-roll, 10 live reads, 30s jingle, Globe beacon | 40% |

### Cross-Platform Radio Perks

| User Type | Tier | Perks |
|-----------|------|-------|
| Seller Pro | £14.99/mo | 50 pre-rolls/mo, 10% off packages |
| Seller Business | £49.99/mo | 200 pre-rolls/mo, 2 live reads, 20% off |
| Creator Verified | - | 25 pre-rolls/mo, 10% off |
| Creator Partner | - | 100 pre-rolls, 20 mid-rolls, 1 live read, 25% off |
| Member PLUS | £9.99/mo | 10% off radio when selling |
| Member CHROME | £19.99/mo | 20 free pre-rolls/mo, 25% off |

---

## 10. OFFICIAL SHOP (SHOPIFY)

### Brands
- **RAW** - Streetwear
- **HUNG** - Premium line
- **HIGH** - Club wear
- **HNH MESS** - Lube & aftercare products

### Revenue Model
- Direct e-commerce via Shopify
- Variable margins (product-dependent)
- Integrated with HotMess accounts for XP rewards

---

## 11. REFERRAL PROGRAM

### Rewards

| Action | Referrer Reward | Referee Reward |
|--------|-----------------|----------------|
| Sign up | 500 XP + "Connector" badge | 100 XP + 1 week PLUS free |

### Referral Tiers

| Tier | Referrals | Reward |
|------|-----------|--------|
| Bronze | 5 | Bronze Recruiter Badge |
| Silver | 15 | Silver Badge + 1 Month PLUS |
| Gold | 50 | Gold Badge + 1 Month CHROME |
| Platinum | 100 | Platinum Badge + Lifetime PLUS |

---

## 12. RETENTION MECHANICS (Indirect Revenue)

### Daily Check-in XP

| Day | XP |
|-----|-----|
| Day 1 | 10 |
| Day 2-6 | 15-35 |
| Day 7 | 100 (weekly bonus) |
| Day 14 | 250 |
| Day 30 | 500 |
| Day 90 | 1,000 |
| Day 365 | 5,000 |

### Win-back Campaigns

| Inactive Days | Offer |
|---------------|-------|
| 3 | Message only |
| 7 | 50 XP |
| 14 | 100 XP |
| 30 | 1 Week PLUS Free |
| 60 | 1 Month PLUS 50% off |

---

## REVENUE FLOW SUMMARY

| Stream | Type | Platform Take | Status |
|--------|------|---------------|--------|
| Memberships (PLUS/CHROME) | Recurring | 100% | ✅ Live |
| XP Packages | One-time | 100% | ✅ Live |
| MESSMARKET Seller Commission | Transaction | 7-10% | ✅ Live |
| MESSMARKET Seller Packages | Recurring | 100% | ✅ Live |
| Buyer Premium Protection | Transaction | 5% | ✅ Live |
| Ticket Resale (Seller) | Transaction | 6-10% | ✅ Built |
| Ticket Resale (Buyer) | Transaction | 2.5% | ✅ Built |
| Premium Content | Transaction | 10-20% | ✅ Built |
| Creator Subscriptions | Recurring | 10-20% | ✅ Built |
| Venue Packages | Recurring | 100% | ✅ Defined |
| Globe Advertising | One-time/Recurring | 100% | ✅ Defined |
| Radio Advertising | One-time/Recurring | 100% | ✅ Defined |
| Official Shop (Shopify) | Transaction | Variable | ✅ Live |
| Featured Listings (XP) | One-time | 100% (XP sink) | ✅ Live |

---

## ESTIMATED REVENUE PER USER TYPE

### Average Monthly Revenue Potential

| User Type | Subscription | Transactions | Ads | Total Est. |
|-----------|--------------|--------------|-----|------------|
| Free User | £0 | £5 (purchases) | £0.50 (ad views) | £5.50 |
| PLUS User | £9.99 | £15 | £0 | £24.99 |
| CHROME User | £19.99 | £25 | £0 | £44.99 |
| Casual Seller | £0 | £10 (commission) | £0 | £10 |
| Pro Seller | £14.99 | £50 (commission) | £20 (radio) | £84.99 |
| Business Seller | £49.99 | £200 (commission) | £100 (radio/ads) | £349.99 |
| Venue Standard | £49.99 | £0 | £50 (beacons) | £99.99 |
| Venue Premium | £149.99 | £0 | £200 (campaigns) | £349.99 |

---

## API ENDPOINTS FOR REVENUE

| Endpoint | Purpose | File |
|----------|---------|------|
| `POST /api/stripe/create-checkout-session` | Membership subscription | `api/stripe/create-checkout-session.js` |
| `POST /api/stripe/webhook` | Handle Stripe events | `api/stripe/webhook.js` |
| `POST /api/stripe/cancel-subscription` | Cancel subscription | `api/stripe/cancel-subscription.js` |
| `GET /api/subscriptions/me` | Get user subscription | `api/subscriptions/me.js` |
| `POST /api/premium/subscribe` | Creator subscription (XP) | `api/premium/subscribe.js` |
| `POST /api/premium/unlock` | Unlock premium content | `api/premium/unlock.js` |

---

## DATABASE TABLES (Revenue-Related)

From `supabase/migrations/`:
- `subscriptions` - User and creator subscriptions
- `orders` - Marketplace orders
- `order_items` - Order line items
- `products` - Seller products
- `seller_payouts` - Payout tracking
- `stripe_customers` - Stripe customer IDs
- `premium_content` - Gated content
- `transactions` - XP transactions

---

## RECOMMENDED REVENUE OPTIMIZATIONS

### 1. Not Visible on Live Site
- XP purchase flow not prominently displayed
- Seller packages not promoted
- Radio advertising not exposed to business users
- Venue packages not visible

### 2. Missing CTAs
- "Become a Seller" → SellerDashboard
- "Advertise on Radio" → Radio advertising page
- "List Your Venue" → Venue onboarding
- "Buy XP" → XP store
- "Go PLUS" / "Go CHROME" → Throughout app

### 3. Conversion Opportunities
- After 3 failed messages → Upsell PLUS (unlimited)
- After viewing blurred viewers → Upsell CHROME
- After first sale → Upsell Pro Seller package
- After listing products → Offer listing boost
- After attending event → Offer ticket resale for similar events
