# Conflict Resolution Patches

This directory contains patch files that resolve merge conflicts for PRs #30, #31, #32, #41, and #42.

## Patch Files

- **pr30-resolution.patch** - Resolves vercel.json conflict in PR #30 (cursor/production-logger-admin-06d6)
- **pr31-resolution.patch** - Resolves vercel.json conflict in PR #31 (cursor/product-polish-and-wow-a0a3)
- **pr32-resolution.patch** - Resolves vercel.json conflict in PR #32 (cursor/infrastructure-gaps-plan-2e41)
- **pr41-resolution.patch** - Resolves security.yml conflict in PR #41 (copilot/investigate-pr-failures-again)
- **pr42-resolution.patch** - Resolves security.yml conflict in PR #42 (copilot/fix-pr-merge-issues)

## How to Use

To apply a patch to a PR branch:

```bash
# 1. Checkout the PR branch
git checkout <branch-name>

# 2. Apply the patch
git am < patches/<patch-file>

# 3. Push to update the PR
git push origin <branch-name>
```

## Example

To resolve PR #30:

```bash
git checkout cursor/production-logger-admin-06d6
git am < patches/pr30-resolution.patch
git push origin cursor/production-logger-admin-06d6
```

## Troubleshooting

If `git am` fails:
1. Check that you're on the correct branch
2. Ensure the branch is up to date with its remote
3. Try `git am --3way < patches/<patch-file>` for better conflict resolution
4. If issues persist, see the detailed documentation in `APPLYING_RESOLUTIONS.md`

## What's in Each Patch?

Each patch contains:
- The merge commit that resolves the conflict
- A detailed commit message explaining the resolution
- The specific changes needed to resolve the conflict

You can inspect a patch before applying:
```bash
cat patches/pr30-resolution.patch
```

## More Information

- See `CONFLICT_RESOLUTIONS.md` for detailed analysis of each conflict
- See `APPLYING_RESOLUTIONS.md` for alternative application methods
- See `SUMMARY.md` for an executive summary
