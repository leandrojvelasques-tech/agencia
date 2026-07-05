import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AgendaItem {
  time?: string;
  block?: string;
  topic?: string;
  title?: string;
  start_time?: string;
  end_time?: string;
  break_duration?: number;
  blocks?: Array<{ title?: string; description?: string }>;
}

function formatAgendaHtml(agenda: AgendaItem[] | null | undefined): string {
  if (!Array.isArray(agenda) || agenda.length === 0) return 'No hay agenda definida para este evento.';
  
  let html = '<div style="font-family: sans-serif; border-left: 3px solid #0b5e3a; padding-left: 15px; margin: 15px 0;">';
  
  if (agenda[0] && ('blocks' in agenda[0] || 'title' in agenda[0])) {
    // New format (nested classes/blocks)
    agenda.forEach((c) => {
      html += `<div style="margin-bottom: 20px;">`;
      html += `<h4 style="margin: 0 0 5px 0; color: #0b5e3a; font-size: 16px;">${c.title || 'Clase / Sesión'}`;
      if (c.start_time || c.end_time) {
        html += ` <span style="font-size: 12px; color: #666; font-weight: normal;">(${c.start_time || '—'}${c.end_time ? ` - ${c.end_time}` : ''} hs)</span>`;
      }
      html += `</h4>`;
      
      if (Array.isArray(c.blocks) && c.blocks.length > 0) {
        html += `<div style="margin-left: 15px; border-left: 1px solid #ddd; padding-left: 10px;">`;
        c.blocks.forEach((b) => {
          html += `<div style="margin-bottom: 10px;">`;
          if (b.title) {
            html += `<p style="margin: 0; font-size: 11px; font-weight: bold; text-transform: uppercase; color: #0b5e3a;">${b.title}</p>`;
          }
          if (b.description) {
            html += `<p style="margin: 2px 0 0 0; font-size: 13px; color: #444; line-height: 1.4;">${b.description}</p>`;
          }
          html += `</div>`;
        });
        html += `</div>`;
      }
      
      if (c.break_duration && c.break_duration > 0) {
        html += `<p style="margin: 5px 0 0 15px; font-size: 12px; color: #0b5e3a; font-style: italic;">☕ Break / Receso (${c.break_duration} min)</p>`;
      }
      html += `</div>`;
    });
  } else {
    // Old format fallback
    agenda.forEach((item) => {
      if (item.topic || item.block) {
        html += `<div style="margin-bottom: 12px;">`;
        let timeHeader = '';
        if (item.time) {
          timeHeader = `<strong style="color: #0b5e3a;">${item.time} hs</strong>: `;
        }
        html += `<p style="margin: 0; font-size: 13px; color: #333;">${timeHeader}`;
        if (item.block) {
          html += `<span style="font-size: 11px; font-weight: bold; text-transform: uppercase; color: #888;">[${item.block}]</span> `;
        }
        html += `${item.topic || ''}</p>`;
        html += `</div>`;
      }
    });
  }
  
  html += '</div>';
  return html.replace(/\n/g, ''); // Remove newlines so they are not replaced by <br> in email mapping
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    let registrationId = '';
    let emailType = '';

    // Check if triggered by database webhook
    if (body.type && body.table === 'registrations') {
      const { type, record, old_record } = body;
      registrationId = record.id;
      
      if (type === 'INSERT') {
        emailType = 'welcome';
      } else if (type === 'UPDATE' && record.status === 'cancelled' && old_record.status !== 'cancelled') {
        emailType = 'cancellation';
      } else {
        return new Response(JSON.stringify({ message: 'Ignored webhook trigger' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }
    } else {
      // Direct invocation
      registrationId = body.registrationId;
      emailType = body.type;
    }

    if (!registrationId || !emailType) {
      return new Response(JSON.stringify({ error: 'Missing registrationId or type' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // 1. Fetch registration, participant, and event
    const { data: reg, error: regErr } = await supabase
      .from('registrations')
      .select('*, participants(*), events(*)')
      .eq('id', registrationId)
      .single();

    if (regErr || !reg) {
      return new Response(JSON.stringify({ error: `Registration not found: ${regErr?.message}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    const participant = reg.participants;
    const event = reg.events;

    if (!participant || !event) {
      return new Response(JSON.stringify({ error: 'Participant or event not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    // 2. Fetch email template
    const { data: template, error: tempErr } = await supabase
      .from('email_templates')
      .eq('id', emailType)
      .single();

    if (tempErr || !template) {
      return new Response(JSON.stringify({ error: `Template "${emailType}" not found` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    // 3. Format placeholders
    let dateStr = event.event_date || '';
    if (reg.selected_date) {
      dateStr = reg.selected_date;
    }
    const modalityStr = reg.attendance_mode === 'virtual' ? 'Virtual (Online)' : 'Presencial';
    const domain = 'https://www.leandrovelasques.com.ar';
    const eventUrl = `${domain}/evento/${event.slug}`;
    const liveLink = event.live_link || '';

    const placeholders: Record<string, string> = {
      '{{nombre}}': participant.first_name || '',
      '{{apellido}}': participant.last_name || '',
      '{{evento}}': event.title || '',
      '{{fecha}}': dateStr,
      '{{horario}}': event.start_time || '',
      '{{modalidad}}': modalityStr,
      '{{coordinador}}': event.coordinator || 'Leandro Velasques',
      '{{agenda}}': formatAgendaHtml(event.agenda),
      '{{link_inscripcion}}': eventUrl,
      '{{link_evento}}': eventUrl,
      '{{link_reunion}}': liveLink,
      '{{link_acceso}}': liveLink
    };

    let resolvedSubject = template.subject;
    let resolvedBody = template.body;

    for (const [key, value] of Object.entries(placeholders)) {
      resolvedSubject = resolvedSubject.replaceAll(key, value);
      resolvedBody = resolvedBody.replaceAll(key, value);
    }

    const emailHtml = resolvedBody.replace(/\n/g, '<br>');

    // 4. Send email via Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const emailFrom = Deno.env.get('EMAIL_FROM') || 'Notificaciones Leandro Velasques <onboarding@resend.dev>';
    
    let status = 'pending';
    let errorMessage = null;

    if (participant.email) {
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
              to: [participant.email],
              subject: resolvedSubject,
              html: emailHtml
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

      // 5. Save log
      try {
        await supabase.from('email_logs').insert({
          event_id: event.id,
          recipient_email: participant.email,
          recipient_name: `${participant.first_name} ${participant.last_name}`,
          type: emailType,
          subject: resolvedSubject,
          body: emailHtml,
          status: status,
          error_message: errorMessage
        });
      } catch (dbErr) {
        console.error('Error guardando logs en Supabase:', dbErr);
      }
    }

    return new Response(JSON.stringify({ success: true, status, error: errorMessage }), {
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
