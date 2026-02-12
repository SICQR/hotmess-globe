import { getSupabaseServerClients, getAuthedUser, getBearerToken, json } from '../routing/_utils.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'Method not allowed' });
  }

  const { ticket_id, recipient_email, resale_price } = req.body;

  if (!ticket_id || !recipient_email) {
    return json(res, 400, { error: 'Missing ticket_id or recipient_email' });
  }

  const accessToken = getBearerToken(req);
  if (!accessToken) return json(res, 401, { error: 'Missing bearer token' });

  const { serviceClient, anonClient } = getSupabaseServerClients();
  const { user, error: userError } = await getAuthedUser({ anonClient, accessToken });

  if (userError || !user) return json(res, 401, { error: 'Unauthorized' });

  // 1. Fetch Ticket + Beacon info
  // We use foreign table join to get price.
  const { data: ticket, error: ticketError } = await serviceClient
    .from('event_rsvps')
    .select(`
      id, 
      user_id, 
      user_email, 
      beacon_id, 
      Beacon:beacon_id (
        id, 
        ticket_price_cents
      )
    `)
    .eq('id', ticket_id)
    .single();

  if (ticketError || !ticket) {
    return json(res, 404, { error: 'Ticket not found' });
  }

  // 2. Verify Ownership
  const ownerId = ticket.user_id;
  const ownerEmail = ticket.user_email;
  
  // Check against user.id and fallback to email match if needed
  const isOwner = (ownerId && ownerId === user.id) || 
                  (ownerEmail && String(ownerEmail).toLowerCase() === String(user.email).toLowerCase());

  if (!isOwner) {
    return json(res, 403, { error: 'You do not own this ticket' });
  }

  // 3. Check Price Cap (Anti-Scalp)
  // Max markup: 10%
  const originalPrice = ticket.Beacon?.ticket_price_cents || 0;
  const maxPrice = Math.floor(originalPrice * 1.10);

  if (resale_price !== undefined && resale_price > maxPrice) {
    return json(res, 400, { 
      error: 'Price cap exceeded', 
      details: `Max resale price is ${(maxPrice / 100).toFixed(2)}` 
    });
  }

  // 4. Find Recipient
  // Using serviceClient to search users by email
  const { data: recipient, error: recipientError } = await serviceClient
    .from('User')
    .select('id, email')
    .eq('email', recipient_email)
    .maybeSingle();

  if (recipientError || !recipient) {
    return json(res, 404, { error: 'Recipient user not found' });
  }

  if (recipient.id === user.id) {
    return json(res, 400, { error: 'Cannot transfer to yourself' });
  }

  // 5. Transfer Ticket
  // Update both user_id and user_email to be safe across schema versions
  const { error: updateError } = await serviceClient
    .from('event_rsvps')
    .update({
      user_id: recipient.id,
      user_email: recipient.email
    })
    .eq('id', ticket_id);

  if (updateError) {
    return json(res, 500, { error: 'Transfer failed', details: updateError.message });
  }

  return json(res, 200, { success: true, message: 'Ticket transferred successfully' });
}
