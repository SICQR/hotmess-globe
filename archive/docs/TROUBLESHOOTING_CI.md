# CI/CD Troubleshooting Guide

## Common Issues and Solutions

### Issue 1: Dependency Review Action Failing

**Symptoms:**
- Security workflow fails with error: "Dependency review is not supported on this repository"
- Error message suggests checking `https://github.com/SICQR/hotmess-globe/settings/security_analysis`

**Root Cause:**
The Dependency graph feature is not enabled in the repository settings.

**Solution:**
1. Go to repository Settings → Security → Code security and analysis
2. Enable "Dependency graph"
3. After enabling, the dependency-review action will work properly

**Temporary Fix:**
The workflow has been updated to make dependency-review non-blocking (`continue-on-error: true`), so PRs won't be blocked even if this feature is not enabled.

---

### Issue 2: Workflows Showing "action_required" Status

**Symptoms:**
- Workflow runs complete immediately with "action_required" conclusion
- No jobs are executed
- Affects automated bot PRs (e.g., copilot-swe-agent, cursor)

**Root Cause:**
GitHub requires manual approval for workflows triggered by certain automated actors. This is a security feature to prevent unauthorized code execution.

**Solution:**
Repository administrators need to configure workflow approval settings:

1. Go to repository Settings → Actions → General
2. Under "Fork pull request workflows from outside collaborators":
   - Choose "Require approval for first-time contributors" or
   - Choose "Require approval for all outside collaborators"
3. Consider adding trusted bots to the allow list

**Workaround:**
A repository administrator can manually approve each workflow run from the Actions tab.

---

### Issue 3: TruffleHog Secret Scanning

**Status:** Working correctly

The TruffleHog action scans for secrets in the codebase. It's configured to:
- In CI Pipeline (`ci.yml`): Scan with default settings
- In Security Checks (`security.yml`): Scan with `--only-verified` flag

If this fails, it likely means secrets have been detected in the code and should be removed immediately.

---

## How to Test Workflow Changes

1. Make changes to workflow files in `.github/workflows/`
2. Commit and push to a branch
3. Create a pull request to `main` (or `develop` for CI pipeline)
4. Check the Actions tab to see if workflows trigger
5. If "action_required" appears, a maintainer needs to approve the run

---

## Workflow Triggers

### CI Pipeline (`ci.yml`)
- Triggers on: Push to `main` or `develop`, PRs to `main` or `develop`
- Jobs: lint, typecheck, build, security audit, test

### Security Checks (`security.yml`)
- Triggers on: Push to `main`, PRs to `main`, daily cron, manual dispatch
- Jobs: dependency-scan, secret-scan, dependency-review, codeql-analysis, license-check

---

## Required Secrets

Workflows require these secrets to be configured in repository settings:

- `VITE_BASE44_APP_ID` - For build process
- `VITE_BASE44_APP_BASE_URL` - For build process
- `VERCEL_ORG_ID` - For Vercel deployment
- `VERCEL_PROJECT_ID` - For Vercel deployment
- `VERCEL_TOKEN` - For Vercel deployment

---

## Getting Help

If workflows continue to fail after following this guide:
1. Check the Actions tab for detailed error logs
2. Review recent changes to workflow files
3. Verify all required secrets are configured
4. Check repository security settings
5. Contact repository administrators for approval settings
