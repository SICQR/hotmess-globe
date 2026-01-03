# Security Policy

## 🔒 Overview

This document outlines security best practices, policies, and procedures for the HOTMESS platform. Security is a top priority, and all contributors must follow these guidelines.

## 🚨 Reporting Security Vulnerabilities

**DO NOT** create public GitHub issues for security vulnerabilities.

Instead, please report security issues by emailing security@sicqr.com (or appropriate contact) with:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We will respond within 48 hours and work with you to address the issue promptly.

## ✅ Security Best Practices

### 1. Environment Variables & Secrets

**NEVER commit sensitive credentials to the repository.**

#### Required Practices:
- ✅ Use `.env.local` or `.env` for sensitive values (both are gitignored)
- ✅ Store secrets in environment variables prefixed with `VITE_` only if they MUST be exposed client-side
- ✅ Keep API keys, database credentials, and auth tokens out of client-side code when possible
- ✅ Use `.env.example` to document required variables WITHOUT actual values
- ✅ Rotate any credentials that were accidentally committed
- ❌ NEVER commit `.env`, `.env.local`, or files containing secrets
- ❌ NEVER hardcode API keys, passwords, or tokens in source code
- ❌ NEVER log sensitive data (passwords, tokens, API keys, PII)

#### Example `.env.local`:
```env
# Backend Configuration
VITE_BASE44_APP_ID=your_app_id_here
VITE_BASE44_APP_BASE_URL=https://your-app.base44.app

# Third-party Services (Client-side - use with caution)
VITE_MAPBOX_ACCESS_TOKEN=your_mapbox_token
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_key

# Sensitive Operations (Server-side only)
SUPABASE_SERVICE_KEY=your_service_key  # NEVER prefix with VITE_
STRIPE_SECRET_KEY=sk_test_your_key     # NEVER prefix with VITE_
```

### 2. Dependency Management

#### Keep Dependencies Updated:
- Run `npm audit` regularly to check for vulnerabilities
- Apply security patches promptly with `npm audit fix`
- Review breaking changes before applying `npm audit fix --force`
- Use `npm overrides` to force secure dependency versions when needed
- Subscribe to security advisories for critical packages

#### Current Status:
- ✅ All npm vulnerabilities resolved (0 vulnerabilities as of last audit)
- ✅ `npm overrides` configured for quill@^2.0.3 to ensure XSS protection

### 3. Authentication & Authorization

#### Best Practices:
- ✅ Use Base44 SDK for authentication flows
- ✅ Check `base44.auth.isAuthenticated()` before accessing protected resources
- ✅ Validate user permissions on both client and server
- ✅ Implement proper session management
- ❌ NEVER trust client-side authorization checks alone
- ❌ NEVER expose admin functionality without server-side validation

#### Code Example:
```javascript
// Good: Check auth before sensitive operations
const isAuth = await base44.auth.isAuthenticated();
if (!isAuth) {
  return redirect('/login');
}
const user = await base44.auth.me();
```

### 4. Input Validation & Sanitization

#### Always Validate User Input:
- ✅ Validate and sanitize all user inputs
- ✅ Use Zod or similar for schema validation
- ✅ Escape HTML content when rendering user-generated content
- ✅ Validate file uploads (type, size, content)
- ✅ Use parameterized queries to prevent SQL injection
- ❌ NEVER trust user input
- ❌ NEVER use `dangerouslySetInnerHTML` without sanitization

#### Example:
```javascript
import { z } from 'zod';

const userSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/),
  age: z.number().min(18).max(120),
});

// Validate before processing
const validatedData = userSchema.parse(userInput);
```

### 5. Logging & Error Handling

#### Secure Logging Practices:
- ✅ Use the structured logger (`src/utils/logger.js`)
- ✅ Log errors for debugging and monitoring
- ✅ Redact sensitive information automatically (passwords, tokens, keys)
- ✅ Use environment-appropriate log levels (errors only in production)
- ❌ NEVER log passwords, tokens, API keys, or PII
- ❌ NEVER expose stack traces to end users in production

#### Example:
```javascript
import logger from '@/utils/logger';

// Good: Structured logging with automatic redaction
logger.error('Authentication failed', { 
  userId: user.id, 
  error: error.message,
  token: 'abc123'  // Will be automatically redacted
});

// Bad: Exposing sensitive data
console.log('User data:', user);  // Avoid console.log in production
```

### 6. Cross-Site Scripting (XSS) Prevention

#### Mitigation Strategies:
- ✅ React automatically escapes JSX content
- ✅ Use DOMPurify for HTML sanitization when needed
- ✅ Implement Content Security Policy (CSP) headers
- ✅ Validate and sanitize rich text editor content (Quill)
- ❌ NEVER use `dangerouslySetInnerHTML` with unsanitized content
- ❌ NEVER concatenate user input into HTML strings

### 7. Content Security Policy (CSP)

**Status**: ⚠️ TODO - Not yet implemented

Recommended CSP headers:
```
Content-Security-Policy: 
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  font-src 'self' data:;
  connect-src 'self' https://your-api.base44.app;
```

### 8. API Security

#### Backend Functions (Edge Functions):
- ✅ Validate authentication tokens server-side
- ✅ Implement rate limiting
- ✅ Use CORS appropriately
- ✅ Validate request payloads
- ✅ Return appropriate HTTP status codes
- ❌ NEVER expose internal errors to clients
- ❌ NEVER trust client-provided user IDs without verification

### 9. File Upload Security

#### Safe Upload Practices:
- ✅ Validate file types (mime type + extension)
- ✅ Limit file sizes
- ✅ Scan uploads for malware if possible
- ✅ Store uploads in a separate domain/CDN
- ✅ Generate random filenames
- ❌ NEVER execute uploaded files
- ❌ NEVER trust client-provided mime types alone

## 🔍 Security Checklist for Pull Requests

Before submitting a PR, ensure:

- [ ] No secrets or credentials committed
- [ ] All user inputs are validated
- [ ] Authentication checks are in place
- [ ] Error messages don't expose sensitive information
- [ ] Dependencies are up to date (`npm audit` passes)
- [ ] Code doesn't introduce XSS vulnerabilities
- [ ] Logging doesn't expose sensitive data
- [ ] New environment variables are documented in `.env.example`

## 🛡️ Known Security Considerations

### Current Implementation Status:

#### ✅ Completed:
1. All npm vulnerabilities fixed (0 remaining)
2. Structured logging with automatic sensitive data redaction
3. Environment variable management with `.env.example`

#### ⚠️ In Progress / Recommended:
1. **Content Security Policy**: Not yet implemented - should be added to Vite config
2. **Error Tracking**: Sentry integration partially commented out in ErrorBoundary
3. **Rate Limiting**: Not implemented on API endpoints
4. **Input Validation**: Inconsistent across the application
5. **Console Statements**: ~95 remaining console.log statements should be replaced with logger

#### 🔴 Known Issues:
1. **Client-Side API Keys**: Some API operations performed client-side (VITE_ env vars)
   - Mapbox, Supabase public keys are acceptable
   - Consider proxying sensitive operations through backend functions
2. **SoundCloud Integration**: Incomplete OAuth implementation (placeholder code)
3. **QR Scanner**: Ticket scanning not fully implemented

## 📚 Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Base44 SDK Security](https://docs.base44.app/security)
- [React Security Best Practices](https://react.dev/learn/security)
- [Vite Security](https://vitejs.dev/guide/env-and-mode.html)

## 📝 Security Audit History

| Date | Auditor | Findings | Status |
|------|---------|----------|--------|
| 2026-01-03 | GitHub Copilot | 8 npm vulnerabilities, console logging issues | Fixed |

## 🔄 Regular Security Tasks

### Weekly:
- Run `npm audit` and address findings
- Review access logs for suspicious activity

### Monthly:
- Update dependencies with `npm update`
- Review authentication and authorization logic
- Check for unused dependencies with `npx depcheck`

### Quarterly:
- Comprehensive security audit
- Penetration testing
- Review and rotate API keys

---

**Last Updated**: 2026-01-03
**Maintained By**: Development Team
**Contact**: security@sicqr.com (update with actual contact)
