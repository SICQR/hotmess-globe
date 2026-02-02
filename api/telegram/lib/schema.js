/**
 * @typedef {Object} TelegramRoom
 * @property {string} id - UUID
 * @property {string} chat_id - Telegram Chat ID (e.g., "-100123456789")
 * @property {string} name - Display name (e.g., "Soho Alerts")
 * @property {string} purpose - 'social' | 'alert' | 'vip' | 'event_temporary'
 * @property {Object} geo_fence - { lat: number, lng: number, radius_meters: number }
 * @property {string|null} linked_beacon_id - If tied to an event beacon
 * @property {string} status - 'active' | 'archived' | 'pending'
 * @property {Object} settings - { requires_chrome: boolean, auto_archive_at: string }
 * @property {string} created_at - ISO String
 */

export const ROOM_PURPOSES = {
  SOCIAL: 'social',
  ALERT: 'alert',
  VIP: 'vip',
  EVENT_TEMP: 'event_temporary'
};

export const ROOM_STATUS = {
  ACTIVE: 'active',
  ARCHIVED: 'archived',
  PENDING: 'pending'
};

/**
 * SQL Schema Reference (for Supabase):
 * 
 * create table telegram_rooms (
 *   id uuid default gen_random_uuid() primary key,
 *   chat_id text unique not null,
 *   name text not null,
 *   purpose text not null,
 *   geo_fence jsonb, -- { lat, lng, radius }
 *   linked_beacon_id uuid references "Beacon"(id),
 *   status text default 'active',
 *   settings jsonb default '{}',
 *   created_at timestamptz default now()
 * );
 */
