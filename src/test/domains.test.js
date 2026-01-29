import { describe, it, expect } from 'vitest';

// These validation functions are from api/domains/index.js
// Copied here for testing purposes
function validateDomain(domain) {
  const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i;
  return domainRegex.test(domain);
}

function validateBranchName(branch) {
  if (!branch || branch.length === 0 || branch.length > 255) {
    return false;
  }
  const invalidChars = /[\s~^:?*\[\]\\]/;
  return !invalidChars.test(branch);
}

describe('Domain Validation', () => {
  it('should accept valid domains', () => {
    expect(validateDomain('example.com')).toBe(true);
    expect(validateDomain('sub.example.com')).toBe(true);
    expect(validateDomain('test-123.example.co.uk')).toBe(true);
  });

  it('should reject invalid domains', () => {
    expect(validateDomain('localhost')).toBe(false);
    expect(validateDomain('example')).toBe(false);
    expect(validateDomain('example..com')).toBe(false);
    expect(validateDomain('example.com/')).toBe(false);
    expect(validateDomain('')).toBe(false);
  });
});

describe('Branch Name Validation', () => {
  it('should accept valid branch names', () => {
    expect(validateBranchName('main')).toBe(true);
    expect(validateBranchName('develop')).toBe(true);
    expect(validateBranchName('feature/new-ui')).toBe(true);
    expect(validateBranchName('bugfix/issue-123')).toBe(true);
    expect(validateBranchName('release/v1.0.0')).toBe(true);
  });

  it('should reject invalid branch names', () => {
    expect(validateBranchName('')).toBe(false);
    expect(validateBranchName('branch with spaces')).toBe(false);
    expect(validateBranchName('branch~test')).toBe(false);
    expect(validateBranchName('branch^test')).toBe(false);
    expect(validateBranchName('branch:test')).toBe(false);
    expect(validateBranchName('branch?test')).toBe(false);
    expect(validateBranchName('branch*test')).toBe(false);
    expect(validateBranchName('branch[test]')).toBe(false);
    expect(validateBranchName('branch\\test')).toBe(false);
  });

  it('should reject very long branch names', () => {
    const longName = 'a'.repeat(256);
    expect(validateBranchName(longName)).toBe(false);
  });

  it('should accept branch names at length limit', () => {
    const maxName = 'a'.repeat(255);
    expect(validateBranchName(maxName)).toBe(true);
  });
});
