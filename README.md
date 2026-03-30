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
  <b>JavaScript library for the Universal Commerce Protocol (UCP).</b>
</p>

[![npm version](https://img.shields.io/npm/v/@omnixhq/ucp-js-sdk.svg)](https://www.npmjs.com/package/@omnixhq/ucp-js-sdk)
[![CI](https://github.com/OmnixHQ/ucp-js-sdk/actions/workflows/ci.yml/badge.svg)](https://github.com/OmnixHQ/ucp-js-sdk/actions/workflows/ci.yml)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4+-blue.svg)](https://www.typescriptlang.org/)

## Overview

This repository contains the JavaScript SDK for the
[Universal Commerce Protocol (UCP)](https://ucp.dev). It provides TypeScript
types and [Zod](https://zod.dev/) schemas for UCP models, making it easy to
build UCP-compliant applications in JavaScript and TypeScript.

## Installation

To install the SDK in your project, run:

```bash
npm install @omnixhq/ucp-js-sdk
```

## Usage

The SDK provides Zod schemas and TypeScript types for every UCP entity. Use schemas
to validate data at runtime and get full type safety throughout your application:

```typescript
import { ExtendedCheckoutCreateRequestSchema } from "@omnixhq/ucp-js-sdk";

const result = ExtendedCheckoutCreateRequestSchema.safeParse(req.body);
if (!result.success) {
  return res.status(400).json({ error: result.error.flatten() });
}
// result.data is fully typed
```

See [docs/examples.md](docs/examples.md) for more examples covering checkout
validation, payment handlers, discovery profiles, order webhooks, and fulfillment.

## Development

### Prerequisites

This project uses `npm` for package management and `typescript` for building.

### Generating schemas

`src/spec_generated.ts` is auto-generated from the UCP spec. The generator
downloads the spec tarball directly — no local clone required:

```bash
npm run generate                          # default release (v2026-01-23)
npm run generate -- --release v2026-01-24 # specific release tag
npm run generate -- --branch main         # latest commit on a branch
npm run generate -- --commit abc1234      # exact commit SHA
npm run generate -- /path/to/ucp/source   # local spec clone
```

### Verifying schema coverage

Check that `spec_generated.ts` exports exactly the schemas present in the spec —
no missing, no undocumented extras:

```bash
npm run verify:schemas                          # default release
npm run verify:schemas -- --release v2026-01-24 # specific release
npm run verify:schemas -- --branch main         # latest on a branch
npm run verify:schemas -- /path/to/ucp/source   # local clone
```

This runs automatically in CI before every build. See
[docs/schema-verification.md](docs/schema-verification.md) for the full
reference — output format, upgrade workflow, and skipped schemas.

### Building

To build the project for both CommonJS and ESM:

```bash
npm run build
```

## Contributing

We welcome community contributions. See our
[Contribution Guide](https://github.com/OmnixHQ/ucp-js-sdk/blob/main/CONTRIBUTING.md)
for details.

## License

UCP is an open-source project under the [Apache License 2.0](LICENSE).
