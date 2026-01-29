# Supabase setup (hotmess-globe)

## Project Reference

This project uses Supabase as its backend database and authentication provider.

**Project Reference:** `rfoftonnlwudilafhfkl`
**Project URL:** `https://rfoftonnlwudilafhfkl.supabase.co`

### MCP (Model Context Protocol) Configuration

For AI-assisted development with Cursor or other MCP-compatible tools, use this configuration:

```json
{
  "mcpServers": {
    "supabase": {
      "url": "https://mcp.supabase.com/mcp?project_ref=rfoftonnlwudilafhfkl"
    }
  }
}
```

This enables AI assistants to:
- Query your database schema
- Understand table relationships
- Generate type-safe queries
- Access migration history

## Required env
- `VITE_SUPABASE_URL` - Set to `https://rfoftonnlwudilafhfkl.supabase.co`
- `VITE_SUPABASE_ANON_KEY` - Get from Supabase Dashboard → Project Settings → API

See `.env.example` for full configuration.

## Running Migrations

This repository includes database migrations in `supabase/migrations/`. To apply them:

### Method 1: Supabase Dashboard SQL Editor (Recommended)
1. Open your Supabase project dashboard at https://supabase.com/dashboard
2. Navigate to SQL Editor in the left sidebar
3. Click "New Query"
4. Copy the contents of the migration file from `supabase/migrations/`
5. Paste into the SQL Editor
6. Click "Run" to execute

### Method 2: Supabase CLI
If you have the Supabase CLI installed:
```bash
supabase db push
```

### Important Migrations
- **`20260128000001_premium_content.sql`** - Required for premium features, XP purchasing, and subscriptions
  - Creates tables: `subscriptions`, `premium_unlocks`, `premium_content`, `xp_transactions`
  - Required when `VITE_XP_PURCHASING_ENABLED=true`

## RLS policies (required for the app to fully work)
This repo expects to read/write data from Supabase tables. If RLS is enabled without policies, the app will sign in but profile CRUD (and most entity CRUD) will fail.

1) Open Supabase Dashboard → SQL Editor
2) Paste and run: `supabase/policies.sql`

### Notes
- The included policies assume a `public."User"` table with an `email` column.
- If you use `user_id` (UUID) instead, prefer policies based on `auth.uid()`.
