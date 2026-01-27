import { vi } from 'vitest';

export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  full_name: 'Test User',
  avatar_url: 'https://example.com/avatar.jpg',
  bio: 'Test bio',
  city: 'London',
  last_lat: 51.5074,
  last_lng: -0.1278,
  xp: 1000,
  membership_tier: 'basic',
  profile_type: 'standard',
  tags: ['tag1', 'tag2'],
  looking_for: ['hookup', 'fwb'],
  last_seen: new Date().toISOString(),
  created_at: new Date().toISOString(),
};

export const mockProfiles = [
  {
    ...mockUser,
    id: 'user-1',
    email: 'user1@example.com',
    full_name: 'User One',
    matchProbability: 85,
  },
  {
    ...mockUser,
    id: 'user-2',
    email: 'user2@example.com',
    full_name: 'User Two',
    matchProbability: 72,
  },
  {
    ...mockUser,
    id: 'user-3',
    email: 'user3@example.com',
    full_name: 'User Three',
    matchProbability: 68,
  },
];

export const mockSupabaseClient = {
  auth: {
    getSession: vi.fn().mockResolvedValue({
      data: { session: { access_token: 'test-token', user: { id: 'test-user-id', email: 'test@example.com' } } },
      error: null,
    }),
    getUser: vi.fn().mockResolvedValue({
      data: { user: { id: 'test-user-id', email: 'test@example.com' } },
      error: null,
    }),
    signInWithPassword: vi.fn().mockResolvedValue({
      data: { user: mockUser, session: { access_token: 'test-token' } },
      error: null,
    }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    onAuthStateChange: vi.fn().mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    }),
  },
  from: vi.fn((table: string) => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: mockUser, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: mockUser, error: null }),
  })),
  rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  channel: vi.fn().mockReturnValue({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
    unsubscribe: vi.fn(),
  }),
};

export const createMockSupabase = () => mockSupabaseClient;
