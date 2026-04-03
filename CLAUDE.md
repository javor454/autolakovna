# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development

- Inspect makefile for development commands.
- Use context7 to get up to date documentation to any tool.
- Use playwright to inspect frontend

## Architecture

**Static site + serverless API on Vercel**
- Frontend: Single-page HTML (`public/index.html`) with Tailwind CDN + custom CSS
- Serverless functions in `api/` (Vercel convention)
  - `contact.js`: Handles contact form with Google Drive upload + Resend email
  - `health.js`: Health check endpoint

**Contact form workflow:**
1. Client submits form with photos (`public/contact-form.js`)
2. `api/contact.js` validates, creates unique folder per inquiry (`TIMESTAMP_NAME/`)
3. Uploads photos to that folder (resumable upload API)
4. Creates `_ZAZNAM.txt` immutable record in folder with form data
5. Sends notification email via Resend (optional, requires verified domain)
6. Uses timeouts and error handling for Vercel's serverless constraints (4.5 MB limit, 60s max)

**Design system:** `design_system/` contains UI spec and reference mockup

## Environment Variables

Required for contact form (Drive):
- **OAuth (personal Drive):** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`, `DRIVE_FOLDER_ID` — run `make drive-oauth-token` once. Default token scope is **`drive`** (add the same on the consent screen; `drive.file` alone often fails until broader scope is added). Optional: `GOOGLE_OAUTH_SCOPES` for a narrower scope. Default redirect is root with trailing slash, e.g. `http://127.0.0.1:8765/` (must match **Authorized redirect URIs** exactly). **Authorized JavaScript origins** = origin without path (e.g. `http://127.0.0.1:8765`). Set `GOOGLE_OAUTH_REDIRECT_URI=http://localhost:8765/` if you use localhost in the browser.
- **Or service account (Workspace Shared drive):** `GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `DRIVE_FOLDER_ID`
- Optional: `RESEND_API_KEY`, `MAIL_FROM`, `MAIL_TO` — email notifications (requires verified domain)

Copy `.env.example` → `.env` and populate.

## Key Constraints

- Vercel serverless: 4.5 MB request body limit, ~60s timeout
- Photos: Combined max 3.2 MB to stay under Vercel limit
- Uses Google Drive resumable upload for reliability
- All timeouts explicitly set (Drive: 55s, Resend: 30s, Auth: 25s)

## Code Style

- ES modules (`"type": "module"` in package.json)
- Czech user-facing strings
- Vercel functions use `export default { fetch }` pattern
- No test suite currently
