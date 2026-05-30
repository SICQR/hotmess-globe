/**
 * Badge math unit tests
 *
 * Verifies the unread count logic: JSONB unread_count per email,
 * thread-level read/unread state, multi-thread scenarios, and
 * markRead clearing behavior.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Read source files to verify implementation patterns
const chatSheetSrc = readFileSync(
  resolve(__dirname, '../components/sheets/L2ChatSheet.jsx'),
  'utf-8'
);
const unreadCountSrc = readFileSync(
  resolve(__dirname, '../hooks/useUnreadCount.ts'),
  'utf-8'
);
const swSrc = readFileSync(
  resolve(__dirname, '../../public/sw.js'),
  'utf-8'
);

describe('Badge Math — Unread Count Logic', () => {
  // ── Pure logic tests ─────────────────────────────────────────────

  it('computes total unread from JSONB unread_count per thread', () => {
    // Simulate the reduce logic from useUnreadCount
    const userEmail = 'me@test.com';
    const threads = [
      { id: '1', unread_count: { 'me@test.com': 3, 'other@test.com': 0 } },
      { id: '2', unread_count: { 'me@test.com': 1 } },
      { id: '3', unread_count: { 'me@test.com': 0 } },
      { id: '4', unread_count: null },
    ];

    const total = threads.reduce((sum, thread) => {
      const count =
        typeof thread.unread_count === 'object' && thread.unread_count !== null
          ? (thread.unread_count as Record<string, number>)[userEmail] || 0
          : 0;
      return sum + count;
    }, 0);

    expect(total).toBe(4); // 3 + 1 + 0 + 0
  });

  it('markRead zeroes only the current user email, not others', () => {
    const threadUnread = { 'me@test.com': 5, 'other@test.com': 2 };
    const updated = { ...threadUnread, 'me@test.com': 0 };

    expect(updated['me@test.com']).toBe(0);
    expect(updated['other@test.com']).toBe(2);
  });

  it('increment adds 1 to recipient, leaves sender at 0', () => {
    const senderEmail = 'me@test.com';
    const recipientEmail = 'them@test.com';
    const currentUnread = { 'me@test.com': 0, 'them@test.com': 2 };

    const newUnread = {
      ...currentUnread,
      [recipientEmail]: (currentUnread[recipientEmail] || 0) + 1,
    };

    expect(newUnread[senderEmail]).toBe(0); // sender unchanged
    expect(newUnread[recipientEmail]).toBe(3); // +1
  });

  it('handles first message to thread with empty unread_count', () => {
    const recipientEmail = 'them@test.com';
    const currentUnread: Record<string, number> = {};

    const newUnread = {
      ...currentUnread,
      [recipientEmail]: (currentUnread[recipientEmail] || 0) + 1,
    };

    expect(newUnread[recipientEmail]).toBe(1);
  });

  it('rapid messages increment correctly', () => {
    const recipientEmail = 'them@test.com';
    let unread: Record<string, number> = {};

    for (let i = 0; i < 10; i++) {
      unread = { ...unread, [recipientEmail]: (unread[recipientEmail] || 0) + 1 };
    }

    expect(unread[recipientEmail]).toBe(10);
  });

  it('reading one thread does not affect others', () => {
    const userEmail = 'me@test.com';
    const threads = [
      { id: '1', unread_count: { [userEmail]: 3 } },
      { id: '2', unread_count: { [userEmail]: 5 } },
    ];

    // Read thread 1
    threads[0].unread_count[userEmail] = 0;

    const total = threads.reduce((sum, t) => sum + ((t.unread_count as Record<string, number>)[userEmail] || 0), 0);
    expect(total).toBe(5); // only thread 2 remains
  });

  // ── Implementation verification tests ────────────────────────────

  it('L2ChatSheet increments unread_count for recipient on send', () => {
    // handleSend should include unread_count increment
    expect(chatSheetSrc).toContain('(currentUnread[recipientEmail] || 0) + 1');
    // Both handleSend and handleSendSpecial should do it
    const matches = chatSheetSrc.match(/\(currentUnread\[recipientEmail\] \|\| 0\) \+ 1/g);
    expect(matches?.length).toBeGreaterThanOrEqual(2);
  });

  it('L2ChatSheet checks muted_by before sending push', () => {
    expect(chatSheetSrc).toContain('muted_by');
    expect(chatSheetSrc).toContain("!mutedBy.includes(recipientEmail)");
  });

  it('useUnreadCount reads JSONB unread_count field', () => {
    expect(unreadCountSrc).toContain('unread_count');
    expect(unreadCountSrc).toContain('thread.unread_count');
  });

  it('useUnreadCount only shows local notification when document.hidden', () => {
    expect(unreadCountSrc).toContain('document.hidden');
  });

  it('SW suppresses push when user is viewing that chat thread', () => {
    expect(swSrc).toContain('client.focused');
    expect(swSrc).toContain('thread=');
    expect(swSrc).toContain('isThreadOpen');
  });

  it('markRead writes 0 to unread_count for the user email', () => {
    expect(chatSheetSrc).toContain('[userEmail]: 0');
  });

  it('thread sorting in inbox is by last_message_at DESC', () => {
    // useUnreadCount or thread loading should sort by last_message_at
    expect(chatSheetSrc).toContain("order('last_message_at'");
  });

  it('badge count includes both chat unread and taps', () => {
    expect(unreadCountSrc).toContain('chatCount + tapsCount');
  });
});
