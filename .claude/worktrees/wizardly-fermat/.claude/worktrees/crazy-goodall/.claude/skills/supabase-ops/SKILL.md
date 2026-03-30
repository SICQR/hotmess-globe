---
name: supabase-ops
description: >
  Writes Supabase migrations, RLS policies, edge functions, RPCs, and realtime subscriptions for
  the HOTMESS platform. Knows the live schema, the beacons VIEW gotcha, right_now_status TABLE rule,
  and auth listener limits. Use this skill whenever the task involves database changes, new tables,
  RLS policies, edge functions, SQL migrations, or any Supabase interaction. Also use when migrating
  from base44 to Supabase (a key Phase 1 task), fixing RLS holes, adding columns, creating RPCs,
  or wiring realtime subscriptions. Triggers on "migration", "RLS", "edge function", "Supabase",
  "database", "table", "policy", "SQL", "base44", or any task that touches the data layer.
---

# Supabase Ops — HOTMESS Database Operations

You manage the Supabase data layer for HOTMESS. The platform runs two projects:

- **Production**: `axxwdjmbwkvqhcpwters` (supabase-purple-queen, East US)
- **Dev/staging**: `klsywpvncqqglhnhrjbh` (HOTMESS BASE44, ap-northeast-1)

## Migration Conventions

### Filename format
```
YYYYMMDD00000N_descriptive_name.sql
```
Example: `20260324000001_add_challenges_and_user_challenges.sql`

Place in: `supabase/migrations/`

### Comment block
Every migration starts with a comment explaining **why** the change is needed:

```sql
-- Add challenges table for gamification framework
-- Stores challenge definitions and user_challenges join table
-- to track which users completed which challenges.
-- Required by Phase 4 (Surface Built Features) of the product plan.
```

### Table creation pattern

```sql
CREATE TABLE IF NOT EXISTS public.my_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- columns here
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Always enable RLS
ALTER TABLE public.my_table ENABLE ROW LEVEL SECURITY;
```

### Foreign key convention
- User references → `REFERENCES public.profiles(id) ON DELETE CASCADE`
- NOT `auth.users(id)` — always use profiles
- Every user-owned table has `user_id UUID NOT NULL`

### Indexes
- Always index foreign keys: `CREATE INDEX idx_my_table_user_id ON public.my_table(user_id);`
- Composite unique constraints where appropriate: `UNIQUE(user_id, challenge_id)`

## RLS Policy Rules

These rules exist because HOTMESS has had multiple RLS security holes. Follow them exactly.

### Policy naming
```
{table}_{operation}_{scope}
```
Examples: `challenges_read_all`, `user_challenges_write_own`, `messages_read_thread_member`

### Read policies (SELECT)
```sql
-- Public read (anyone can see)
CREATE POLICY "my_table_read_all"
  ON public.my_table FOR SELECT
  USING (true);

-- Owner-only read
CREATE POLICY "my_table_read_own"
  ON public.my_table FOR SELECT
  USING (auth.uid() = user_id);
```

### Write policies (INSERT)
```sql
-- Owner-only write
CREATE POLICY "my_table_write_own"
  ON public.my_table FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

**NEVER use `USING (true)` on INSERT/UPDATE/DELETE policies.** This is the #1 RLS mistake
in this codebase. USING(true) on writes means any authenticated user can write to any row.

### Update policies
```sql
CREATE POLICY "my_table_update_own"
  ON public.my_table FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### Delete policies
```sql
CREATE POLICY "my_table_delete_own"
  ON public.my_table FOR DELETE
  USING (auth.uid() = user_id);
```

### Admin policies
```sql
CREATE POLICY "my_table_write_admin"
  ON public.my_table FOR INSERT
  WITH CHECK (
    auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin')
  );
```

## Known Schema Gotchas

### beacons is a VIEW
`beacons` is a PostgreSQL VIEW, not a table. `ALTER TABLE beacons` will fail.
Columns like `title`, `description`, `address`, `image_url` live in the `metadata` JSONB column
of the underlying table. To query:

```sql
SELECT metadata->>'title' as title, metadata->>'description' as description
FROM beacon_data  -- the underlying table
```

### right_now_status is a TABLE
There is NO `profiles.right_now_status` JSONB column. The status is stored in a separate
`right_now_status` table. Some old code writes to the non-existent profiles column — always
fix these to write to the table instead:

```sql
-- Correct
INSERT INTO right_now_status (user_id, intent, updated_at)
VALUES ($1, $2, NOW())
ON CONFLICT (user_id) DO UPDATE SET intent = $2, updated_at = NOW();

-- WRONG — column does not exist
UPDATE profiles SET right_now_status = $2 WHERE id = $1;
```

### Auth listener limit
6 files already have `onAuthStateChange` listeners. Don't add more without auditing:
BootGuardContext, NowSignalContext, viewerState.ts, bootGuard.ts, Auth.jsx, supabaseClient.jsx

### profile_overrides FK
The `profile_overrides` table has a wrong FK reference (known bug, medium severity).
If touching this table, fix the FK to reference `profiles.id`.

## Edge Functions

Live in `supabase/functions/`. Current functions:

```
cancel-subscription    — Stripe subscription cancellation
create-checkout-session — Stripe checkout
notify-push            — JWT-authenticated push notifications
push-processor         — Push dispatch worker
send-email             — Transactional email (NEEDS gold rebrand: P1-5)
send-push              — Web push via VAPID
stripe-webhook         — Stripe webhook handler
```

### Edge function pattern

```ts
// supabase/functions/my-function/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { user }, error } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (error || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Business logic here

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
```

## RPC Pattern

```sql
CREATE OR REPLACE FUNCTION public.my_rpc(
  p_user_id UUID,
  p_param TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Logic here
END;
$$;
```

## Realtime Subscriptions

Use sparingly. The client-side pattern:

```tsx
import { supabase } from '@/components/utils/supabaseClient';

useEffect(() => {
  const channel = supabase
    .channel('my-channel')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'my_table',
      filter: `user_id=eq.${userId}`,
    }, (payload) => {
      // Handle new row
    })
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}, [userId]);
```

Realtime subscriptions multiply on Vite hot-reload (dev-only issue, not production).
Always clean up in the useEffect return.

## base44 → Supabase Migration (Phase 1 Priority)

The product plan's P1-1 task requires migrating Safety.jsx from base44 to Supabase.
Known base44 calls remaining:

- `Safety.jsx`: base44.entities.TrustedContact.*, base44.entities.SafetyCheckIn.*
- `PanicButton.jsx`: base44 SendEmail integration

Replace pattern:
```tsx
// Before (base44)
const contacts = await base44.entities.TrustedContact.list();

// After (Supabase)
const { data: contacts } = await supabase
  .from('trusted_contacts')
  .select('*')
  .eq('user_id', user.id);
```

Target: zero base44 calls in user-facing paths by Phase 6.

## Applying Migrations

Use the Supabase MCP tool `apply_migration` or `execute_sql` for direct SQL.
Always test on dev/staging (`klsywpvncqqglhnhrjbh`) before production (`axxwdjmbwkvqhcpwters`).

## Live DB Quick Checks

```sql
-- User counts
SELECT COUNT(*) FROM profiles WHERE onboarding_completed = true;

-- Trusted contacts (should be >0 after Phase 1)
SELECT COUNT(*) FROM trusted_contacts;

-- Engagement metrics
SELECT COUNT(*) FROM taps;
SELECT COUNT(*) FROM messages;
SELECT COUNT(*) FROM chat_threads;

-- base44 dependency audit
-- (run from code, not SQL)
-- grep -r "base44" src/ --include="*.tsx" --include="*.jsx" --include="*.ts"
```
