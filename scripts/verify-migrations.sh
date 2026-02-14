#!/bin/bash
# Migration Verification Script
# This script checks if all local migration files are applied to Supabase
# 
# Usage: ./scripts/verify-migrations.sh
# Make executable: chmod +x scripts/verify-migrations.sh

set -e

echo "🔍 Checking Supabase Migration Status..."
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Install it with:"
    echo "   npm install -g supabase"
    exit 1
fi

# Check if migrations directory exists
if [ ! -d "supabase/migrations" ]; then
    echo "❌ Migrations directory not found: supabase/migrations"
    echo "   Make sure you're running this script from the project root"
    exit 1
fi

# Count local migration files
LOCAL_MIGRATIONS=$(ls -1 supabase/migrations/*.sql 2>/dev/null | wc -l)
echo "📁 Local migrations: $LOCAL_MIGRATIONS"

# Try to get remote migration status
echo ""
echo "📡 Checking remote migrations..."
echo "   (Note: This requires supabase to be linked to your project)"
echo ""

if supabase migration list 2>/dev/null; then
    echo ""
    echo "✅ Successfully connected to Supabase"
    echo ""
    echo "📋 To apply pending migrations locally:"
    echo "   supabase db reset"
    echo ""
    echo "📋 To apply pending migrations to production:"
    echo "   1. Push to GitHub (if GitHub integration is enabled)"
    echo "   2. Or apply manually via Supabase Dashboard → Database → SQL Editor"
else
    echo ""
    echo "⚠️  Could not connect to Supabase project"
    echo ""
    echo "To link your project:"
    echo "   supabase link --project-ref YOUR_PROJECT_ID"
    echo ""
    echo "   (Find your project ID in Supabase Dashboard → Project Settings → API)"
    echo "   Example: supabase link --project-ref klsywpvncqqglhnhrjbh"
    echo ""
    echo "Or check migrations manually:"
    echo "   1. Open Supabase Dashboard: https://app.supabase.com/"
    echo "   2. Select your project"
    echo "   3. Go to Database → Migrations"
    echo "   4. Verify all $LOCAL_MIGRATIONS migrations are applied"
fi

echo ""
echo "📖 For detailed deployment instructions, see:"
echo "   docs/SUPABASE_DEPLOYMENT_CHECKLIST.md"
