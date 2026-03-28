# Pull Request Checklist

## Before Opening PR

### Code Quality
- [ ] No `console.log` statements (use proper logging)
- [ ] No hardcoded values (use env vars / tokens)
- [ ] TypeScript strict mode passes
- [ ] ESLint passes with no warnings

### Architecture Compliance
- [ ] Does this reduce pages? (or at minimum, not add any)
- [ ] Does this reduce UI-only state?
- [ ] Does Supabase remain the source of truth?
- [ ] Does the Globe stay dumb? (no auth/profile logic)
- [ ] Does safety remain authoritative?

### Testing
- [ ] Storybook stories exist for new components
- [ ] All component states covered (default, loading, blocked, empty, error)
- [ ] Manual testing completed on mobile viewport

---

## PR Description Template

```markdown
## What

[One sentence describing the change]

## Why

[Business reason or user problem being solved]

## How

[Technical approach, if non-obvious]

## State Changes

- [ ] Adds/modifies Supabase tables
- [ ] Adds/modifies RLS policies
- [ ] Adds/modifies RPCs
- [ ] Changes boot guard logic
- [ ] Changes presence logic
- [ ] Changes safety logic

## Screenshots

[Before/after if UI change]

## Testing

- [ ] Tested on mobile (390px viewport)
- [ ] Tested boot guard flow
- [ ] Tested presence flow (if applicable)
- [ ] Tested safety flow (if applicable)
```

---

## Reviewer Checklist

### Architecture
- [ ] No new pages introduced
- [ ] No new navigation stacks
- [ ] No UI-only state pretending to be real
- [ ] Globe does not reference profile/auth state

### Data Flow
- [ ] Writes go through RPCs (not direct inserts)
- [ ] RLS policies enforce visibility
- [ ] No Supabase data duplicated in client state

### Safety
- [ ] Safety flows cannot be bypassed
- [ ] Safety state is authoritative
- [ ] Admin-only content not leaked

### UI
- [ ] Follows 8pt spacing grid
- [ ] One primary CTA per state
- [ ] No back buttons / breadcrumbs
- [ ] Sheets stack, don't navigate

---

## Merge Blockers

**Do NOT merge if any of these are true:**

- ❌ Introduces a new page/route as a destination
- ❌ UI state not backed by Supabase
- ❌ Globe has auth/profile logic
- ❌ Safety can be accidentally dismissed
- ❌ Missing Storybook stories for new components
- ❌ Deep links can bypass boot guard

---

## Post-Merge

- [ ] Verify Vercel preview deployment
- [ ] Run smoke test on preview URL
- [ ] Check Supabase logs for errors
- [ ] Notify team in Slack/Discord
