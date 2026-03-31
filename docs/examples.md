# Usage Examples

Practical examples for building UCP-compliant applications with `@omnixhq/ucp-js-sdk`.

Each schema serves as both a **runtime validator** (Zod) and a **TypeScript type** — you
get validation errors at the boundary and full autocomplete/type safety throughout your
application.

## 1. Validate a checkout create request

```typescript
import { CheckoutCreateRequestSchema } from "@omnixhq/ucp-js-sdk";

app.post("/checkout", async (req, res) => {
  const result = CheckoutCreateRequestSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.flatten() });
  }
  const checkout = result.data; // fully typed: CheckoutCreateRequest
});
```

## 2. Type-safe checkout response handling

```typescript
import { CheckoutSchema, CheckoutStatusEnumSchema } from "@omnixhq/ucp-js-sdk";

const raw = await fetch("/api/checkout/abc123").then((r) => r.json());
const checkout = CheckoutSchema.parse(raw);

// Extension data is preserved (fulfillment, discounts, ap2, etc.)
if (checkout.status === "ready_for_complete") {
  showConfirmButton();
}
```

## 3. Validate payment handler responses

```typescript
import { PaymentHandlerResponseSchema } from "@omnixhq/ucp-js-sdk";

const handler = PaymentHandlerResponseSchema.parse(apiResponse);
// handler.version, handler.config, etc. — fully typed
```

## 4. Validate a UCP discovery profile

```typescript
import { UcpDiscoveryProfileSchema } from "@omnixhq/ucp-js-sdk";

const profile = await fetch(
  "https://platform.example.com/.well-known/ucp"
).then((r) => r.json());
const discovery = UcpDiscoveryProfileSchema.parse(profile);

// discovery.ucp.payment_handlers — typed record of payment handler arrays
// discovery.ucp.capabilities    — typed record of capability arrays
// discovery.ucp.services        — typed record of service arrays
// discovery.signing_keys        — typed array of JWK signing keys
```

## 5. Order webhook validation

```typescript
import { OrderSchema } from "@omnixhq/ucp-js-sdk";

app.post("/webhooks/order", (req, res) => {
  const order = OrderSchema.parse(req.body);
  // order is fully typed with all UCP Order fields
  console.log(order.id, order.line_items);
});
```

## 6. Use standalone enums for type safety

```typescript
import {
  CheckoutStatusEnumSchema,
  type CheckoutStatusEnum,
  TotalTypeEnumSchema,
  ServiceBaseTransportEnumSchema,
  MessageErrorSeverityEnumSchema,
} from "@omnixhq/ucp-js-sdk";

// Parse and validate enum values
const status = CheckoutStatusEnumSchema.parse("incomplete");
const transport = ServiceBaseTransportEnumSchema.parse("mcp");

// Types are exported alongside schemas
const current: CheckoutStatusEnum = "ready_for_complete";
```

## 7. Update a checkout (fulfillment + discounts)

```typescript
import { CheckoutUpdateRequestSchema } from "@omnixhq/ucp-js-sdk";

const update = CheckoutUpdateRequestSchema.parse({
  buyer: {
    email: "jane@example.com",
  },
});
```
