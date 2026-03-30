# How to Apply PR Conflict Resolutions

This guide explains how to apply the conflict resolutions that have been prepared for PRs #30, #31, #32, #41, and #42.

## Overview

Conflict resolutions have been prepared in separate branches:
- `resolved-pr30` - Resolves PR #30
- `resolved-pr31` - Resolves PR #31
- `resolved-pr32` - Resolves PR #32
- `resolved-pr41` - Resolves PR #41
- `resolved-pr42` - Resolves PR #42

Each resolved branch contains a merge commit that resolves the conflicts with the main branch.

## Method 1: Automated Script (Easiest)

Run the automated resolution script that handles all 5 PRs:

```bash
# From the repository root
bash scripts/apply-pr-resolutions.sh
```

This script will:
1. Fetch each PR branch
2. Merge main and resolve conflicts
3. Commit the resolutions with detailed messages
4. Leave changes ready for you to review and push

**Note**: The script commits but does NOT push. Review the changes before pushing.

## Method 2: Manual Resolution Per PR

## Method 2: Manual Resolution Per PR

If you prefer to resolve conflicts manually for each PR:

### For PRs #30, #31, #32 (vercel.json conflicts):
```bash
# Checkout the PR branch
git fetch origin <branch-name>
git checkout <branch-name>

# Merge main (will show conflict)
git merge origin/main

# Resolve by accepting main's version
git checkout --theirs vercel.json
git add vercel.json

# Commit and push
git commit -m "chore: resolve vercel.json conflict - use main's rewrites syntax"
git push origin <branch-name>
```

Branch names:
- PR #30: `cursor/production-logger-admin-06d6`
- PR #31: `cursor/product-polish-and-wow-a0a3`
- PR #32: `cursor/infrastructure-gaps-plan-2e41`

### For PR #41 (security.yml conflict):
```bash
git fetch origin copilot/investigate-pr-failures-again
git checkout copilot/investigate-pr-failures-again
git merge origin/main

# Keep PR #41's version (it has better error handling)
git checkout --ours .github/workflows/security.yml
git add .github/workflows/security.yml

git commit -m "chore: resolve security.yml - keep comprehensive error handling"
git push origin copilot/investigate-pr-failures-again
```

### For PR #42 (security.yml conflict):
```bash
git fetch origin copilot/fix-pr-merge-issues
git checkout copilot/fix-pr-merge-issues
git merge origin/main

# Use main's version (it has the inline comment)
git checkout --theirs .github/workflows/security.yml
git add .github/workflows/security.yml

git commit -m "chore: resolve security.yml - use main's inline comment"
git push origin copilot/fix-pr-merge-issues
```

## Method 3: Using Resolved Branches

## Method 3: Using Resolved Branches

The local `resolved-pr*` branches can be used as references or pushed to replace the PR branches.

**⚠️ Warning**: This will replace the PR branch history.

```bash
# For PR #30
git fetch origin resolved-pr30
git push origin resolved-pr30:cursor/production-logger-admin-06d6 --force-with-lease

# For PR #31
git fetch origin resolved-pr31
git push origin resolved-pr31:cursor/product-polish-and-wow-a0a3 --force-with-lease

# For PR #32
git fetch origin resolved-pr32
git push origin resolved-pr32:cursor/infrastructure-gaps-plan-2e41 --force-with-lease

# For PR #41
git fetch origin resolved-pr41
git push origin resolved-pr41:copilot/investigate-pr-failures-again --force-with-lease

# For PR #42
git fetch origin resolved-pr42
git push origin resolved-pr42:copilot/fix-pr-merge-issues --force-with-lease
```

**Note**: The resolved branches are currently local only and haven't been pushed to origin.

## Method 4: Follow Documentation Manually

If you prefer to manually resolve the conflicts following the documentation:

1. Read the resolution details in `CONFLICT_RESOLUTIONS.md`
2. Checkout the PR branch
3. Merge main: `git merge main`
4. Resolve conflicts according to the documented approach
5. Commit and push

## Verification After Applying

After applying any resolution:

1. **Check GitHub**: Verify the PR no longer shows conflicts
2. **Run CI**: Ensure all CI/CD checks pass
3. **Review**: Check the changes make logical sense
4. **Test**: If possible, test the affected functionality

## For PR #23

PR #23 is too complex for automated resolution. See `CONFLICT_RESOLUTIONS.md` for detailed guidance on how to manually resolve its conflicts.

## Need Help?

If you encounter issues:
1. Check `CONFLICT_RESOLUTIONS.md` for detailed resolution rationale
2. Review the commit messages in the resolved branches
3. Contact the repository maintainers for assistance
