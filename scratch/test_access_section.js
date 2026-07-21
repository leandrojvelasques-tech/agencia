function buildAccessSectionHtml(attendanceMode, liveLink, zoomDetails, location) {
  let html = '';
  if (attendanceMode === 'virtual') {
    if (liveLink) {
      const isZoom = liveLink.includes('zoom.us');
      const platformText = isZoom ? 'Ingresar a Zoom / Unirse al Encuentro' : 'Ingresar a la Sala / Unirse al Encuentro';
      html += `
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate; margin: 0 auto;">
          <tr>
            <td align="center" bgcolor="#285A47" style="border-radius:8px;">
              <a href="${liveLink}" target="_blank" style="display:inline-block; padding:15px 25px; color:#FFFFFF; font-size:15px; line-height:1; font-weight:700; text-decoration:none; border-radius:8px;">
                ${platformText}
              </a>
            </td>
          </tr>
        </table>
        <p style="margin:12px 0 0 0; color:#8A9490; font-size:12px; line-height:1.6; text-align:center;">
          Vínculo directo: <a href="${liveLink}" target="_blank" style="color:#285A47; font-weight:bold; text-decoration:none;">${liveLink}</a>
        </p>
      `;
    }
    if (zoomDetails) {
      const formattedZoom = zoomDetails.replace(/\n/g, '<br>');
      
      const idMatch = zoomDetails.match(/(?:ID de reunión|Meeting ID):\s*([0-9\s-]+)/i);
      const passMatch = zoomDetails.match(/(?:Código de acceso|Passcode):\s*([0-9a-zA-Z]+)/i);
      const phoneMatch = zoomDetails.match(/(\+\d+[\d,]*#)/);
      
      const zoomId = idMatch ? idMatch[1].trim() : '';
      const zoomPass = passMatch ? passMatch[1].trim() : '';
      const oneTouchPhone = phoneMatch ? phoneMatch[1].trim() : '';
      
      if (zoomId && zoomPass) {
        html += `
          <div style="margin-top: 20px; text-align: left; background-color: #F4F8F6; border: 1px solid #D1E4DA; border-radius: 12px; padding: 20px; font-family: Arial, sans-serif;">
            <strong style="color: #285A47; font-size: 14px; display: block; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px;">🔑 Datos de Acceso a Zoom:</strong>
            
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%; border-collapse:collapse; margin-bottom:12px;">
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #E2EDE8; color: #5A6E65; font-size: 13px; width: 130px; font-weight: bold;">ID de Reunión:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #E2EDE8; color: #1E2824; font-size: 14px; font-weight: bold; font-family: monospace; letter-spacing: 0.5px;">${zoomId}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #E2EDE8; color: #5A6E65; font-size: 13px; font-weight: bold;">Código de acceso:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #E2EDE8; color: #1E2824; font-size: 14px; font-weight: bold; font-family: monospace; letter-spacing: 0.5px;">${zoomPass}</td>
              </tr>
              ${oneTouchPhone ? `
              <tr>
                <td style="padding: 8px 0; color: #5A6E65; font-size: 13px; font-weight: bold;">Móvil un toque:</td>
                <td style="padding: 8px 0; color: #285A47; font-size: 13px; font-weight: bold; font-family: monospace;">
                  <a href="tel:${oneTouchPhone}" style="color: #285A47; text-decoration: underline;">${oneTouchPhone}</a>
                </td>
              </tr>
              ` : ''}
            </table>
            
            <div style="border-top: 1px dashed #C8DDD3; padding-top: 12px; margin-top: 6px;">
              <p style="margin: 0 0 6px 0; font-size: 11px; color: #72857C; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">Detalles Completos de la Invitación:</p>
              <div style="font-size: 11px; line-height: 1.45; color: #5A6E65; font-family: monospace; background-color: #FFFFFF; border: 1px solid #E2EDE8; border-radius: 6px; padding: 12px; max-height: 110px; overflow-y: auto; white-space: pre-wrap;">${formattedZoom}</div>
            </div>
          </div>
        `;
      } else {
        html += `
          <div style="margin-top: 20px; text-align: left; background-color: #F7FAF8; border: 1px solid #D9E8E0; border-radius: 12px; padding: 20px; font-family: Arial, sans-serif; font-size: 13px; line-height: 1.55; color: #303A36;">
            <strong style="color: #285A47; font-size: 14px; display: block; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px;">🔑 Datos de Acceso a la Reunión:</strong>
            <div style="white-space: pre-wrap; font-family: monospace; background: #ffffff; border: 1px solid #e2ece7; border-radius: 6px; padding: 12px; color: #4F4C4D;">${formattedZoom}</div>
          </div>
        `;
      }
    }
    if (!liveLink && !zoomDetails) {
      html += `
        <p style="margin:0; color:#4F4C4D; font-size:14px; line-height:1.6; text-align:center;">
          El enlace de acceso virtual estará disponible próximamente.
        </p>
      `;
    }
  } else {
    const loc = location || 'Sede del Consejo Profesional de Ciencias Económicas del Chubut';
    html += `
      <div style="text-align: left; background-color: #F7FAF8; border: 1px solid #D9E8E0; border-radius: 10px; padding: 18px; font-family: Arial, sans-serif;">
        <strong style="color: #285A47; font-size: 14px; display: block; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">📍 Lugar del Encuentro (Presencial):</strong>
        <p style="margin: 0; color: #303A36; font-size: 15px; font-weight: bold;">${loc}</p>
        <p style="margin: 6px 0 0 0; color: #747D79; font-size: 13px; line-height: 1.45;">Te esperamos directamente en la dirección indicada. ¡Por favor planifica tu llegada con tiempo!</p>
      </div>
    `;
  }
  return html;
}

const zoomDetails = `Consejo Profesional de Ciencias Económicas del Chubut le está invitando a una reunión de Zoom programada.

Tema: Reunión Zoom de Consejo Profesional de Ciencias Económicas del Chubut
Hora: 21 jul 2026 06:00 p. m. Buenos Aires, Georgetown
Únase a la reunión de Zoom
https://us06web.zoom.us/j/81046473556?pwd=ElWaw3gg12CKGHsbHO1WXwTpw2MFGI.1

Enlace al chat de la reunión
https://us06web.zoom.us/launch/jc/81046473556

ID de reunión: 810 4647 3556
Código de acceso: 412858

---

Móvil con un toque
+16694449171,,81046473556# Estados Unidos
+16699006833,,81046473556# Estados Unidos (San Jose)


---

Unirse mediante SIP
* 81046473556@zoomcrc.com

Instrucciones para unirse
https://us06web.zoom.us/meetings/81046473556/invitations?signature=GzJzhFS9Zcat9vmqogktyFVbAqxtF28wz4bb9AaOvhY`;

const liveLink = "https://us06web.zoom.us/j/81046473556?pwd=ElWaw3gg12CKGHsbHO1WXwTpw2MFGI.1";

console.log("--- VIRTUAL ZOOM WITH ID/PASSCODE ---");
console.log(buildAccessSectionHtml('virtual', liveLink, zoomDetails, ''));

console.log("\n--- VIRTUAL GOOGLE MEET (NO ZOOM DETAILS) ---");
console.log(buildAccessSectionHtml('virtual', 'https://meet.google.com/abc-defg-hij', '', ''));

console.log("\n--- PRESENCIAL ---");
console.log(buildAccessSectionHtml('presencial', '', '', 'Delegación Trelew'));
