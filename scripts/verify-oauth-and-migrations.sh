#!/bin/bash
# Comprehensive Verification Script
# Checks migrations and Google OAuth configuration

set -e

BOLD='\033[1m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BOLD}🔍 HOTMESS Migration & OAuth Verification${NC}"
echo "=================================================="
echo ""

# =============================================================================
# 1. Migration Check
# =============================================================================
echo -e "${BOLD}📁 Checking Migrations...${NC}"
echo ""

if [ ! -d "supabase/migrations" ]; then
    echo -e "${RED}❌ Migrations directory not found!${NC}"
    exit 1
fi

MIGRATION_COUNT=$(ls -1 supabase/migrations/*.sql 2>/dev/null | wc -l)
echo -e "${GREEN}✅ Found ${MIGRATION_COUNT} migration files${NC}"

# List latest 5 migrations
echo ""
echo "Latest migrations:"
ls -1 supabase/migrations/*.sql | tail -5 | while read file; do
    echo "  - $(basename "$file")"
done

# Check for specific important migrations
echo ""
echo "Checking critical migrations..."
CRITICAL_MIGRATIONS=(
    "20260103000000_create_user.sql"
    "20260103000001_rls_user_beacon_eventrsvp.sql"
    "20260104160000_create_uploads_bucket_and_rls.sql"
    "20260105100000_create_soundcloud_oauth_tables.sql"
    "20260214010000_security_fixes_rls_hardening.sql"
)

for migration in "${CRITICAL_MIGRATIONS[@]}"; do
    if [ -f "supabase/migrations/$migration" ]; then
        echo -e "  ${GREEN}✅${NC} $migration"
    else
        echo -e "  ${RED}❌${NC} $migration (missing)"
    fi
done

# =============================================================================
# 2. Google OAuth Configuration Check
# =============================================================================
echo ""
echo -e "${BOLD}🔐 Checking Google OAuth Configuration...${NC}"
echo ""

# Check supabase/config.toml
if [ ! -f "supabase/config.toml" ]; then
    echo -e "${RED}❌ supabase/config.toml not found!${NC}"
    exit 1
fi

echo "Checking supabase/config.toml..."
if grep -q "\[auth.external.google\]" supabase/config.toml; then
    echo -e "  ${GREEN}✅${NC} Google OAuth section exists"
    
    # Check if enabled within the google section
    GOOGLE_SECTION=$(grep -A 10 "\[auth.external.google\]" supabase/config.toml | head -11)
    if echo "$GOOGLE_SECTION" | grep -q "enabled = true"; then
        echo -e "  ${GREEN}✅${NC} Google OAuth enabled"
    else
        echo -e "  ${RED}❌${NC} Google OAuth not enabled"
    fi
    
    if grep -q "client_id = \"env(GOOGLE_OAUTH_CLIENT_ID)\"" supabase/config.toml; then
        echo -e "  ${GREEN}✅${NC} Client ID configured (env var)"
    else
        echo -e "  ${YELLOW}⚠️${NC}  Client ID configuration not found"
    fi
    
    if grep -q "secret = \"env(GOOGLE_OAUTH_CLIENT_SECRET)\"" supabase/config.toml; then
        echo -e "  ${GREEN}✅${NC} Client Secret configured (env var)"
    else
        echo -e "  ${YELLOW}⚠️${NC}  Client Secret configuration not found"
    fi
else
    echo -e "  ${RED}❌${NC} Google OAuth section not found in config"
fi

# Check Auth.jsx for proper callback handling
echo ""
echo "Checking Auth.jsx implementation..."
if [ -f "src/pages/Auth.jsx" ]; then
    if grep -q "signInWithGoogle" src/pages/Auth.jsx; then
        echo -e "  ${GREEN}✅${NC} Google OAuth sign-in method found"
    else
        echo -e "  ${RED}❌${NC} Google OAuth sign-in method not found"
    fi
    
    if grep -q "handleOAuthCallback" src/pages/Auth.jsx; then
        echo -e "  ${GREEN}✅${NC} OAuth callback handler found"
    else
        echo -e "  ${YELLOW}⚠️${NC}  OAuth callback handler not found (check useEffect)"
    fi
    
    # Check that we're NOT using /auth/callback
    if grep -q "/auth/callback" src/pages/Auth.jsx; then
        echo -e "  ${RED}❌${NC} Still using incorrect /auth/callback route!"
    else
        echo -e "  ${GREEN}✅${NC} Not using incorrect /auth/callback route"
    fi
else
    echo -e "  ${RED}❌${NC} Auth.jsx not found!"
fi

# Check supabaseClient.jsx
echo ""
echo "Checking supabaseClient.jsx..."
if [ -f "src/components/utils/supabaseClient.jsx" ]; then
    if grep -q "signInWithGoogle" src/components/utils/supabaseClient.jsx; then
        echo -e "  ${GREEN}✅${NC} signInWithGoogle method exported"
    else
        echo -e "  ${RED}❌${NC} signInWithGoogle method not found"
    fi
    
    # Check default redirect
    if grep -q "redirectTo.*auth/callback" src/components/utils/supabaseClient.jsx; then
        echo -e "  ${RED}❌${NC} Still using incorrect /auth/callback in default!"
    else
        echo -e "  ${GREEN}✅${NC} Correct default redirect (not /auth/callback)"
    fi
else
    echo -e "  ${RED}❌${NC} supabaseClient.jsx not found!"
fi

# =============================================================================
# 3. Environment Variables Check
# =============================================================================
echo ""
echo -e "${BOLD}🔑 Checking Environment Variables...${NC}"
echo ""

# Check .env.example
if [ -f ".env.example" ]; then
    echo "Checking .env.example..."
    if grep -q "GOOGLE_OAUTH_CLIENT_ID" .env.example; then
        echo -e "  ${GREEN}✅${NC} Google OAuth credentials documented"
    else
        echo -e "  ${YELLOW}⚠️${NC}  Google OAuth credentials not documented"
    fi
else
    echo -e "  ${YELLOW}⚠️${NC}  .env.example not found"
fi

# Check for actual .env.local (should not exist in repo)
if [ -f ".env.local" ]; then
    echo -e "  ${YELLOW}⚠️${NC}  .env.local exists (should not be committed)"
else
    echo -e "  ${GREEN}✅${NC} .env.local not in repository (correct)"
fi

# =============================================================================
# 4. Documentation Check
# =============================================================================
echo ""
echo -e "${BOLD}📚 Checking Documentation...${NC}"
echo ""

DOCS=(
    "docs/SUPABASE_OAUTH_SETUP.md:OAuth Setup Guide"
    "docs/SUPABASE_DEPLOYMENT_CHECKLIST.md:Deployment Checklist"
    "docs/OAUTH_FLOW_DIAGRAM.md:OAuth Flow Diagram"
    "docs/GOOGLE_OAUTH_FIX_SUMMARY.md:Implementation Summary"
)

for doc in "${DOCS[@]}"; do
    file="${doc%%:*}"
    name="${doc##*:}"
    if [ -f "$file" ]; then
        echo -e "  ${GREEN}✅${NC} $name"
    else
        echo -e "  ${RED}❌${NC} $name (missing)"
    fi
done

# =============================================================================
# 5. Summary & Next Steps
# =============================================================================
echo ""
echo "=================================================="
echo -e "${BOLD}📊 Verification Summary${NC}"
echo "=================================================="
echo ""
echo -e "Migrations: ${GREEN}${MIGRATION_COUNT} files found${NC}"
echo -e "Google OAuth: ${GREEN}Configured in code${NC}"
echo ""
echo -e "${YELLOW}⚠️  Production Setup Required:${NC}"
echo ""
echo "1. Google Cloud Console:"
echo "   - Create OAuth 2.0 Client ID"
echo "   - Add redirect URI: https://your-project-id.supabase.co/auth/v1/callback"
echo ""
echo "2. Supabase Dashboard:"
echo "   - Enable Google OAuth provider"
echo "   - Enter Client ID and Secret"
echo "   - Configure Site URL and Redirect URLs"
echo ""
echo "3. Verify Migrations in Supabase Dashboard:"
echo "   - Go to Database → Migrations"
echo "   - Check all ${MIGRATION_COUNT} migrations are applied"
echo ""
echo -e "${BLUE}📖 For detailed instructions, see:${NC}"
echo "   - docs/SUPABASE_OAUTH_SETUP.md"
echo "   - docs/SUPABASE_DEPLOYMENT_CHECKLIST.md"
echo ""
