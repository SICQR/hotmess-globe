#!/bin/bash
# Apply HOTMESS Migrations to Supabase
#
# Usage: ./scripts/apply-migrations.sh
#
# Requires: SUPABASE_PROJECT_REF and SUPABASE_DB_PASSWORD env vars
# Or: supabase CLI logged in

set -e

echo "🔥 HOTMESS Migration Apply"
echo "========================="

# Check if supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo "❌ supabase CLI not found. Install with: brew install supabase/tap/supabase"
    exit 1
fi

# List migrations to apply
echo ""
echo "📋 Migrations to apply:"
ls -1 supabase/migrations/*.sql 2>/dev/null | while read f; do
    echo "   - $(basename $f)"
done

echo ""
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 0
fi

# Push migrations
echo ""
echo "🚀 Applying migrations..."
supabase db push

echo ""
echo "✅ Migrations applied successfully!"
echo ""
echo "Tables created:"
echo "   - user_roles"
echo "   - ticket_listings, ticket_purchases, ticket_chat_*"
echo "   - businesses, business_presence, business_signals"
echo "   - sellers, products, product_orders, product_reviews"
echo ""
echo "Next steps:"
echo "   1. Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET in Vercel"
echo "   2. Add Stripe webhook endpoint: https://hotmessldn.com/api/webhook/stripe"
echo "   3. Test ticket and product purchase flows"
