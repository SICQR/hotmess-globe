import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Email templates
const EMAIL_TEMPLATES = {
  welcome: {
    subject: 'Welcome to HOTMESS 🔥',
    html: (data: { name: string }) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #000; color: #fff; padding: 40px;">
        <h1 style="color: #FF1493; font-size: 32px; margin-bottom: 20px;">Welcome to HOTMESS</h1>
        <p style="font-size: 16px; line-height: 1.6; color: #ccc;">
          Hey ${data.name || 'there'},
        </p>
        <p style="font-size: 16px; line-height: 1.6; color: #ccc;">
          You're now part of London's most connected nightlife community. Get ready to discover events, 
          connect with like-minded people, and unlock unforgettable experiences.
        </p>
        <div style="background: linear-gradient(135deg, #FF1493 0%, #B026FF 100%); padding: 20px; margin: 30px 0; text-align: center;">
          <p style="font-size: 18px; margin: 0; font-weight: bold;">Start exploring now</p>
        </div>
        <p style="font-size: 14px; color: #666;">
          Questions? Reply to this email or contact us at hello@hotmess.london
        </p>
        <p style="font-size: 12px; color: #444; margin-top: 40px; text-align: center;">
          HOTMESS London OS • 18+ • Consent-first • Care always
        </p>
      </div>
    `,
  },
  
  subscription_confirmed: {
    subject: 'Your HOTMESS subscription is active 🎉',
    html: (data: { name: string; tier: string }) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #000; color: #fff; padding: 40px;">
        <h1 style="color: #FF1493; font-size: 32px; margin-bottom: 20px;">Subscription Confirmed</h1>
        <p style="font-size: 16px; line-height: 1.6; color: #ccc;">
          Hey ${data.name || 'there'},
        </p>
        <p style="font-size: 16px; line-height: 1.6; color: #ccc;">
          Your <strong style="color: #00D9FF;">${data.tier?.toUpperCase() || 'PREMIUM'}</strong> subscription is now active!
        </p>
        <p style="font-size: 16px; line-height: 1.6; color: #ccc;">
          You now have access to all premium features including 2x XP multiplier, stealth mode, and more.
        </p>
        <p style="font-size: 12px; color: #444; margin-top: 40px; text-align: center;">
          HOTMESS London OS • 18+ • Consent-first • Care always
        </p>
      </div>
    `,
  },

  subscription_cancelled: {
    subject: 'Your HOTMESS subscription has been cancelled',
    html: (data: { name: string; endsAt: string }) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #000; color: #fff; padding: 40px;">
        <h1 style="color: #FF1493; font-size: 32px; margin-bottom: 20px;">Subscription Cancelled</h1>
        <p style="font-size: 16px; line-height: 1.6; color: #ccc;">
          Hey ${data.name || 'there'},
        </p>
        <p style="font-size: 16px; line-height: 1.6; color: #ccc;">
          Your subscription has been cancelled. You'll retain access to premium features until ${data.endsAt}.
        </p>
        <p style="font-size: 16px; line-height: 1.6; color: #ccc;">
          Changed your mind? You can resubscribe anytime from your account settings.
        </p>
        <p style="font-size: 12px; color: #444; margin-top: 40px; text-align: center;">
          HOTMESS London OS • 18+ • Consent-first • Care always
        </p>
      </div>
    `,
  },

  support_ticket_created: {
    subject: 'We received your support request [#${ticketId}]',
    html: (data: { name: string; ticketId: string; subject: string }) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #000; color: #fff; padding: 40px;">
        <h1 style="color: #FF1493; font-size: 32px; margin-bottom: 20px;">Support Request Received</h1>
        <p style="font-size: 16px; line-height: 1.6; color: #ccc;">
          Hey ${data.name || 'there'},
        </p>
        <p style="font-size: 16px; line-height: 1.6; color: #ccc;">
          We've received your support request regarding: <strong>${data.subject}</strong>
        </p>
        <p style="font-size: 14px; color: #888;">
          Ticket ID: #${data.ticketId}
        </p>
        <p style="font-size: 16px; line-height: 1.6; color: #ccc;">
          Our team will get back to you within 24-48 hours. For urgent safety concerns, email safety@hotmess.london directly.
        </p>
        <p style="font-size: 12px; color: #444; margin-top: 40px; text-align: center;">
          HOTMESS London OS • 18+ • Consent-first • Care always
        </p>
      </div>
    `,
  },

  event_reminder: {
    subject: 'Reminder: ${eventName} is coming up!',
    html: (data: { name: string; eventName: string; eventDate: string; eventLocation: string }) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #000; color: #fff; padding: 40px;">
        <h1 style="color: #FF1493; font-size: 32px; margin-bottom: 20px;">Event Reminder 📅</h1>
        <p style="font-size: 16px; line-height: 1.6; color: #ccc;">
          Hey ${data.name || 'there'},
        </p>
        <p style="font-size: 16px; line-height: 1.6; color: #ccc;">
          Just a reminder that <strong style="color: #00D9FF;">${data.eventName}</strong> is coming up!
        </p>
        <div style="background: #111; padding: 20px; margin: 20px 0; border-left: 4px solid #FF1493;">
          <p style="margin: 0; color: #fff;"><strong>When:</strong> ${data.eventDate}</p>
          <p style="margin: 10px 0 0 0; color: #fff;"><strong>Where:</strong> ${data.eventLocation}</p>
        </div>
        <p style="font-size: 16px; line-height: 1.6; color: #ccc;">
          Don't forget to enable your Right Now status so your friends can find you!
        </p>
        <p style="font-size: 12px; color: #444; margin-top: 40px; text-align: center;">
          HOTMESS London OS • 18+ • Consent-first • Care always
        </p>
      </div>
    `,
  },

  safety_alert: {
    subject: '🚨 Safety Alert from HOTMESS',
    html: (data: { name: string; alertType: string; message: string }) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #000; color: #fff; padding: 40px;">
        <h1 style="color: #FF0000; font-size: 32px; margin-bottom: 20px;">🚨 Safety Alert</h1>
        <p style="font-size: 16px; line-height: 1.6; color: #ccc;">
          ${data.message}
        </p>
        <div style="background: #300; padding: 20px; margin: 20px 0; border: 2px solid #F00;">
          <p style="margin: 0; color: #fff;">
            If you need immediate assistance, please contact emergency services or use the panic button in the app.
          </p>
        </div>
        <p style="font-size: 14px; color: #888;">
          Safety Team: safety@hotmess.london
        </p>
        <p style="font-size: 12px; color: #444; margin-top: 40px; text-align: center;">
          HOTMESS London OS • 18+ • Consent-first • Care always
        </p>
      </div>
    `,
  },
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      throw new Error('Resend API key not configured')
    }

    const { to, template, data } = await req.json()

    if (!to || !template) {
      throw new Error('Missing required parameters: to, template')
    }

    const emailTemplate = EMAIL_TEMPLATES[template as keyof typeof EMAIL_TEMPLATES]
    if (!emailTemplate) {
      throw new Error(`Unknown email template: ${template}`)
    }

    // Replace template variables in subject
    let subject = emailTemplate.subject
    for (const [key, value] of Object.entries(data || {})) {
      subject = subject.replace(`\${${key}}`, String(value))
    }

    const html = emailTemplate.html(data || {})

    // Send email via Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: Deno.env.get('EMAIL_FROM') || 'HOTMESS <noreply@hotmess.london>',
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to send email: ${error}`)
    }

    const result = await response.json()

    return new Response(
      JSON.stringify({ success: true, id: result.id }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Send email error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
