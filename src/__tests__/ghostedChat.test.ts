/**
 * ghostedChat.test.ts
 *
 * Unit tests for the Ghosted chat messaging logic:
 * - Thread creation / lookup
 * - Message validation
 * - Chat path: /ghosted → profile sheet → chat sheet
 * - Sheet policy: chat sheets are gated to /ghosted or profile-in-stack
 *
 * These tests are pure logic tests — no DOM, no network.
 */

import { describe, it, expect } from 'vitest';
import { canOpenSheet } from '@/lib/sheetPolicy';

// ── Thread participant helpers ────────────────────────────────────────────────

interface ExistingThread {
  id: string;
  participant_emails: string[];
}

interface NewThread {
  _new: true;
  participant_emails: string[];
}

type ThreadResult = ExistingThread | NewThread;

function isNewThread(t: ThreadResult): t is NewThread {
  return '_new' in t && t._new === true;
}

/** Mirrors the participant matching logic in L2ChatSheet.jsx */
function threadMatchesUsers(
  participantEmails: string[],
  userA: string,
  userB: string,
): boolean {
  return participantEmails.includes(userA) && participantEmails.includes(userB);
}

/** Mirrors the thread deduplication logic: find existing thread or flag as new */
function resolveThread(
  threads: ExistingThread[],
  myEmail: string,
  toEmail: string,
): ThreadResult {
  const existing = threads.find((t) =>
    threadMatchesUsers(t.participant_emails, myEmail, toEmail),
  );
  if (existing) return existing;
  return { _new: true, participant_emails: [myEmail, toEmail] };
}

// ── Message validation helper ─────────────────────────────────────────────────

/** Mirrors the send-guard in handleSend() */
function canSendMessage(text: string, senderEmail: string | null, isSending: boolean): boolean {
  return !!(text.trim() && senderEmail && !isSending);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Ghosted chat — thread resolution', () => {
  const alice = 'alice@example.com';
  const bob = 'bob@example.com';
  const carol = 'carol@example.com';

  it('returns existing thread when alice→bob thread exists', () => {
    const threads = [{ id: 'thread-1', participant_emails: [alice, bob] }];
    const result = resolveThread(threads, alice, bob);
    expect(isNewThread(result)).toBe(false);
    if (!isNewThread(result)) expect(result.id).toBe('thread-1');
  });

  it('returns existing thread even when email order is reversed (bob→alice)', () => {
    const threads = [{ id: 'thread-1', participant_emails: [bob, alice] }];
    const result = resolveThread(threads, alice, bob);
    expect(isNewThread(result)).toBe(false);
    if (!isNewThread(result)) expect(result.id).toBe('thread-1');
  });

  it('creates new thread marker when no thread exists between alice and carol', () => {
    const threads = [{ id: 'thread-1', participant_emails: [alice, bob] }];
    const result = resolveThread(threads, alice, carol);
    expect(isNewThread(result)).toBe(true);
    if (isNewThread(result)) expect(result.participant_emails).toEqual([alice, carol]);
  });

  it('creates new thread marker when threads list is empty', () => {
    const result = resolveThread([], alice, bob);
    expect(isNewThread(result)).toBe(true);
    if (isNewThread(result)) {
      expect(result.participant_emails).toContain(alice);
      expect(result.participant_emails).toContain(bob);
    }
  });

  it('does not pick up a thread that only includes alice (no bob)', () => {
    const threads = [{ id: 'thread-solo', participant_emails: [alice] }];
    const result = resolveThread(threads, alice, bob);
    expect(isNewThread(result)).toBe(true);
  });

  it('does not pick up a thread between carol and bob when looking for alice→bob', () => {
    const threads = [{ id: 'thread-cb', participant_emails: [carol, bob] }];
    const result = resolveThread(threads, alice, bob);
    expect(isNewThread(result)).toBe(true);
  });
});

describe('Ghosted chat — message send guard', () => {
  it('allows sending a valid message', () => {
    expect(canSendMessage('Hello!', 'alice@example.com', false)).toBe(true);
  });

  it('blocks sending when text is empty', () => {
    expect(canSendMessage('', 'alice@example.com', false)).toBe(false);
  });

  it('blocks sending when text is only whitespace', () => {
    expect(canSendMessage('   ', 'alice@example.com', false)).toBe(false);
  });

  it('blocks sending when sender email is null (not authenticated)', () => {
    expect(canSendMessage('Hello!', null, false)).toBe(false);
  });

  it('blocks sending when already in progress (isSending=true)', () => {
    expect(canSendMessage('Hello!', 'alice@example.com', true)).toBe(false);
  });
});

describe('Ghosted chat — sheet policy (two-user journey)', () => {
  // These tests validate the full path that the two-user journey takes:
  // /ghosted → tap card → openSheet('profile') → tap Message → openSheet('chat')

  it('Step 1: profile sheet is always allowed anywhere', () => {
    // Tapping a profile card on /ghosted
    expect(canOpenSheet('profile', '/ghosted', [])).toBe(true);
    // Even from home
    expect(canOpenSheet('profile', '/', [])).toBe(true);
  });

  it('Step 2: chat sheet is allowed on /ghosted', () => {
    // Direct tap → chat from ghosted grid
    expect(canOpenSheet('chat', '/ghosted', [])).toBe(true);
  });

  it('Step 2 alt: chat sheet is allowed when profile is in stack (from any route)', () => {
    // Profile sheet already open → "Message" button → chat
    expect(canOpenSheet('chat', '/', [{ type: 'profile' }])).toBe(true);
    expect(canOpenSheet('chat', '/pulse', [{ type: 'profile' }])).toBe(true);
    expect(canOpenSheet('chat', '/market', [{ type: 'profile' }])).toBe(true);
  });

  it('chat sheet is blocked from home with no profile in stack', () => {
    expect(canOpenSheet('chat', '/', [])).toBe(false);
  });

  it('video call sheet follows same rules as chat', () => {
    expect(canOpenSheet('video', '/ghosted', [])).toBe(true);
    expect(canOpenSheet('video', '/', [{ type: 'profile' }])).toBe(true);
    expect(canOpenSheet('video', '/', [])).toBe(false);
  });

  it('full two-user ghosted→chat path', () => {
    // User A is on /ghosted
    const onGhosted = '/ghosted';
    const emptyStack: { type: string }[] = [];

    // Tap profile card → profile sheet
    expect(canOpenSheet('profile', onGhosted, emptyStack)).toBe(true);

    // Profile sheet now in stack
    const stackWithProfile = [{ type: 'profile' }];

    // Tap "Message" → chat sheet (allowed because profile is in stack)
    expect(canOpenSheet('chat', onGhosted, stackWithProfile)).toBe(true);

    // Same works from any other route if profile sheet was opened
    expect(canOpenSheet('chat', '/', stackWithProfile)).toBe(true);
  });
});
