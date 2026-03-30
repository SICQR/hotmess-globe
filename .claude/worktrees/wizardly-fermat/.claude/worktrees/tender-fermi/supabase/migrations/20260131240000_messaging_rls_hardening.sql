-- Messaging RLS Hardening
-- Restrict chat access to only participants, add proper unread count tracking

-- ============================================================================
-- SECURE CHAT THREADS RLS
-- ============================================================================

-- Drop overly permissive policies
drop policy if exists chat_threads_select_authenticated on public.chat_threads;
drop policy if exists chat_threads_write_authenticated on public.chat_threads;
drop policy if exists chat_threads_update_authenticated on public.chat_threads;
drop policy if exists chat_threads_delete_authenticated on public.chat_threads;

-- Users can only see threads they're a participant of
create policy chat_threads_select_participant
  on public.chat_threads
  for select
  to authenticated
  using ((auth.jwt() ->> 'email') = any(participant_emails));

-- Users can create threads where they're a participant
create policy chat_threads_insert_participant
  on public.chat_threads
  for insert
  to authenticated
  with check ((auth.jwt() ->> 'email') = any(participant_emails));

-- Participants can update their threads (for muting, metadata, etc.)
create policy chat_threads_update_participant
  on public.chat_threads
  for update
  to authenticated
  using ((auth.jwt() ->> 'email') = any(participant_emails))
  with check ((auth.jwt() ->> 'email') = any(participant_emails));

-- No delete for regular users (soft delete via active flag)
-- Only admins/service role can hard delete

-- ============================================================================
-- SECURE MESSAGES RLS
-- ============================================================================

drop policy if exists messages_select_authenticated on public.messages;
drop policy if exists messages_write_authenticated on public.messages;
drop policy if exists messages_update_authenticated on public.messages;
drop policy if exists messages_delete_authenticated on public.messages;

-- Users can only see messages in threads they're a participant of
create policy messages_select_thread_participant
  on public.messages
  for select
  to authenticated
  using (
    exists (
      select 1 from public.chat_threads t
      where t.id = thread_id
      and (auth.jwt() ->> 'email') = any(t.participant_emails)
    )
  );

-- Users can insert messages in threads they're a participant of
create policy messages_insert_thread_participant
  on public.messages
  for insert
  to authenticated
  with check (
    sender_email = (auth.jwt() ->> 'email')
    and exists (
      select 1 from public.chat_threads t
      where t.id = thread_id
      and (auth.jwt() ->> 'email') = any(t.participant_emails)
    )
  );

-- Users can update messages (mark as read) in their threads
create policy messages_update_thread_participant
  on public.messages
  for update
  to authenticated
  using (
    exists (
      select 1 from public.chat_threads t
      where t.id = thread_id
      and (auth.jwt() ->> 'email') = any(t.participant_emails)
    )
  )
  with check (
    exists (
      select 1 from public.chat_threads t
      where t.id = thread_id
      and (auth.jwt() ->> 'email') = any(t.participant_emails)
    )
  );

-- Only sender can delete their own messages
create policy messages_delete_sender
  on public.messages
  for delete
  to authenticated
  using (sender_email = (auth.jwt() ->> 'email'));

-- ============================================================================
-- UNREAD COUNT FUNCTIONS
-- ============================================================================

-- Function to get unread count for a user in a thread
create or replace function public.get_thread_unread_count(
  p_thread_id uuid,
  p_user_email text
)
returns int
language sql
stable
security definer
as $$
  select count(*)::int
  from public.messages m
  where m.thread_id = p_thread_id
    and m.sender_email != p_user_email
    and not (p_user_email = any(m.read_by));
$$;

-- Function to mark messages as read
create or replace function public.mark_messages_read(
  p_thread_id uuid,
  p_user_email text
)
returns int
language plpgsql
security definer
as $$
declare
  updated_count int;
begin
  update public.messages
  set read_by = array_append(read_by, p_user_email)
  where thread_id = p_thread_id
    and sender_email != p_user_email
    and not (p_user_email = any(read_by));
  
  get diagnostics updated_count = row_count;
  
  -- Update thread's unread_count jsonb
  update public.chat_threads
  set unread_count = unread_count - p_user_email
  where id = p_thread_id;
  
  return updated_count;
end;
$$;

-- Function to get total unread count for a user across all threads
create or replace function public.get_total_unread_count(p_user_email text)
returns int
language sql
stable
security definer
as $$
  select coalesce(sum(
    (select count(*)::int from public.messages m 
     where m.thread_id = t.id 
     and m.sender_email != p_user_email 
     and not (p_user_email = any(m.read_by)))
  ), 0)::int
  from public.chat_threads t
  where p_user_email = any(t.participant_emails)
    and t.active = true;
$$;

-- Trigger to update thread unread counts when message is sent
create or replace function public.update_thread_on_message()
returns trigger
language plpgsql
security definer
as $$
declare
  participant text;
  participants text[];
begin
  -- Update last_message and last_message_at
  update public.chat_threads
  set 
    last_message = left(new.content, 100),
    last_message_at = new.created_at,
    updated_at = now()
  where id = new.thread_id;
  
  -- Increment unread count for all participants except sender
  select participant_emails into participants
  from public.chat_threads
  where id = new.thread_id;
  
  if participants is not null then
    foreach participant in array participants loop
      if participant != new.sender_email then
        update public.chat_threads
        set unread_count = jsonb_set(
          coalesce(unread_count, '{}'::jsonb),
          array[participant],
          to_jsonb(coalesce((unread_count ->> participant)::int, 0) + 1)
        )
        where id = new.thread_id;
      end if;
    end loop;
  end if;
  
  return new;
end;
$$;

drop trigger if exists trg_update_thread_on_message on public.messages;
create trigger trg_update_thread_on_message
after insert on public.messages
for each row execute function public.update_thread_on_message();

-- ============================================================================
-- BOT SESSIONS RLS (also tighten)
-- ============================================================================

drop policy if exists bot_sessions_select_authenticated on public.bot_sessions;
drop policy if exists bot_sessions_write_authenticated on public.bot_sessions;

-- Users can only see sessions they're involved in
create policy bot_sessions_select_participant
  on public.bot_sessions
  for select
  to authenticated
  using (
    initiator_email = (auth.jwt() ->> 'email')
    or target_email = (auth.jwt() ->> 'email')
  );

-- Users can create sessions where they're the initiator
create policy bot_sessions_insert_initiator
  on public.bot_sessions
  for insert
  to authenticated
  with check (initiator_email = (auth.jwt() ->> 'email'));

-- Participants can update session status
create policy bot_sessions_update_participant
  on public.bot_sessions
  for update
  to authenticated
  using (
    initiator_email = (auth.jwt() ->> 'email')
    or target_email = (auth.jwt() ->> 'email')
  );

comment on function public.get_thread_unread_count is 'Get unread message count for a user in a specific thread';
comment on function public.mark_messages_read is 'Mark all messages in a thread as read by user';
comment on function public.get_total_unread_count is 'Get total unread messages across all threads for a user';
