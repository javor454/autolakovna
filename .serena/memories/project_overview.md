---
name: Project Overview
description: Purpose, tech stack, and architecture of autolakovna project
type: project
---

# Project: Autolakovna

**Purpose:** Static website for auto body shop (car painting/repair business) with contact form, photo gallery, and inquiry submission to Google Drive.

**Tech Stack:**
- **Frontend:** Static HTML + vanilla JS, Tailwind CDN, custom CSS
- **Backend:** Vercel serverless functions (Node 20.x)
- **Storage:** Google Drive (OAuth or service account)
- **Email:** Resend API (optional, for notifications)
- **Image processing:** Sharp (dev dependency, for gallery thumbnails)
- **Dev environment:** Docker + docker-compose

**Architecture:**
- Single-page static site (`public/index.html`)
- Serverless API endpoints in `api/`:
  - `contact.js` - form handler with Drive upload + email notification
  - `health.js` - health check
- Gallery system with auto-generated thumbnails and metadata
- Vercel constraints: 4.5 MB request limit, 60s timeout
- All timeouts explicit: Drive 55s, Resend 30s, Auth 25s

**Why:** Commercial site for Czech auto body shop, needs inquiry tracking with photo uploads to Drive.

**How to apply:** When working on this project, respect Vercel serverless limits and Drive API patterns. Czech strings for user-facing content.