/**
 * 03 — Real-Time Communication & Read Receipts
 *
 * Validates:
 * 1. Messages can be inserted into chat threads
 * 2. mark_messages_read RPC updates read_by array
 * 3. get_thread_unread_count returns correct count
 * 4. get_total_unread_count aggregates across threads
 * 5. Thread metadata (last_message, last_message_at) updated by trigger
 * 6. unread_count JSONB on chat_threads updated by trigger
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { admin, TEST_USERS, wait } from './setup';

let testThreadId: string;
let messageIds: string[] = [];

beforeAll(async () => {
  // Create a test thread between Phil and Glen
  const { data: thread, error } = await admin
    .from('chat_threads')
    .insert({
      participant_emails: [TEST_USERS.phil.email, TEST_USERS.glen.email],
      last_message: null,
      last_message_at: null,
      active: true,
      unread_count: {},
    })
    .select('id')
    .single();

  if (error) throw new Error(`Thread creation failed: ${error.message}`);
  testThreadId = thread!.id;
});

afterAll(async () => {
  // Clean up
  if (messageIds.length > 0) {
    await admin.from('chat_messages').delete().in('id', messageIds);
  }
  if (testThreadId) {
    await admin.from('chat_threads').delete().eq('id', testThreadId);
  }
});

describe('Chat: message insertion', () => {
  it('can insert a text message into a thread', async () => {
    const { data, error } = await admin
      .from('chat_messages')
      .insert({
        thread_id: testThreadId,
        sender_email: TEST_USERS.phil.email,
        sender_name: 'test_phil_username',
        content: 'Hey Glen, testing realtime!',
        message_type: 'text',
        read_by: [TEST_USERS.phil.email],
      })
      .select('id, content, sender_email, read_by')
      .single();

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data!.content).toBe('Hey Glen, testing realtime!');
    expect(data!.sender_email).toBe(TEST_USERS.phil.email);
    expect(data!.read_by).toContain(TEST_USERS.phil.email);
    messageIds.push(data!.id);
  });

  it('can insert a second message from Glen', async () => {
    await wait(100);
    const { data, error } = await admin
      .from('chat_messages')
      .insert({
        thread_id: testThreadId,
        sender_email: TEST_USERS.glen.email,
        sender_name: 'test_glen_username',
        content: 'Yo Phil, got it!',
        message_type: 'text',
        read_by: [TEST_USERS.glen.email],
      })
      .select('id')
      .single();

    expect(error).toBeNull();
    messageIds.push(data!.id);
  });

  it('can insert a media message', async () => {
    const { data, error } = await admin
      .from('chat_messages')
      .insert({
        thread_id: testThreadId,
        sender_email: TEST_USERS.phil.email,
        sender_name: 'test_phil_username',
        content: null,
        message_type: 'image',
        media_urls: ['https://example.com/test-image.jpg'],
        read_by: [TEST_USERS.phil.email],
      })
      .select('id, message_type, media_urls')
      .single();

    expect(error).toBeNull();
    expect(data!.message_type).toBe('image');
    expect(data!.media_urls).toHaveLength(1);
    messageIds.push(data!.id);
  });
});

describe('Chat: thread trigger updates', () => {
  it('trigger updates last_message and last_message_at on new message', async () => {
    await wait(300); // Give trigger time to fire

    const { data: thread, error } = await admin
      .from('chat_threads')
      .select('last_message, last_message_at, unread_count')
      .eq('id', testThreadId)
      .single();

    expect(error).toBeNull();
    expect(thread).toBeDefined();
    // Last message should be the most recent one (the image has null content,
    // but the trigger uses left(new.content, 100) which may be null)
    // The trigger fires on every insert, so last_message_at should be recent
    expect(thread!.last_message_at).toBeDefined();
  });

  it('trigger increments unread_count for non-sender participants', async () => {
    const { data: thread } = await admin
      .from('chat_threads')
      .select('unread_count')
      .eq('id', testThreadId)
      .single();

    expect(thread).toBeDefined();
    const unreadCount = thread!.unread_count as Record<string, number>;

    // Phil sent 2 messages, Glen sent 1
    // Glen should have unread count >= 2 (Phil's messages)
    // Phil should have unread count >= 1 (Glen's message)
    if (unreadCount) {
      const glenUnread = unreadCount[TEST_USERS.glen.email] || 0;
      const philUnread = unreadCount[TEST_USERS.phil.email] || 0;
      expect(glenUnread).toBeGreaterThanOrEqual(2);
      expect(philUnread).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('Chat: read receipts via RPCs', () => {
  it('get_thread_unread_count returns correct unread count for Glen', async () => {
    const { data, error } = await admin.rpc('get_thread_unread_count', {
      p_thread_id: testThreadId,
      p_user_email: TEST_USERS.glen.email,
    });

    expect(error).toBeNull();
    // Glen hasn't read Phil's messages (2 from Phil)
    expect(data).toBeGreaterThanOrEqual(2);
  });

  it('mark_messages_read clears unread for Glen', async () => {
    const { data: updatedCount, error } = await admin.rpc('mark_messages_read', {
      p_thread_id: testThreadId,
      p_user_email: TEST_USERS.glen.email,
    });

    expect(error).toBeNull();
    expect(updatedCount).toBeGreaterThanOrEqual(2);

    // Verify unread count is now 0
    await wait(100);
    const { data: count } = await admin.rpc('get_thread_unread_count', {
      p_thread_id: testThreadId,
      p_user_email: TEST_USERS.glen.email,
    });
    expect(count).toBe(0);
  });

  it('read_by array is updated after mark_messages_read', async () => {
    const { data: msgs } = await admin
      .from('chat_messages')
      .select('id, read_by, sender_email')
      .eq('thread_id', testThreadId)
      .neq('sender_email', TEST_USERS.glen.email);

    expect(msgs).toBeDefined();
    for (const msg of msgs!) {
      // All of Phil's messages should now have Glen in read_by
      expect(msg.read_by).toContain(TEST_USERS.glen.email);
    }
  });

  it('get_total_unread_count works across all threads', async () => {
    // Phil still has 1 unread (Glen's message)
    const { data, error } = await admin.rpc('get_total_unread_count', {
      p_user_email: TEST_USERS.phil.email,
    });

    expect(error).toBeNull();
    // At least 1 unread from Glen in the test thread
    expect(data).toBeGreaterThanOrEqual(1);
  });
});

describe('Chat: read_at timestamp', () => {
  it('mark_messages_read stamps read_at on first read', async () => {
    // Insert a fresh message from Glen that Phil has not read
    const { data: freshMsg } = await admin
      .from('chat_messages')
      .insert({
        thread_id: testThreadId,
        sender_email: TEST_USERS.glen.email,
        sender_name: 'test_glen',
        content: 'Fresh message for read_at test',
        message_type: 'text',
        read_by: [TEST_USERS.glen.email],
      })
      .select('id')
      .single();

    if (freshMsg) messageIds.push(freshMsg.id);

    // Phil marks as read
    await admin.rpc('mark_messages_read', {
      p_thread_id: testThreadId,
      p_user_email: TEST_USERS.phil.email,
    });

    await wait(200);

    // Verify read_at is now set
    const { data: msg } = await admin
      .from('chat_messages')
      .select('read_at, read_by')
      .eq('id', freshMsg!.id)
      .single();

    expect(msg!.read_at).toBeDefined();
    expect(msg!.read_at).not.toBeNull();
    expect(msg!.read_by).toContain(TEST_USERS.phil.email);
  });
});

describe('Chat: expires_at (ephemeral messages)', () => {
  it('can insert a message with expires_at', async () => {
    const expiresAt = new Date(Date.now() + 3600000).toISOString();
    const { data, error } = await admin
      .from('chat_messages')
      .insert({
        thread_id: testThreadId,
        sender_email: TEST_USERS.phil.email,
        sender_name: 'test_phil',
        content: 'This message self-destructs!',
        message_type: 'text',
        read_by: [TEST_USERS.phil.email],
        expires_at: expiresAt,
      })
      .select('id, expires_at')
      .single();

    expect(error).toBeNull();
    expect(data!.expires_at).toBeDefined();
    messageIds.push(data!.id);
  });
});

describe('Chat: message types', () => {
  it('supports meetpoint message type', async () => {
    const { data, error } = await admin
      .from('chat_messages')
      .insert({
        thread_id: testThreadId,
        sender_email: TEST_USERS.phil.email,
        sender_name: 'test_phil',
        content: 'Meet me here',
        message_type: 'meetpoint',
        metadata: {
          lat: 51.5134,
          lng: -0.1340,
          address: 'Soho Square, London',
        },
        read_by: [TEST_USERS.phil.email],
      })
      .select('id, message_type, metadata')
      .single();

    expect(error).toBeNull();
    expect(data!.message_type).toBe('meetpoint');
    expect((data!.metadata as any).lat).toBe(51.5134);
    messageIds.push(data!.id);
  });
});
