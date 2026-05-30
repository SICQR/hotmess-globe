# CI/CD Pipeline Setup Guide

This guide describes the CI/CD pipeline configuration for the HOTMESS Globe application.

## 📋 Overview

The CI/CD pipeline automates the following processes:
- **Continuous Integration (CI)**: Automated testing, linting, type-checking, and building on every push and pull request
- **Continuous Deployment (CD)**: Automated deployment to Vercel production on push to `main` branch
- **Quality Checks**: Code quality, security scanning, and dependency audits

## 🔄 Current Workflow Configuration

The project uses `.github/workflows/ci.yml` which includes:

### CI Jobs (Run on all pushes and PRs to `main` and `develop`):
1. **lint** - ESLint code quality checks
2. **typecheck** - TypeScript type checking
3. **build** - Build application and upload artifacts
4. **security** - npm audit and TruffleHog secret scanning
5. **test** - Run test suite (currently non-blocking)
6. **all-checks-complete** - Summary job confirming all checks passed

### CD Job (Run only on push to `main`):
7. **deploy-production** - Deploy to Vercel production after all CI checks pass

## 🚀 Deployment Behavior

### When Deployment Happens:
- **Production deployment**: Automatically triggered on **push to `main` branch only**
- **No deployment**: On pull requests or pushes to other branches
- **Prerequisites**: All CI checks (lint, typecheck, build, security) must pass before deployment

### Deployment Platform:
- **Vercel** using Vercel CLI for production deployments
- Deployment uses the official Vercel CLI commands with prebuilt artifacts

## 🔐 Required GitHub Secrets

Configure the following secrets in your GitHub repository settings (`Settings > Secrets and variables > Actions`):

### Vercel Deployment (Required)
- **`VERCEL_TOKEN`** - Vercel authentication token (get from https://vercel.com/account/tokens)
- **`VERCEL_ORG_ID`** - Your Vercel organization ID (found in project settings)
- **`VERCEL_PROJECT_ID`** - Your Vercel project ID (found in project settings)

### Build Configuration (Required)
- **`VITE_BASE44_APP_ID`** - Your Base44 application ID
- **`VITE_BASE44_APP_BASE_URL`** - Your Base44 backend URL

### Optional Secrets
- `SNYK_TOKEN` - Snyk security scanning token (for enhanced security checks)
- `CODECOV_TOKEN` - Codecov coverage reporting token (for test coverage)

### How to Add Secrets

1. Go to your GitHub repository
2. Click on **Settings**
3. Navigate to **Secrets and variables** > **Actions**
4. Click **New repository secret**
5. Add each secret with its name and value

## 🚀 Vercel Deployment Setup

### Initial Vercel Project Setup

Before the automated deployment can work, you need to set up your Vercel project:

1. **Install Vercel CLI** (optional, for local setup):
   ```bash
   npm install -g vercel@latest
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Link your project** (from project root):
   ```bash
   vercel link
   ```
   
   This will prompt you to:
   - Select your Vercel scope (personal or team)
   - Link to an existing project or create a new one
   - Confirm the project settings

4. **Get your project details**:
   
   After linking, you can find your project IDs in `.vercel/project.json`:
   ```bash
   cat .vercel/project.json
   ```
   
   Or retrieve them from the Vercel dashboard:
   - Go to your project settings on https://vercel.com
   - Find `VERCEL_PROJECT_ID` in Project Settings > General
   - Find `VERCEL_ORG_ID` in your account/team settings

5. **Generate a deployment token**:
   - Visit https://vercel.com/account/tokens
   - Create a new token with a descriptive name (e.g., "GitHub Actions - HOTMESS")
   - Copy the token immediately (you won't be able to see it again)
   - Add it as `VERCEL_TOKEN` secret in GitHub

6. **Configure environment variables in Vercel**:
   - Go to Project Settings > Environment Variables in Vercel dashboard
   - Add all required `VITE_*` environment variables for production
   - These will be pulled automatically during deployment

### How Automated Deployment Works

When you push to the `main` branch:

1. **CI checks run first**: lint, typecheck, build, security
2. **If all checks pass**: The `deploy-production` job starts
3. **Deployment steps**:
   - Installs Vercel CLI
   - Pulls Vercel environment configuration
   - Builds the project using Vercel's build system
   - Deploys the prebuilt artifacts to production

The deployment uses `vercel deploy --prebuilt --prod` which ensures:
- Fast deployments using prebuilt artifacts
- Production environment is used
- Environment variables from Vercel are applied

## 📊 Monitoring and Notifications

### Workflow Status

You can monitor the deployment status in several ways:

1. **GitHub Actions Tab**: View workflow runs at `https://github.com/SICQR/hotmess-globe/actions`
2. **Commit Status**: Check marks on commits indicate workflow status
3. **Pull Request Checks**: CI checks appear on PRs (deployment does not run on PRs)

### Status Badges

Add the following badge to your README.md to display build status:

```markdown
![CI Pipeline](https://github.com/SICQR/hotmess-globe/workflows/CI%20Pipeline/badge.svg)
```

### Vercel Deployment Status

- View deployments in the Vercel dashboard: https://vercel.com
- Each deployment gets a unique URL for preview
- Production deployments are automatically assigned to your production domain

## 🔍 Troubleshooting

### Common Issues

#### 1. Build Fails with "Module not found"
- **Solution**: Ensure all dependencies are in `package.json`
- **Solution**: Clear npm cache if needed: `npm cache clean --force`

#### 2. Environment Variables Not Available
- **Solution**: Verify secrets are configured in GitHub Settings > Secrets and variables > Actions
- **Solution**: Ensure secret names match exactly (case-sensitive)
- **Solution**: For Vercel, also set environment variables in Vercel dashboard

#### 3. Deployment Fails with Vercel Authentication Error
- **Solution**: Check that `VERCEL_TOKEN` is valid and not expired
- **Solution**: Verify `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` are correct
- **Solution**: Ensure the token has appropriate permissions

#### 4. Deployment Job Doesn't Run
- **Solution**: Verify you pushed to `main` branch (not a PR)
- **Solution**: Check that all CI jobs (lint, typecheck, build, security) passed
- **Solution**: Review the workflow conditions in the `if` statement

#### 5. Tests Failing in CI but Pass Locally
- **Solution**: Check for environment-specific issues
- **Solution**: Ensure test files are committed to the repository
- **Solution**: Currently tests are non-blocking (continue-on-error: true)

### Debug Mode

Enable debug logging in GitHub Actions:

1. Go to **Settings** > **Secrets and variables** > **Actions**
2. Add a variable: `ACTIONS_STEP_DEBUG` = `true`
3. Re-run the workflow to see detailed logs

## 📈 Best Practices

1. **Always Test in Development**: Test changes locally before pushing
2. **Use Pull Requests**: Create PRs to run CI checks before merging to `main`
3. **Monitor Deployments**: Watch the first few deployments closely
4. **Set Branch Protection**: Require CI checks to pass before merging
5. **Keep Secrets Secure**: Never commit secrets; use GitHub Secrets
6. **Review Security Alerts**: Address npm audit findings promptly
7. **Test After Deployment**: Verify the production site after each deployment

## 🔄 Workflow Triggers

The CI/CD pipeline triggers based on different events:

### CI Checks (All Branches):
- **Push to main or develop**: Runs lint, typecheck, build, security, test
- **Pull Request to main or develop**: Runs all CI checks but NO deployment

### Deployment:
- **Push to main only**: Runs CI checks + production deployment
- **Pull Requests**: Never trigger deployment (even to main)
- **Other branches**: No deployment

This ensures:
- All code is tested before merging
- Only tested, reviewed code is deployed to production
- PRs are safe to create without affecting production

## 📝 Next Steps

After setting up the CI/CD pipeline:

1. ✅ Verify workflow file exists at `.github/workflows/ci.yml`
2. ✅ Configure required secrets in GitHub Settings:
   - `VERCEL_TOKEN`
   - `VERCEL_ORG_ID`
   - `VERCEL_PROJECT_ID`
   - `VITE_BASE44_APP_ID`
   - `VITE_BASE44_APP_BASE_URL`
3. ✅ Set up Vercel project and link it (see Vercel setup section above)
4. ✅ Configure environment variables in Vercel dashboard
5. ✅ Create a test PR to verify CI checks work
6. ✅ Merge to `main` to trigger first production deployment
7. ✅ Monitor the deployment in GitHub Actions and Vercel dashboard
8. ✅ Set up branch protection rules requiring CI checks to pass
9. ✅ Verify the production deployment is successful

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Vercel CLI Documentation](https://vercel.com/docs/cli)
- [Vercel GitHub Integration](https://vercel.com/docs/deployments/git/vercel-for-github)
- [Vite Build Configuration](https://vitejs.dev/guide/build.html)
- [GitHub Actions Security Best Practices](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)

---

For questions or issues with the CI/CD setup, please open an issue on GitHub or consult the [main README](./README.md).
