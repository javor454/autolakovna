import { google } from 'googleapis';
import { Readable } from 'stream';

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export default async function handler(request) {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'POST' } });
  }

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ ok: false, error: 'Neplatná data formuláře.' }, { status: 400 });
  }

  const name = String(formData.get('name') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();
  const phone = String(formData.get('phone') ?? '').trim();
  const message = String(formData.get('message') ?? '').trim();

  if (!name || !email || !message) {
    return Response.json({ ok: false, error: 'Vyplňte jméno, e-mail a popis.' }, { status: 400 });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ ok: false, error: 'Neplatný e-mail.' }, { status: 400 });
  }

  const files = formData.getAll('photos').filter((v) => v instanceof File && v.size > 0);

  for (const f of files) {
    if (!ALLOWED_TYPES.has(f.type)) {
      return Response.json(
        { ok: false, error: 'Povolené jsou jen obrázky (PNG, JPG, …).' },
        { status: 400 },
      );
    }
  }

  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const folderId = process.env.DRIVE_FOLDER_ID;

  if (!clientEmail || !privateKey || !folderId) {
    console.error('Missing Drive env');
    return Response.json({ ok: false, error: 'Server není nakonfigurován.' }, { status: 503 });
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });

  const drive = google.drive({ version: 'v3', auth: await auth.getClient() });

  const uploaded = [];
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const safeBase = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80) || `image-${i}`;
    const fname = `${stamp}-${safeBase}`;
    const buf = Buffer.from(await file.arrayBuffer());
    const stream = Readable.from(buf);

    const created = await drive.files.create({
      requestBody: {
        name: fname,
        parents: [folderId],
      },
      media: {
        mimeType: file.type || 'application/octet-stream',
        body: stream,
      },
      fields: 'id, name',
    });

    uploaded.push(created.data.name || fname);
  }

  const resendKey = process.env.RESEND_API_KEY;
  const mailFrom = process.env.MAIL_FROM;
  const mailTo = process.env.MAIL_TO;

  if (!resendKey || !mailFrom || !mailTo) {
    console.error('Missing Resend env');
    return Response.json({ ok: false, error: 'Server není nakonfigurován.' }, { status: 503 });
  }

  const textBody = [
    'Nová poptávka z webu Lak&Go',
    '',
    `Jméno: ${name}`,
    `E-mail: ${email}`,
    `Telefon: ${phone || '—'}`,
    '',
    'Popis:',
    message,
    '',
    files.length ? `Nahrané soubory (${uploaded.length}): ${uploaded.join(', ')}` : 'Bez příloh',
  ].join('\n');

  const htmlBody = `<p><strong>Nová poptávka</strong></p>
<p>Jméno: ${escapeHtml(name)}<br/>E-mail: ${escapeHtml(email)}<br/>Telefon: ${escapeHtml(phone || '—')}</p>
<p><strong>Popis:</strong></p><p>${escapeHtml(message).replace(/\n/g, '<br/>')}</p>
<p>${files.length ? escapeHtml(`Soubory: ${uploaded.join(', ')}`) : 'Bez příloh'}</p>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: mailFrom,
      to: [mailTo],
      reply_to: email,
      subject: `Poptávka: ${name}`,
      text: textBody,
      html: htmlBody,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error('Resend error:', res.status, errText);
    return Response.json({ ok: false, error: 'Odeslání e-mailu se nezdařilo.' }, { status: 502 });
  }

  return Response.json({ ok: true });
}

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
