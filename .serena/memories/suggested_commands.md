---
name: Suggested Commands
description: Essential Makefile commands for development
type: reference
---

# Development Commands

All commands via `make` (runs in Docker containers):

## Development
- `make dev` - Start Vercel dev server on http://localhost:3000 (foreground)
- `make dev-bg` - Same, detached (background)
- `make down` - Stop detached containers
- `make shell` - Open shell in dev container (Node 20)
- `make logs` - Show dev container logs

## Dependencies
- `make install` - Install npm deps (writes `node_modules/`)

## Deployment (Vercel)
- `make deploy-preview` - Deploy preview (unique URL)
- `make deploy` - Production deploy
- `make vercel-whoami` - Check VERCEL_TOKEN from .env
- `make vercel-link` - Link project (first-time setup)

## Setup
- `make drive-oauth-token` - Generate Google OAuth refresh token (port 8765)

## Gallery
- `make gallery-thumbs` - Generate thumbnails from `gallery/*` → `public/gallery-thumbs/`
- `make build-gallery-data` - Build `public/gallery-data.json` from thumbnails

## Help
- `make help` - List all commands

**Why:** Dockerized workflow ensures consistent Node 20 env, Vercel CLI pre-installed.

**How to apply:** Always use `make` commands, not direct `npm` or `vercel` (unless in container shell).