/**
 * canonical chat adapter
 *
 * chat_threads + chat_messages are DEPRECATED 2026-05-07, planned DROP on/after
 * 2026-05-21. Canonical schema = public.conversations + conversation_members +
 * messages.
 *
 * This file exposes a small API in the OLD shape so the 13 React call sites
 * that hardcoded `chat_threads` / `chat_messages` can swap with a 2-line edit
 * each, while the data actually goes to the canonical tables. RLS on the
 * canonical tables is already enforcing the boo-first mutual gate (PR #282 +
 * the canonical migration applied 2026-05-20).
 *
 * Returned objects MIRROR the old chat_threads / chat_messages columns so the
 * downstream React renderers do not need any structural changes:
 *
 *   LegacyThread = {
 *     id, participant_emails, thread_type, active, metadata,
 *     unread_count, last_message, last_message_at, created_at, updated_at
 *   }
 *
 *   LegacyMessage = {
 *     id, thread_id, sender_email, content, message_type, read_by,
 *     media_urls, created_at, created_date, metadata
 *   }
 *
 * The adapter looks up user_id ↔ email through the `profiles` table — every
 * HOTMESS user has a profile row with an email column. The mapping is cached
 * per call to avoid n+1 lookups for thread lists.
 */
import { supabase } from '@/components/utils/supabaseClient';

// ── Shapes returned to legacy callers ─────────────────────────────────────

export interface LegacyThread {
  id: string;
  participant_emails: string[];
  thread_type: 'direct' | 'squad' | 'group';
  active: boolean;
  metadata: Record<string, unknown>;
  unread_count: Record<string, number>;
  last_message: string | null;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LegacyMessage {
  id: string;
  thread_id: string;
  sender_email: string;
  content: string;
  message_type: string;
  read_by: string[];
  media_urls: string[];
  created_at: string;
  created_date: string;
  metadata: Record<string, unknown>;
}

// ── Internal helpers ──────────────────────────────────────────────────────

interface ProfileLite { id: string; email: string }

async function getProfilesById(ids: string[]): Promise<Map<string, ProfileLite>> {
  if (!ids.length) return new Map();
  const { data } = await supabase
    .from('profiles')
    .select('id, email')
    .in('id', Array.from(new Set(ids)));
  const m = new Map<string, ProfileLite>();
  (data || []).forEach((p: any) => m.set(p.id, { id: p.id, email: p.email || '' }));
  return m;
}

async function getProfileIdByEmail(email: string): Promise<string | null> {
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle();
  return data?.id ?? null;
}

async function getMyAuth(): Promise<{ userId: string | null; email: string | null }> {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    userId: session?.user?.id ?? null,
    email: session?.user?.email ?? null,
  };
}

function toLegacyThread(
  c: any,
  members: { user_id: string }[],
  emailMap: Map<string, ProfileLite>,
): LegacyThread {
  const participantEmails = members
    .map((m) => emailMap.get(m.user_id)?.email)
    .filter((e): e is string => Boolean(e));
  return {
    id: c.id,
    participant_emails: participantEmails,
    thread_type: c.is_group ? 'group' : 'direct',
    active: true,
    metadata: c.metadata || {},
    unread_count: c.unread_count || {},
    last_message: c.last_message ?? null,
    last_message_at: c.last_message_at ?? null,
    created_at: c.created_at,
    updated_at: c.updated_at,
  };
}

function toLegacyMessage(m: any, senderEmail: string): LegacyMessage {
  const meta = m.metadata || {};
  return {
    id: m.id,
    thread_id: m.conversation_id,
    sender_email: senderEmail,
    content: m.content || '',
    message_type: (meta.message_type as string) || 'text',
    read_by: (meta.read_by as string[]) || [],
    media_urls: (meta.media_urls as string[]) || (Array.isArray(m.attachments) ? m.attachments : []),
    created_at: m.created_at,
    created_date: m.created_at,
    metadata: meta,
  };
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * List all conversations the current user is a member of, in legacy
 * chat_threads shape. Replaces:
 *   supabase.from('chat_threads').select('*').eq('active', true)
 *     .order('last_message_at', { ascending: false })
 */
export async function listMyThreads(opts: { limit?: number } = {}): Promise<LegacyThread[]> {
  const { userId } = await getMyAuth();
  if (!userId) return [];
  const limit = opts.limit ?? 50;

  // 1. My memberships
  const { data: myMembers } = await supabase
    .from('conversation_members')
    .select('conversation_id')
    .eq('user_id', userId);
  const convIds = (myMembers || []).map((r: any) => r.conversation_id);
  if (!convIds.length) return [];

  // 2. Conversations
  const { data: convs } = await supabase
    .from('conversations')
    .select('*')
    .in('id', convIds)
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .limit(limit);

  // 3. All members for those convs
  const { data: allMembers } = await supabase
    .from('conversation_members')
    .select('conversation_id, user_id')
    .in('conversation_id', (convs || []).map((c: any) => c.id));

  const memberIds = (allMembers || []).map((m: any) => m.user_id);
  const emailMap = await getProfilesById(memberIds);

  return (convs || []).map((c: any) => {
    const members = (allMembers || []).filter((m: any) => m.conversation_id === c.id);
    return toLegacyThread(c, members, emailMap);
  });
}

/**
 * Find an existing 1:1 conversation between the current user and another user
 * (by email), or create one. Returns the legacy-shaped thread.
 *
 * Replaces:
 *   supabase.from('chat_threads').insert({participant_emails, thread_type:'direct', active:true})
 */
export async function getOrCreateDirectThread(otherEmail: string): Promise<LegacyThread | null> {
  const { userId, email: myEmail } = await getMyAuth();
  if (!userId || !myEmail) return null;
  const otherId = await getProfileIdByEmail(otherEmail);
  if (!otherId) return null;

  // Find existing 1:1 conv where both are members
  const { data: myMembers } = await supabase
    .from('conversation_members')
    .select('conversation_id')
    .eq('user_id', userId);
  const myConvIds = (myMembers || []).map((r: any) => r.conversation_id);
  if (myConvIds.length) {
    const { data: shared } = await supabase
      .from('conversation_members')
      .select('conversation_id')
      .eq('user_id', otherId)
      .in('conversation_id', myConvIds);
    if (shared && shared.length) {
      // Confirm is_group=false
      const candidateIds = shared.map((r: any) => r.conversation_id);
      const { data: directs } = await supabase
        .from('conversations')
        .select('*')
        .in('id', candidateIds)
        .eq('is_group', false)
        .limit(1);
      if (directs && directs.length) {
        const c = directs[0];
        const emailMap = new Map<string, ProfileLite>([
          [userId, { id: userId, email: myEmail }],
          [otherId, { id: otherId, email: otherEmail }],
        ]);
        return toLegacyThread(
          c,
          [{ user_id: userId }, { user_id: otherId }],
          emailMap,
        );
      }
    }
  }

  // Create new direct conv + 2 member rows
  const { data: newConv, error: convErr } = await supabase
    .from('conversations')
    .insert({ is_group: false, created_by: userId })
    .select('*')
    .single();
  if (convErr || !newConv) return null;

  const { error: memErr } = await supabase
    .from('conversation_members')
    .insert([
      { conversation_id: newConv.id, user_id: userId },
      { conversation_id: newConv.id, user_id: otherId },
    ]);
  if (memErr) return null;

  const emailMap = new Map<string, ProfileLite>([
    [userId, { id: userId, email: myEmail }],
    [otherId, { id: otherId, email: otherEmail }],
  ]);
  return toLegacyThread(
    newConv,
    [{ user_id: userId }, { user_id: otherId }],
    emailMap,
  );
}

/**
 * List messages in a thread, newest first by default.
 * Replaces: supabase.from('chat_messages').select('*').eq('thread_id', X)
 */
export async function listMessages(
  threadId: string,
  opts: { limit?: number; order?: 'asc' | 'desc' } = {},
): Promise<LegacyMessage[]> {
  const limit = opts.limit ?? 200;
  const ascending = opts.order !== 'desc';
  const { data: rows } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', threadId)
    .order('created_at', { ascending })
    .limit(limit);

  const senderIds = (rows || []).map((r: any) => r.sender_id);
  const emailMap = await getProfilesById(senderIds);

  return (rows || []).map((m: any) =>
    toLegacyMessage(m, emailMap.get(m.sender_id)?.email || ''),
  );
}

/**
 * Send a message into a thread. Replaces:
 *   supabase.from('chat_messages').insert({ thread_id, sender_email, content, message_type })
 */
export async function sendMessage(args: {
  threadId: string;
  content: string;
  messageType?: string;
  mediaUrls?: string[];
  metadata?: Record<string, unknown>;
}): Promise<{ ok: boolean; data: LegacyMessage | null; error: string | null }> {
  const { userId, email: myEmail } = await getMyAuth();
  if (!userId) return { ok: false, data: null, error: 'not_authenticated' };

  const meta = {
    message_type: args.messageType ?? 'text',
    ...(args.mediaUrls?.length ? { media_urls: args.mediaUrls } : {}),
    ...(args.metadata ?? {}),
  };

  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: args.threadId,
      sender_id: userId,
      content: args.content,
      metadata: meta,
    })
    .select('*')
    .single();

  if (error) return { ok: false, data: null, error: error.message };

  // Bump the conversation's last_message snapshot (RLS allows the sender to
  // update conversations they are a member of)
  await supabase
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', args.threadId);

  return {
    ok: true,
    data: toLegacyMessage(data, myEmail || ''),
    error: null,
  };
}

/**
 * Mark messages as read by the current user (stored in messages.metadata.read_by uuid[]).
 * Replaces ad-hoc updates to chat_threads.unread_count + chat_messages.read_by.
 */
export async function markThreadRead(threadId: string): Promise<void> {
  const { userId } = await getMyAuth();
  if (!userId) return;

  const { data: unread } = await supabase
    .from('messages')
    .select('id, metadata')
    .eq('conversation_id', threadId)
    .limit(200);

  const toUpdate = (unread || []).filter((m: any) => {
    const readBy = (m.metadata?.read_by as string[]) || [];
    return !readBy.includes(userId);
  });

  await Promise.all(
    toUpdate.map(async (m: any) => {
      const readBy = ((m.metadata?.read_by as string[]) || []).concat(userId);
      const newMeta = { ...(m.metadata || {}), read_by: readBy };
      await supabase.from('messages').update({ metadata: newMeta }).eq('id', m.id);
    }),
  );
}

/**
 * Subscribe to new messages on a thread (canonical realtime channel).
 * Returns the unsubscribe handle.
 */
export function subscribeToThread(
  threadId: string,
  onMessage: (m: LegacyMessage) => void,
) {
  const channel = supabase
    .channel(`thread:${threadId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${threadId}` },
      async (payload) => {
        const m: any = payload.new;
        // Resolve sender email for the legacy renderer
        const { data: prof } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', m.sender_id)
          .maybeSingle();
        onMessage(toLegacyMessage(m, prof?.email || ''));
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
