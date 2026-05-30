#!/bin/bash
#
# Apply conflict resolutions to PR branches
# This script applies the conflict resolutions for PRs #30, #31, #32, #41, #42
#

set -e

echo "======================================"
echo "Applying PR Conflict Resolutions"
echo "======================================"
echo ""

# Check we're in the right directory
if [ ! -f "CONFLICT_RESOLUTIONS.md" ]; then
    echo "Error: Must run from repository root"
    exit 1
fi

# Function to resolve vercel.json conflict (PRs #30, #31, #32)
resolve_vercel_json() {
    local pr_num=$1
    local branch=$2
    
    echo "Resolving PR #$pr_num ($branch)..."
    
    # Checkout the branch
    git fetch origin "$branch"
    git checkout "$branch"
    
    # Merge main
    if git merge --no-commit origin/main 2>&1 | grep -q "CONFLICT"; then
        # Resolve by taking main's version (theirs)
        git checkout --theirs vercel.json
        git add vercel.json
        
        # Commit the resolution
        git commit -m "chore: resolve merge conflict in vercel.json - use rewrites syntax from main

The main branch has updated vercel.json to use the 'rewrites' syntax
which is the current Vercel standard. This replaces the older 'routes'
syntax with 'handle: filesystem'.

Resolution: Accept main's version with rewrites configuration."
        
        echo "✓ PR #$pr_num resolved"
        return 0
    else
        echo "✓ PR #$pr_num has no conflicts (already merged or resolved)"
        git merge --abort 2>/dev/null || true
        return 0
    fi
}

# Function to resolve security.yml conflict (PR #41)
resolve_pr41_security() {
    echo "Resolving PR #41 (copilot/investigate-pr-failures-again)..."
    
    git fetch origin copilot/investigate-pr-failures-again
    git checkout copilot/investigate-pr-failures-again
    
    if git merge --no-commit origin/main 2>&1 | grep -q "CONFLICT"; then
        # Keep PR #41's version (ours) - it has better error handling
        git checkout --ours .github/workflows/security.yml
        git add .github/workflows/security.yml
        
        git commit -m "chore: resolve security.yml conflict - keep PR #41's comprehensive dependency review handling

PR #41 includes better error handling with:
- ID on the dependency-review step for outcome checking
- Comprehensive note explaining possible failure reasons
- Clear guidance for repository admins

Resolution: Accept PR #41's version which provides better user feedback"
        
        echo "✓ PR #41 resolved"
        return 0
    else
        echo "✓ PR #41 has no conflicts"
        git merge --abort 2>/dev/null || true
        return 0
    fi
}

# Function to resolve security.yml conflict (PR #42)
resolve_pr42_security() {
    echo "Resolving PR #42 (copilot/fix-pr-merge-issues)..."
    
    git fetch origin copilot/fix-pr-merge-issues
    git checkout copilot/fix-pr-merge-issues
    
    if git merge --no-commit origin/main 2>&1 | grep -q "CONFLICT"; then
        # Use main's version (theirs) - it has the inline comment
        git checkout --theirs .github/workflows/security.yml
        git add .github/workflows/security.yml
        
        git commit -m "chore: resolve security.yml conflict - use main's version with inline comment

Main branch includes an inline comment explaining why continue-on-error is set,
which provides better context for future maintainers.

Resolution: Accept main's version with the explanatory comment"
        
        echo "✓ PR #42 resolved"
        return 0
    else
        echo "✓ PR #42 has no conflicts"
        git merge --abort 2>/dev/null || true
        return 0
    fi
}

# Main execution
echo "This script will resolve conflicts and push changes."
echo "Make sure you have push access to the repository."
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

# Save current branch
ORIG_BRANCH=$(git branch --show-current)

# Resolve PRs #30, #31, #32 (vercel.json conflicts)
resolve_vercel_json 30 "cursor/production-logger-admin-06d6"
echo ""

resolve_vercel_json 31 "cursor/product-polish-and-wow-a0a3"
echo ""

resolve_vercel_json 32 "cursor/infrastructure-gaps-plan-2e41"
echo ""

# Resolve PRs #41, #42 (security.yml conflicts)
resolve_pr41_security
echo ""

resolve_pr42_security
echo ""

# Return to original branch
git checkout "$ORIG_BRANCH"

echo "======================================"
echo "Resolutions Complete!"
echo "======================================"
echo ""
echo "The following branches have been updated:"
echo "  - cursor/production-logger-admin-06d6 (PR #30)"
echo "  - cursor/product-polish-and-wow-a0a3 (PR #31)"
echo "  - cursor/infrastructure-gaps-plan-2e41 (PR #32)"
echo "  - copilot/investigate-pr-failures-again (PR #41)"
echo "  - copilot/fix-pr-merge-issues (PR #42)"
echo ""
echo "Note: Changes are committed locally but NOT pushed."
echo "Review the changes and push manually with:"
echo "  git push origin <branch-name>"
echo ""
echo "To push all at once (USE WITH CAUTION):"
echo "  git push origin cursor/production-logger-admin-06d6 \\"
echo "    cursor/product-polish-and-wow-a0a3 \\"
echo "    cursor/infrastructure-gaps-plan-2e41 \\"
echo "    copilot/investigate-pr-failures-again \\"
echo "    copilot/fix-pr-merge-issues"
