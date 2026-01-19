# Test Infrastructure Setup Guide

> **Test configuration files to add to your repository root**

## Vitest Configuration

Create `vitest.config.js` in repository root:

```javascript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.config.js',
        '**/dist/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
```

## Test Setup File

Create `tests/setup.js` in repository root:

```javascript
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
  takeRecords() {
    return [];
  }
};

// Mock Base44 SDK
vi.mock('@/api/base44Client', () => ({
  base44: {
    auth: {
      me: vi.fn(() => Promise.resolve({ 
        email: 'test@test.com', 
        full_name: 'Test User',
        xp: 1000,
        role: 'user'
      })),
      isAuthenticated: vi.fn(() => Promise.resolve(true)),
      logout: vi.fn(),
      updateMe: vi.fn(),
    },
    entities: {
      User: {
        list: vi.fn(() => Promise.resolve([])),
        filter: vi.fn(() => Promise.resolve([])),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      Beacon: {
        list: vi.fn(() => Promise.resolve([])),
        filter: vi.fn(() => Promise.resolve([])),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    },
    functions: {
      invoke: vi.fn(),
    },
    integrations: {
      Core: {
        UploadFile: vi.fn(() => Promise.resolve({ file_url: 'https://example.com/file.jpg' })),
      },
    },
  },
}));
```

## Package.json Updates

Add to your `package.json`:

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.1.5",
    "@testing-library/react": "^14.1.2",
    "@testing-library/user-event": "^14.5.1",
    "@vitest/ui": "^1.1.0",
    "jsdom": "^23.0.1",
    "vitest": "^1.1.0",
    "@vitest/coverage-v8": "^1.1.0"
  }
}
```

Install dependencies:
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event @vitest/ui jsdom @vitest/coverage-v8
```

## Example Test Files

### Component Test Example

Create `tests/components/Button.test.jsx`:

```javascript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@/components/ui/button';

describe('Button Component', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('applies variant styles', () => {
    const { container } = render(<Button variant="destructive">Delete</Button>);
    expect(container.firstChild).toHaveClass('bg-destructive');
  });

  it('can be disabled', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

### Hook Test Example

Create `tests/hooks/useCurrentUser.test.js`:

```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCurrentUser } from '@/components/utils/queryConfig';

describe('useCurrentUser Hook', () => {
  let queryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  const wrapper = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  it('fetches current user', async () => {
    const { result } = renderHook(() => useCurrentUser(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    
    expect(result.current.data).toEqual({
      email: 'test@test.com',
      full_name: 'Test User',
      xp: 1000,
      role: 'user',
    });
  });

  it('handles unauthenticated state', async () => {
    const { result } = renderHook(() => useCurrentUser(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    
    expect(result.current.data).toBeDefined();
  });
});
```

### Utility Function Test Example

Create `tests/utils/sanitize.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { sanitizeText, sanitizeURL } from '@/components/utils/sanitize';

describe('Sanitization Utilities', () => {
  describe('sanitizeText', () => {
    it('removes script tags', () => {
      const malicious = '<script>alert("xss")</script>Hello';
      expect(sanitizeText(malicious)).toBe('Hello');
    });

    it('escapes HTML entities', () => {
      const html = '<div>Test & Co.</div>';
      expect(sanitizeText(html)).not.toContain('<div>');
    });

    it('handles null/undefined', () => {
      expect(sanitizeText(null)).toBe('');
      expect(sanitizeText(undefined)).toBe('');
    });
  });

  describe('sanitizeURL', () => {
    it('allows HTTPS URLs', () => {
      const url = 'https://example.com';
      expect(sanitizeURL(url)).toBe(url);
    });

    it('blocks javascript: protocol', () => {
      const malicious = 'javascript:alert("xss")';
      expect(sanitizeURL(malicious)).toBe('');
    });

    it('validates URL format', () => {
      expect(sanitizeURL('not-a-url')).toBe('');
    });
  });
});
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with UI
npm run test:ui

# Generate coverage report
npm run test:coverage

# Run specific test file
npm test -- tests/components/Button.test.jsx

# Run tests matching pattern
npm test -- --grep "Button"
```

## Coverage Thresholds

Add to `vitest.config.js`:

```javascript
test: {
  coverage: {
    lines: 70,
    functions: 70,
    branches: 60,
    statements: 70,
  },
}
```

## CI/CD Integration

Tests automatically run in GitHub Actions CI pipeline. See `CI_CD_SETUP.md`.

## Best Practices

1. **Test user behavior, not implementation**
2. **Write tests before fixing bugs**
3. **Mock external dependencies**
4. **Use descriptive test names**
5. **Keep tests isolated and independent**
6. **Aim for 70%+ code coverage**
7. **Test edge cases and error states**

## Troubleshooting

### Tests fail with "Cannot find module"
- Check path aliases in `vitest.config.js`
- Verify imports use `@/` prefix correctly

### Mock not working
- Ensure mocks are defined before imports
- Use `vi.fn()` for function mocks
- Reset mocks in `afterEach` if needed

### Async tests timing out
- Increase timeout: `{ timeout: 10000 }`
- Use `waitFor` for async assertions
- Check for unresolved promises