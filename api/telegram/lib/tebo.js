import { ROOM_PURPOSES, ROOM_STATUS } from './schema.js';

export class TeboNetwork {
  /**
   * @param {Object} supabase - Supabase client instance
   * @param {string} botToken - Telegram Bot Token
   */
  constructor(supabase, botToken) {
    this.supabase = supabase;
    this.botToken = botToken;
    this.apiUrl = `https://api.telegram.org/bot${botToken}`;
  }

  /**
   * Registers or updates a room in the network
   */
  async registerRoom(chatId, title, purpose = ROOM_PURPOSES.SOCIAL, extraData = {}) {
    const { data, error } = await this.supabase
      .from('telegram_rooms')
      .upsert({
        chat_id: chatId.toString(),
        name: title,
        purpose,
        status: ROOM_STATUS.ACTIVE,
        ...extraData,
        updated_at: new Date().toISOString()
      }, { onConflict: 'chat_id' })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * 3.1 Auto-create a temporary room for an Event Beacon
   * Note: Since bots cannot create groups via API, this logic assumes 
   * we are repurposing an available pool room or user manually added bot.
   * For prototype: We create a DB entry and return a "mock" chat link.
   */
  async createEventRoom(beacon) {
    console.log(`[Tebo] Spiking room for beacon: ${beacon.event_title}`);
    
    // Mock: In a real scenario, this would claim an empty group from a pool
    const mockChatId = `-100${Math.floor(Math.random() * 1000000000)}`; 
    
    const room = await this.registerRoom(mockChatId, `🔥 ${beacon.event_title} Chat`, ROOM_PURPOSES.EVENT_TEMP, {
      linked_beacon_id: beacon.id,
      geo_fence: {
        lat: beacon.location.lat,
        lng: beacon.location.lng,
        radius_meters: 500
      },
      settings: {
        auto_archive_at: beacon.event_end || new Date(Date.now() + 86400000).toISOString()
      }
    });

    // Announce in the room (Mock call)
    await this.sendMessage(mockChatId, `
🏗 *Room Created*
Welcome to the temporary chat for *${beacon.event_title}*.
This room will auto-archive when the event ends.
    `.trim());

    return room;
  }

  /**
   * 3.2 Auto-archive rooms
   */
  async archiveRoom(chatId) {
    console.log(`[Tebo] Archiving room ${chatId}`);

    // 1. Notify users
    await this.sendMessage(chatId, `
📦 *This Room is Closing*
The event has ended. This chat is now archived.
See you at the next one! 💋
    `.trim());

    // 2. Update DB
    await this.supabase
      .from('telegram_rooms')
      .update({ status: ROOM_STATUS.ARCHIVED })
      .eq('chat_id', chatId);

    // 3. (Optional) Leave chat or restrict permissions
    // await this.apiCall('setChatPermissions', { chat_id: chatId, permissions: { can_send_messages: false } });
  }

  /**
   * 3.3 Inject System Alerts into relevant rooms
   */
  async injectAlert(type, location, message) {
    // Find rooms overlapping with location
    // Note: This requires PostGIS or simple bounding box logic. 
    // Simplified here to just broadcast to 'alert' purpose rooms.
    
    const { data: rooms } = await this.supabase
      .from('telegram_rooms')
      .select('chat_id, name')
      .eq('status', ROOM_STATUS.ACTIVE)
      .eq('purpose', ROOM_PURPOSES.ALERT);

    if (!rooms) return;

    const alertPrefix = type === 'SAFETY' ? '🚨 *SAFETY ALERT*' : '🎁 *DROP ALERT*';

    const promises = rooms.map(room => 
      this.sendMessage(room.chat_id, `${alertPrefix}\n\n${message}`)
    );

    await Promise.all(promises);
    return { sent_to: rooms.length };
  }

  /**
   * 4. VIP Access Control
   * Checks if a Telegram user is a CHROME member
   */
  async checkVipAccess(chatId, telegramUserId) {
    // 1. Get room settings
    const { data: room } = await this.supabase
      .from('telegram_rooms')
      .select('settings, purpose')
      .eq('chat_id', chatId.toString())
      .single();

    if (!room) return true; // Default allow if unknown room
    
    // Only check if it's a VIP room
    if (room.purpose !== ROOM_PURPOSES.VIP && !room.settings?.requires_chrome) {
      return true;
    }

    // 2. Check user tier
    const { data: userLink } = await this.supabase
      .from('telegram_users')
      .select('User:user_id (tier)')
      .eq('telegram_id', telegramUserId.toString())
      .single();

    if (!userLink || !userLink.User || userLink.User.tier !== 'CHROME') {
      return false;
    }

    return true;
  }

  /**
   * Helper: Send Message
   */
  async sendMessage(chatId, text, options = {}) {
    try {
      const res = await fetch(`${this.apiUrl}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'Markdown',
          ...options
        })
      });
      return res.json();
    } catch (e) {
      console.error('[Tebo] Send failed:', e);
    }
  }

  /**
   * Helper: Kick User
   */
  async kickUser(chatId, userId) {
    try {
      await fetch(`${this.apiUrl}/banChatMember`, { // ban unbans if until_date is short, or use kick logic
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          user_id: userId,
          until_date: Math.floor(Date.now() / 1000) + 60 // Ban for 1 minute (effectively a kick)
        })
      });
    } catch (e) {
      console.error('[Tebo] Kick failed:', e);
    }
  }
}
