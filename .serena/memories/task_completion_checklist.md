---
name: Task Completion Checklist
description: What to do after completing a task
type: feedback
---

# Task Completion Checklist

**No automated checks currently:**
- No linting
- No formatting
- No test suite

**Manual verification:**
1. Test locally with `make dev` (http://localhost:3000)
2. For API changes: test endpoints manually
3. For gallery changes: run `make gallery-thumbs` and `make build-gallery-data`
4. For deploy: `make deploy-preview` first, then `make deploy`

**Commit:**
- Follow existing commit message style (see git log)
- Concise, descriptive messages
- Use Czech for user-facing changes if context demands

**Why:** No CI/CD checks, manual testing required. Vercel serverless requires live testing for full validation.

**How to apply:** After code changes, manually test locally before deploying. For serverless API, test with real requests.