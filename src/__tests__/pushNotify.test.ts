/**
 * pushNotify.test.ts
 * Tests that pushNotify calls fetch with the correct payload,
 * handles missing emails, and never throws.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock supabase before importing pushNotify
const mockGetSession = vi.fn();
vi.mock('@/components/utils/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
    },
  },
}));

// Stub import.meta.env
vi.stubEnv('VITE_SUPABASE_URL', 'https://test-project.supabase.co');

// Must import after mocks are set up
const { pushNotify } = await import('@/lib/pushNotify');

describe('pushNotify', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 200 }),
    );
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'test-jwt-token' } },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls fetch with correct URL and payload', async () => {
    await pushNotify({
      emails: ['user@example.com'],
      title: 'New message',
      body: 'You have a new message',
      tag: 'chat',
      url: '/ghosted',
    });

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, opts] = fetchSpy.mock.calls[0];
    expect(url).toBe('https://test-project.supabase.co/functions/v1/notify-push');
    expect(opts.method).toBe('POST');
    expect(opts.headers['Authorization']).toBe('Bearer test-jwt-token');

    const body = JSON.parse(opts.body);
    expect(body.emails).toEqual(['user@example.com']);
    expect(body.title).toBe('New message');
    expect(body.body).toBe('You have a new message');
    expect(body.tag).toBe('chat');
    expect(body.url).toBe('/ghosted');
    expect(body.icon).toBe('/icons/icon-192.png');
  });

  it('uses default tag, url, and icon when not provided', async () => {
    await pushNotify({
      emails: ['a@b.com'],
      title: 'Test',
      body: 'Body',
    });

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body.tag).toBe('hotmess');
    expect(body.url).toBe('/');
    expect(body.icon).toBe('/icons/icon-192.png');
  });

  it('does not call fetch when emails array is empty', async () => {
    await pushNotify({ emails: [], title: 'Test', body: 'Body' });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('does not call fetch when emails is missing', async () => {
    await pushNotify({ emails: undefined as any, title: 'Test', body: 'Body' });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('does not call fetch when title is empty', async () => {
    await pushNotify({ emails: ['a@b.com'], title: '', body: 'Body' });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('does not call fetch when body is empty', async () => {
    await pushNotify({ emails: ['a@b.com'], title: 'Test', body: '' });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('does not call fetch when no session exists', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    await pushNotify({ emails: ['a@b.com'], title: 'Test', body: 'Body' });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('never throws even when fetch rejects', async () => {
    fetchSpy.mockRejectedValue(new Error('Network error'));
    await expect(
      pushNotify({ emails: ['a@b.com'], title: 'Test', body: 'Body' }),
    ).resolves.toBeUndefined();
  });

  it('never throws when fetch returns non-ok status', async () => {
    fetchSpy.mockResolvedValue(new Response(null, { status: 500 }));
    await expect(
      pushNotify({ emails: ['a@b.com'], title: 'Test', body: 'Body' }),
    ).resolves.toBeUndefined();
  });
});
