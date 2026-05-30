/**
 * errorUtils — Human-friendly error messages for user-facing toasts
 *
 * Maps common Supabase/Postgres/network error codes and messages
 * to friendly copy. Never expose raw technical errors to users.
 */

const ERROR_MAP: Record<string, string> = {
  // Postgres / PostgREST codes
  '42501': 'You don\'t have permission to do that.',
  '23505': 'This already exists. Try refreshing the page.',
  '23503': 'Couldn\'t complete this action — a related record is missing.',
  '23514': 'Some of the information provided isn\'t valid.',
  '42P01': 'Something went wrong on our end. Try again shortly.',
  '42703': 'Something went wrong on our end. Try again shortly.',
  'PGRST116': 'Couldn\'t find what you were looking for.',
  'PGRST301': 'You need to be signed in to do that.',
  'PGRST302': 'You don\'t have permission to do that.',

  // Supabase auth
  'invalid_grant': 'Your session has expired. Please sign in again.',
  'user_not_found': 'Account not found. Check your email and try again.',
  'invalid_credentials': 'Incorrect email or password.',
  'email_not_confirmed': 'Please check your email and confirm your account first.',
  'otp_expired': 'Your verification code has expired. Request a new one.',
  'over_request_rate_limit': 'Too many attempts. Wait a moment and try again.',
  'user_already_exists': 'An account with this email already exists. Try signing in instead.',

  // Network
  'Failed to fetch': 'No internet connection. Check your network and try again.',
  'NetworkError': 'No internet connection. Check your network and try again.',
  'TypeError: Failed to fetch': 'No internet connection. Check your network and try again.',
  'AbortError': 'The request was cancelled. Try again.',
  'TimeoutError': 'This is taking too long. Check your connection and try again.',
};

// Patterns to match in error messages (case-insensitive)
const PATTERN_MAP: Array<[RegExp, string]> = [
  [/row-level security/i, 'You don\'t have permission to do that.'],
  [/policy/i, 'You don\'t have permission to do that.'],
  [/jwt expired/i, 'Your session has expired. Please sign in again.'],
  [/jwt/i, 'Your session has expired. Please sign in again.'],
  [/rate limit/i, 'Too many attempts. Wait a moment and try again.'],
  [/duplicate key/i, 'This already exists. Try refreshing the page.'],
  [/violates.*constraint/i, 'Some of the information provided isn\'t valid.'],
  [/PGRST/i, 'Something went wrong on our end. Try again shortly.'],
  [/42501/i, 'You don\'t have permission to do that.'],
  [/not found/i, 'Couldn\'t find what you were looking for.'],
  [/timeout/i, 'This is taking too long. Check your connection and try again.'],
  [/network/i, 'No internet connection. Check your network and try again.'],
  [/fetch/i, 'Something went wrong. Check your connection and try again.'],
];

/**
 * Convert a raw error into a human-friendly message.
 *
 * Accepts Error objects, Supabase error objects ({ code, message, details }),
 * or plain strings. Falls back to a generic message.
 */
export function humanizeError(
  error: unknown,
  fallback = 'Something went wrong. Try again or contact support.'
): string {
  if (!error) return fallback;

  // Extract code and message from various error shapes
  let code: string | undefined;
  let message: string | undefined;

  if (typeof error === 'string') {
    message = error;
  } else if (error instanceof Error) {
    message = error.message;
    code = (error as unknown as Record<string, unknown>).code as string | undefined;
  } else if (typeof error === 'object' && error !== null) {
    const obj = error as Record<string, unknown>;
    code = (obj.code ?? obj.error_code ?? obj.statusCode) as string | undefined;
    message = (obj.message ?? obj.error_description ?? obj.msg ?? obj.detail) as string | undefined;
  }

  // Try exact code match first
  if (code && ERROR_MAP[code]) {
    return ERROR_MAP[code];
  }

  // Try exact message match
  if (message && ERROR_MAP[message]) {
    return ERROR_MAP[message];
  }

  // Try pattern matching on message
  if (message) {
    for (const [pattern, friendly] of PATTERN_MAP) {
      if (pattern.test(message)) {
        return friendly;
      }
    }
  }

  // Try pattern matching on code
  if (code) {
    for (const [pattern, friendly] of PATTERN_MAP) {
      if (pattern.test(code)) {
        return friendly;
      }
    }
  }

  return fallback;
}
