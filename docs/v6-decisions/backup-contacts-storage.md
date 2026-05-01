# Decision: backup_contacts Storage

**Date:** 2026-05-01  
**Status:** ACCEPTED  
**Affects:** Chunk 04a (Care As Kink — Active), Chunk 04b, Chunk 05  

---

## Decision

**Option B selected**: Store backup contacts in the existing `trusted_contacts` table using a `role` column, rather than adding a `profiles.backup_contacts` JSONB/UUID array column.

---

## Schema Change

```sql
ALTER TABLE trusted_contacts
  ADD COLUMN role text NOT NULL DEFAULT 'trusted'
  CHECK (role IN ('trusted', 'backup'));
```

Trigger `enforce_backup_contacts_limit` caps `role='backup'` rows at **2 per user**.

---

## Reading backup contacts in code

```js
// Care surface hook
const { data: backups } = await supabase
  .from('trusted_contacts')
  .select('contact_name, contact_phone')
  .eq('user_id', userId)
  .eq('role', 'backup')
  .limit(2);
```

---

## Writing / updating backup contacts

```js
// Upsert a backup contact (will trigger error if > 2 exist)
await supabase
  .from('trusted_contacts')
  .upsert({ user_id: userId, role: 'backup', contact_name: name, contact_phone: phone });
```

---

## Spec update

All references in HOTMESS-CareAsKink spec to `profiles.backup_contacts` are superseded by:

> Backup contacts are stored in `trusted_contacts` where `role = 'backup'`, max 2 rows per `user_id`. See `docs/v6-decisions/backup-contacts-storage.md`.

---

## Rationale

- `trusted_contacts` table already exists with `contact_name`, `contact_phone`, `notify_on_sos`, `notify_on_checkout`
- Adding a redundant JSONB column on `profiles` creates two sources of truth — drift risk
- Extending `trusted_contacts` with a `role` flag is additive and reversible
- Care surfaces already need `contact_phone` for GET OUT notification — same row, no join

---

## Rejected option

Option A (`profiles.backup_contacts uuid[]` or JSONB `[{name, phone}]`) was spec-word-for-word but creates redundancy with `trusted_contacts` and a 3am bug risk when sources diverge.
