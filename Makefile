.PHONY: help install dev dev-bg down shell vercel-login vercel-link env-example logs drive-oauth-token

help: ## Show available commands
	@echo "Commands:"
	@echo ""
	@grep -E '^[a-zA-Z0-9_.-]+:.*##' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*## "}; {printf "  make %-18s %s\n", $$1, $$2}'

install: ## Install npm deps inside a one-off container (writes node_modules/)
	docker compose run --rm dev npm ci

dev: ## Start Vercel dev on http://localhost:3000 (install + vercel dev)
	docker compose up

dev-bg: ## Same as dev, detached (background)
	docker compose up -d

down: ## Stop detached containers
	docker compose down

shell: ## Open sh in the dev container (Node 20 + npm 11, project at /app)
	docker compose run --rm dev sh

vercel-login: ## Log in to Vercel (interactive, first-time setup)
	docker compose run --rm -it dev npx vercel login

vercel-link: ## Link this folder to a Vercel project (interactive)
	docker compose run --rm -it dev npx vercel link

logs: ## Show logs from the dev container
	docker compose logs dev

drive-oauth-token: ## One-time: browser OAuth → prints GOOGLE_REFRESH_TOKEN (needs port 8765)
	docker compose run --rm -p 8765:8765 dev node --env-file=.env scripts/google-oauth-token.mjs
