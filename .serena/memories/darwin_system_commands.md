---
name: Darwin System Commands
description: macOS-specific command notes for autolakovna dev
type: reference
---

# Darwin (macOS) System Commands

**Standard Unix commands work:** `git`, `ls`, `cd`, `grep`, `find`, `cat`, `head`, `tail`, `sed`, `awk`

**Docker:**
- Docker Desktop required
- `docker compose` (not `docker-compose` v1)

**No BSD vs GNU differences in this project** - Docker containers use Linux binaries.

**Port binding:**
- Local dev: `:3000` (Vercel dev)
- OAuth flow: `:8765` (google-oauth-token script)

**Why:** Development on macOS, but execution in Linux containers (Docker).

**How to apply:** Host commands are macOS, but `make` commands execute in Linux containers. No need for GNU coreutils.