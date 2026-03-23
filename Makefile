.PHONY: help install dev dev-bg down shell vercel-login vercel-link env-example

# Default: show available commands
help:
	@echo "Autolakovna — common commands (Docker only for dev; no local Node required)"
	@echo ""
	@echo "  make install       Install npm deps inside a one-off container (writes node_modules/)"
	@echo "  make dev           Start Vercel dev on http://localhost:3000 (install + vercel dev)"
	@echo "  make dev-bg        Same as dev, detached (background)"
	@echo "  make down          Stop detached containers"
	@echo "  make shell         Open sh in the Node 20 container (project mounted at /app)"
	@echo "  make vercel-login  Log in to Vercel (interactive, first-time setup)"
	@echo "  make vercel-link   Link this folder to a Vercel project (interactive)"
	@echo "  make env-example   Copy .env.example to .env if .env does not exist yet"
	@echo ""
	@echo "See SETUP.md for Resend, Google Drive, and environment variables."

install:
	docker compose run --rm dev npm ci

dev:
	docker compose up

dev-bg:
	docker compose up -d

down:
	docker compose down

shell:
	docker compose run --rm dev sh

vercel-login:
	docker compose run --rm -it dev npx vercel login

vercel-link:
	docker compose run --rm -it dev npx vercel link

env-example:
	@if [ -f .env ]; then echo ".env already exists; not overwriting."; else cp .env.example .env && echo "Created .env from .env.example — edit it with your secrets."; fi
