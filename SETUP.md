# Setup guide

## What to do next (short path)

1. Copy environment template: `make env-example`, then edit `.env` (see below).
2. **Resend** — create an account, add API key and sender to `.env`.
3. **Google Drive** — create a service account, JSON key, share a folder with it, put credentials in `.env`.
4. **Vercel** — create a project, add the **same** variables in the dashboard (Production + Preview), deploy from Git or CLI.
5. **Local dev** — `make vercel-login` and `make vercel-link` once, then `make dev`. Open http://localhost:3000

`vercel dev` reads `.env` from the project root for serverless functions locally.

---

## Makefile commands

| Command | Purpose |
|--------|---------|
| `make` or `make help` | List commands |
| `make install` | `npm ci` inside Docker (updates `node_modules/`) |
| `make dev` | `docker compose up` — install deps + `vercel dev` on port 3000 |
| `make dev-bg` | Same, detached |
| `make down` | Stop detached compose stack |
| `make shell` | Shell in Node 20 container, `/app` = repo |
| `make vercel-login` | Vercel CLI login (first time) |
| `make vercel-link` | Attach repo to a Vercel project |
| `make env-example` | Create `.env` from `.env.example` if missing |

---

## What is Resend?

[Resend](https://resend.com) is an email API: your serverless function calls their HTTP API with an API key, and they deliver the message. No SMTP server to run. The contact form uses Resend so you get an email when someone submits the form.

**Steps:**

1. Sign up at resend.com.
2. **API key** — Dashboard → API Keys → create a key → put it in `RESEND_API_KEY` in `.env` and in Vercel env vars.
3. **Sending domain** — Add and verify your domain (DNS records they give you). Then you can set e.g. `MAIL_FROM=Lak&Go <poptavky@yourdomain.com>`.
4. For quick tests only, Resend may allow a restricted test sender (check their docs); production should use your verified domain.
5. `MAIL_TO` = your inbox where lead notifications should arrive.

---

## Environment variables (`.env` and Vercel)

Copy [.env.example](.env.example) to `.env` and fill:

### Resend / email

- **`RESEND_API_KEY`** — Secret from Resend dashboard (starts with `re_`).
- **`MAIL_FROM`** — Must be an address on a domain you verified in Resend (display name allowed: `Name <addr@domain>`).
- **`MAIL_TO`** — Where to receive submissions (can be the same domain or any inbox you check).

### Google Drive

- **`GOOGLE_CLIENT_EMAIL`** — Service account email (looks like `something@project-id.iam.gserviceaccount.com`). It is **not** your personal Gmail.
- **`GOOGLE_PRIVATE_KEY`** — Private key from the service account JSON (see below). In `.env` you can paste the key across multiple lines **or** one line with `\n` where line breaks were.
- **`DRIVE_FOLDER_ID`** — ID of the Drive folder where uploads go. From the folder URL:  
  `https://drive.google.com/drive/folders/THIS_PART_IS_THE_ID`

**Vercel:** Project → Settings → Environment Variables — add every variable for Production (and Preview if you want previews to work with real email/Drive).

---

## Google Cloud / Drive setup (service account)

You do **not** “use your Google account password” in the app. You create a **robot account** (service account) that only has access to what you share.

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project (or pick an existing one).
3. **Enable the Google Drive API**  
   APIs & Services → Library → search “Google Drive API” → Enable.
4. **Create a service account**  
   APIs & Services → Credentials → Create credentials → Service account → name it (e.g. `autolakovna-uploads`) → Done.
5. **Create a key**  
   Open the service account → Keys → Add key → JSON. A file downloads — **keep it secret**, do not commit it.
6. From that JSON file take:
   - **`client_email`** → `GOOGLE_CLIENT_EMAIL`
   - **`private_key`** → `GOOGLE_PRIVATE_KEY` (including `-----BEGIN PRIVATE KEY-----` … `-----END PRIVATE KEY-----`)
7. In **Google Drive**, create a folder for uploads. **Share** that folder with the **service account email** (`GOOGLE_CLIENT_EMAIL`) with **Editor** access.
8. Put the folder ID in `DRIVE_FOLDER_ID`.

If uploads fail with “file not found” or permission errors, the folder is usually not shared with the service account email, or the ID is wrong.

---

## Private key in `.env` (multiline)

Example shape (replace with your real key):

```env
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBg...
...more lines...
-----END PRIVATE KEY-----"
```

Or one line with escaped newlines:

```env
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
```

On Vercel, paste carefully; multiline env vars are supported in the dashboard.

---

## Security reminders

- Never commit `.env` or the downloaded service account JSON (they are in `.gitignore`).
- Rotate the Resend API key if it leaks.
- Delete old service account keys in Google Cloud if you regenerate them.
