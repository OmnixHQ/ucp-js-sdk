# UCP Spec Changelog: v2026-01-23 to v2026-04-08

> Comprehensive diff of the [Universal Commerce Protocol](https://ucp.dev) specification
> between releases `v2026-01-23` (January 23, 2026) and `v2026-04-08` (April 8, 2026).
>
> **89 commits** from 20+ contributors over ~11 weeks.
> Schema impact: **27 new schemas added, 21 schemas modified, 0 schemas removed.**
> Service definitions: **3 added, 3 removed** (renamed/restructured).

---

## 1. New Capabilities (3 new top-level schemas)

### Cart (`shopping/cart.json`)

A new pre-purchase exploration capability (`dev.ucp.shopping.cart`) for basket building
without payment commitment. Carts model browsing, comparing, and saving items for later.

- CRUD operations: create, get, update, cancel
- Binary state (exists / 404) vs checkout's lifecycle status
- Estimated totals (not final pricing)
- `continue_url` for sharing/handoff
- Cart-to-checkout conversion via `cart_id` parameter (idempotent: same `cart_id` always
  returns same `checkout_id`)
- REST: `POST/GET/PUT /carts`, `POST /carts/{id}/cancel`
- MCP: `create_cart`, `get_cart`, `update_cart`, `cancel_cart` tools

### Catalog Search (`shopping/catalog_search.json`)

Product discovery via free-text search with filters (`dev.ucp.shopping.catalog.search`).

- Free-text query with semantic search support
- Filters: category (string array, OR semantics), price range (min/max in minor units)
- Context: country, region, postal_code, language, currency, intent
- Cursor-based pagination (default 10, no hard max -- businesses set upper bound)
- Extensible search inputs: query is no longer required, enabling filter-only browse
  and extension-defined modalities (image search, vector search)
- REST: `POST /catalog/search`
- MCP: `search_catalog` tool

### Catalog Lookup (`shopping/catalog_lookup.json`)

Targeted product + variant retrieval by ID (`dev.ucp.shopping.catalog.lookup`).

- Batch lookup: accepts `ids` array (product IDs, variant IDs, optionally SKU/handle)
- `get_product` operation for single-product detail with variant selection state
  (`selected` options + `preferences` for relaxation priority)
- Variant `inputs[]` correlation for batch responses (each variant carries which
  request IDs resolved to it, with `match` type: `exact` or `featured`)
- Optional filters (price range, category) applied after identifier resolution
- REST: `POST /catalog/lookup`, `POST /catalog/product`
- MCP: `lookup_catalog`, `get_product` tools
- Search and Lookup can be adopted independently

---

## 2. Breaking Changes (5 commits with `!`)

### `feat!: signals for authorization & abuse` (#203)

- New `signals` field on checkout, cart, catalog search, and catalog lookup requests
- Signals are platform attestations (direct observations + 3P attestations)
- Keys use reverse-domain naming enforced via `propertyNames` (e.g., `dev.ucp.buyer_ip`,
  `dev.ucp.user_agent`)
- Signal feedback via info messages with well-known code: `signal`
- Deprecated `risk_signals` on checkout (transition annotation: optional to omit)
- Signals and context are now echoed back in responses (removed `ucp_response: "omit"`)

### `feat!: update Order capability` (#254)

- Order:Checkout modeled as 1:N relationship (an order can span multiple checkouts)
- Signed quantities and amounts on adjustments (supports returns, exchanges)
- `quantity.original` field added for tracking original vs adjusted quantities
- Adjustment `amount` renamed to `totals` for consistency with the totals contract
- Softened append-only and immutable language on adjustments and line items
- Get Order operation added (`GET /orders/{id}`, MCP `get_order`) with platform-auth

### `feat!: make currency required on Order` (#283)

- `currency` is now a **required** field on the Order schema
- Currency is omitted from UCP request (business-provided only)

### `fix!: update total to use signed_amount.json` (#299)

- `total.json` now uses `signed_amount.json` (no `minimum: 0` constraint) instead
  of unsigned `amount.json`
- Per-type sign conditionals moved to `total.json` as the single source of truth:
  - `discount` / `items_discount`: must be < 0
  - `subtotal` / `tax` / `fee`: must be >= 0
- Fixes unsatisfiable schema bug where discount amounts needed to be both >= 0 AND < 0

### `feat!: align embedded protocol errors with UCP error conventions` (#325)

- Delegation error responses moved from JSON-RPC `error` to `result` using standard
  `error_response` shape
- New `ucp.json` `$defs/success` and `$defs/error` for shared composition
- `ucp.status` decoupled from severity -- status is a shape discriminator, severity
  is the action prescriber
- ECP delegation errors can now use `recoverable` severity (e.g., `abort_error`)
- Cart embedded protocol (`ep.cart.*`) aligned with UCP envelope conventions

### `feat!: embedded cart + reauth in ECP` (#244)

- Embedded Protocol transport binding for cart capability (`ep.cart.*` methods)
- `ec.auth` / `ep.cart.auth` reauth mechanism for credential renewal during sessions
- `ec.error` / `ep.cart.error` session-level error notifications

### `feat!: redesign identity linking` (#265) -- **REVERTED**

- Was merged then reverted in #329. No net change in the final release.

---

## 3. New Shared Type Schemas (24 new files in `shopping/types/`)

### Catalog Product Model

| Schema                     | Description                                                                                                                                                         |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `product.json`             | Catalog product entry (id, title, description, url, category, price_range, media, options, variants, rating, metadata)                                              |
| `variant.json`             | Purchasable SKU within a product (id, sku, barcodes, title, price, availability with `status`, selected_options, media, rating, tags, metadata, seller, unit_price) |
| `product_option.json`      | Configurable dimension (e.g., Size, Color) with option values                                                                                                       |
| `option_value.json`        | Value for a product option (name, label, optional id)                                                                                                               |
| `detail_option_value.json` | Extended option value for get_product with `available`/`exists` availability signals                                                                                |
| `selected_option.json`     | A specific option selection (e.g., Color=Blue) with optional id                                                                                                     |
| `category.json`            | Typed category with `{value, taxonomy}` supporting multiple taxonomies (google_product_category, shopify, merchant)                                                 |
| `description.json`         | Reusable product description type                                                                                                                                   |
| `media.json`               | Media object (image, video, 3D model) with open string vocabulary for type                                                                                          |
| `rating.json`              | Aggregate review rating (`average`, `count`, `scale_min` with default 1, `scale_max`)                                                                               |
| `price.json`               | Single price (amount + currency in minor units per ISO 4217)                                                                                                        |
| `price_range.json`         | Min/max Price range across variants                                                                                                                                 |

### Search & Filter Types

| Schema                   | Description                                                                                                                                             |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `search_filters.json`    | Search filter definitions (category array, price filter)                                                                                                |
| `price_filter.json`      | Integer min/max price bounds for search filtering                                                                                                       |
| `pagination.json`        | Cursor-based pagination (`limit`, `cursor`, response: `has_next_page` required, `next_cursor` required when has_next_page=true, optional `total_count`) |
| `input_correlation.json` | Batch lookup correlation (`id` + optional `match` type)                                                                                                 |

### Monetary & Totals Types

| Schema               | Description                                                                      |
| -------------------- | -------------------------------------------------------------------------------- |
| `amount.json`        | Canonical integer minor-unit monetary amount with ISO 4217 exponent guidance     |
| `signed_amount.json` | Monetary amount without `minimum: 0` constraint (for discounts, returns)         |
| `totals.json`        | Structured totals array container referencing `total.json` with sign constraints |

### Error Handling Types

| Schema                | Description                                                             |
| --------------------- | ----------------------------------------------------------------------- |
| `error_code.json`     | Registry of standard UCP error codes (string type, open vocabulary)     |
| `error_response.json` | Standard error response envelope (`ucp.status: "error"` + `messages[]`) |

### Security & Identity Types

| Schema                     | Description                                                                              |
| -------------------------- | ---------------------------------------------------------------------------------------- |
| `signals.json`             | Platform attestation signals for authorization & abuse prevention (reverse-domain keyed) |
| `reverse_domain_name.json` | Standalone reverse domain name type (extracted from `ucp.json` `$defs`)                  |

---

## 4. Schema Modifications (21 modified files)

### Core Protocol Schemas

| Schema                 | Changes                                                                                                                                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ucp.json`             | Added `$defs/success` (base + status "success") and `$defs/error` (base + status "error") for shared composition; `status` field ("success"/"error") added to `$defs/base` as application-level discriminator |
| `capability.json`      | Updated for multi-parent `extends` support (string or array); added `requires` object for protocol + capability version constraints                                                                           |
| `service.json`         | Renamed/versioned transport definitions                                                                                                                                                                       |
| `payment_handler.json` | Added `available_instruments` to payment handler configurations; improved `minItems`/`minProperties`/`uniqueItems` constraints                                                                                |

### Shopping Capability Schemas

| Schema               | Changes                                                                                                                                                                                             |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `checkout.json`      | Added `signals` field; `risk_signals` deprecated with transition annotation; `id` marked as `deprecated_required_to_omit` for update requests; schema-transition annotations for graceful migration |
| `order.json`         | 1:N relationship with checkout; `currency` now required; optional `label` field for additional identifiers; Get Order operation; signed quantities/amounts on adjustments                           |
| `discount.json`      | Extended to cart (previously checkout-only); `extends` now array `["dev.ucp.shopping.checkout", "dev.ucp.shopping.cart"]`; `provisional` + `eligibility` fields on applied_discount                 |
| `fulfillment.json`   | Fulfillment method type and id optionally passed in update calls; embedded protocol methods added with UCP envelope                                                                                 |
| `ap2_mandate.json`   | References updated for signing spec changes                                                                                                                                                         |
| `buyer_consent.json` | Schema updates for protocol alignment                                                                                                                                                               |

### Shopping Type Schemas

| Schema                         | Changes                                                                                                                                                                                                            |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `context.json`                 | Added `intent` field for buyer purpose signals; added `language` (BCP 47); added `currency` for multi-currency markets; added `eligibility[]` array for buyer benefit claims; clarified non-identifying constraint |
| `item.json`                    | Clarified line item id description (removed Google mention)                                                                                                                                                        |
| `total.json`                   | Switched from unsigned `amount.json` to `signed_amount.json`; per-type sign conditionals (discount < 0, subtotal/tax/fee >= 0) consolidated here                                                                   |
| `fulfillment_method.json`      | Type and id made optional for update calls                                                                                                                                                                         |
| `message_error.json`           | Added `unrecoverable` as fourth severity value; clarified resource state vs action semantics                                                                                                                       |
| `message_warning.json`         | Extended to support disclosure contract                                                                                                                                                                            |
| `order_confirmation.json`      | Updated for 1:N Order:Checkout relationship                                                                                                                                                                        |
| `order_line_item.json`         | Signed quantities; `quantity.original` field; adjustment `amount` renamed to `totals`                                                                                                                              |
| `card_payment_instrument.json` | Minor constraint improvements                                                                                                                                                                                      |
| `adjustment.json`              | Signed amounts; `amount` field renamed to `totals`; softened append-only language                                                                                                                                  |

### Transport Schemas

| Schema                            | Changes                                                                                                                         |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `transports/embedded_config.json` | Added `ec_color_scheme` query parameter (light/dark/auto); link delegation extension; cart capability binding; reauth mechanism |

---

## 5. New Enums, Types, and Constants

### Error Codes (added to `error_code.json` and spec prose)

- `not_found` -- resource does not exist (business outcome, HTTP 200)
- `invalid_eligibility` -- unresolved eligibility claims at checkout completion
- `eligibility_not_accepted` (warning), `eligibility_accepted` (info), `eligibility_invalid` (error)
- `abort_error`, `security_error`, `timeout_error` -- embedded protocol delegation errors
- `not_allowed_error`, `window_open_rejected_error` -- checkout-specific embedded errors

### UCP Status Discriminator

- `ucp.status`: `"success"` | `"error"` -- application-level operation discriminator on all responses
- `$defs/success` and `$defs/error` in `ucp.json` for schema composition

### Message Severity Values

- `recoverable` -- platform can fix and retry
- `requires_buyer_input` -- buyer action needed
- `requires_buyer_review` -- buyer review/approval needed
- `unrecoverable` (new) -- no valid resource exists, start over or hand off

### Signals Well-Known Keys

- `dev.ucp.buyer_ip` -- buyer IP address
- `dev.ucp.user_agent` -- buyer user agent string
- Custom signals use reverse-domain naming (e.g., `com.example.score`)

### Embedded Protocol Color Scheme

- `ec_color_scheme`: `"light"` | `"dark"` | `"auto"`

### Variant Availability Status

- Open vocabulary string: `in_stock`, `backorder`, `preorder`, etc.

### Input Correlation Match Types

- Open vocabulary string: `exact` (variant-level resolution), `featured` (product-level, server-selected)

---

## 6. Service Definition Changes

| File                                      | Status   | Notes                                                                          |
| ----------------------------------------- | -------- | ------------------------------------------------------------------------------ |
| `services/shopping/openapi.json`          | Removed  | Replaced by `rest.openapi.json`                                                |
| `services/shopping/openrpc.json`          | Removed  | Replaced by `mcp.openrpc.json`                                                 |
| `services/shopping/embedded.json`         | Removed  | Replaced by `embedded.openrpc.json`                                            |
| `services/shopping/rest.openapi.json`     | Added    | Renamed + versioned REST transport definition                                  |
| `services/shopping/mcp.openrpc.json`      | Added    | Renamed + versioned MCP transport definition; added catalog + cart methods     |
| `services/shopping/embedded.openrpc.json` | Added    | Renamed; added cart EP methods, reauth, UCP envelope on all delegation results |
| `handlers/tokenization/openapi.json`      | Modified | Signing headers updated (RFC 9421)                                             |

---

## 7. Summary Statistics

| Category                   | Count                                          |
| -------------------------- | ---------------------------------------------- |
| New capability schemas     | 3 (`cart`, `catalog_search`, `catalog_lookup`) |
| New shared type schemas    | 24                                             |
| Modified schemas           | 21                                             |
| Removed schemas            | 0                                              |
| New service definitions    | 3 (renamed from 3 removed)                     |
| Breaking changes (`!`)     | 5 effective (1 reverted)                       |
| Total source/ file changes | 53                                             |
| Total commits              | 89                                             |
| Spec-impacting commits     | ~45                                            |

---

## 8. Migration Notes for SDK Consumers

1. **New exports needed**: 27 new schema files will generate new Zod schemas and TypeScript types.
2. **Breaking type changes**: `total.json` now uses signed amounts; `order.json` requires `currency`;
   Order adjustments use `totals` instead of `amount`.
3. **New `ucp.status` discriminator**: All response types gain optional `status` field with
   `$defs/success` and `$defs/error` composition helpers.
4. **Signals replaces risk_signals**: Checkout's `risk_signals` is deprecated; consumers should
   migrate to the new `signals` field.
5. **Discount extends cart**: The discount extension's `extends` field is now an array, not a string.
6. **Embedded protocol**: Significant restructuring of ECP delegation responses to use standard
   `error_response` envelope. New cart and auth methods added.
7. **Context expansion**: `context.json` gains `intent`, `language`, `currency`, and `eligibility`
   fields -- all optional, no breaking changes for existing consumers.
