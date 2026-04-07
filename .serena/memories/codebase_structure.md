---
name: Codebase Structure
description: Directory layout and key files in autolakovna
type: project
---

# Codebase Structure

```
/
├── api/                    # Vercel serverless functions
│   ├── contact.js          # Form handler (Drive upload + email)
│   └── health.js           # Health check endpoint
├── public/                 # Static assets (served directly)
│   ├── index.html          # Main page
│   ├── contact-form.js     # Form submission logic
│   ├── nav-sections.js     # Navigation highlighting
│   ├── gallery.js          # Gallery UI
│   ├── gallery-data.json   # Auto-generated gallery metadata
│   ├── before-after-slider.js
│   ├── site.css            # Custom styles
│   ├── images/             # Static images
│   └── gallery-thumbs/     # Generated thumbnails (gitignored sources)
├── scripts/                # Build/setup utilities
│   ├── google-oauth-token.mjs      # OAuth token generator
│   ├── generate-gallery-thumbs.mjs # Sharp-based thumbnail gen
│   └── build-gallery-data.mjs      # Gallery JSON builder
├── design_system/          # UI spec + mockup
├── Makefile                # All dev commands
├── package.json            # Node 20, ES modules, scripts
├── docker-compose.yml      # Dev container config
├── Dockerfile              # Node 20 + Vercel CLI
├── .env.example            # Env vars template
└── CLAUDE.md               # Project guidance
```

**Why:** Vercel convention for serverless (api/), static assets (public/), Docker for dev environment.

**How to apply:** Add serverless functions to `api/`, frontend code to `public/`, build scripts to `scripts/`. Respect Vercel file-based routing.