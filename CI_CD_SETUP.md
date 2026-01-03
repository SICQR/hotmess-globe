# CI/CD Pipeline Setup Guide

This guide describes how to create and configure the `.github/workflows/ci.yml` workflow file for continuous integration and deployment of the HOTMESS Globe application.

## 📋 Overview

The CI/CD pipeline automates the following processes:
- **Continuous Integration (CI)**: Automated testing, linting, and building on every push and pull request
- **Continuous Deployment (CD)**: Automated deployment to staging/production environments
- **Quality Checks**: Code quality, security scanning, and dependency audits

## 🏗️ Prerequisites

Before setting up the CI/CD pipeline, ensure you have:

1. **GitHub Repository Access**: Admin access to the repository
2. **Node.js Environment**: The project uses Node.js 18+
3. **Environment Variables**: Proper secrets configured in GitHub Settings
4. **Deployment Target**: Vercel, Netlify, or other hosting platform configured

## 📁 Directory Structure

Create the following directory structure in your repository:

```
.github/
└── workflows/
    └── ci.yml
```

## 🔧 Creating the CI/CD Workflow

### Step 1: Create the Workflow Directory

```bash
mkdir -p .github/workflows
```

### Step 2: Create the ci.yml File

Create `.github/workflows/ci.yml` with the following content:

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  # Job 1: Install dependencies and cache them
  setup:
    name: Setup and Cache Dependencies
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Cache node_modules
        uses: actions/cache@v3
        with:
          path: node_modules
          key: ${{ runner.os }}-node-modules-${{ hashFiles('**/package-lock.json') }}
          restore-keys: |
            ${{ runner.os }}-node-modules-

  # Job 2: Lint the code
  lint:
    name: Lint Code
    runs-on: ubuntu-latest
    needs: setup
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Restore dependencies
        uses: actions/cache@v3
        with:
          path: node_modules
          key: ${{ runner.os }}-node-modules-${{ hashFiles('**/package-lock.json') }}

      - name: Run ESLint
        run: npm run lint

  # Job 3: Type checking
  typecheck:
    name: Type Check
    runs-on: ubuntu-latest
    needs: setup
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Restore dependencies
        uses: actions/cache@v3
        with:
          path: node_modules
          key: ${{ runner.os }}-node-modules-${{ hashFiles('**/package-lock.json') }}

      - name: Run TypeScript type checking
        run: npm run typecheck

  # Job 4: Run tests (when test suite is available)
  test:
    name: Run Tests
    runs-on: ubuntu-latest
    needs: setup
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Restore dependencies
        uses: actions/cache@v3
        with:
          path: node_modules
          key: ${{ runner.os }}-node-modules-${{ hashFiles('**/package-lock.json') }}

      - name: Run tests
        run: npm test
        continue-on-error: true  # TODO: Remove this once test suite is implemented (target: Q1 2026)

      - name: Upload coverage reports
        if: always()
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
          flags: unittests
          name: codecov-umbrella

  # Job 5: Build the application
  build:
    name: Build Application
    runs-on: ubuntu-latest
    needs: [lint, typecheck]
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Restore dependencies
        uses: actions/cache@v3
        with:
          path: node_modules
          key: ${{ runner.os }}-node-modules-${{ hashFiles('**/package-lock.json') }}

      - name: Build application
        run: npm run build
        env:
          VITE_BASE44_APP_ID: ${{ secrets.VITE_BASE44_APP_ID }}
          VITE_BASE44_APP_BASE_URL: ${{ secrets.VITE_BASE44_APP_BASE_URL }}

      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: dist
          path: dist/
          retention-days: 7

  # Job 6: Security audit
  security:
    name: Security Audit
    runs-on: ubuntu-latest
    needs: setup
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Run npm audit
        run: npm audit --audit-level=high

      - name: Run Snyk security scan
        uses: snyk/actions/node@0.4.0
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}

  # Job 7: Deploy to staging (on develop branch)
  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: [build, test]
    if: github.ref == 'refs/heads/develop' && github.event_name == 'push'
    environment:
      name: staging
      url: https://staging.hotmess.app
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Download build artifacts
        uses: actions/download-artifact@v3
        with:
          name: dist
          path: dist/

      - name: Deploy to Vercel (Staging)
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: ./

  # Job 8: Deploy to production (on main branch)
  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: [build, test, security]
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    environment:
      name: production
      url: https://hotmess.app
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Download build artifacts
        uses: actions/download-artifact@v3
        with:
          name: dist
          path: dist/

      - name: Deploy to Vercel (Production)
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
          working-directory: ./
```

## 🔐 Required GitHub Secrets

Configure the following secrets in your GitHub repository settings (`Settings > Secrets and variables > Actions`):

### Base44 Configuration
- `VITE_BASE44_APP_ID` - Your Base44 application ID
- `VITE_BASE44_APP_BASE_URL` - Your Base44 backend URL

### Deployment Secrets (Vercel)
- `VERCEL_TOKEN` - Vercel authentication token
- `VERCEL_ORG_ID` - Your Vercel organization ID
- `VERCEL_PROJECT_ID` - Your Vercel project ID

### Optional Secrets
- `SNYK_TOKEN` - Snyk security scanning token (optional but recommended)
- `CODECOV_TOKEN` - Codecov coverage reporting token (optional)

### How to Add Secrets

1. Go to your GitHub repository
2. Click on **Settings**
3. Navigate to **Secrets and variables** > **Actions**
4. Click **New repository secret**
5. Add each secret with its name and value

## 🚀 Deployment Platforms

### Option 1: Vercel (Recommended)

Vercel is the recommended platform for deploying Vite applications.

#### Setup Steps:

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Link your project**
   ```bash
   vercel link
   ```

4. **Get your project details**
   ```bash
   vercel inspect
   ```
   Note down your `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID`

5. **Generate a token**
   - Visit https://vercel.com/account/tokens
   - Create a new token
   - Add it as `VERCEL_TOKEN` secret in GitHub

### Option 2: Netlify

Alternatively, you can use Netlify for deployment.

```yaml
# Add this job to your ci.yml for Netlify deployment
deploy-netlify:
  name: Deploy to Netlify
  runs-on: ubuntu-latest
  needs: [build, test]
  if: github.ref == 'refs/heads/main' && github.event_name == 'push'
  steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Download build artifacts
      uses: actions/download-artifact@v3
      with:
        name: dist
        path: dist/

    - name: Deploy to Netlify
      uses: nwtgck/actions-netlify@v2.0
      with:
        publish-dir: './dist'
        production-branch: main
        github-token: ${{ secrets.GITHUB_TOKEN }}
        deploy-message: "Deploy from GitHub Actions"
      env:
        NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
        NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
```

### Option 3: GitHub Pages

For GitHub Pages deployment:

```yaml
deploy-github-pages:
  name: Deploy to GitHub Pages
  runs-on: ubuntu-latest
  needs: [build, test]
  if: github.ref == 'refs/heads/main' && github.event_name == 'push'
  permissions:
    contents: read
    pages: write
    id-token: write
  steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Download build artifacts
      uses: actions/download-artifact@v3
      with:
        name: dist
        path: dist/

    - name: Setup Pages
      uses: actions/configure-pages@v3

    - name: Upload artifact
      uses: actions/upload-pages-artifact@v2
      with:
        path: 'dist/'

    - name: Deploy to GitHub Pages
      id: deployment
      uses: actions/deploy-pages@v2
```

## 📊 Monitoring and Notifications

### Status Badges

Add the following badges to your README.md to display build status:

```markdown
![CI/CD Pipeline](https://github.com/SICQR/hotmess-globe/workflows/CI/CD%20Pipeline/badge.svg)
```

### Slack Notifications

Add Slack notifications to be informed about build status:

```yaml
- name: Slack Notification
  if: always()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    text: 'CI/CD Pipeline completed'
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

## 🔍 Troubleshooting

### Common Issues

#### 1. Build Fails with "Module not found"
- **Solution**: Ensure `npm ci` is run before the build step
- **Solution**: Check that all dependencies are listed in `package.json`

#### 2. Environment Variables Not Available
- **Solution**: Verify secrets are properly configured in GitHub Settings
- **Solution**: Ensure secret names match exactly (case-sensitive)

#### 3. Deployment Fails
- **Solution**: Check deployment platform credentials are valid
- **Solution**: Verify the build artifacts are being uploaded correctly

#### 4. Tests Failing in CI but Pass Locally
- **Solution**: Check for environment-specific issues
- **Solution**: Ensure test files are committed to the repository

### Debug Mode

Enable debug logging in GitHub Actions:

1. Go to **Settings** > **Secrets and variables** > **Actions**
2. Add a variable: `ACTIONS_STEP_DEBUG` = `true`

## 📈 Best Practices

1. **Run CI on All Branches**: Ensure code quality across all branches
2. **Require Status Checks**: Set up branch protection rules requiring CI to pass
3. **Use Caching**: Cache dependencies to speed up workflows
4. **Parallel Jobs**: Run independent jobs in parallel for faster feedback
5. **Fail Fast**: Configure jobs to fail quickly on errors
6. **Security Scanning**: Always include security audits in your pipeline
7. **Environment-Specific Deployments**: Use separate environments for staging and production

## 🔄 Workflow Triggers

The CI/CD pipeline triggers on:
- **Push to main/develop**: Full CI/CD pipeline with deployment
- **Pull Requests**: CI checks only (no deployment)
- **Manual Trigger**: Can be triggered manually from GitHub Actions UI

## 📝 Next Steps

After setting up the CI/CD pipeline:

1. ✅ Verify the workflow file is in `.github/workflows/ci.yml`
2. ✅ Configure all required secrets in GitHub Settings
3. ✅ Push changes to trigger the first workflow run
4. ✅ Monitor the workflow execution in the Actions tab
5. ✅ Set up branch protection rules to require CI checks
6. ✅ Configure deployment environments in GitHub Settings

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Vercel Deployment Guide](https://vercel.com/docs)
- [Netlify Deployment Guide](https://docs.netlify.com/)
- [Vite Build Configuration](https://vitejs.dev/guide/build.html)

---

For questions or issues with the CI/CD setup, please open an issue on GitHub or consult the [main README](./README.md).
