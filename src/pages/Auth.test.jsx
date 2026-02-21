import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Hoist mock variables so they are available inside vi.mock factories
const { mockToast, mockResetPasswordForEmail, mockSignIn, mockSignUp, mockGetSession, mockOnAuthStateChange } = vi.hoisted(() => ({
  mockToast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
  mockResetPasswordForEmail: vi.fn(),
  mockSignIn: vi.fn(),
  mockSignUp: vi.fn(),
  mockGetSession: vi.fn(),
  mockOnAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
}));

// Mock react-router-dom before importing the component
vi.mock('react-router-dom', () => ({
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
  useNavigate: () => vi.fn(),
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
    h2: ({ children, ...props }) => <h2 {...props}>{children}</h2>,
    p: ({ children, ...props }) => <p {...props}>{children}</p>,
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

// Mock TelegramLogin
vi.mock('@/components/auth/TelegramLogin', () => ({
  default: () => null,
}));

// Mock createPageUrl
vi.mock('../utils', () => ({
  createPageUrl: (page) => `/${page.toLowerCase()}`,
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: mockToast,
}));

// Mock supabaseClient auth helpers
vi.mock('@/components/utils/supabaseClient', () => ({
  auth: {
    resetPasswordForEmail: (...args) => mockResetPasswordForEmail(...args),
    signIn: (...args) => mockSignIn(...args),
    signUp: (...args) => mockSignUp(...args),
    signOut: vi.fn(),
    getSession: (...args) => mockGetSession(...args),
    onAuthStateChange: (...args) => mockOnAuthStateChange(...args),
    signInWithGoogle: vi.fn(),
    updatePassword: vi.fn(),
  },
  base44: {
    entities: {
      User: { filter: vi.fn().mockResolvedValue({ data: [] }) },
    },
    auth: { updateMe: vi.fn() },
  },
}));

import Auth from './Auth';

describe('Auth – Reset Password (forgot step)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: getSession returns no session (not in a recovery flow)
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
  });

  const renderAndGoToForgot = async () => {
    render(<Auth />);
    // Click "Forgot password?" to enter the forgot step
    const forgotBtn = screen.getByRole('button', { name: /forgot password/i });
    await userEvent.click(forgotBtn);
    return screen.getByRole('button', { name: /send reset link/i });
  };

  it('shows an error toast when email is empty and does NOT call resetPasswordForEmail', async () => {
    render(<Auth />);
    // Click "Forgot password?" to enter the forgot step
    await userEvent.click(screen.getByRole('button', { name: /forgot password/i }));

    // Submit the form directly (bypassing HTML5 required-field validation) with no email
    const form = screen.getByRole('button', { name: /send reset link/i }).closest('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Please enter your email');
    });
    expect(mockResetPasswordForEmail).not.toHaveBeenCalled();
  });

  it('calls resetPasswordForEmail with the email and a redirectTo URL when email is provided', async () => {
    mockResetPasswordForEmail.mockResolvedValue({ error: null });

    await renderAndGoToForgot();

    // Type an email
    const emailInput = screen.getByPlaceholderText('your@email.com');
    await userEvent.type(emailInput, 'test@example.com');

    const submitBtn = screen.getByRole('button', { name: /send reset link/i });
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockResetPasswordForEmail).toHaveBeenCalledTimes(1);
    });

    const [calledEmail, calledRedirectTo] = mockResetPasswordForEmail.mock.calls[0];
    expect(calledEmail).toBe('test@example.com');
    expect(calledRedirectTo).toMatch(/\?mode=reset$/);
  });

  it('shows a success toast and returns to sign-in step on success', async () => {
    mockResetPasswordForEmail.mockResolvedValue({ error: null });

    await renderAndGoToForgot();

    const emailInput = screen.getByPlaceholderText('your@email.com');
    await userEvent.type(emailInput, 'test@example.com');
    await userEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith(
        expect.stringContaining("you'll receive a reset link")
      );
    });
  });

  it('shows an error toast when resetPasswordForEmail returns an error', async () => {
    mockResetPasswordForEmail.mockResolvedValue({ error: { message: 'Network error' } });

    await renderAndGoToForgot();

    const emailInput = screen.getByPlaceholderText('your@email.com');
    await userEvent.type(emailInput, 'test@example.com');
    await userEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Network error');
    });
  });
});

describe('Auth – Sign-up email confirmation handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
  });

  it('shows confirmation message and switches to sign-in when session is null after sign-up', async () => {
    // Supabase returns user but no session (email confirmation required)
    mockSignUp.mockResolvedValue({
      data: { user: { id: 'uid-123' }, session: null },
      error: null,
    });

    render(<Auth />);

    // Switch to sign-up mode
    const toggleBtn = screen.getByRole('button', { name: /sign up/i });
    await userEvent.click(toggleBtn);

    // Fill in form fields
    await userEvent.type(screen.getByPlaceholderText(/your name/i), 'Jane Doe');
    await userEvent.type(screen.getByPlaceholderText('your@email.com'), 'jane@example.com');
    await userEvent.type(screen.getByPlaceholderText(/password/i), 'password123');

    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith(
        expect.stringContaining('Check your email')
      );
    });
    // Should NOT have called signIn (no immediate sign-in after confirmation-required sign-up)
    expect(mockSignIn).not.toHaveBeenCalled();
  });
});
