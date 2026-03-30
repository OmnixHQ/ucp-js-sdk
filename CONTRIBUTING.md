# Contributing to @omnixhq/ucp-js-sdk

Thank you for your interest in contributing! This document explains how to get started.

## Getting Started

```bash
git clone https://github.com/OmnixHQ/ucp-js-sdk.git
cd ucp-js-sdk
npm install
npm run build
```

## Development Workflow

1. **Fork** the repository and create a feature branch
2. **Never push directly to `main`** — all changes go through a PR
3. **Run all checks** before submitting:

```bash
npm run typecheck       # TypeScript strict mode
npm run lint            # ESLint
npm run format:check    # Prettier
npm run verify:schemas  # Check spec ↔ spec_generated.ts coverage
npm run build           # tsdown (dual ESM + CJS)
npm run check:exports   # attw (validates exports map)
npm run check:publish   # publint
```

## Schema Generation

`src/spec_generated.ts` is auto-generated — **never edit it by hand**. If a schema
needs changing, fix the generator or add an extension in `src/extensions.ts`:

```bash
npm run generate                          # regenerate from default spec release
npm run generate -- --release v2026-01-24 # specific release tag
npm run generate -- --branch main         # latest commit on a branch
```

See [docs/schema-verification.md](docs/schema-verification.md) for the full upgrade workflow.

## Code Style

- **Immutability** — never mutate existing objects, always return new copies
- **Small files** — 200–400 lines typical, 800 max
- **No descriptive comments** — comments explain WHY, never WHAT
- **Every `const` export must have a corresponding `type` export**
- **Aliases in `extensions.ts` must reference generated schemas, not re-define them**

## Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new schema export
fix: correct enum values in CheckoutResponseStatus
refactor: extract shared normalisation logic
docs: update schema-verification guide
chore: update dependencies
```

## Pull Requests

- Keep PRs focused — one feature or fix per PR
- All CI checks must pass before merging
- Release-please manages versioning automatically from commit messages — do **not**
  manually edit `version` in `package.json` or `.release-please-manifest.json`

## Reporting Issues

- **Bugs**: [Open an issue](https://github.com/OmnixHQ/ucp-js-sdk/issues/new)
- **Security**: Do not file a public issue — email the maintainers directly

## Contributor License Agreement (CLA)

By submitting a pull request, you agree that your contributions may be relicensed
under the project's Apache 2.0 license and any future commercial license. This ensures
OmnixHQ can maintain both the open source project and any commercial offerings.

## License

By contributing, you agree that your contributions will be licensed under the
[Apache License 2.0](./LICENSE).
