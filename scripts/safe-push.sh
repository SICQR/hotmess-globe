#!/bin/bash

#######################################
# Safe Git Push Script
# A terminal prompt for safely pushing to GitHub
# with confirmation prompts and safety checks
#######################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Print colored message
print_color() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Print header
print_header() {
    echo ""
    print_color "$CYAN" "╔════════════════════════════════════════════════════╗"
    print_color "$CYAN" "║           🔒 SAFE GIT PUSH PROMPT 🔒               ║"
    print_color "$CYAN" "╚════════════════════════════════════════════════════╝"
    echo ""
}

# Check if we're in a git repository
check_git_repo() {
    if ! git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
        print_color "$RED" "❌ Error: Not inside a git repository!"
        exit 1
    fi
}

# Get current branch name
get_current_branch() {
    git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "HEAD"
}

# Check for uncommitted changes
check_uncommitted_changes() {
    if ! git diff-index --quiet HEAD -- 2>/dev/null; then
        return 1
    fi
    if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
        return 1
    fi
    return 0
}

# Get commits to be pushed
get_commits_to_push() {
    local branch=$1
    local remote=${2:-origin}
    
    # Check if remote branch exists
    if git rev-parse --verify "$remote/$branch" > /dev/null 2>&1; then
        git log "$remote/$branch..HEAD" --oneline 2>/dev/null
    else
        # New branch - show all commits from common ancestor with main/master
        local base_branch=""
        if git rev-parse --verify "$remote/main" > /dev/null 2>&1; then
            base_branch="$remote/main"
        elif git rev-parse --verify "$remote/master" > /dev/null 2>&1; then
            base_branch="$remote/master"
        fi
        
        if [ -n "$base_branch" ]; then
            echo "(New branch - commits since $base_branch)"
            git log "$base_branch..HEAD" --oneline 2>/dev/null | head -20
        else
            git log --oneline -10 2>/dev/null
        fi
    fi
}

# Count commits to push
count_commits_to_push() {
    local branch=$1
    local remote=${2:-origin}
    
    if git rev-parse --verify "$remote/$branch" > /dev/null 2>&1; then
        git rev-list --count "$remote/$branch..HEAD" 2>/dev/null || echo "0"
    else
        echo "new"
    fi
}

# Display repository status
display_status() {
    local branch=$1
    local remote=${2:-origin}
    
    print_color "$BOLD" "📊 Repository Status:"
    echo "────────────────────────────────────────────────────"
    
    # Current branch
    print_color "$GREEN" "   Branch:  $branch"
    
    # Remote
    local remote_url=$(git remote get-url "$remote" 2>/dev/null || echo "not set")
    print_color "$BLUE" "   Remote:  $remote ($remote_url)"
    
    # Check if remote branch exists
    if git rev-parse --verify "$remote/$branch" > /dev/null 2>&1; then
        print_color "$GREEN" "   Status:  Remote branch exists"
    else
        print_color "$YELLOW" "   Status:  ⚠️  New branch (will be created on remote)"
    fi
    
    echo ""
}

# Display commits to be pushed
display_commits() {
    local branch=$1
    local remote=${2:-origin}
    
    local commit_count=$(count_commits_to_push "$branch" "$remote")
    
    print_color "$BOLD" "📝 Commits to be pushed:"
    echo "────────────────────────────────────────────────────"
    
    local commits=$(get_commits_to_push "$branch" "$remote")
    
    if [ -z "$commits" ]; then
        print_color "$YELLOW" "   No new commits to push."
        return 1
    fi
    
    echo "$commits" | while read -r line; do
        echo "   $line"
    done
    
    echo ""
    if [ "$commit_count" != "new" ]; then
        print_color "$CYAN" "   Total: $commit_count commit(s)"
    fi
    echo ""
    return 0
}

# Warn about protected branches
check_protected_branches() {
    local branch=$1
    local protected_branches=("main" "master" "develop" "production" "staging" "release")
    
    for protected in "${protected_branches[@]}"; do
        if [ "$branch" = "$protected" ]; then
            echo ""
            print_color "$YELLOW" "⚠️  WARNING: You are pushing to '$branch' (protected branch)"
            print_color "$YELLOW" "   Make sure you have the necessary permissions."
            echo ""
            return 1
        fi
    done
    return 0
}

# Confirm action
confirm_action() {
    local message=$1
    local default=${2:-n}
    
    if [ "$default" = "y" ]; then
        local prompt="[Y/n]"
    else
        local prompt="[y/N]"
    fi
    
    echo -n -e "${BOLD}$message $prompt: ${NC}"
    read -r response
    
    if [ -z "$response" ]; then
        response=$default
    fi
    
    case "$response" in
        [yY][eE][sS]|[yY])
            return 0
            ;;
        *)
            return 1
            ;;
    esac
}

# Perform the push
do_push() {
    local branch=$1
    local remote=${2:-origin}
    local force=${3:-false}
    
    echo ""
    print_color "$CYAN" "🚀 Pushing to $remote/$branch..."
    echo ""
    
    local push_cmd="git push -u $remote $branch"
    if [ "$force" = "true" ]; then
        push_cmd="git push -u $remote $branch --force-with-lease"
    fi
    
    # Execute push with retry logic
    local max_retries=4
    local retry_count=0
    local wait_time=4
    
    while [ $retry_count -lt $max_retries ]; do
        if $push_cmd; then
            echo ""
            print_color "$GREEN" "✅ Successfully pushed to $remote/$branch"
            return 0
        else
            retry_count=$((retry_count + 1))
            if [ $retry_count -lt $max_retries ]; then
                print_color "$YELLOW" "⚠️  Push failed. Retrying in ${wait_time}s... (attempt $retry_count/$max_retries)"
                sleep $wait_time
                wait_time=$((wait_time * 2))
            fi
        fi
    done
    
    print_color "$RED" "❌ Push failed after $max_retries attempts"
    return 1
}

# Main function
main() {
    print_header
    check_git_repo
    
    local current_branch=$(get_current_branch)
    local remote="origin"
    local force_push=false
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -f|--force)
                force_push=true
                shift
                ;;
            -r|--remote)
                remote="$2"
                shift 2
                ;;
            -b|--branch)
                current_branch="$2"
                shift 2
                ;;
            -h|--help)
                echo "Usage: safe-push.sh [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  -f, --force      Use force-with-lease push"
                echo "  -r, --remote     Specify remote (default: origin)"
                echo "  -b, --branch     Specify branch (default: current branch)"
                echo "  -h, --help       Show this help message"
                echo ""
                exit 0
                ;;
            *)
                print_color "$RED" "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Display current status
    display_status "$current_branch" "$remote"
    
    # Check for uncommitted changes
    if ! check_uncommitted_changes; then
        print_color "$YELLOW" "⚠️  WARNING: You have uncommitted changes!"
        echo ""
        git status --short
        echo ""
        if ! confirm_action "Do you want to continue anyway?"; then
            print_color "$BLUE" "ℹ️  Commit your changes first with: git add . && git commit -m \"your message\""
            exit 0
        fi
        echo ""
    fi
    
    # Display commits to be pushed
    if ! display_commits "$current_branch" "$remote"; then
        if ! confirm_action "No new commits. Push anyway?"; then
            print_color "$BLUE" "ℹ️  Nothing to push. Exiting."
            exit 0
        fi
    fi
    
    # Check for protected branches
    local is_protected=false
    if ! check_protected_branches "$current_branch"; then
        is_protected=true
    fi
    
    # Force push warning
    if [ "$force_push" = "true" ]; then
        echo ""
        print_color "$RED" "🔴 FORCE PUSH REQUESTED!"
        print_color "$RED" "   This will overwrite remote history with --force-with-lease"
        print_color "$YELLOW" "   This can cause issues for collaborators!"
        echo ""
        if ! confirm_action "Are you ABSOLUTELY sure you want to force push?"; then
            print_color "$BLUE" "ℹ️  Force push cancelled."
            exit 0
        fi
    fi
    
    # Final confirmation
    echo "────────────────────────────────────────────────────"
    if [ "$is_protected" = "true" ]; then
        if ! confirm_action "⚠️  Push to PROTECTED branch '$current_branch'?"; then
            print_color "$BLUE" "ℹ️  Push cancelled."
            exit 0
        fi
    else
        if ! confirm_action "Ready to push to '$current_branch'?"; then
            print_color "$BLUE" "ℹ️  Push cancelled."
            exit 0
        fi
    fi
    
    # Perform the push
    do_push "$current_branch" "$remote" "$force_push"
}

# Run main function
main "$@"
