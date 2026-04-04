.PHONY: help install dev dev-bg down shell vercel-login vercel-whoami vercel-link deploy deploy-preview env-example logs drive-oauth-token

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

vercel-login: ## Interaktivní login (e-mail/GitHub); IGNORUJE VERCEL_TOKEN — jen pro session v kontejneru
	docker compose run --rm -it dev npx vercel login

vercel-whoami: ## Ověří VERCEL_TOKEN z .env (bez vercel login — stejné jako u vercel dev)
	docker compose run --rm dev sh -c 'npx vercel whoami --token "$$VERCEL_TOKEN"'

vercel-link: ## Propojení projektu (s tokenem z .env; může vyžadovat -it u prvního linku)
	docker compose run --rm -it dev sh -c 'npx vercel link --token "$$VERCEL_TOKEN"'

deploy-preview: ## Nasazení preview (unikátní URL) — VERCEL_TOKEN + .vercel/project.json
	docker compose run --rm dev sh -c 'npx vercel deploy --token "$$VERCEL_TOKEN" --yes'

deploy: ## Produkční nasazení (stejná „Production“ větev jako na vercel.com) — totéž + --prod
	docker compose run --rm dev sh -c 'npx vercel deploy --prod --token "$$VERCEL_TOKEN" --yes'

logs: ## Show logs from the dev container
	docker compose logs dev

drive-oauth-token: ## One-time: browser OAuth → prints GOOGLE_REFRESH_TOKEN (needs port 8765)
	docker compose run --rm -p 8765:8765 dev node --env-file=.env scripts/google-oauth-token.mjs
