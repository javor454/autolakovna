import { google } from 'googleapis';
import formidable from 'formidable';
import { readFile } from 'fs/promises';

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
/**
 * Vercel hard-limits the request body for serverless (~4.5 MB including multipart boundaries + text fields).
 * If the browser sends more, the platform often drops the request before this code runs — no function logs.
 */
const MAX_TOTAL_PHOTO_BYTES = Math.floor(3.2 * 1024 * 1024);
const DRIVE_UPLOAD_TIMEOUT_MS = 55_000;
const GOOGLE_AUTH_TIMEOUT_MS = 25_000;
const RESEND_TIMEOUT_MS = 30_000;

function withTimeout(promise, ms, label) {
  let t;
  const timeout = new Promise((_, reject) => {
    t = setTimeout(() => reject(new Error(`${label} timed out`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(t));
}

/** Google Gaxios / Drive API error payload */
function googleApiErrorDetail(err) {
  const e = err?.response?.data?.error;
  if (!e) return err?.message || String(err);
  const first = e.errors?.[0];
  const reason = first?.reason ? ` (${first.reason})` : '';
  return `${e.message || e.code || 'Drive API'}${reason}`;
}

function driveErrorFromHttp(status, bodyText) {
  let data;
  try {
    data = JSON.parse(bodyText);
  } catch {
    data = { error: { message: bodyText || String(status) } };
  }
  const err = new Error(`Drive HTTP ${status}`);
  err.response = { status, data };
  return err;
}

/**
 * @see https://developers.google.com/workspace/drive/api/guides/manage-uploads#resumable
 */
async function uploadResumable(authClient, { folderId, fname, mimeType, buf }) {
  const { token } = await authClient.getAccessToken();
  if (!token) {
    const err = new Error('No Google access token');
    err.response = { status: 401, data: {} };
    throw err;
  }
  const auth = { Authorization: `Bearer ${token}` };

  const params = new URLSearchParams({
    uploadType: 'resumable',
    supportsAllDrives: 'true',
    fields: 'id,name',
  });
  const initUrl = `https://www.googleapis.com/upload/drive/v3/files?${params}`;

  const initRes = await fetch(initUrl, {
    method: 'POST',
    headers: {
      ...auth,
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Upload-Content-Type': mimeType,
      'X-Upload-Content-Length': String(buf.length),
    },
    body: JSON.stringify({ name: fname, parents: [folderId] }),
  });

  if (!initRes.ok) {
    throw driveErrorFromHttp(initRes.status, await initRes.text());
  }

  const location = initRes.headers.get('location');
  if (!location) {
    const err = new Error('Resumable upload: missing Location');
    err.response = { status: initRes.status, data: {} };
    throw err;
  }

  const putRes = await fetch(location, {
    method: 'PUT',
    headers: {
      ...auth,
      'Content-Type': mimeType,
      'Content-Length': String(buf.length),
    },
    body: buf,
  });

  if (!putRes.ok) {
    throw driveErrorFromHttp(putRes.status, await putRes.text());
  }

  return putRes.json();
}

export const config = {
  maxDuration: 300,
  api: {
    bodyParser: false,
  },
};

async function parseMultipart(req) {
  const form = formidable({
    maxFileSize: MAX_TOTAL_PHOTO_BYTES,
    keepExtensions: true,
  });

  return new Promise((resolve, reject) => {
    form.parse(req, async (err, fields, files) => {
      if (err) {
        reject(err);
        return;
      }

      // Convert formidable output to expected format
      const formattedFields = {};
      for (const [key, val] of Object.entries(fields)) {
        formattedFields[key] = Array.isArray(val) ? val[0] : val;
      }

      const formattedFiles = [];
      const photosArray = files.photos ? (Array.isArray(files.photos) ? files.photos : [files.photos]) : [];

      for (const f of photosArray) {
        const buffer = await readFile(f.filepath);
        formattedFiles.push({
          name: 'photos',
          filename: f.originalFilename || f.newFilename,
          mimeType: f.mimetype,
          buffer,
        });
      }

      resolve({ fields: formattedFields, files: formattedFiles });
    });
  });
}

export default async function handleRequest(req, res) {
  if (req.method !== 'POST') {
    res.status(405).setHeader('Allow', 'POST').send('Method Not Allowed');
    return;
  }

  let parsed;
  try {
    parsed = await parseMultipart(req);
  } catch (err) {
    console.error('[contact] multipart parse error:', err);
    res.status(400).json({
      ok: false,
      errors: {
        form: 'Nepodařilo se zpracovat odeslaná data. Zkuste to znovu nebo bez fotek.',
      },
    });
    return;
  }

  const { fields, files } = parsed;
  const name = String(fields.name ?? '').trim();
  const email = String(fields.email ?? '').trim();
  const phone = String(fields.phone ?? '').trim();
  const message = String(fields.message ?? '').trim();

  const fieldErrors = {};
  if (!name) fieldErrors.name = 'Vyplňte jméno a příjmení.';
  if (!email) fieldErrors.email = 'Vyplňte e-mail.';
  if (!message) fieldErrors.message = 'Vyplňte popis požadované služby.';
  if (Object.keys(fieldErrors).length) {
    res.status(400).json({ ok: false, errors: fieldErrors });
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ ok: false, errors: { email: 'Zadejte platný e-mail.' } });
    return;
  }

  const photos = files.filter((f) => f.name === 'photos' && f.buffer.length > 0);

  let photoBytesTotal = 0;
  for (const f of photos) {
    if (!ALLOWED_TYPES.has(f.mimeType)) {
      res.status(400).json({
        ok: false,
        errors: { photos: 'Povolené jsou jen obrázky (PNG, JPG, …).' },
      });
      return;
    }
    if (f.buffer.length > MAX_TOTAL_PHOTO_BYTES) {
      res.status(400).json({
        ok: false,
        errors: {
          photos: `Jeden soubor max ${(MAX_TOTAL_PHOTO_BYTES / (1024 * 1024)).toFixed(1)} MB (limit hostingu Vercel).`,
        },
      });
      return;
    }
    photoBytesTotal += f.buffer.length;
    if (photoBytesTotal > MAX_TOTAL_PHOTO_BYTES) {
      res.status(400).json({
        ok: false,
        errors: {
          photos: `Fotky celkem mohou mít max. ${(MAX_TOTAL_PHOTO_BYTES / (1024 * 1024)).toFixed(1)} MB (limit hostingu Vercel).`,
        },
      });
      return;
    }
  }

  console.info('[contact] received', { photoCount: photos.length, photoBytesTotal });

  const folderId = String(process.env.DRIVE_FOLDER_ID ?? '').trim();
  console.info('[contact] folderId:', folderId);
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN?.trim();
  const oauthClientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const oauthClientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  const useOAuth = Boolean(refreshToken && oauthClientId && oauthClientSecret);
  const useServiceAccount = Boolean(clientEmail && privateKey);

  if (!folderId || (!useOAuth && !useServiceAccount)) {
    console.error('Missing Drive env');
    res.status(503).json({ ok: false, error: 'Server není nakonfigurován.' });
    return;
  }

  let authClient;
  try {
    console.info('[contact] auth method:', useOAuth ? 'OAuth' : 'service account');
    if (useOAuth) {
      const oauth2 = new google.auth.OAuth2(oauthClientId, oauthClientSecret);
      oauth2.setCredentials({ refresh_token: refreshToken });
      console.info('[contact] getting OAuth token...');
      await withTimeout(oauth2.getAccessToken(), GOOGLE_AUTH_TIMEOUT_MS, 'Google přihlášení');
      console.info('[contact] OAuth token acquired');
      authClient = oauth2;
    } else {
      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: clientEmail,
          private_key: privateKey,
        },
        scopes: ['https://www.googleapis.com/auth/drive'],
      });
      authClient = await withTimeout(auth.getClient(), GOOGLE_AUTH_TIMEOUT_MS, 'Google přihlášení');
    }
  } catch (err) {
    console.error('Google Drive auth failed:', err);
    res.status(502).json({
      ok: false,
      error:
        err.message?.includes('timed out')
          ? 'Úložiště neodpovídá včas. Zkuste to znovu nebo bez fotek.'
          : 'Nelze se připojit k úložišti souborů.',
    });
    return;
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const safeName = name.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
  const folderName = `${safeName}_${stamp}`;

  // Create dedicated folder for this inquiry
  let inquiryFolderId;
  try {
    console.info('[contact] creating folder:', folderName);
    const drive = google.drive({ version: 'v3', auth: authClient });
    const folderMeta = await withTimeout(
      drive.files.create({
        requestBody: {
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [folderId],
        },
        fields: 'id,webViewLink',
        supportsAllDrives: true,
      }),
      DRIVE_UPLOAD_TIMEOUT_MS,
      'Vytvoření složky',
    );
    inquiryFolderId = folderMeta.data.id;
    console.info('[contact] folder created:', inquiryFolderId);
  } catch (err) {
    const detail = googleApiErrorDetail(err);
    console.error('Folder creation failed:', detail, err?.response?.data ?? err);
    res.status(502).json({ ok: false, error: 'Nepodařilo se vytvořit složku.' });
    return;
  }

  /**
   * Drive v3 resumable upload (uploadType=resumable): session POST then PUT of bytes.
   * @see https://developers.google.com/workspace/drive/api/guides/manage-uploads
   */
  async function uploadOne(file, i) {
    const safeBase = file.filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80) || `image-${i}`;
    const fname = safeBase; // No timestamp prefix - folder is already unique
    const buf = file.buffer;
    const mimeType = file.mimeType || 'application/octet-stream';

    const created = await withTimeout(
      uploadResumable(authClient, {
        folderId: inquiryFolderId, // Upload to inquiry folder
        fname,
        mimeType,
        buf,
      }),
      DRIVE_UPLOAD_TIMEOUT_MS + 2000,
      'Nahrání souboru',
    );

    return created.name || fname;
  }

  let uploaded;
  try {
    console.info('[contact] starting uploads...');
    uploaded = await Promise.all(photos.map((file, i) => uploadOne(file, i)));
    console.info('[contact] uploads complete:', uploaded);
  } catch (err) {
    const detail = googleApiErrorDetail(err);
    console.error('Google Drive upload failed:', detail, err?.response?.data ?? err);
    const status = err?.response?.status;
    const reason = err?.response?.data?.error?.errors?.[0]?.reason;
    let userMsg = 'Nahrání na disk se nezdařilo.';
    if (err.message?.includes('timed out')) {
      userMsg = 'Nahrání fotek trvalo příliš dlouho. Zkuste menší obrázky nebo méně souborů.';
    } else if (status === 404 || reason === 'notFound') {
      userMsg = useOAuth
        ? 'Složka pro nahrávání nebyla nalezena. Zkontrolujte DRIVE_FOLDER_ID (složka musí být ve vašem Disku).'
        : 'Složka pro nahrávání nebyla nalezena. Zkontrolujte DRIVE_FOLDER_ID a sdílení se service účtem.';
    } else if (status === 403 || reason === 'insufficientPermissions' || reason === 'storageQuotaExceeded') {
      userMsg = useOAuth
        ? 'Google Disk odmítl zápis. Zkontrolujte DRIVE_FOLDER_ID a OAuth scope tokenu (drive / drive.file).'
        : 'Google Disk odmítl zápis (oprávnění nebo kvóta). U osobního Disku použijte OAuth místo service účtu.';
    }
    res.status(502).json({ ok: false, error: userMsg });
    return;
  }

  // Create immutable record in folder
  try {
    console.info('[contact] creating record file...');
    const record = `Poptávka Lak&Go
Datum: ${new Date().toLocaleString('cs-CZ', { timeZone: 'Europe/Prague' })}
Jméno: ${name}
E-mail: ${email}
Telefon: ${phone || '—'}

Popis:
${message}

Nahrané fotky: ${uploaded.length > 0 ? uploaded.join(', ') : 'žádné'}
`;

    const drive = google.drive({ version: 'v3', auth: authClient });
    await withTimeout(
      drive.files.create({
        requestBody: {
          name: 'zaznam_formulare.txt',
          parents: [inquiryFolderId],
        },
        media: {
          mimeType: 'text/plain',
          body: record,
        },
        supportsAllDrives: true,
      }),
      DRIVE_UPLOAD_TIMEOUT_MS,
      'Vytvoření záznamu',
    );
    console.info('[contact] record created');
  } catch (err) {
    console.error('Record creation failed:', err);
    // Non-fatal, continue
  }

  const resendKey = process.env.RESEND_API_KEY;
  const mailFrom = process.env.MAIL_FROM;
  const mailTo = process.env.MAIL_TO;
  const emailEnabled = Boolean(resendKey && mailFrom && mailTo);

  if (emailEnabled) {
    console.info('[contact] sending email...');
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
      photos.length ? `Nahrané soubory (${uploaded.length}): ${uploaded.join(', ')}` : 'Bez příloh',
    ].join('\n');

    const htmlBody = `<p><strong>Nová poptávka</strong></p>
<p>Jméno: ${escapeHtml(name)}<br/>E-mail: ${escapeHtml(email)}<br/>Telefon: ${escapeHtml(phone || '—')}</p>
<p><strong>Popis:</strong></p><p>${escapeHtml(message).replace(/\n/g, '<br/>')}</p>
<p>${photos.length ? escapeHtml(`Soubory: ${uploaded.join(', ')}`) : 'Bez příloh'}</p>`;

    let emailRes;
    try {
      emailRes = await fetch('https://api.resend.com/emails', {
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
        signal: AbortSignal.timeout(RESEND_TIMEOUT_MS),
      });
    } catch (err) {
      const errName = err && err.name;
      if (errName === 'AbortError' || errName === 'TimeoutError') {
        console.error('Resend timeout');
        res.status(502).json({ ok: false, error: 'Odeslání e-mailu překročilo čas. Zkuste znovu.' });
        return;
      }
      throw err;
    }

    if (!emailRes.ok) {
      const errText = await emailRes.text();
      console.error('Resend error:', emailRes.status, errText);
      res.status(502).json({ ok: false, error: 'Odeslání e-mailu se nezdařilo.' });
      return;
    }
    console.info('[contact] email sent');
  } else {
    console.warn(
      'contact: e-mail přeskočen (doplňte RESEND_API_KEY, MAIL_FROM, MAIL_TO až budete mít doménu v Resend)',
    );
  }

  console.info('[contact] returning success');
  res.json({ ok: true });
}

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
