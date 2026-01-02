# Security Policy

## Reporting Security Vulnerabilities

If you discover a security vulnerability, please report it by emailing the maintainers directly. Do not create a public GitHub issue for security vulnerabilities.

## Security Updates

This project is actively maintained and regularly updated to address security vulnerabilities.

### Latest Security Review: 2026-01-02

- ✅ All npm package vulnerabilities resolved
- ✅ Automated security audits enabled in CI/CD
- ✅ Dependencies updated to secure versions

## Security Best Practices

### Environment Variables

1. **Never commit secrets**: All sensitive configuration must be stored in environment variables
2. **Client-side exposure**: Variables prefixed with `VITE_` are exposed to the browser - do not store sensitive secrets in these
3. **Use .env.local**: Store local development credentials in `.env.local` (gitignored)
4. **Production secrets**: Store production secrets in your deployment platform's secure environment variable storage

### API Keys and Tokens

1. **Mapbox**: Configure domain restrictions in your Mapbox account
2. **Supabase**: Implement Row Level Security (RLS) policies for all tables
3. **Stripe**: Use publishable keys only on the client; keep secret keys on the server
4. **Base44**: Implement proper authentication and authorization in your Base44 backend

### Dependency Management

1. **Regular updates**: Dependencies are regularly updated to patch security vulnerabilities
2. **Audit checks**: Run `npm audit` before deploying to production
3. **CI/CD integration**: Automated security checks run on every push and pull request

### Code Security

1. **Input validation**: All user inputs are validated and sanitized
2. **XSS prevention**: Using DOMPurify >= 3.2.4 for HTML sanitization
3. **Authentication**: Implement proper authentication checks for protected routes
4. **CORS**: Configure CORS policies appropriately for your backend

## Vulnerability History

### 2026-01-02: Comprehensive Security Update

**Fixed Vulnerabilities:**
- `glob` (HIGH): Command injection vulnerability - updated to 10.5.0+
- `dompurify` (MODERATE): XSS vulnerability - forced update to 3.2.4 via npm overrides
- `quill` (MODERATE): XSS in editor - forced update to 2.0.3 via npm overrides
- `jspdf` (HIGH): DoS and ReDoS vulnerabilities - updated to 3.0.4
- `js-yaml` (MODERATE): Prototype pollution - auto-fixed via npm audit
- `mdast-util-to-hast` (MODERATE): Unsanitized attributes - auto-fixed via npm audit
- `vite` (MODERATE): Path traversal on Windows - auto-fixed via npm audit

**Actions Taken:**
1. Updated `jspdf` to version 3.0.4
2. Added npm overrides to force `quill` to version 2.0.3
3. Ran `npm audit fix` to auto-fix remaining vulnerabilities
4. Verified all 8 CVEs resolved with `npm audit`

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| main    | :white_check_mark: |

## Contact

For security concerns, please contact the repository maintainers.
