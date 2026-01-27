import { getBearerToken, json } from '../shopify/_utils.js';
import { getSupabaseServerClients } from '../routing/_utils.js';

/**
 * Import Telegram username to user profile
 * POST /api/telegram/import-username
 * 
 * This endpoint:
 * 1. Checks if user has a connected Telegram account
 * 2. Gets the Telegram username
 * 3. Validates it's available (not taken by another user)
 * 4. Updates the user's profile username
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'Method not allowed' });
  }

  const accessToken = getBearerToken(req);
  if (!accessToken) {
    return json(res, 401, { error: 'Unauthorized' });
  }

  const { error: supaErr, serviceClient } = getSupabaseServerClients();

  if (supaErr || !serviceClient) {
    return json(res, 500, { error: 'Database connection failed' });
  }

  try {
    // Get current user
    const { data: { user }, error: authError } = await serviceClient.auth.getUser(accessToken);
    
    if (authError || !user) {
      return json(res, 401, { error: 'Unauthorized' });
    }

    // Check if user has connected Telegram
    const { data: telegramUser, error: telegramError } = await serviceClient
      .from('telegram_users')
      .select('username, first_name')
      .eq('user_id', user.id)
      .maybeSingle();

    if (telegramError) {
      console.error('[telegram/import-username] Telegram lookup error:', telegramError);
      return json(res, 500, { error: 'Failed to check Telegram connection' });
    }

    if (!telegramUser) {
      return json(res, 400, { error: 'No Telegram account connected' });
    }

    if (!telegramUser.username) {
      return json(res, 400, { 
        error: 'Your Telegram account does not have a username set. Please set a username in Telegram first.' 
      });
    }

    const telegramUsername = telegramUser.username.trim();

    // Check if this username is already taken by another user
    const { data: existingUser, error: checkError } = await serviceClient
      .from('User')
      .select('id, auth_user_id')
      .ilike('username', telegramUsername)
      .maybeSingle();

    if (checkError) {
      console.error('[telegram/import-username] Username check error:', checkError);
      return json(res, 500, { error: 'Failed to check username availability' });
    }

    // If username exists and belongs to another user, it's taken
    if (existingUser && existingUser.auth_user_id !== user.id) {
      return json(res, 400, { 
        error: 'This Telegram username is already in use by another account',
        username: telegramUsername,
        available: false
      });
    }

    // Update the user's profile with the Telegram username
    const { error: updateError } = await serviceClient
      .from('User')
      .update({ 
        username: telegramUsername,
        updated_at: new Date().toISOString()
      })
      .eq('auth_user_id', user.id);

    if (updateError) {
      console.error('[telegram/import-username] Update error:', updateError);
      return json(res, 500, { error: 'Failed to update username' });
    }

    return json(res, 200, { 
      success: true, 
      username: telegramUsername,
      message: 'Username imported from Telegram successfully'
    });
  } catch (err) {
    console.error('[telegram/import-username] Unexpected error:', err);
    return json(res, 500, { error: 'Failed to import Telegram username' });
  }
}
