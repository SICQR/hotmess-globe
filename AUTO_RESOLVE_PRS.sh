#!/bin/bash
# AUTO_RESOLVE_PRS.sh
# This script helps you (the human) quickly merge PRs following the recommended order
# Run this AFTER merging PR #62 to main

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Auto-Resolve PRs Helper Script       ║${NC}"
echo -e "${BLUE}║  Interactive PR Merge Assistant       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${YELLOW}⚠️  GitHub CLI (gh) not found${NC}"
    echo "This script works best with GitHub CLI installed."
    echo "Install from: https://cli.github.com/"
    echo ""
    echo "You can still use this script - it will provide manual instructions."
    echo ""
    USE_GH=false
else
    echo -e "${GREEN}✓ GitHub CLI detected${NC}"
    USE_GH=true
fi

# Function to check if user is authenticated
check_auth() {
    if [ "$USE_GH" = true ]; then
        if ! gh auth status &> /dev/null; then
            echo -e "${YELLOW}⚠️  Not authenticated with GitHub CLI${NC}"
            echo "Run: gh auth login"
            return 1
        fi
        echo -e "${GREEN}✓ GitHub CLI authenticated${NC}"
    fi
    return 0
}

# Function to merge a PR
merge_pr() {
    local pr_number=$1
    local pr_title=$2
    local reason=$3
    
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}PR #${pr_number}: ${pr_title}${NC}"
    echo -e "${GREEN}Why: ${reason}${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    if [ "$USE_GH" = true ]; then
        echo ""
        echo "Options:"
        echo "  1) View PR"
        echo "  2) Merge PR (auto)"
        echo "  3) Skip for now"
        echo "  4) Exit script"
        echo ""
        read -p "Choose [1-4]: " choice
        
        case $choice in
            1)
                gh pr view $pr_number --web
                merge_pr $pr_number "$pr_title" "$reason"
                ;;
            2)
                echo -e "${YELLOW}Merging PR #${pr_number}...${NC}"
                gh pr merge $pr_number --squash --delete-branch || {
                    echo -e "${RED}Failed to merge. You may need to:${NC}"
                    echo "  - Remove draft status"
                    echo "  - Approve the PR"
                    echo "  - Resolve conflicts"
                    gh pr view $pr_number --web
                }
                ;;
            3)
                echo -e "${YELLOW}Skipped PR #${pr_number}${NC}"
                ;;
            4)
                echo -e "${GREEN}Exiting script${NC}"
                exit 0
                ;;
            *)
                echo -e "${RED}Invalid choice${NC}"
                merge_pr $pr_number "$pr_title" "$reason"
                ;;
        esac
    else
        echo ""
        echo -e "${YELLOW}Manual merge instructions:${NC}"
        echo "1. Go to: https://github.com/SICQR/hotmess-globe/pull/${pr_number}"
        echo "2. Remove draft status (if needed)"
        echo "3. Review changes"
        echo "4. Approve and merge"
        echo ""
        read -p "Press Enter when done (or 's' to skip): " skip
        if [ "$skip" = "s" ]; then
            echo -e "${YELLOW}Skipped PR #${pr_number}${NC}"
        fi
    fi
}

# Main execution
echo ""
check_auth

echo ""
echo -e "${GREEN}This script will guide you through merging PRs in the recommended order.${NC}"
echo ""
echo "The merge order follows the priority matrix from the analysis:"
echo "  Phase 1: Unblock CI/CD (PRs #33, #41, #42, #45, #47)"
echo "  Phase 2: Documentation (PRs #34, #55, #58, #61)"
echo "  Phase 3: Foundation (PRs #56, #52, #30)"
echo "  Phase 4+: Features, UI, Retention"
echo ""
read -p "Ready to start? [y/N]: " ready

if [ "$ready" != "y" ] && [ "$ready" != "Y" ]; then
    echo "Exiting. Run this script again when ready."
    exit 0
fi

# Phase 1: Critical - Unblock CI/CD
echo ""
echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo -e "${BLUE}  PHASE 1: UNBLOCK CI/CD (Critical)${NC}"
echo -e "${BLUE}═══════════════════════════════════════════${NC}"

merge_pr 33 "Remove unused AlertCircle import" "Unblocks linting for all PRs"
merge_pr 41 "Fix: CI failures - Dependency graph" "Fixes critical CI issues (ready to merge)"
merge_pr 42 "Fix PR merge issues" "Resolves merge blockers"
merge_pr 45 "Install dependencies" "Fixes dependency issues"
merge_pr 47 "Vercel conditional deployment" "Improves deployment reliability"

# Apply conflict resolutions
echo ""
echo -e "${YELLOW}Apply conflict resolutions for PRs #30, #31, #32?${NC}"
echo "This will run: bash scripts/apply-pr-resolutions.sh"
read -p "Apply now? [y/N]: " apply_conflicts

if [ "$apply_conflicts" = "y" ] || [ "$apply_conflicts" = "Y" ]; then
    if [ -f "scripts/apply-pr-resolutions.sh" ]; then
        bash scripts/apply-pr-resolutions.sh
    else
        echo -e "${RED}Resolution script not found. Ensure PR #62 is merged first.${NC}"
    fi
fi

# Phase 2: Documentation
echo ""
echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo -e "${BLUE}  PHASE 2: DOCUMENTATION${NC}"
echo -e "${BLUE}═══════════════════════════════════════════${NC}"

merge_pr 34 "Document PR status" "Status documentation"
merge_pr 55 "Premium features docs" "Premium feature documentation"
merge_pr 58 "Business readiness docs" "Business documentation"
merge_pr 61 "Deployment blockers doc" "Deployment documentation"

# Coordination needed
echo ""
echo -e "${YELLOW}═══════════════════════════════════════════${NC}"
echo -e "${YELLOW}  COORDINATION NEEDED${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════${NC}"
echo ""
echo "PR #37: Revert PR - Decision needed"
echo "  Should this revert be kept or closed?"
echo ""
echo "PR #39 vs PR #52: Match probability"
echo "  Two PRs implement similar features. Choose one:"
echo "  - PR #39: By @SICQR"
echo "  - PR #52: By Copilot"
echo ""
read -p "Press Enter to continue to Phase 3..."

# Phase 3: Foundation
echo ""
echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo -e "${BLUE}  PHASE 3: FOUNDATION FEATURES${NC}"
echo -e "${BLUE}═══════════════════════════════════════════${NC}"

merge_pr 56 "Lux design system" "Foundation design system (21+ components)"
echo -e "${YELLOW}Choose match probability approach:${NC}"
echo "  1) Merge PR #52 (Copilot's version)"
echo "  2) Merge PR #39 (@SICQR's version)"
echo "  3) Skip for now"
read -p "Choice [1-3]: " match_choice

case $match_choice in
    1) merge_pr 52 "Match probability scoring" "8-dimensional algorithm" ;;
    2) merge_pr 39 "Match probability system" "@SICQR's implementation" ;;
    *) echo "Skipped match probability" ;;
esac

merge_pr 30 "Production logger" "Structured logging + admin auth"

# Phase 4: UI/UX
echo ""
echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo -e "${BLUE}  PHASE 4: UI/UX ENHANCEMENTS${NC}"
echo -e "${BLUE}═══════════════════════════════════════════${NC}"

merge_pr 54 "Smart UI system" "Cursor-glow effects and smart UI (depends on #56)"
merge_pr 59 "Gamification animations" "Visual polish system (depends on #56)"
merge_pr 51 "i18n + offline sync" "Internationalization support"
merge_pr 31 "Product polish" "Polish and wow features"

# Phase 5: Retention
echo ""
echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo -e "${BLUE}  PHASE 5: RETENTION FEATURES${NC}"
echo -e "${BLUE}═══════════════════════════════════════════${NC}"

merge_pr 53 "Retention features" "Notifications, gamification, crons"
merge_pr 36 "Safe git push" "Developer tooling"
merge_pr 32 "Infrastructure gaps" "Infrastructure improvements"

# Phase 6: Large integration
echo ""
echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo -e "${BLUE}  PHASE 6: LARGE INTEGRATION${NC}"
echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo ""
echo -e "${RED}PR #23: Large feature branch (546 files, 90K+ lines)${NC}"
echo -e "${YELLOW}This PR requires manual rebase by @SICQR${NC}"
echo ""
echo "Recommended: Coordinate with @SICQR on timeline after other PRs merge"
echo ""
read -p "View PR #23 now? [y/N]: " view_23

if [ "$view_23" = "y" ] || [ "$view_23" = "Y" ]; then
    if [ "$USE_GH" = true ]; then
        gh pr view 23 --web
    else
        echo "Visit: https://github.com/SICQR/hotmess-globe/pull/23"
    fi
fi

# Summary
echo ""
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}  SCRIPT COMPLETE${NC}"
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo ""
echo "Next steps:"
echo "1. Review merged PRs in GitHub"
echo "2. Monitor CI/CD pipeline"
echo "3. Test deployed features"
echo "4. Coordinate on remaining PRs"
echo ""
echo "For detailed status, see: PR_STATUS_DASHBOARD.md"
echo ""
echo -e "${GREEN}✅ Resolution framework execution complete!${NC}"
