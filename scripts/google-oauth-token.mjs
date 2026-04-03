/**
 * One-time: complete OAuth in the browser, print GOOGLE_REFRESH_TOKEN.
 *
 * Prereqs in env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
 *   e.g. node --env-file=.env scripts/google-oauth-token.mjs
 *
 * Výchozí redirect_uri je kořenová URL s koncovým lomítkem (vyhovuje poli, kde Google
 * nepřijímá /oauth2callback): http://127.0.0.1:8765/
 * Volitelně: GOOGLE_OAUTH_REDIRECT_URI=http://localhost:8765/
 *
 * V Google Cloud Console musí být redirect URI uvedený řádek včetně koncového /
 * přesně stejný jako v terminálu (localhost vs 127.0.0.1 rozlišuje).
 *
 * „Authorized JavaScript origins“ = obvykle bez cesty, např. http://localhost:8765
 * (bez koncového / u některých účtů — pokud Console hlásí chybu, zkuste i s /).
 *
 * Výchozí scope: https://www.googleapis.com/auth/drive (spolehlivější s consent screenem; stejné jako typická SA integrace).
 * Užší přístup: GOOGLE_OAUTH_SCOPES=https://www.googleapis.com/auth/drive.file (musí být i na consent screenu).
 */
import http from 'http';
import { google } from 'googleapis';

const DEFAULT_REDIRECT = 'http://127.0.0.1:8765/';

function normalizeRedirectUri(raw) {
  const trimmed = (raw || DEFAULT_REDIRECT).trim();
  let u;
  try {
    u = new URL(trimmed);
  } catch {
    return { error: trimmed };
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    return { error: 'scheme musí být http nebo https' };
  }
  // Kořenová cesta: Google i konzole často chtějí explicitní „/“ na konci řetězce
  const path = u.pathname || '/';
  if (path === '/' || path === '') {
    return { ok: `${u.origin}/`, parsed: new URL(`${u.origin}/`) };
  }
  return { ok: u.toString(), parsed: u };
}

const normalized = normalizeRedirectUri(
  process.env.GOOGLE_OAUTH_REDIRECT_URI?.trim() || DEFAULT_REDIRECT,
);
if (!normalized.ok) {
  console.error('Neplatná GOOGLE_OAUTH_REDIRECT_URI:', normalized.error ?? '—');
  process.exit(1);
}

const REDIRECT_URI = normalized.ok;
const parsed = normalized.parsed;

const PORT = parsed.port
  ? Number(parsed.port)
  : parsed.protocol === 'https:'
    ? 443
    : 80;

const CALLBACK_PATH = parsed.pathname || '/';

function oauthScopesFromEnv() {
  const raw = process.env.GOOGLE_OAUTH_SCOPES?.trim();
  if (!raw) {
    return ['https://www.googleapis.com/auth/drive'];
  }
  return raw
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

const SCOPES = oauthScopesFromEnv();

const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

if (!clientId || !clientSecret) {
  console.error(
    'Chybí GOOGLE_CLIENT_ID nebo GOOGLE_CLIENT_SECRET. Spusťte např.:\n  node --env-file=.env scripts/google-oauth-token.mjs',
  );
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: SCOPES,
});

const server = http.createServer(async (req, res) => {
  let url;
  try {
    url = new URL(req.url || '/', parsed.origin);
  } catch {
    res.writeHead(400).end();
    return;
  }

  if (url.pathname !== CALLBACK_PATH) {
    res.writeHead(404).end();
    return;
  }

  const code = url.searchParams.get('code');
  const oauthErr = url.searchParams.get('error');

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });

  if (oauthErr) {
    res.end(`<p>OAuth chyba: ${escapeHtml(oauthErr)}</p>`);
    server.close(() => process.exit(1));
    return;
  }

  if (!code) {
    res.end('<p>V URL chybí autorizační kód.</p>');
    server.close(() => process.exit(1));
    return;
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    const refresh = tokens.refresh_token;

    res.end(
      '<p>OK. Refresh token je v terminálu — zkopírujte ho do <code>.env</code> jako <code>GOOGLE_REFRESH_TOKEN</code> a na Vercel.</p>',
    );

    server.close(() => {
      if (!refresh) {
        console.error(
          '\nGoogle nevrátil refresh_token. Odstraňte aplikaci v https://myaccount.google.com/permissions a spusťte skript znovu (musí být prompt=consent).\n',
        );
        process.exit(1);
        return;
      }
      console.log('\n--- Přidejte do .env a do Environment Variables na Vercelu ---\n');
      console.log(`GOOGLE_REFRESH_TOKEN=${refresh}\n`);
      process.exit(0);
    });
  } catch (e) {
    console.error(e);
    res.end('<p>Výměna kódu za token selhala — detaily v terminálu.</p>');
    server.close(() => process.exit(1));
  }
});

server.listen(PORT, '0.0.0.0', () => {
  const originNoSlash = `${parsed.protocol}//${parsed.host}`;
  console.log('\n=== Zkopírujte do „Authorized redirect URIs“ (přesně, včetně koncového /) ===\n');
  console.log(REDIRECT_URI);
  console.log('\n=== „Authorized JavaScript origins“ (bez cesty /oauth2…) — typicky: ===\n');
  console.log(`  ${originNoSlash}`);
  console.log('\n=== Požadované scope (musí být na OAuth consent screen + zapnuté Drive API) ===\n');
  SCOPES.forEach((s) => console.log(`  ${s}`));
  console.log(
    '\nV tomto GCP projektu: APIs & Services → Library → „Google Drive API“ → Enable.',
  );
  console.log(
    'OAuth consent screen → Scopes → přidejte stejný scope jako výše (často …/auth/drive).',
  );
  console.log(
    '\nKdyž Google ukáže chybu: nahoře na stránce je skutečný důvod (např. redirect_uri_mismatch, invalid_scope).',
  );
  console.log(
    'Řádek „Podrobnosti požadavku“ je jen log parametrů — není to kód chyby.\n',
  );
  console.log('Pokud používáte localhost v .env, nastavte GOOGLE_OAUTH_REDIRECT_URI=http://localhost:8765/ a do Console u redirectů použijte stejný řetězec.\n');
  console.log('Otevřete v prohlížeči:\n');
  console.log(authUrl);
  console.log('\nČekám na zpětné přesměrování…\n');
});
