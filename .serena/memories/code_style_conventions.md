---
name: Code Style and Conventions
description: Coding standards for autolakovna project
type: project
---

# Code Style & Conventions

**Module System:**
- ES modules (`"type": "module"` in package.json)
- Use `import`/`export`, not `require()`

**Vercel Functions:**
- Pattern: `export default { fetch }` (not `export default function`)
- Handles Request/Response objects (Web API standard)

**Language:**
- **Czech** for all user-facing strings (UI, errors, emails)
- **English** for code, comments, developer docs

**Code Quality:**
- Brief, meaningful comments where purpose not obvious
- Comments explain **why**, not what
- Explicit timeout handling for external APIs
- Error handling with detailed messages (esp. Drive API)

**Naming:**
- Constants: `SCREAMING_SNAKE_CASE` (e.g., `MAX_TOTAL_PHOTO_BYTES`)
- Functions: `camelCase`
- Clear, descriptive names (e.g., `uploadResumable`, `driveErrorFromHttp`)

**No Test Suite:** Currently no automated tests

**Type Hints:** Not used (plain JS, no TypeScript/JSDoc types)

**Why:** Vercel patterns for serverless, Czech business, maintainability without test coverage.

**How to apply:** Follow ES module syntax, add timeout wrappers for APIs, keep Czech strings for users, English for dev.