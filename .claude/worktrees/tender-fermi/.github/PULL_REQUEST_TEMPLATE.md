## Description
<!-- Provide a clear and concise description of the changes -->

## Type of Change
<!-- Check all that apply -->
- [ ] 🐛 Bug fix (non-breaking change fixing an issue)
- [ ] ✨ New feature (non-breaking change adding functionality)
- [ ] 💥 Breaking change (fix or feature causing existing functionality to break)
- [ ] 📝 Documentation update
- [ ] 🎨 Style/UI update (no functional changes)
- [ ] ♻️ Code refactor (no functional changes)
- [ ] ⚡ Performance improvement
- [ ] 🔒 Security fix
- [ ] 🧪 Test addition/update
- [ ] 🔧 Configuration change

## Related Issues
<!-- Link related issues: Fixes #123, Resolves #456 -->

## Changes Made
<!-- List the specific changes made -->
- 
- 
- 

## Screenshots (if applicable)
<!-- Add screenshots for UI changes -->

## Testing Performed
<!-- Describe the testing you did -->
- [ ] Tested locally
- [ ] Tested in development environment
- [ ] Tested in staging environment
- [ ] Verified all acceptance criteria

## 🔒 Security Checklist
<!-- All items must be checked before merging -->

### Code Security
- [ ] No secrets, API keys, or credentials committed
- [ ] All user inputs are validated and sanitized
- [ ] No SQL injection vulnerabilities introduced
- [ ] No XSS vulnerabilities introduced
- [ ] Authentication/authorization checks are in place
- [ ] Error messages don't expose sensitive information
- [ ] Used structured logger instead of console.log
- [ ] No sensitive data logged (passwords, tokens, PII)

### Dependencies
- [ ] `npm audit` passes (0 vulnerabilities)
- [ ] No new dependencies with known security issues
- [ ] New dependencies justified and documented
- [ ] Updated `.env.example` if new env vars added

### Environment & Configuration
- [ ] Environment variables properly prefixed (`VITE_` for client, none for server)
- [ ] No hardcoded URLs or configuration values
- [ ] CORS configured correctly (if applicable)
- [ ] Rate limiting considered (if applicable)

### Data Handling
- [ ] File uploads validated (type, size, content)
- [ ] Data sanitized before database storage
- [ ] PII handled according to privacy policy
- [ ] No data exposed in URLs or logs

## 📋 Code Quality Checklist

### Code Standards
- [ ] Code follows project style guidelines
- [ ] ESLint passes (`npm run lint`)
- [ ] TypeScript/JSDoc types added for new functions
- [ ] No unused imports or variables
- [ ] Magic numbers replaced with named constants
- [ ] Complex logic documented with comments

### Testing
- [ ] Unit tests added/updated (when test infrastructure exists)
- [ ] Integration tests added/updated (when applicable)
- [ ] All tests pass
- [ ] Edge cases considered and tested

### Performance
- [ ] No unnecessary re-renders introduced
- [ ] Large dependencies lazy-loaded
- [ ] Images optimized
- [ ] Database queries optimized
- [ ] Bundle size impact considered

### Documentation
- [ ] README updated (if needed)
- [ ] API documentation updated (if needed)
- [ ] Code comments added for complex logic
- [ ] Migration guide provided (for breaking changes)

## 🚀 Deployment Considerations

- [ ] Backward compatible (or migration plan provided)
- [ ] Database migrations included (if needed)
- [ ] Environment variables documented
- [ ] Rollback plan considered
- [ ] Monitoring/alerting updated (if needed)

## ♿ Accessibility (if UI changes)

- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Sufficient color contrast
- [ ] ARIA labels added where needed
- [ ] Focus indicators visible

## 📱 Browser/Device Testing (if UI changes)

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

## Additional Notes
<!-- Any additional information reviewers should know -->

## Reviewer Checklist
<!-- For reviewers to complete -->
- [ ] Code review completed
- [ ] Security implications considered
- [ ] Performance implications considered
- [ ] Breaking changes identified and documented
- [ ] Tests are adequate
- [ ] Documentation is complete

---

**By submitting this PR, I confirm that:**
- I have read and followed the [SECURITY.md](../SECURITY.md) guidelines
- I have tested my changes thoroughly
- I have not introduced any known security vulnerabilities
- I am ready to address any review feedback
