import { getBearerToken, json, getQueryParam } from '../shopify/_utils.js';
import { getSupabaseServerClients } from '../routing/_utils.js';

/**
 * Username validation rules:
 * - 3-20 characters
 * - Alphanumeric and underscores only
 * - Case insensitive for uniqueness checks
 */
const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

const validateUsernameFormat = (username) => {
  if (!username || typeof username !== 'string') {
    return { valid: false, error: 'Username is required' };
  }
  
  const trimmed = username.trim();
  
  if (trimmed.length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters' };
  }
  
  if (trimmed.length > 20) {
    return { valid: false, error: 'Username must be 20 characters or less' };
  }
  
  if (!USERNAME_REGEX.test(trimmed)) {
    return { valid: false, error: 'Username can only contain letters, numbers, and underscores' };
  }
  
  // Reserved usernames
  const reserved = ['admin', 'hotmess', 'support', 'help', 'moderator', 'mod', 'system', 'null', 'undefined'];
  if (reserved.includes(trimmed.toLowerCase())) {
    return { valid: false, error: 'This username is reserved' };
  }
  
  return { valid: true, username: trimmed };
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return json(res, 405, { error: 'Method not allowed' });
  }

  const username = getQueryParam(req, 'username');
  
  // Validate format first
  const validation = validateUsernameFormat(username);
  if (!validation.valid) {
    return json(res, 200, { 
      available: false, 
      error: validation.error,
      valid: false 
    });
  }

  const { error: supaErr, serviceClient } = getSupabaseServerClients();

  if (supaErr || !serviceClient) {
    return json(res, 500, { error: 'Database connection failed' });
  }

  try {
    // Check if username is already taken (case-insensitive)
    const { data, error } = await serviceClient
      .from('User')
      .select('id')
      .ilike('username', validation.username)
      .maybeSingle();

    if (error) {
      console.error('[username/check] Database error:', error);
      return json(res, 500, { error: 'Failed to check username availability' });
    }

    // Get current user to exclude them from the check (for profile editing)
    const accessToken = getBearerToken(req);
    let currentUserId = null;
    
    if (accessToken) {
      const { data: { user } } = await serviceClient.auth.getUser(accessToken);
      if (user) {
        // Get user's current record
        const { data: currentUser } = await serviceClient
          .from('User')
          .select('id, username')
          .eq('auth_user_id', user.id)
          .maybeSingle();
        
        // If the username belongs to the current user, it's available for them
        if (currentUser && data && currentUser.id === data.id) {
          return json(res, 200, { 
            available: true, 
            valid: true,
            username: validation.username 
          });
        }
      }
    }

    const available = !data;

    return json(res, 200, { 
      available, 
      valid: true,
      username: validation.username,
      error: available ? null : 'Username is already taken'
    });
  } catch (err) {
    console.error('[username/check] Unexpected error:', err);
    return json(res, 500, { error: 'Failed to check username availability' });
  }
}
