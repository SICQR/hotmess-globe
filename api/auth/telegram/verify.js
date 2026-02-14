/**
 * Telegram Authentication Verification API
 * 
 * Verifies the hash from Telegram Login Widget to ensure the auth data is genuine.
 * @see https://core.telegram.org/widgets/login#checking-authorization
 */

import crypto from 'crypto';
import { getEnv } from '../_utils/validateEnv.js';

/**
 * Verify Telegram auth data using HMAC-SHA256
 * The data_check_string is created by sorting all received fields alphabetically
 * and joining them as key=value pairs with newlines.
 * The hash is HMAC-SHA256(data_check_string, SHA256(bot_token)).
 */
function verifyTelegramAuth(authData, botToken) {
  const { hash, ...data } = authData;
  
  if (!hash) {
    return { verified: false, error: 'Missing hash' };
  }

  // Check auth_date is recent (within 24 hours)
  const authDate = parseInt(data.auth_date, 10);
  const now = Math.floor(Date.now() / 1000);
  if (now - authDate > 86400) {
    return { verified: false, error: 'Auth data expired' };
  }

  // Sort keys and create data_check_string
  const dataCheckArr = Object.keys(data)
    .sort()
    .map(key => `${key}=${data[key]}`);
  const dataCheckString = dataCheckArr.join('\n');

  // Create secret key from bot token
  const secretKey = crypto
    .createHash('sha256')
    .update(botToken)
    .digest();

  // Calculate expected hash
  const expectedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  if (hash !== expectedHash) {
    return { verified: false, error: 'Invalid hash' };
  }

  return {
    verified: true,
    user: {
      id: data.id,
      first_name: data.first_name,
      last_name: data.last_name,
      username: data.username,
      photo_url: data.photo_url,
      auth_date: authDate
    }
  };
}

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Validate bot token early
  const botToken = getEnv('TELEGRAM_BOT_TOKEN', ['VITE_TELEGRAM_BOT_TOKEN']);
  if (!botToken) {
    return res.status(500).json({ 
      error: 'Telegram authentication not configured',
      verified: false 
    });
  }

  try {
    const authData = req.body;

    if (!authData || typeof authData !== 'object') {
      return res.status(400).json({ error: 'Invalid request body' });
    }

    // Required fields from Telegram
    const requiredFields = ['id', 'first_name', 'auth_date', 'hash'];
    const missingFields = requiredFields.filter(field => !authData[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        error: 'Missing required fields', 
        missing: missingFields 
      });
    }

    const result = verifyTelegramAuth(authData, botToken);

    if (!result.verified) {
      return res.status(401).json({ 
        error: result.error || 'Verification failed',
        verified: false 
      });
    }

    return res.status(200).json({
      verified: true,
      user: result.user,
      message: 'Telegram authentication verified'
    });

  } catch (error) {
    return res.status(500).json({ 
      error: 'Internal server error',
      verified: false 
    });
  }
}
