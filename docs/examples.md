# Usage Examples

Practical examples for building UCP-compliant applications with `@omnixhq/ucp-js-sdk`.

Each schema serves as both a **runtime validator** (Zod) and a **TypeScript type** — you
get validation errors at the boundary and full autocomplete/type safety throughout your
application.

## 1. Validate a checkout payload (merchant server)

```typescript
import { ExtendedCheckoutCreateRequestSchema } from "@omnixhq/ucp-js-sdk";

// Express route handler
app.post("/checkout", async (req, res) => {
  const result = ExtendedCheckoutCreateRequestSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.flatten() });
  }
  const checkout = result.data; // fully typed: ExtendedCheckoutCreateRequest
  // ...create checkout in your system
});
```

## 2. Type-safe checkout response handling (storefront / headless UI)

```typescript
import {
  ExtendedCheckoutResponseSchema,
  CheckoutResponseStatus,
} from "@omnixhq/ucp-js-sdk";

const raw = await fetch("/api/checkout/abc123").then((r) => r.json());
const checkout = ExtendedCheckoutResponseSchema.parse(raw);

// TypeScript knows checkout.status is CheckoutResponseStatus
if (checkout.status === "ready_for_complete") {
  showConfirmButton();
}
```

## 3. Build a payment handler (implementing UCP payment flow)

```typescript
import {
  PaymentHandlerResponseSchema,
  ExtendedPaymentCredentialSchema,
} from "@omnixhq/ucp-js-sdk";

function handlePayment(credential: unknown) {
  const parsed = ExtendedPaymentCredentialSchema.parse(credential);
  // parsed.token is available (SDK extension field)
  const response = {
    status: "success",
    transaction_id: "txn_123",
  };
  return PaymentHandlerResponseSchema.parse(response);
}
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

## 5. Order update webhook validation

```typescript
import { OrderSchema } from "@omnixhq/ucp-js-sdk";

app.post("/webhooks/order", (req, res) => {
  const order = OrderSchema.parse(req.body);
  // order is fully typed with all UCP Order fields
  console.log(order.id, order.status);
});
```

## 6. Fulfillment method selection (with extension fields)

```typescript
import { ExtendedCheckoutUpdateRequestSchema } from "@omnixhq/ucp-js-sdk";

const update = ExtendedCheckoutUpdateRequestSchema.parse({
  fulfillment: {
    methods: [
      {
        id: "method_1",
        type: "shipping",
        line_item_ids: ["li_abc"],
        selected_destination_id: "addr_xyz",
      },
    ],
  },
  discounts: { codes: ["SAVE10"] },
});
```
