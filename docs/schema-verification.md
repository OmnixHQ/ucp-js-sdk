# Schema Verification

`npm run verify:schemas` detects drift between the UCP spec and what's exported
from `src/spec_generated.ts` — ensuring the SDK always reflects the spec
exactly, with no missing or undocumented schemas.

It is run automatically in CI before every build.

---

## How it works

1. Downloads (or reads locally) the UCP spec for the chosen ref.
2. Scans `source/schemas/` and `source/discovery/` for every JSON Schema file
   that has a `$id`.
3. Derives the expected export name for each schema (e.g. `checkout.json` →
   `CheckoutSchema`).
4. For schemas with `ucp_request` annotations, also expects the generated
   request variants (`CheckoutCreateRequestSchema`,
   `CheckoutUpdateRequestSchema`, `CheckoutCompleteRequestSchema`, …).
5. Compares the full expected set against the actual `export const` statements
   in `src/spec_generated.ts`.
6. Exits `0` on a perfect match, `1` if anything is missing or extra.

---

## Modes

### Default — pinned release (v2026-04-08)

```bash
npm run verify:schemas
```

Downloads the `v2026-04-08` spec tarball from GitHub and checks all schemas.
This is what CI runs — always reproducible, no surprises.

---

### Specific release tag

```bash
npm run verify:schemas -- --release v2026-01-24
```

Swap in any tag from the
[UCP spec releases page](https://github.com/Universal-Commerce-Protocol/ucp/releases).
Run this **before** regenerating to preview exactly what would change.

---

### Latest commit on a branch

```bash
npm run verify:schemas -- --branch main
```

Fetches the current tip of the given branch. Useful for tracking unreleased
spec changes — schemas that appear here but are missing locally will arrive in
the next release.

---

### Exact commit SHA

```bash
npm run verify:schemas -- --commit abc1234
```

Pin to a specific commit. Useful for:

- Reproducing a past CI failure at a known point in history.
- Bisecting when a particular schema was added or removed.

---

### Local clone (no network)

```bash
npm run verify:schemas -- /path/to/ucp/source
```

Points directly at a `source/` directory from a locally cloned UCP spec repo.
The path must contain `schemas/` and `discovery/` subdirectories.

Use this when:

- You are editing the spec locally and want instant feedback.
- You are working offline.
- You want to avoid repeated tarball downloads during rapid iteration.

---

## Reading the output

**Everything matches:**

```
Spec schemas expected   : 54
spec_generated.ts exports: 54

✅ All schemas match.
```

**Missing schemas** — spec has them but `spec_generated.ts` does not:

```
Spec schemas expected   : 56
spec_generated.ts exports: 54

❌ Missing from spec_generated.ts (2):
   - TotalsSchema
   - VariantSchema

Run `npm run generate` to regenerate spec_generated.ts from the spec.
```

**Extra schemas** — in `spec_generated.ts` but not in the spec. These are
reported as warnings and do **not** fail CI, because hand-authored extensions
in `src/extensions.ts` are intentional:

```
⚠️  Extra in spec_generated.ts (1):
   + SomeDeprecatedSchema
```

---

## Typical upgrade workflow

```bash
# 1. Preview what changed in the new release
npm run verify:schemas -- --release v2026-01-24

# 2. Regenerate from the new release
npm run generate -- --release v2026-01-24

# 3. Confirm the generated output matches the spec
npm run verify:schemas -- --release v2026-01-24

# 4. Type-check and build
npm run typecheck && npm run build

# 5. Commit
git add src/spec_generated.ts
git commit -m "chore: regenerate schemas from UCP spec v2026-01-24"
```

---

## Skipped schemas

The skip list lives in `scripts/spec-utils.mjs` (`SKIP_SCHEMAS` constant) and
applies equally to both `generate` and `verify:schemas`.

Currently empty — all spec schemas are generated. `discovery/profile_schema.json`
(which uses relative cross-directory `$ref`s like `../schemas/ucp.json#/$defs/base`)
is handled by `prepareSpecDir`'s `rewriteRelativeRefs` step, which rewrites
relative `$ref`s to absolute `$id` URLs before `$RefParser` processes them.

---

## Same flags for `generate`

`npm run generate` accepts the exact same flags, so the two commands are always
symmetric:

```bash
npm run generate -- --release v2026-01-24
npm run generate -- --branch main
npm run generate -- --commit abc1234
npm run generate -- /path/to/ucp/source
```

See the header comment in `scripts/generate.mjs` for details.
