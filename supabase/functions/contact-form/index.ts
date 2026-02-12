// Supabase Edge Function: contact-form
// Sends contact form submissions via Resend

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ContactFormData {
  name: string
  email: string
  message: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY not configured')
    }

    const data: ContactFormData = await req.json()
    const { name, email, message } = data

    // Validate input
    if (!name || !email || !message) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Send email via Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'theLab21 Website <noreply@thelab21.de>',
        to: ['kontakt@thelab21.de'],
        reply_to: email,
        subject: `Kontaktanfrage von ${name}`,
        html: `
          <h2>Neue Kontaktanfrage über thelab21.de</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>E-Mail:</strong> <a href="mailto:${email}">${email}</a></p>
          <hr />
          <p><strong>Nachricht:</strong></p>
          <p style="white-space: pre-wrap;">${message}</p>
        `,
        text: `Neue Kontaktanfrage über thelab21.de\n\nName: ${name}\nE-Mail: ${email}\n\nNachricht:\n${message}`,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Resend error:', errorData)
      throw new Error('Failed to send email')
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: 'Failed to send message' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
