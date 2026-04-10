<!--
   Copyright 2026 UCP Authors

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
-->

<p align="center">
  <h1 align="center">UCP JavaScript SDK</h1>
</p>

<p align="center">
  <b>Runtime-validated Zod schemas and TypeScript types for the Universal Commerce Protocol (UCP).</b>
</p>

[![npm version](https://img.shields.io/npm/v/@omnixhq/ucp-js-sdk.svg)](https://www.npmjs.com/package/@omnixhq/ucp-js-sdk)
[![CI](https://github.com/OmnixHQ/ucp-js-sdk/actions/workflows/ci.yml/badge.svg)](https://github.com/OmnixHQ/ucp-js-sdk/actions/workflows/ci.yml)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4+-blue.svg)](https://www.typescriptlang.org/)

## Overview

The JavaScript SDK for the [Universal Commerce Protocol (UCP)](https://ucp.dev).
Auto-generated from the UCP spec with full coverage — 100 schemas including
checkout, orders, payments, fulfillment, discovery profiles, and all inline enums.

**Key features:**

- 100% spec coverage — every schema, `$def`, request variant, and enum
- Fully generated from the UCP JSON Schema spec — consumer aliases in `extensions.ts`
- Runtime validation with [Zod](https://zod.dev/) — `.parse()` and `.safeParse()`
- Extension-safe — `additionalProperties: true` schemas use `.passthrough()` to preserve extension data
- Dual ESM/CJS build — works everywhere

## Installation

```bash
# Stable (current UCP release)
npm install @omnixhq/ucp-js-sdk
```

### Draft builds

To build against upcoming UCP spec changes (Catalog capability, Order updates, etc.),
install the `next` tag:

```bash
# Draft (latest UCP spec main branch)
npm install @omnixhq/ucp-js-sdk@next
```

Draft builds are published automatically when the UCP spec's `main` branch changes.
They use prerelease versions (e.g., `1.0.2-draft.5.1`) and won't affect your
stable installs. Switch back anytime with `npm install @omnixhq/ucp-js-sdk@latest`.

## Usage

### Validate a checkout request

```typescript
import {
  CheckoutCreateRequestSchema,
  type CheckoutCreateRequest,
} from "@omnixhq/ucp-js-sdk";

const result = CheckoutCreateRequestSchema.safeParse(req.body);
if (!result.success) {
  return res.status(400).json({ error: result.error.flatten() });
}
const checkout: CheckoutCreateRequest = result.data;
```

### Validate a checkout response

```typescript
import { CheckoutSchema } from "@omnixhq/ucp-js-sdk";

const checkout = CheckoutSchema.parse(apiResponse);
// Typed fields: checkout.id, checkout.status, checkout.line_items, etc.
// Extension data (fulfillment, discounts, ap2) is preserved at runtime
// via .passthrough() but not statically typed on the base schema.
```

### Validate a discovery profile

```typescript
import { UcpDiscoveryProfileSchema } from "@omnixhq/ucp-js-sdk";

const profile = await fetch(
  "https://platform.example.com/.well-known/ucp"
).then((r) => r.json());
const discovery = UcpDiscoveryProfileSchema.parse(profile);

// discovery.ucp.services        — Record<string, Service[]>
// discovery.ucp.capabilities    — Record<string, Capability[]>
// discovery.ucp.payment_handlers — Record<string, PaymentHandler[]>
// discovery.signing_keys        — JWK signing keys
```

### Use standalone enums

```typescript
import {
  CheckoutStatusEnumSchema,
  TotalTypeEnumSchema,
  ServiceBaseTransportEnumSchema,
} from "@omnixhq/ucp-js-sdk";

// Type-safe enum values
const status = CheckoutStatusEnumSchema.parse("incomplete");
const transport = ServiceBaseTransportEnumSchema.parse("mcp");
```

See [docs/examples.md](docs/examples.md) for more examples covering payment
handlers, order webhooks, and fulfillment.

## What's included

| Category          | Count | Examples                                                     |
| ----------------- | ----- | ------------------------------------------------------------ |
| Top-level schemas | 46    | `CheckoutSchema`, `OrderSchema`, `PaymentSchema`             |
| `$defs` exports   | 39    | `UcpEntitySchema`, `PaymentHandlerResponseSchema`            |
| Request variants  | 7     | `CheckoutCreateRequestSchema`, `CheckoutUpdateRequestSchema` |
| Inline enums      | 15    | `CheckoutStatusEnumSchema`, `TotalTypeEnumSchema`            |
| Consumer aliases  | ~15   | `UcpDiscoveryProfileSchema`, `CheckoutResponseStatusSchema`  |

All schemas have corresponding TypeScript types exported (e.g., `Checkout`, `Order`, `UcpDiscoveryProfile`).

## Development

### Prerequisites

Node.js 22+ and npm.

### Generating schemas

`src/spec_generated.ts` is auto-generated from the UCP spec:

```bash
npm run generate                          # default release (v2026-04-08)
npm run generate -- --release v2026-01-24 # specific release tag
npm run generate -- --branch main         # latest commit on a branch
npm run generate -- --commit abc1234      # exact commit SHA
npm run generate -- /path/to/ucp/source   # local spec clone
```

### Verifying schema coverage

```bash
npm run verify:schemas                          # default release
npm run verify:schemas -- --release v2026-01-24 # specific release
npm run verify:schemas -- --branch main         # latest on a branch
```

Runs automatically in CI. See [docs/schema-verification.md](docs/schema-verification.md)
for the full reference.

### Building

```bash
npm run build      # tsdown → dual ESM (.mjs) + CJS (.cjs)
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
npm run format     # prettier
```

### Draft branch workflow

The `draft` branch tracks the latest UCP spec `main` for upcoming features:

- **Auto-regeneration**: every Monday at 09:00 UTC (or manual trigger via Actions)
- **Auto-publish**: push to `draft` → publishes `X.Y.Z-draft.N` with npm `next` tag
- **Promotion**: when UCP cuts a stable release, merge `draft` → `main` → release-please handles the rest

## Contributing

We welcome community contributions. See our
[Contribution Guide](https://github.com/OmnixHQ/ucp-js-sdk/blob/main/CONTRIBUTING.md)
for details.

## License

UCP is an open-source project under the [Apache License 2.0](LICENSE).
