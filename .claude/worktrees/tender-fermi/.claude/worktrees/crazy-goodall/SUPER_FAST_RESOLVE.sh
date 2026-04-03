#!/bin/bash
# SUPER_FAST_RESOLVE.sh
# Optimized for users with GitHub CLI (gh) installed
# Resolves all 23 PRs in 30-60 minutes

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${MAGENTA}"
cat << "EOF"
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   ⚡ SUPER FAST PR RESOLUTION ⚡                          ║
║   Optimized for GitHub CLI + Copilot                      ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}✗ GitHub CLI (gh) not found!${NC}"
    echo "Install from: https://cli.github.com/"
    echo "Then run this script again."
    exit 1
fi

echo -e "${GREEN}✓ GitHub CLI detected${NC}"

# Check if authenticated
if ! gh auth status &> /dev/null 2>&1; then
    echo -e "${YELLOW}⚠ Not authenticated with GitHub CLI${NC}"
    echo "Run: gh auth login"
    read -p "Press Enter after authenticating..."
fi

echo -e "${GREEN}✓ GitHub CLI authenticated${NC}"
echo ""

# Function to merge a PR quickly
merge_pr_fast() {
    local pr_number=$1
    local pr_title=$2
    local reason=$3
    
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}PR #${pr_number}: ${pr_title}${NC}"
    echo -e "${GREEN}${reason}${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    # Show options
    echo "Quick actions:"
    echo "  ${GREEN}m${NC} = Merge now (squash + delete branch)"
    echo "  ${BLUE}v${NC} = View PR in terminal"
    echo "  ${BLUE}w${NC} = View PR in browser"
    echo "  ${BLUE}c${NC} = Check PR status"
    echo "  ${YELLOW}s${NC} = Skip this PR"
    echo "  ${RED}q${NC} = Quit"
    echo ""
    
    read -p "Action [m/v/w/c/s/q]: " action
    
    case $action in
        m|M)
            echo -e "${YELLOW}Merging PR #${pr_number}...${NC}"
            if gh pr merge $pr_number --squash --delete-branch 2>&1 | tee /tmp/gh-merge.log; then
                echo -e "${GREEN}✓ Successfully merged PR #${pr_number}${NC}"
                echo ""
                read -p "Press Enter to continue..."
                return 0
            else
                echo -e "${RED}✗ Failed to merge PR #${pr_number}${NC}"
                echo ""
                echo "Common issues:"
                echo "  • PR is in draft status (remove draft first)"
                echo "  • PR needs approval"
                echo "  • PR has conflicts"
                echo "  • CI checks haven't passed"
                echo ""
                
                # Show the actual error
                cat /tmp/gh-merge.log
                echo ""
                
                echo "What would you like to do?"
                echo "  1) Try to approve and merge"
                echo "  2) Remove draft status and retry"
                echo "  3) Open in browser to fix"
                echo "  4) Skip for now"
                read -p "Choice [1-4]: " fix_choice
                
                case $fix_choice in
                    1)
                        gh pr review $pr_number --approve
                        gh pr merge $pr_number --squash --delete-branch
                        ;;
                    2)
                        gh pr ready $pr_number
                        gh pr merge $pr_number --squash --delete-branch
                        ;;
                    3)
                        gh pr view $pr_number --web
                        read -p "Press Enter after fixing..."
                        ;;
                    *)
                        echo -e "${YELLOW}Skipped PR #${pr_number}${NC}"
                        ;;
                esac
            fi
            ;;
        v|V)
            gh pr view $pr_number
            echo ""
            merge_pr_fast $pr_number "$pr_title" "$reason"
            ;;
        w|W)
            gh pr view $pr_number --web
            merge_pr_fast $pr_number "$pr_title" "$reason"
            ;;
        c|C)
            echo "PR Status:"
            gh pr view $pr_number --json state,isDraft,mergeable,statusCheckRollup
            echo ""
            echo "CI Checks:"
            gh pr checks $pr_number
            echo ""
            merge_pr_fast $pr_number "$pr_title" "$reason"
            ;;
        s|S)
            echo -e "${YELLOW}⊳ Skipped PR #${pr_number}${NC}"
            ;;
        q|Q)
            echo -e "${GREEN}Exiting. Run again to continue where you left off.${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}Invalid choice. Skipping.${NC}"
            ;;
    esac
    
    echo ""
}

# Welcome message
echo -e "${CYAN}This script will help you merge all 23 PRs quickly.${NC}"
echo -e "${CYAN}You have GitHub CLI, so merging is FAST! ⚡${NC}"
echo ""
echo "Benefits:"
echo "  • Merge PRs in seconds, not minutes"
echo "  • All operations from terminal"
echo "  • No need to switch to browser"
echo "  • Follow the optimal merge order"
echo ""

# Show current status
echo -e "${YELLOW}Current PR status:${NC}"
gh pr list --limit 30
echo ""

read -p "Ready to start? [y/N]: " start
if [[ ! "$start" =~ ^[Yy]$ ]]; then
    echo "Exiting. Run this script when ready."
    exit 0
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  PHASE 1: UNBLOCK CI/CD (Critical)${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo ""

merge_pr_fast 33 "Remove unused AlertCircle import" "🔴 P0: Unblocks linting for ALL PRs"
merge_pr_fast 41 "Fix: CI failures - Dependency graph" "🔴 P0: Fixes critical CI issues"
merge_pr_fast 42 "Fix PR merge issues" "🔴 P0: Resolves merge blockers"
merge_pr_fast 45 "Install dependencies" "🔴 P0: Fixes dependency issues"
merge_pr_fast 47 "Vercel conditional deployment" "🟠 P1: Deployment reliability"

echo ""
echo -e "${GREEN}✓ Phase 1 Complete!${NC}"
echo ""

# Offer to apply conflict resolutions
echo -e "${YELLOW}Apply conflict resolutions for PRs #30, #31, #32?${NC}"
echo "This will run: bash scripts/apply-pr-resolutions.sh"
read -p "Apply now? [y/N]: " apply_conflicts

if [[ "$apply_conflicts" =~ ^[Yy]$ ]]; then
    if [ -f "scripts/apply-pr-resolutions.sh" ]; then
        echo "Running conflict resolution script..."
        bash scripts/apply-pr-resolutions.sh || echo "Some conflicts may need manual resolution"
    else
        echo -e "${RED}Resolution script not found.${NC}"
    fi
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  PHASE 2: DOCUMENTATION${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo ""

merge_pr_fast 34 "Document PR status" "🟢 Low risk: Status documentation"
merge_pr_fast 55 "Premium features docs" "🟢 Low risk: Premium documentation"
merge_pr_fast 58 "Business readiness docs" "🟢 Low risk: Business docs"
merge_pr_fast 61 "Deployment blockers doc" "🟢 Low risk: Deployment docs"

echo ""
echo -e "${GREEN}✓ Phase 2 Complete!${NC}"
echo ""

# Coordination check
echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}  COORDINATION CHECKPOINT${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"
echo ""
echo "Some PRs need decisions before proceeding:"
echo ""
echo "1. PR #37: Revert PR - Should this be kept or closed?"
echo "2. PR #39 vs #52: Both implement match probability"
echo "   - PR #39: By @SICQR"
echo "   - PR #52: By Copilot"
echo "   Choose one to merge, close the other"
echo ""
read -p "Press Enter to continue to Phase 3..."

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  PHASE 3: FOUNDATION FEATURES${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo ""

merge_pr_fast 56 "Lux design system" "🟡 Medium: Foundation design system (21+ components)"

echo ""
echo "Match probability system - choose one:"
echo "  1) PR #52 (Copilot version)"
echo "  2) PR #39 (@SICQR version)"
echo "  3) Skip for now"
read -p "Choice [1-3]: " match_choice

case $match_choice in
    1)
        merge_pr_fast 52 "Match probability scoring" "🟡 Medium: 8-dimensional algorithm"
        echo "Closing PR #39 (duplicate)..."
        gh pr close 39 --comment "Closed in favor of PR #52"
        ;;
    2)
        merge_pr_fast 39 "Match probability system" "🟡 Medium: @SICQR's implementation"
        echo "Closing PR #52 (duplicate)..."
        gh pr close 52 --comment "Closed in favor of PR #39"
        ;;
    *)
        echo "Skipped match probability"
        ;;
esac

merge_pr_fast 30 "Production logger" "🟠 High: Structured logging + admin auth"

echo ""
echo -e "${GREEN}✓ Phase 3 Complete!${NC}"
echo ""

echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  PHASE 4: UI/UX ENHANCEMENTS${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo ""

merge_pr_fast 54 "Smart UI system" "🟠 High: Cursor-glow effects (depends on #56)"
merge_pr_fast 59 "Gamification animations" "🟡 Medium: Visual polish (depends on #56)"
merge_pr_fast 51 "i18n + offline sync" "🟡 Medium: Internationalization"
merge_pr_fast 31 "Product polish" "🟠 High: Polish and wow features"

echo ""
echo -e "${GREEN}✓ Phase 4 Complete!${NC}"
echo ""

echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  PHASE 5: RETENTION FEATURES${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo ""

merge_pr_fast 53 "Retention features" "🟠 High: Notifications, gamification, crons"
merge_pr_fast 36 "Safe git push" "🟢 Low: Developer tooling"
merge_pr_fast 32 "Infrastructure gaps" "🟠 High: Infrastructure improvements"

echo ""
echo -e "${GREEN}✓ Phase 5 Complete!${NC}"
echo ""

# Final PR
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  PHASE 6: LARGE INTEGRATION${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo ""
echo -e "${RED}PR #23: Large feature branch (546 files, 90K+ lines)${NC}"
echo -e "${YELLOW}This PR requires manual rebase by @SICQR${NC}"
echo ""
echo "Recommended: Wait until other PRs are merged, then coordinate with @SICQR"
echo ""
read -p "View PR #23 now? [y/N]: " view_23

if [[ "$view_23" =~ ^[Yy]$ ]]; then
    gh pr view 23 --web
fi

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✓ RESOLUTION COMPLETE!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
echo ""

# Final status
echo "Final PR status:"
gh pr list
echo ""

echo -e "${CYAN}Next steps:${NC}"
echo "  1. Review merged PRs on GitHub"
echo "  2. Monitor CI/CD pipeline"
echo "  3. Test deployed features"
echo "  4. Coordinate on remaining PRs (if any)"
echo ""

echo -e "${MAGENTA}🎉 Congratulations! You've resolved the PRs!${NC}"
echo ""
echo -e "${CYAN}Pro tip: Run 'gh pr list' anytime to check status${NC}"
echo -e "${CYAN}Pro tip: Use 'gh copilot suggest' for any questions${NC}"
echo ""
