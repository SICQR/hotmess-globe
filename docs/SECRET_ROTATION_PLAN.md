# HOTMESS — Secret Rotation Plan
**Generated:** 2026-02-26
**Trigger:** Postgres credentials committed to git history in docs file (commit 321e34b)

---

## SCOPE OF EXPOSURE

Commit `321e34b` ("security: remove exposed Postgres credential from documentation") confirms that at minimum a Postgres connection string was committed to a docs file. Even though the file was removed, the credential is still accessible via `git log -p` to anyone with repo access.

**Repo:** `SICQR/hotmess-globe` — verify it is **private** in GitHub settings.

---

## ROTATION CHECKLIST

### STEP 1: Rotate Supabase Database Password

**Where:** Supabase dashboard → project `axxwdjmbwkvqhcpwters` → Settings → Database → Reset database password

1. Click "Reset database password"
2. Copy the new password
3. Supabase will also update the connection strings — re-pull them from Settings → Database

**New values to copy:**
- `POSTGRES_URL` (pooled)
- `POSTGRES_URL_NON_POOLING` (direct)
- `POSTGRES_PRISMA_URL` (Prisma)
- `POSTGRES_HOST`
- `POSTGRES_PASSWORD`
- `POSTGRES_USER`
- `POSTGRES_DATABASE`

---

### STEP 2: Update Vercel Environment Variables

```bash
# Pull current to see what you're replacing
vercel env ls production

# Remove and re-add each POSTGRES_* var
vercel env rm POSTGRES_URL production && vercel env add POSTGRES_URL production
vercel env rm POSTGRES_URL_NON_POOLING production && vercel env add POSTGRES_URL_NON_POOLING production
vercel env rm POSTGRES_PRISMA_URL production && vercel env add POSTGRES_PRISMA_URL production
vercel env rm POSTGRES_HOST production && vercel env add POSTGRES_HOST production
vercel env rm POSTGRES_PASSWORD production && vercel env add POSTGRES_PASSWORD production
vercel env rm POSTGRES_USER production && vercel env add POSTGRES_USER production
vercel env rm POSTGRES_DATABASE production && vercel env add POSTGRES_DATABASE production

# Do the same for preview + development environments if they also have POSTGRES_* vars
```

---

### STEP 3: Update Local .env.local

```bash
cd ~/hotmess-globe
vercel env pull .env.local
# This will overwrite .env.local with fresh values from Vercel
```

---

### STEP 4: Verify Connection

```bash
npm run dev
# Open http://localhost:5173 and verify:
# - Login works
# - Profile loads
# - Messages load
# If any of these fail, the DB connection may need updating
```

---

### STEP 5: Remove Dead Vercel Env Vars (While You're There)

After rotating POSTGRES vars, clean these up in one pass:

```bash
# Dead/malformed vars (confirmed unused in source code)
vercel env rm vite_publicSUPABASE_ANON_KEY production
vercel env rm vite_publicSUPABASE_ANON_KEY preview
vercel env rm vite_publicSUPABASE_ANON_KEY development

vercel env rm vite_publicSUPABASE_URL production
vercel env rm vite_publicSUPABASE_URL preview
vercel env rm vite_publicSUPABASE_URL development

vercel env rm vite_publicSUPABASE_PUBLISHABLE_KEY production
vercel env rm vite_publicSUPABASE_PUBLISHABLE_KEY preview
vercel env rm vite_publicSUPABASE_PUBLISHABLE_KEY development

# Legacy Base44 platform vars (confirmed no code references them)
vercel env rm VITE_BASE44_APP_BASE_URL production
vercel env rm VITE_BASE44_APP_BASE_URL preview
vercel env rm VITE_BASE44_APP_BASE_URL development
vercel env rm VITE_BASE44_APP_ID production
vercel env rm VITE_BASE44_APP_ID preview
vercel env rm VITE_BASE44_APP_ID development

# Claude API key added by agent (not used in code)
vercel env rm CLAUDE_1ST_KEY production
vercel env rm CLAUDE_1ST_KEY preview
vercel env rm CLAUDE_1ST_KEY development
```

---

### STEP 6: Add Missing Vars to Preview + Development

```bash
# VITE_SUPABASE_ANON_KEY is currently PRODUCTION-only — add to other envs
vercel env add VITE_SUPABASE_ANON_KEY preview
vercel env add VITE_SUPABASE_ANON_KEY development

# VITE_SUPABASE_URL if not in preview/development
vercel env add VITE_SUPABASE_URL preview
vercel env add VITE_SUPABASE_URL development
```

---

### STEP 7: Consider Rotating Supabase Service Role Key

If there is any chance the service role key was also in the exposed docs file:

**Where:** Supabase dashboard → project `axxwdjmbwkvqhcpwters` → Settings → API → Service role key → Reveal → Rotate

After rotating:
```bash
vercel env rm SUPABASE_SERVICE_ROLE_KEY production && vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env rm SUPABASE_SECRET_KEY production && vercel env add SUPABASE_SECRET_KEY production
# Then: vercel env pull .env.local
```

---

### STEP 8: Clean MEMORY.md of Secrets

The file `/Users/philipgizzie/.claude/projects/-Users-philipgizzie/memory/MEMORY.md` contains API keys in plain text. Remove them:

**Keys to remove from MEMORY.md:**
- `sk-ant-api03-...` (Claude API key)
- `figd_tNuJF-...` (Figma token)
- `gho_wVwRm...` (GitHub OAuth token)
- `sb_secret_...` (Supabase MCP secret)

Replace with references like: `[Claude API key — see .env.local or 1Password]`

---

## POST-ROTATION VERIFICATION

```bash
# 1. Confirm local dev works
npm run dev
# Test: login, load profile, send message, browse market

# 2. Confirm production works
curl https://hotmessldn.com/api/health

# 3. Confirm Supabase connected
curl "https://axxwdjmbwkvqhcpwters.supabase.co/rest/v1/" \
  -H "apikey: [SUPABASE_ANON_KEY]" \
  -H "Authorization: Bearer [SUPABASE_ANON_KEY]"
# Should return 200

# 4. Deploy fresh build
git push origin main
# Monitor: vercel ls
```

---

## SECRET INVENTORY (post-rotation)

| Secret | Owner | Rotation Frequency |
|--------|-------|-------------------|
| POSTGRES_* | Supabase axxwdjmbwkvqhcpwters | Quarterly or on exposure |
| SUPABASE_SERVICE_ROLE_KEY | Supabase axxwdjmbwkvqhcpwters | Quarterly |
| SUPABASE_ANON_KEY | Supabase klsywpvncqqglhnhrjbh | Annually (public-safe) |
| STRIPE_SECRET_KEY | Stripe dashboard | Annually or on exposure |
| STRIPE_WEBHOOK_SECRET | Stripe webhook settings | On endpoint change |
| TELEGRAM_BOT_TOKEN | @BotFather | On exposure only |
| GOOGLE_MAPS_API_KEY | Google Cloud Console | Annually (restrict to domain) |
| VAPID_PRIVATE_KEY | Manually generated | Never (breaks push subscriptions) |
| SHOPIFY_API_STOREFRONT_ACCESS_TOKEN | Shopify Partners | Annually |
| OPENAI_API_KEY | OpenAI dashboard | On exposure |
| TICKET_QR_SIGNING_SECRET | Manual | On exposure |
| *_CRON_SECRET | Manual | On exposure |
