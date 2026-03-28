/**
 * bootGuard.test.tsx
 *
 * Unit tests for BootGuardContext boot-flow edge cases.
 *
 * Tests the state-machine logic without a real Supabase connection by
 * mocking the supabase client.  Each scenario is isolated so failures are
 * easy to trace.
 *
 * Covered scenarios:
 * 1. No session → UNAUTHENTICATED
 * 2. Session but no profile row (PGRST116) → NEEDS_AGE (no localStorage)
 * 3. Session but no profile row + localStorage age flag → NEEDS_ONBOARDING
 * 4. Profile exists, age_verified=false → NEEDS_AGE
 * 5. Profile exists, age_verified=true, onboarding_completed=false → NEEDS_ONBOARDING
 * 6. Profile exists, all gates passed but missing display_name → NEEDS_ONBOARDING
 * 7. Profile exists, all gates passed, no community_attested_at → NEEDS_COMMUNITY_GATE
 * 8. Profile fully complete → READY
 * 9. Generic DB error + no localStorage → NEEDS_AGE
 * 10. Generic DB error + localAge in localStorage → NEEDS_ONBOARDING (not READY)
 * 11. loadProfile catch-path + localAge → NEEDS_ONBOARDING (not READY)
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { BOOT_STATES, BootGuardProvider, useBootGuard } from '@/contexts/BootGuardContext';

// ---------------------------------------------------------------------------
// Supabase mock helpers
// ---------------------------------------------------------------------------

const mockGetSession = vi.fn();
const mockOnAuthStateChange = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/components/utils/supabaseClient', () => {
  return {
    supabase: {
      auth: {
        getSession: (...args: unknown[]) => mockGetSession(...args),
        onAuthStateChange: (...args: unknown[]) => mockOnAuthStateChange(...args),
      },
      from: (...args: unknown[]) => mockFrom(...args),
    },
  };
});

// ---------------------------------------------------------------------------
// Test harness component — exposes bootState as a data-testid span
// ---------------------------------------------------------------------------
function BootConsumer() {
  const { bootState } = useBootGuard();
  return <span data-testid="boot-state">{bootState}</span>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeSession(userId = 'user-123', email = 'test@example.com') {
  return {
    user: { id: userId, email },
    access_token: 'fake-token',
  };
}

type ProfileRow = {
  id: string;
  age_verified?: boolean;
  onboarding_completed?: boolean;
  display_name?: string | null;
  community_attested_at?: string | null;
  [key: string]: unknown;
};

function makeProfile(overrides: Partial<ProfileRow> = {}): ProfileRow {
  return {
    id: 'user-123',
    age_verified: true,
    onboarding_completed: true,
    display_name: 'Test User',
    community_attested_at: new Date().toISOString(),
    ...overrides,
  };
}

/** Set up mocks for a happy-path authenticated session with a given profile. */
function setupAuthWithProfile(profile: ProfileRow | null, sessionOverride?: ReturnType<typeof makeSession>) {
  const session = sessionOverride ?? makeSession();

  mockGetSession.mockResolvedValue({
    data: { session },
    error: null,
  });

  // onAuthStateChange — return unsubscribe handle; don't fire events in these tests
  mockOnAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
  });

  const mockSingle = vi.fn();
  if (profile === null) {
    // Simulate PGRST116 — no row found
    mockSingle.mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'No rows' } });
  } else {
    mockSingle.mockResolvedValue({ data: profile, error: null });
  }

  mockFrom.mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: mockSingle,
      }),
    }),
    // update / upsert used by completeOnboarding / markAgeVerified
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: profile, error: null }),
    }),
    upsert: vi.fn().mockResolvedValue({ data: profile, error: null }),
  });
}

/** Set up mocks for a generic DB error during profile fetch. */
function setupAuthWithDbError(sessionOverride?: ReturnType<typeof makeSession>) {
  const session = sessionOverride ?? makeSession();

  mockGetSession.mockResolvedValue({
    data: { session },
    error: null,
  });

  mockOnAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
  });

  mockFrom.mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST500', message: 'Internal error' } }),
      }),
    }),
  });
}

/** Set up mocks for no session (unauthenticated). */
function setupNoSession() {
  mockGetSession.mockResolvedValue({
    data: { session: null },
    error: null,
  });

  mockOnAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

/** Timeout for waitFor assertions — boot state should settle well within 3s */
const BOOT_STATE_TIMEOUT = 3000;

describe('BootGuardContext — boot state machine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('1. No session → UNAUTHENTICATED', async () => {
    setupNoSession();

    render(
      <BootGuardProvider>
        <BootConsumer />
      </BootGuardProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('boot-state').textContent).toBe(BOOT_STATES.UNAUTHENTICATED);
    }, { timeout: BOOT_STATE_TIMEOUT });
  });

  it('2. Session + no profile row (PGRST116) + no localStorage → NEEDS_AGE', async () => {
    setupAuthWithProfile(null); // PGRST116

    render(
      <BootGuardProvider>
        <BootConsumer />
      </BootGuardProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('boot-state').textContent).toBe(BOOT_STATES.NEEDS_AGE);
    }, { timeout: BOOT_STATE_TIMEOUT });
  });

  it('3. Session + no profile row + localStorage age flag → NEEDS_ONBOARDING', async () => {
    localStorage.setItem('hm_age_confirmed_v1', 'true');
    setupAuthWithProfile(null); // PGRST116

    render(
      <BootGuardProvider>
        <BootConsumer />
      </BootGuardProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('boot-state').textContent).toBe(BOOT_STATES.NEEDS_ONBOARDING);
    }, { timeout: BOOT_STATE_TIMEOUT });
  });

  it('4. Profile exists but age_verified=false → NEEDS_AGE', async () => {
    setupAuthWithProfile(makeProfile({ age_verified: false, onboarding_completed: false }));

    render(
      <BootGuardProvider>
        <BootConsumer />
      </BootGuardProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('boot-state').textContent).toBe(BOOT_STATES.NEEDS_AGE);
    }, { timeout: BOOT_STATE_TIMEOUT });
  });

  it('5. Profile exists, age verified, onboarding_completed=false → NEEDS_ONBOARDING', async () => {
    setupAuthWithProfile(makeProfile({ age_verified: true, onboarding_completed: false }));

    render(
      <BootGuardProvider>
        <BootConsumer />
      </BootGuardProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('boot-state').textContent).toBe(BOOT_STATES.NEEDS_ONBOARDING);
    }, { timeout: BOOT_STATE_TIMEOUT });
  });

  it('6. Profile onboarding_completed=true but display_name empty → NEEDS_ONBOARDING', async () => {
    setupAuthWithProfile(makeProfile({
      age_verified: true,
      onboarding_completed: true,
      display_name: '',
      community_attested_at: new Date().toISOString(),
    }));

    render(
      <BootGuardProvider>
        <BootConsumer />
      </BootGuardProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('boot-state').textContent).toBe(BOOT_STATES.NEEDS_ONBOARDING);
    }, { timeout: BOOT_STATE_TIMEOUT });
  });

  it('7. Profile complete but no community_attested_at and no localStorage → NEEDS_COMMUNITY_GATE', async () => {
    setupAuthWithProfile(makeProfile({
      age_verified: true,
      onboarding_completed: true,
      display_name: 'Test User',
      community_attested_at: null,
    }));

    render(
      <BootGuardProvider>
        <BootConsumer />
      </BootGuardProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('boot-state').textContent).toBe(BOOT_STATES.NEEDS_COMMUNITY_GATE);
    }, { timeout: BOOT_STATE_TIMEOUT });
  });

  it('8. Fully complete profile → READY', async () => {
    setupAuthWithProfile(makeProfile());

    render(
      <BootGuardProvider>
        <BootConsumer />
      </BootGuardProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('boot-state').textContent).toBe(BOOT_STATES.READY);
    }, { timeout: BOOT_STATE_TIMEOUT });
  });

  it('9. Generic DB error + no localStorage → NEEDS_AGE', async () => {
    setupAuthWithDbError();

    render(
      <BootGuardProvider>
        <BootConsumer />
      </BootGuardProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('boot-state').textContent).toBe(BOOT_STATES.NEEDS_AGE);
    }, { timeout: BOOT_STATE_TIMEOUT });
  });

  it('10. Generic DB error + localAge in localStorage → NEEDS_ONBOARDING (not READY)', async () => {
    // Before fix this would set READY — now it must set NEEDS_ONBOARDING
    localStorage.setItem('hm_age_confirmed_v1', 'true');
    setupAuthWithDbError();

    render(
      <BootGuardProvider>
        <BootConsumer />
      </BootGuardProvider>,
    );

    await waitFor(() => {
      const state = screen.getByTestId('boot-state').textContent;
      // Must NOT skip onboarding gate
      expect(state).toBe(BOOT_STATES.NEEDS_ONBOARDING);
      expect(state).not.toBe(BOOT_STATES.READY);
    }, { timeout: BOOT_STATE_TIMEOUT });
  });

  it('11. community_attested_at present in localStorage bypasses NEEDS_COMMUNITY_GATE', async () => {
    localStorage.setItem('hm_community_attested_v1', 'true');
    setupAuthWithProfile(makeProfile({
      age_verified: true,
      onboarding_completed: true,
      display_name: 'Test User',
      community_attested_at: null,
    }));

    render(
      <BootGuardProvider>
        <BootConsumer />
      </BootGuardProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('boot-state').textContent).toBe(BOOT_STATES.READY);
    }, { timeout: BOOT_STATE_TIMEOUT });
  });
});
