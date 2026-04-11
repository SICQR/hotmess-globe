import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { data: messages, error } = await supabase.rpc('get_whatsapp_daily_summary');
  if (error) return res.status(500).json({ error: error.message });
  if (!messages?.length) return res.status(200).json({ status: 'no messages' });

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const messageText = messages.map(m =>
    `${m.from_name || m.from_number} [${m.category}] — ${m.message_count} messages. Last: "${m.last_message}"`
  ).join('\n');

  const claudeRes = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 500,
    messages: [{
      role: 'user',
      content: `You are Phil Gizzie's business co-founder. Here are his WhatsApp messages from yesterday.
Write a tight 150-word briefing: who needs a reply today, any urgent business signals (orders, payments, leads), one recommended action.
Direct. No waffle. Co-founder tone.

Messages:
${messageText}`
    }]
  });

  const summary = claudeRes.content[0].text;
  const dateStr = new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'HOTMESS OS <os@hotmessldn.com>',
      to: 'phil@hotmessldn.com',
      subject: `📱 WhatsApp Brief — ${dateStr}`,
      html: `
        <div style="font-family:monospace;max-width:600px;margin:0 auto;padding:24px;background:#050507;color:#fff;">
          <h2 style="color:#C8962C;">📱 WhatsApp Daily Brief — ${dateStr}</h2>
          <div style="background:#111;padding:16px;border-radius:8px;white-space:pre-wrap;line-height:1.6;margin-bottom:24px;">${summary}</div>
          <h3 style="color:#888;font-size:12px;text-transform:uppercase;">All Threads (${messages.length})</h3>
          ${messages.map(m => `
            <div style="border-left:3px solid #C8962C;padding-left:12px;margin-bottom:12px;">
              <strong>${m.from_name || m.from_number}</strong>
              <span style="color:#888;font-size:11px;"> [${m.category}] · ${m.message_count} msg${m.message_count !== 1 ? 's' : ''}</span><br/>
              <span style="color:#ccc;font-size:13px;">${(m.last_message || '').substring(0, 120)}${(m.last_message || '').length > 120 ? '…' : ''}</span>
            </div>
          `).join('')}
        </div>
      `,
    }),
  });

  return res.status(200).json({ status: 'sent', threads: messages.length });
}
