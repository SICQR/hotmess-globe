import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function classifyMessage(body = '') {
  const text = body.toLowerCase();
  if (text.includes('lube') || text.includes('hnh') || text.includes('order') || text.includes('bottle')) return 'hnh_mess';
  if (text.includes('hotmess') || text.includes('event') || text.includes('promo') || text.includes('ticket')) return 'hotmess';
  if (text.includes('plugin') || text.includes('smash') || text.includes('granule') || text.includes('track')) return 'music';
  if (text.includes('court') || text.includes('legal') || text.includes('wow workspace')) return 'legal';
  if (text.includes('invoice') || text.includes('payment') || text.includes('pay')) return 'finance';
  return 'personal';
}

export default async function handler(req, res) {
  // GET = Meta webhook verification
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }
    return res.status(403).send('Forbidden');
  }

  // POST = incoming message
  if (req.method === 'POST') {
    try {
      const body = req.body;
      const messages = body?.entry?.[0]?.changes?.[0]?.value?.messages;
      const contacts = body?.entry?.[0]?.changes?.[0]?.value?.contacts;
      const metadata = body?.entry?.[0]?.changes?.[0]?.value?.metadata;

      if (!messages?.length) return res.status(200).json({ status: 'ok' });

      const nameMap = {};
      contacts?.forEach(c => { nameMap[c.wa_id] = c.profile?.name || null; });

      const rows = messages.map(msg => ({
        message_id: msg.id,
        from_number: msg.from,
        from_name: nameMap[msg.from] || null,
        to_number: metadata?.display_phone_number || null,
        body: msg.text?.body || msg.caption || null,
        message_type: msg.type || 'text',
        thread_id: msg.from,
        timestamp: new Date(parseInt(msg.timestamp) * 1000).toISOString(),
        raw_payload: msg,
        category: classifyMessage(msg.text?.body || msg.caption || ''),
        is_read: false,
      }));

      const { error } = await supabase
        .from('whatsapp_messages')
        .upsert(rows, { onConflict: 'message_id', ignoreDuplicates: true });

      if (error) throw error;
      return res.status(200).json({ status: 'ok', saved: rows.length });
    } catch (err) {
      console.error('WhatsApp webhook error:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
