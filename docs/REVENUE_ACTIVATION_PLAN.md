# REVENUE ACTIVATION PLAN: PATH TO 2M
**Objective:** Activate high-value self-service revenue streams to hit £166k/mo run rate.

## 1. THE GAP (UI vs. Reality)
We have a beautiful `Pricing.jsx` page with tabs for Memberships, Sellers, Venues, and Radio.
**Problem:** The buttons do nothing or link to generic pages.
**Solution:** Wire every button to a Stripe Checkout flow.

## 2. ACTIVATION PRIORITIES

### A. Memberships (Recurring Consumer Revenue)
- **Target:** 1,000 Chrome Users (£20k/mo)
- **Action:** 
    - Wire `Pricing.jsx` "Upgrade" buttons to `api/stripe/create-checkout-session`.
    - Ensure `webhooks` handle the role upgrade (FREE -> CHROME) instantly.

### B. Radio Advertising (High-Margin B2B)
- **Target:** 50 Monthly Sponsors (£75k/mo)
- **Action:**
    - Create `RadioAdWizard.jsx`:
        - Step 1: Select Package (Weekly/Monthly/Takeover).
        - Step 2: Upload Audio OR Request Production (+£299).
        - Step 3: Select Slots/Time.
        - Step 4: Pay via Stripe.
    - Output: Writes to `radio_ads_queue` table for admin review.

### C. Venue & Business Packages (Recurring B2B)
- **Target:** 100 Premium Venues (£35k/mo)
- **Action:**
    - Wire "Subscribe" on `Pricing.jsx` to a specific `price_id` in Stripe.
    - Post-payment redirect to `/biz/onboarding` to set up their Beacon/Globe Pin.

### D. Ticket Resale (High Volume Transactional)
- **Target:** 5,000 txns/mo (£25k/mo)
- **Action:**
    - Finalize `TicketMarketplace` logic.
    - Ensure split payments (Stripe Connect) works so sellers get paid automatically.

## 3. INFRASTRUCTURE REQUIREMENTS
To execute this, we need:
1.  **Stripe Secret Key** (sk_live_...)
2.  **Stripe Webhook Secret** (whsec_...)
3.  **Stripe Price IDs** for every tier in `Pricing.jsx`.

## 4. IMMEDIATE NEXT STEPS
1.  **User:** Provide Stripe Keys.
2.  **Claw:** 
    - Update `lib/pricing.js` with real Stripe Price IDs.
    - Create `RadioAdWizard` component.
    - Verify Webhook handler logic.
