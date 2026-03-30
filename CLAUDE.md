# @omnixhq/ucp-js-sdk — Project Rules

## What This Is

`@omnixhq/ucp-js-sdk` is the spec-generated TypeScript/Zod schema library for the
[Universal Commerce Protocol](https://ucp.dev). It provides runtime-validated Zod schemas
and TypeScript types for every UCP entity.

It is a **library, not a server** — no port, no process, no Docker container.

## Architecture

```
index.ts                  — re-exports src/extensions + src/spec_generated
src/
  spec_generated.ts       — AUTO-GENERATED from UCP spec (never edit manually)
  extensions.ts           — hand-authored: aliases, extensions, UcpDiscoveryProfileSchema
scripts/
  generate.mjs            — downloads spec + generates spec_generated.ts
  verify-schemas.mjs      — detects drift between spec and spec_generated.ts
  spec-utils.mjs          — shared utilities for generate + verify
docs/
  schema-verification.md  — full usage guide for generate and verify:schemas
```

### Two-file pattern

- **`spec_generated.ts`** — never touch by hand. Always regenerate with `npm run generate`.
- **`extensions.ts`** — hand-authored additions on top of the generated base:
  - Stable aliases consumers depend on (`FulfillmentResponseSchema`, `ItemResponseSchema`, etc.)
  - `UcpDiscoveryProfileSchema` (hand-authored: profile_schema.json has broken $refs)
  - `CheckoutResponseStatusSchema` (hand-authored: not generated, comes from checkout.json enum)
  - `ExtendedCheckout*` schemas that compose generated + platform-specific fields
  - `PaymentHandlerResponseSchema` (re-exported from generated; hand-authored alias for stability)

## Git Workflow

**NEVER push directly to `main`.** All changes go through a branch + PR.

```bash
git checkout -b <type>/<short-description>
# make changes
git add <files>
git commit -m "<type>: <description>"
git push -u origin <branch>
gh pr create --title "<type>: <description>" --body "..."
```

Commit types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `ci`

**Release-please** reads conventional commits and opens a Release PR automatically on
merge to `main`. Do NOT manually edit `version` in `package.json` or
`.release-please-manifest.json`.

## Build & Test

```bash
npm install
npm run build           # tsdown → dual ESM (.mjs) + CJS (.cjs) with .d.mts/.d.cts
npm run typecheck       # tsc --noEmit
npm run lint            # eslint
npm run format:check    # prettier --check
npm run verify:schemas  # check spec ↔ spec_generated.ts coverage
npm run check:exports   # attw (validates exports map across node10/node16/bundler)
npm run check:publish   # publint
```

CI runs all of the above on every PR (`.github/workflows/ci.yml`).

## Schema Generation

`spec_generated.ts` is auto-generated. **Never edit it by hand.**

```bash
npm run generate                           # default release (v2026-01-23)
npm run generate -- --release v2026-01-24  # specific release tag
npm run generate -- --branch main          # latest commit on a branch
npm run generate -- --commit abc1234       # exact commit SHA
npm run generate -- /path/to/ucp/source    # local spec clone
```

See `docs/schema-verification.md` for the full upgrade workflow.

## Schema Verification

```bash
npm run verify:schemas                           # default release
npm run verify:schemas -- --release v2026-01-24  # check against new release
npm run verify:schemas -- --branch main          # check against branch tip
npm run verify:schemas -- /path/to/ucp/source    # local clone
```

Exits 0 on match, 1 on drift. Runs automatically in CI before every build.

## Skipped Schemas

`discovery/profile_schema.json` is excluded from generation (broken relative `$ref`s).
`UcpDiscoveryProfileSchema` is hand-authored in `extensions.ts` instead.
The skip list lives in `scripts/spec-utils.mjs` (`SKIP_SCHEMAS` constant).

## Code Rules

### spec_generated.ts is sacred

Never edit `spec_generated.ts` manually. If you see a schema issue in it, the fix goes in
one of:

1. The generator (`scripts/generate.mjs` or `scripts/spec-utils.mjs`)
2. `extensions.ts` — add an alias or override on top of the generated base

### extensions.ts conventions

- Group additions under `// ---` banner comments
- Every `const` export must have a corresponding `type` export
- Aliases must reference the generated schema, not re-define it
- Keep hand-authored schemas minimal — prefer generating from spec

### ESLint

`src/spec_generated.ts` is excluded from linting (auto-generated).
Config: `.eslintrc.cjs` with `@typescript-eslint`, `no-explicit-any: error`,
`no-floating-promises: error`.

### Prettier

Runs on all `*.ts`, `*.json`, `*.md` files. Always run `npm run format:check` before
committing, or `npm run format` to auto-fix.

### No descriptive comments

Comments must explain WHY, not WHAT.

## Release Pipeline

1. Merge feat/fix PR → release-please opens a Release PR (bumps version + changelog)
2. Merge Release PR → npm publish fires automatically

**Secrets required** (set in repo Settings → Secrets → Actions):

- `NPM_TOKEN` — npm automation token for `@omnixhq` org publish
- `GITHUB_TOKEN` — built-in, used by release-please (no manual secret needed)

## Current State (as of 2026-03-30)

### What's done

- Full spec migration to UCP `v2026-01-23` with Draft 2020-12 generator
- `scripts/generate.mjs` — downloads spec tarball + emits 81 schemas (46 top-level +
  35 per-`$def` exports + 7 request variants from `ucp_request` annotations)
- `scripts/verify-schemas.mjs` — drift detection (expected: 81 exports), runs in CI
- `scripts/spec-utils.mjs` — shared utilities (`--release`, `--branch`, `--commit`,
  local path modes)
- `tsdown` dual ESM/CJS build — passes all `attw` resolution modes
- CI workflow (typecheck → lint → format:check → verify:schemas → build → check:exports
  → check:publish)
- Release workflow (release-please + npm publish with provenance)
- `docs/schema-verification.md` — full developer guide
- **Zero `z.any()`** — all `$defs`-only spec files are now extracted as individual named
  exports (e.g. `UcpEntitySchema`, `PaymentHandlerResponseSchema`, `DiscountAllocationSchema`)

### Open work

- **NPM_TOKEN** not yet set in repo secrets → npm publish not yet wired up
- **ucp-client migration** — waiting until SDK is published to npm before switching
  `@ucp-js/sdk` → `@omnixhq/ucp-js-sdk` in ucp-client
