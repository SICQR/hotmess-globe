/**
 * safeName — single source of truth for displaying another user's identity.
 *
 * Phil 2026-05-28 P0: an email address was rendered as a chat contact name
 * because `display_name || email` fallbacks existed across the app. In a
 * queer platform this can out a user, enable harassment, or end the app.
 * Sacred Invariant: a real user email NEVER appears to another user.
 *
 * Rules:
 *   - If display_name is set, use it.
 *   - If display_name is missing, use 'Member'. Never the email. Never a
 *     username-from-email split. Never the user_id (cosmetically ugly + can
 *     correlate across surfaces).
 *
 * Always go through this helper when rendering another user's name.
 *
 * If you find yourself doing `something || email` to display to a user,
 * STOP. Use safeName(something). The eslint rule + unit test in this
 * directory will fail the build if email-as-fallback is ever re-introduced.
 */

type UserLike = {
  display_name?: string | null;
  displayName?: string | null;
  name?: string | null;
  // Phil 2026-06-01 Task #520 — username is part of the public identity
  // ladder per D10 + D485. safeName drops through to it when display_name
  // is missing rather than collapsing straight to a generic fallback.
  username?: string | null;
  // The fields below MUST NOT be used as display fallbacks. Listed for type
  // completeness only.
  email?: string | null;
  id?: string | null;
} | null | undefined;

// Phil 2026-06-01 Task #520 — was 'Member', which is also a tier word in
// this product. Every conversation row whose counterpart hadn't resolved
// rendered "Member" and visually labelled the person as a tier instead of
// a person. Matches D485 (UserProfile fallback "HOTMESS member" → Anonymous)
// and the inbox RPC fix shipped earlier today.
const ANONYMOUS_LABEL = 'Anonymous';

/**
 * Safe display name for ANY other user. Never returns an email.
 *
 * Ladder (Phil 2026-06-01 Task #520):
 *   display_name -> username -> fallback ('Anonymous' by default)
 *
 * Both display_name and username are rejected if they contain '@' to guard
 * against bad data being rendered as identity. This preserves the Sacred
 * Invariant that a real user email NEVER appears to another user.
 */
export function safeName(user: UserLike, fallback: string = ANONYMOUS_LABEL): string {
  if (!user) return fallback;
  const candidates: Array<unknown> = [user.display_name, user.displayName, user.name, user.username];
  for (const c of candidates) {
    if (typeof c === 'string') {
      const trimmed = c.trim();
      if (trimmed && !trimmed.includes('@')) return trimmed;
    }
  }
  return fallback;
}

/**
 * Safe display name for the currently signed-in user (self). May still
 * include the user's own email in places like Settings → Account info, where
 * the user is looking at their own data. Use the explicit `selfEmail()`
 * helper for those cases — this one defaults to safe-by-default behavior.
 */
export const safeSelfName = safeName;

/**
 * Explicit helper for the rare cases where it IS correct to show an email
 * (e.g. Settings showing your own email, password reset confirm screens).
 * Importing this function makes the intent visible at the call site so
 * code review can catch misuse.
 */
export function selfEmailForOwnAccount(email: string | null | undefined): string {
  return (email || '').trim() || '—';
}
