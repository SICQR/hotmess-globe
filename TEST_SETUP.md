# Test Setup Guide

This guide provides comprehensive instructions for setting up and running tests in the HOTMESS Globe application using Vitest, React Testing Library, and other testing tools.

## 📋 Overview

This project uses modern testing tools optimized for Vite and React:
- **Vitest**: Fast unit test framework, Vite-native alternative to Jest
- **React Testing Library**: Testing utilities for React components
- **@testing-library/user-event**: User interaction simulation
- **jsdom**: Browser environment simulation for Node.js
- **@vitest/ui**: Optional UI for test visualization

## 🚀 Quick Start

### Install Testing Dependencies

Run the following command to install all required testing dependencies:

```bash
npm install --save-dev vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

### Update package.json Scripts

Add the following test scripts to your `package.json`:

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest --watch"
  }
}
```

## 🔧 Configuration

### Step 1: Update vite.config.js

Modify your `vite.config.js` to include test configuration:

```javascript
import base44 from "@base44/vite-plugin"
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  logLevel: 'error', // Suppress warnings, only show errors
  plugins: [
    base44({
      // Support for legacy code that imports the base44 SDK with @/integrations, @/entities, etc.
      // can be removed if the code has been updated to use the new SDK imports from @base44/sdk
      legacySDKImports: process.env.BASE44_LEGACY_SDK_IMPORTS === 'true',
      hmrNotifier: true,
      navigationNotifier: true,
      visualEditAgent: true
    }),
    react(),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.config.js',
        '**/*.config.ts',
        '**/dist/**',
      ]
    }
  }
})
```

### Step 2: Create Test Setup File

Create `src/test/setup.js` for global test configuration:

```javascript
import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock window.matchMedia (required for many UI components)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {}, // deprecated
    removeListener: () => {}, // deprecated
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
})

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return []
  }
  unobserve() {}
}

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

// Mock scrollTo
global.scrollTo = () => {}
```

### Step 3: Create Test Utilities

Create `src/test/utils.jsx` for common test utilities:

```javascript
import { render } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Create a custom render function that includes common providers
export function renderWithProviders(ui, options = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  function Wrapper({ children }) {
    return (
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          {children}
        </BrowserRouter>
      </QueryClientProvider>
    )
  }

  return render(ui, { wrapper: Wrapper, ...options })
}

// Re-export everything from React Testing Library
export * from '@testing-library/react'
export { default as userEvent } from '@testing-library/user-event'
```

## 📝 Writing Tests

### Example 1: Component Test

Create `src/components/__tests__/Button.test.jsx`:

```javascript
import { describe, it, expect, vi } from 'vitest'
import { renderWithProviders, screen } from '../../test/utils'
import userEvent from '@testing-library/user-event'
import { Button } from '../ui/button'

describe('Button Component', () => {
  it('renders button with text', () => {
    renderWithProviders(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument()
  })

  it('calls onClick handler when clicked', async () => {
    const handleClick = vi.fn()
    const user = userEvent.setup()
    
    renderWithProviders(<Button onClick={handleClick}>Click me</Button>)
    
    await user.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('is disabled when disabled prop is true', () => {
    renderWithProviders(<Button disabled>Disabled Button</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })
})
```

### Example 2: Hook Test

Create `src/hooks/__tests__/useAuth.test.js`:

```javascript
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuth } from '../useAuth'

describe('useAuth Hook', () => {
  let queryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })
  })

  const wrapper = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )

  it('returns user when authenticated', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Add assertions based on your auth implementation
  })
})
```

### Example 3: Utility Function Test

Create `src/lib/__tests__/utils.test.js`:

```javascript
import { describe, it, expect } from 'vitest'
import { cn } from '../utils'

describe('cn utility', () => {
  it('merges class names correctly', () => {
    expect(cn('class1', 'class2')).toBe('class1 class2')
  })

  it('handles conditional classes', () => {
    expect(cn('base', false && 'conditional')).toBe('base')
    expect(cn('base', true && 'conditional')).toBe('base conditional')
  })
})
```

### Example 4: Integration Test

Create `src/pages/__tests__/HomePage.test.jsx`:

```javascript
import { describe, it, expect, vi } from 'vitest'
import { renderWithProviders, screen, waitFor } from '../../test/utils'
import HomePage from '../HomePage'

// Mock API calls
vi.mock('@base44/sdk', () => ({
  useQuery: () => ({
    data: [],
    isLoading: false,
    error: null,
  }),
}))

describe('HomePage', () => {
  it('renders homepage without crashing', () => {
    renderWithProviders(<HomePage />)
    expect(screen.getByRole('main')).toBeInTheDocument()
  })

  it('displays loading state initially', async () => {
    renderWithProviders(<HomePage />)
    
    // Check for loading indicators or content
    await waitFor(() => {
      expect(screen.queryByTestId('loading')).not.toBeInTheDocument()
    })
  })
})
```

## 🎯 Testing Best Practices

### 1. Test User Behavior, Not Implementation

```javascript
// ❌ Bad - Testing implementation details
expect(component.state.isOpen).toBe(true)

// ✅ Good - Testing user-visible behavior
expect(screen.getByRole('dialog')).toBeVisible()
```

### 2. Use Accessible Queries

Priority order for queries:
1. `getByRole` - Most accessible
2. `getByLabelText` - For form fields
3. `getByPlaceholderText` - For inputs
4. `getByText` - For non-interactive elements
5. `getByTestId` - Last resort

```javascript
// ✅ Good - Using accessible queries
const button = screen.getByRole('button', { name: /submit/i })
const input = screen.getByLabelText(/username/i)
```

### 3. Async Testing

```javascript
import { waitFor } from '@testing-library/react'

it('loads data asynchronously', async () => {
  renderWithProviders(<DataComponent />)
  
  await waitFor(() => {
    expect(screen.getByText(/data loaded/i)).toBeInTheDocument()
  })
})
```

### 4. Mocking

```javascript
import { vi } from 'vitest'

// Mock a module
vi.mock('../api/client', () => ({
  fetchData: vi.fn(() => Promise.resolve({ data: [] })),
}))

// Mock a function
const mockFn = vi.fn()
mockFn.mockReturnValue('mocked value')
```

## 🏃 Running Tests

### Run All Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Run Tests with UI

```bash
npm run test:ui
```

### Run Tests Once (CI Mode)

```bash
npm run test:run
```

### Run Tests with Coverage

```bash
npm run test:coverage
```

### Run Specific Test File

```bash
npm test -- src/components/__tests__/Button.test.jsx
```

### Run Tests Matching Pattern

```bash
npm test -- --grep="Button"
```

## 📊 Code Coverage

### Coverage Configuration

The test configuration includes coverage settings. After running tests with coverage:

```bash
npm run test:coverage
```

You'll find reports in:
- `coverage/index.html` - Visual HTML report
- `coverage/coverage-final.json` - JSON data
- Console output with text summary

### Coverage Thresholds

Add coverage thresholds to your `vite.config.js`:

```javascript
test: {
  coverage: {
    provider: 'v8',
    reporter: ['text', 'json', 'html'],
    statements: 70,
    branches: 70,
    functions: 70,
    lines: 70,
  }
}
```

## 🐛 Debugging Tests

### Using Console Logs

```javascript
import { screen, debug } from '@testing-library/react'

it('debugs component', () => {
  renderWithProviders(<MyComponent />)
  
  // Print entire document
  screen.debug()
  
  // Print specific element
  screen.debug(screen.getByRole('button'))
})
```

### Using VS Code Debugger

Add to `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Vitest Tests",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "test"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

## 🔍 Common Testing Patterns

### Testing Forms

```javascript
import userEvent from '@testing-library/user-event'

it('submits form with user input', async () => {
  const user = userEvent.setup()
  const handleSubmit = vi.fn()
  
  renderWithProviders(<LoginForm onSubmit={handleSubmit} />)
  
  await user.type(screen.getByLabelText(/username/i), 'testuser')
  await user.type(screen.getByLabelText(/password/i), 'password123')
  await user.click(screen.getByRole('button', { name: /login/i }))
  
  expect(handleSubmit).toHaveBeenCalledWith({
    username: 'testuser',
    password: 'password123',
  })
})
```

### Testing Navigation

```javascript
it('navigates to profile page', async () => {
  const user = userEvent.setup()
  
  renderWithProviders(<App />)
  
  await user.click(screen.getByRole('link', { name: /profile/i }))
  
  expect(screen.getByRole('heading', { name: /profile/i })).toBeInTheDocument()
})
```

### Testing API Calls

```javascript
import { rest } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer(
  rest.get('/api/user', (req, res, ctx) => {
    return res(ctx.json({ username: 'testuser' }))
  })
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

## 🎨 Testing UI Components

### Snapshot Testing

```javascript
import { expect } from 'vitest'

it('matches snapshot', () => {
  const { container } = renderWithProviders(<MyComponent />)
  expect(container).toMatchSnapshot()
})
```

### Testing Animations

```javascript
it('animates element', async () => {
  renderWithProviders(<AnimatedComponent />)
  
  const element = screen.getByTestId('animated-element')
  
  // Trigger animation
  fireEvent.click(screen.getByRole('button'))
  
  // Check animation classes or styles
  expect(element).toHaveClass('animate-in')
})
```

## 📚 Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Library Queries](https://testing-library.com/docs/queries/about)
- [Common Testing Mistakes](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

## 🔄 Migration from Jest

If migrating from Jest to Vitest:

1. **Replace imports**: `jest` → `vitest`
2. **Update config**: Move from `jest.config.js` to `vite.config.js`
3. **Update scripts**: Replace `jest` with `vitest` in package.json
4. **No babel needed**: Vitest uses Vite's transform pipeline

Most Jest APIs work in Vitest without changes!

## ❓ Troubleshooting

### Issue: "Cannot find module" errors
**Solution**: Check your `vite.config.js` resolve aliases match your imports

### Issue: Tests timeout
**Solution**: Increase timeout in test file:
```javascript
import { describe, it } from 'vitest'

describe('slow tests', () => {
  it('takes a while', { timeout: 10000 }, async () => {
    // test code
  })
})
```

### Issue: DOM not available
**Solution**: Ensure `environment: 'jsdom'` is set in vite.config.js

### Issue: React hooks errors
**Solution**: Wrap components with appropriate providers in renderWithProviders

## 📋 Test Checklist

Before committing:
- [ ] All tests pass locally
- [ ] New features have test coverage
- [ ] Coverage meets minimum thresholds
- [ ] No console errors or warnings
- [ ] Tests follow naming conventions
- [ ] Mock data is realistic
- [ ] Async operations are properly handled

---

For questions or issues with testing, please refer to the [main README](./README.md) or open an issue on GitHub.
