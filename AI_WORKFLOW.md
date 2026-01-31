# 🤖 AI Workflow Guide

**One repo. One branch. One AI at a time.**

---

## The Rules

1. **Always pull before starting**
2. **Only use ONE AI tool at a time**
3. **Push when done (or before switching tools)**

---

## Before Starting Any AI Session

```bash
cd ~/hotmess-globe
git pull
```

---

## After Finishing Any AI Session

```bash
cd ~/hotmess-globe
git add -A
git commit -m "feat: description of changes"
git push
```

---

## Which AI Tool to Use When

| Task | Best Tool |
|------|-----------|
| Terminal commands, file ops, git | **Copilot CLI** (me) |
| Code editing with preview | **Cursor** |
| Long planning/research | **Claude.ai** or **ChatGPT** |
| Quick questions | Any |

---

## If Things Get Messy

### Conflicts after pull:
```bash
git stash
git pull
git stash pop
# Fix conflicts manually
```

### Reset to remote (nuclear option):
```bash
git fetch origin
git reset --hard origin/main
```

### See what changed:
```bash
git status
git diff
```

---

## Branch Strategy

**Keep it simple: work on `main`**

Only create branches for:
- Major experiments you might abandon
- PRs that need review

---

## Quick Reference

```bash
# Morning routine
cd ~/hotmess-globe && git pull && npm run dev

# End of session
git add -A && git commit -m "wip: session done" && git push

# Check status
git status
```

---

*Created 2026-01-31 - Stop the chaos, ship the product.*
