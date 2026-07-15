import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const emailFrom = Deno.env.get('EMAIL_FROM') || 'Notificaciones Leandro Velasques <onboarding@resend.dev>';

    const body = await req.json();
    const { eventId, subject, message, extraRecipients, testMode, preview } = body;

    if (!eventId || !subject || !message) {
      return new Response(JSON.stringify({ error: 'Missing required fields: eventId, subject, message' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // 1. Fetch event
    const { data: event, error: evErr } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (evErr || !event) {
      return new Response(JSON.stringify({ error: `Event not found: ${evErr?.message}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    // 2. Fetch welcome template to slice header and footer (for design consistency)
    const { data: welcomeTemplate, error: tempErr } = await supabase
      .from('email_templates')
      .select('*')
      .eq('id', 'welcome')
      .single();

    if (tempErr || !welcomeTemplate) {
      return new Response(JSON.stringify({ error: 'Base welcome template not found to copy design.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const welcomeBody = welcomeTemplate.body;
    const startIndex = welcomeBody.indexOf('<td align="center" style="padding:38px 36px 22px 36px;">');
    const endIndex = welcomeBody.indexOf('<!-- Pie institucional -->');

    let headerHtml = '';
    let footerHtml = '';

    if (startIndex !== -1 && endIndex !== -1) {
      headerHtml = welcomeBody.substring(0, startIndex);
      footerHtml = welcomeBody.substring(endIndex);
    } else {
      // Fallback simple HTML if parsing fails
      headerHtml = `
      <!doctype html>
      <html>
      <body style="margin:0; padding:0; background-color:#F3F5F4; font-family:sans-serif;">
        <table width="100%" bgcolor="#F3F5F4" style="padding:20px;">
          <tr>
            <td align="center">
              <table width="600" bgcolor="#ffffff" style="border-radius:12px; overflow:hidden; border:1px solid #E1E6E3;">
      `;
      footerHtml = `
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
      `;
    }

    // Build message container
    const middleHtml = `
          <tr>
            <td style="padding:40px 36px; background-color:#ffffff;">
              <h1 style="margin:0 0 16px 0; color:#285A47; font-size:24px; line-height:1.25; font-weight:700;">
                \${subject}
              </h1>
              <p style="margin:0 0 20px 0; color:#4F4C4D; font-size:16px; line-height:1.6;">
                Hola <strong>\${nombre}</strong>,
              </p>
              <div style="color:#4F4C4D; font-size:15px; line-height:1.65; margin:0;">
                \${message}
              </div>
            </td>
          </tr>
    `;

    const fullTemplate = headerHtml + middleHtml + footerHtml;

    // Handle preview mode
    if (preview === true) {
      const emailHtml = fullTemplate
        .replaceAll('\${subject}', subject)
        .replaceAll('\${message}', message.replace(/\n/g, '<br>')) // Convert text newlines to html
        .replaceAll('\${nombre}', 'Nombre Destinatario (Prueba)')
        .replaceAll('{{evento}}', event.title || '')
        .replaceAll('{{coordinador}}', event.coordinator || 'Leandro Velasques');

      return new Response(JSON.stringify({ success: true, html: emailHtml }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // 3. Fetch active registrations
    const { data: registrations, error: regErr } = await supabase
      .from('registrations')
      .select('*, participants(*)')
      .eq('event_id', eventId)
      .neq('status', 'cancelled');

    if (regErr) {
      return new Response(JSON.stringify({ error: `Failed to fetch registrations: ${regErr.message}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    // 4. Compile recipients
    let recipients: Array<{ email: string; name: string }> = [];

    if (testMode === true) {
      recipients.push({
        email: 'info@leandrovelasques.com.ar',
        name: 'Leandro Velasques (Prueba)',
      });
    } else {
      if (registrations) {
        registrations.forEach((r) => {
          const p = r.participants;
          if (p && p.email) {
            recipients.push({
              email: p.email,
              name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Participante',
            });
          }
        });
      }

      // Add extra recipients if any
      if (Array.isArray(extraRecipients)) {
        extraRecipients.forEach((emailStr) => {
          const clean = emailStr.trim();
          if (clean && !recipients.some(r => r.email.toLowerCase() === clean.toLowerCase())) {
            recipients.push({ email: clean, name: 'Invitado' });
          }
        });
      }
    }

    if (recipients.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'No recipients found.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // 5. Send emails
    const results: any[] = [];
    const coordinators = event.notification_recipients || [];
    const coordinatorEmails = coordinators.map((c: any) => c.email).filter(Boolean);
    const replyTo = coordinatorEmails.length > 0 ? coordinatorEmails : ['leandrojvelasques@gmail.com'];

    for (const recipient of recipients) {
      // Build email body for this specific user
      let emailHtml = fullTemplate
        .replaceAll('\${subject}', subject)
        .replaceAll('\${message}', message.replace(/\n/g, '<br>')) // Convert text newlines to html
        .replaceAll('\${nombre}', recipient.name)
        .replaceAll('{{evento}}', event.title || '')
        .replaceAll('{{coordinador}}', event.coordinator || 'Leandro Velasques');

      let status = 'pending';
      let errorMessage = null;

      if (resendApiKey) {
        try {
          const sendResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              from: emailFrom,
              to: [recipient.email],
              subject: subject,
              html: emailHtml,
              reply_to: replyTo
            })
          });
          const sendResult = await sendResponse.json();
          if (sendResponse.status >= 200 && sendResponse.status < 300) {
            status = 'sent';
          } else {
            status = 'failed';
            errorMessage = sendResult.message || `Error status: ${sendResponse.status}`;
          }
        } catch (err: any) {
          status = 'failed';
          errorMessage = err.message || String(err);
        }
      } else {
        status = 'simulated';
        errorMessage = 'Simulación: RESEND_API_KEY no configurado en Supabase.';
      }

      // Log email
      try {
        await supabase.from('email_logs').insert({
          event_id: event.id,
          recipient_email: recipient.email,
          recipient_name: recipient.name,
          type: testMode ? 'broadcast_test' : 'broadcast',
          subject: subject,
          body: emailHtml,
          status: status,
          error_message: errorMessage
        });
      } catch (dbErr) {
        console.error('Error logging email broadcast to DB:', dbErr);
      }

      results.push({ email: recipient.email, status, error: errorMessage });
    }

    return new Response(JSON.stringify({ success: true, sentCount: results.filter(r => r.status === 'sent').length, details: results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})
