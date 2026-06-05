/**
 * Invitation templates — D59 S1.
 *
 * Three channels, one shared message. The recipient (Paul / Glen / Dean,
 * NOT a HOTMESS user) gets the same emotional information across whichever
 * channel reached them. The actual route (which channels fire) is chosen
 * by the dispatcher based on what the nominator provided.
 *
 * Compliance:
 *   - Safety Posture Invariant      — never claims rescue
 *   - Safety Purpose Invariant      — frames the role as "help them reach you"
 *   - Account-free invariant        — never requires recipient to join HOTMESS
 *   - D15 HOTMESS Care Language     — warm, direct, no insurance-form energy
 *   - D59 §A.1 liability            — never uses "trusted contact" pre-acceptance
 *   - D59 Recipient Identity Amend  — invites recipient to confirm + add their preferences
 *
 * Helpers below take a shared `ctx` object:
 *   nominatorFirstName  — "Phil"
 *   nominatorDisplay    — full display name shown in the message
 *   acceptUrl           — token-bearing acceptance URL
 *   contactFirstName    — what the recipient is called in greeting (falls back to "there")
 */

function inlineEscape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function firstNameOf(full) {
  if (!full) return null;
  const trimmed = String(full).trim();
  if (!trimmed) return null;
  return trimmed.split(/\s+/)[0];
}

/**
 * Email subject — single line, no exclamation marks, no urgency.
 */
export function emailSubject(ctx) {
  const name = ctx.nominatorFirstName || 'Someone you know';
  return `${name} wants you to be there if it matters`;
}

/**
 * Email plain-text body. The HTML variant is a styled version of the same.
 */
export function emailTextBody(ctx) {
  const greet = ctx.contactFirstName ? `Hi ${ctx.contactFirstName},` : 'Hi there,';
  const nominator = ctx.nominatorDisplay || ctx.nominatorFirstName || 'A HOTMESS member';
  const first = ctx.nominatorFirstName || 'They';
  return [
    greet,
    '',
    `${nominator} has added you as someone they trust on HOTMESS.`,
    '',
    `HOTMESS is a queer nightlife platform in London — beacons, radio, members.`,
    `One of the things it does is help members reach the people they trust if`,
    `something happens. ${first} has picked you as one of those people.`,
    '',
    `Before that becomes real, you confirm:`,
    '',
    `  • that the way to reach you is right`,
    `  • how you'd like to be reached if it matters (text? Telegram? a call?)`,
    `  • that you accept this`,
    '',
    `It takes under a minute. You don't need a HOTMESS account.`,
    '',
    `Confirm here: ${ctx.acceptUrl}`,
    '',
    `If this isn't for you, you can decline on the same page. ${first} will be`,
    `told kindly. No drama.`,
    '',
    `— HOTMESS`,
  ].join('\n');
}

/**
 * Email HTML body. Plain HTML, brand dark + gold, no external assets.
 */
export function emailHtmlBody(ctx) {
  const greet = ctx.contactFirstName ? `Hi ${inlineEscape(ctx.contactFirstName)},` : 'Hi there,';
  const nominator = inlineEscape(ctx.nominatorDisplay || ctx.nominatorFirstName || 'A HOTMESS member');
  const first = inlineEscape(ctx.nominatorFirstName || 'They');
  const url = inlineEscape(ctx.acceptUrl);
  return `<!DOCTYPE html>
<html><body style="margin:0;padding:24px;background:#050507;font-family:-apple-system,system-ui,sans-serif;color:#fff;">
  <div style="max-width:560px;margin:0 auto;">
    <div style="font-size:14px;color:#C8962C;letter-spacing:1px;margin-bottom:16px;">HOTMESS</div>
    <h1 style="font-size:22px;font-weight:700;line-height:1.3;margin:0 0 24px 0;">
      ${greet}
    </h1>
    <p style="font-size:15px;line-height:1.6;color:rgba(255,255,255,0.85);margin:0 0 16px 0;">
      ${nominator} has added you as someone they trust on HOTMESS.
    </p>
    <p style="font-size:15px;line-height:1.6;color:rgba(255,255,255,0.7);margin:0 0 24px 0;">
      HOTMESS is a queer nightlife platform in London. One of the things it
      does is help members reach the people they trust if something happens.
      ${first} has picked you as one of those people.
    </p>
    <p style="font-size:14px;line-height:1.6;color:rgba(255,255,255,0.6);margin:0 0 8px 0;">
      Before that becomes real, you confirm:
    </p>
    <ul style="font-size:14px;line-height:1.7;color:rgba(255,255,255,0.6);margin:0 0 24px 0;padding-left:20px;">
      <li>that the way to reach you is right</li>
      <li>how you'd like to be reached if it matters</li>
      <li>that you accept this</li>
    </ul>
    <p style="font-size:14px;line-height:1.6;color:rgba(255,255,255,0.6);margin:0 0 32px 0;">
      It takes under a minute. You don't need a HOTMESS account.
    </p>
    <div style="margin:0 0 24px 0;">
      <a href="${url}" style="display:inline-block;padding:14px 28px;background:#C8962C;color:#050507;font-weight:700;text-decoration:none;border-radius:8px;font-size:15px;">
        Confirm your role
      </a>
    </div>
    <p style="font-size:13px;line-height:1.5;color:rgba(255,255,255,0.4);margin:32px 0 0 0;border-top:1px solid rgba(255,255,255,0.08);padding-top:16px;">
      If this isn't for you, you can decline on the same page. ${first}
      will be told kindly. No drama.
    </p>
    <p style="font-size:11px;line-height:1.5;color:rgba(255,255,255,0.25);margin:24px 0 0 0;">
      — HOTMESS
    </p>
  </div>
</body></html>`;
}

/**
 * Telegram body — slightly looser than SMS, fits inline link.
 */
export function telegramBody(ctx) {
  const greet = ctx.contactFirstName ? `Hi ${ctx.contactFirstName} —` : 'Hi —';
  const nominator = ctx.nominatorDisplay || ctx.nominatorFirstName || 'A HOTMESS member';
  const first = ctx.nominatorFirstName || 'They';
  return [
    `${greet}`,
    ``,
    `${nominator} added you as someone they trust on HOTMESS.`,
    ``,
    `One of the things HOTMESS does is help members reach people they trust if something happens. ${first} has picked you.`,
    ``,
    `Before that becomes real, you confirm how you'd like to be reached and that you accept.`,
    ``,
    `Under a minute. No HOTMESS account needed.`,
    ``,
    `Confirm: ${ctx.acceptUrl}`,
    ``,
    `If it isn't for you, decline on the same page. ${first} will be told kindly.`,
    ``,
    `— HOTMESS`,
  ].join('\n');
}

/**
 * SMS body — compressed. Identity-first; URL is the action.
 * Targets ≤320 chars (two segments).
 */
export function smsBody(ctx) {
  const first = ctx.nominatorFirstName || 'A friend';
  const parts = [];
  parts.push(`${first} added you as someone they trust on HOTMESS.`);
  parts.push(`Help them reach you if it matters — confirm how, or decline. Under a minute. No HOTMESS account needed.`);
  parts.push(`${ctx.acceptUrl}`);
  return parts.join(' ');
}

export const __testing = {
  inlineEscape,
  firstNameOf,
};
