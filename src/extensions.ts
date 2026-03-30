import { z } from "zod";

import {
  BuyerSchema,
  CheckoutCreateRequestSchema,
  CheckoutCompleteRequestSchema,
  CheckoutSchema,
  CheckoutUpdateRequestSchema,
  FulfillmentMethodSchema,
  FulfillmentSchema,
  ItemSchema,
  LineItemSchema,
  OrderSchema,
  PaymentCredentialSchema as GeneratedPaymentCredentialSchema,
  PaymentInstrumentSchema,
  PaymentSchema,
  TotalSchema,
} from "./spec_generated";

// ---------------------------------------------------------------------------
// Aliases — stable names consumers depend on even if the generated name changes
// ---------------------------------------------------------------------------

export const ItemResponseSchema = ItemSchema;
export type ItemResponse = z.infer<typeof ItemResponseSchema>;

export const TotalResponseSchema = TotalSchema;
export type TotalResponse = z.infer<typeof TotalResponseSchema>;

export const LineItemResponseSchema = LineItemSchema;
export type LineItemResponse = z.infer<typeof LineItemResponseSchema>;

export const FulfillmentResponseSchema = FulfillmentSchema;
export type FulfillmentResponse = z.infer<typeof FulfillmentResponseSchema>;

export const FulfillmentMethodResponseSchema = FulfillmentMethodSchema;
export type FulfillmentMethodResponse = z.infer<
  typeof FulfillmentMethodResponseSchema
>;

// ---------------------------------------------------------------------------
// Checkout status
// ---------------------------------------------------------------------------

export const CheckoutResponseStatusSchema = z.enum([
  "incomplete",
  "requires_escalation",
  "ready_for_complete",
  "complete_in_progress",
  "completed",
  "canceled",
]);
export type CheckoutResponseStatus = z.infer<
  typeof CheckoutResponseStatusSchema
>;

// ---------------------------------------------------------------------------
// Payment handler / credential
// ---------------------------------------------------------------------------

export const ExtendedPaymentCredentialSchema =
  GeneratedPaymentCredentialSchema.extend({
    token: z.string().optional(),
  });
export type ExtendedPaymentCredential = z.infer<
  typeof ExtendedPaymentCredentialSchema
>;

export const PaymentHandlerResponseSchema = z
  .object({
    id: z.string(),
    type: z.string().optional(),
    display_name: z.string().optional(),
    instrument_types: z.array(z.string()).optional(),
  })
  .passthrough();
export type PaymentHandlerResponse = z.infer<
  typeof PaymentHandlerResponseSchema
>;

export const PaymentResponseSchema = PaymentSchema.passthrough();
export type PaymentResponse = z.infer<typeof PaymentResponseSchema>;

export const PaymentInstrumentResponseSchema =
  PaymentInstrumentSchema.passthrough();
export type PaymentInstrumentResponse = z.infer<
  typeof PaymentInstrumentResponseSchema
>;

// ---------------------------------------------------------------------------
// Discovery profile
// Hand-authored: profile_schema.json has broken relative $refs that prevent
// generation. See https://github.com/Universal-Commerce-Protocol/js-sdk/issues/19
// ---------------------------------------------------------------------------

const UcpEntitySchema = z
  .object({
    version: z.string(),
    spec: z.string().url().optional(),
    schema: z.string().url().optional(),
    id: z.string().optional(),
    config: z.record(z.any()).optional(),
  })
  .passthrough();

export const UcpDiscoveryProfileSchema = z.object({
  ucp: z.object({
    version: z.string(),
    capabilities: z.record(z.string(), z.array(UcpEntitySchema)).optional(),
    services: z.record(z.string(), z.array(UcpEntitySchema)).optional(),
    payment_handlers: z.array(PaymentHandlerResponseSchema).optional(),
  }),
});
export type UcpDiscoveryProfile = z.infer<typeof UcpDiscoveryProfileSchema>;

// ---------------------------------------------------------------------------
// Platform config (ucp-client–specific, not in the UCP spec)
// ---------------------------------------------------------------------------

export const PlatformConfigSchema = z.object({
  webhook_url: z.string().url().optional(),
});
export type PlatformConfig = z.infer<typeof PlatformConfigSchema>;

// ---------------------------------------------------------------------------
// Extension field schemas (fulfillment, discount, buyer consent, AP2)
// ---------------------------------------------------------------------------

const FulfillmentRequestSchema = z
  .object({
    methods: z
      .array(
        z
          .object({
            id: z.string(),
            type: z.enum(["shipping", "pickup"]),
            line_item_ids: z.array(z.string()),
            selected_destination_id: z.string().nullable().optional(),
            groups: z
              .array(
                z
                  .object({
                    id: z.string(),
                    selected_option_id: z.string().nullable().optional(),
                  })
                  .passthrough()
              )
              .optional(),
          })
          .passthrough()
      )
      .optional(),
  })
  .passthrough();

const DiscountsObjectSchema = z
  .object({
    codes: z.array(z.string()).optional(),
  })
  .passthrough();

const ConsentSchema = z
  .object({
    marketing: z.boolean().optional(),
    sms: z.boolean().optional(),
    terms: z.boolean().optional(),
  })
  .passthrough();

const Ap2ResponseSchema = z
  .object({
    mandate: z.string().optional(),
    status: z.string().optional(),
  })
  .passthrough();

// ---------------------------------------------------------------------------
// Checkout request schemas — auto-generated from ucp_request annotations
// ---------------------------------------------------------------------------

export {
  CheckoutCreateRequestSchema,
  CheckoutUpdateRequestSchema,
  CheckoutCompleteRequestSchema,
};
export type CheckoutCreateRequest = z.infer<typeof CheckoutCreateRequestSchema>;
export type CheckoutUpdateRequest = z.infer<typeof CheckoutUpdateRequestSchema>;
export type CheckoutCompleteRequest = z.infer<
  typeof CheckoutCompleteRequestSchema
>;

// ---------------------------------------------------------------------------
// Checkout response schemas
// ---------------------------------------------------------------------------

export const CheckoutResponseSchema = CheckoutSchema.passthrough();
export type CheckoutResponse = z.infer<typeof CheckoutResponseSchema>;

export const ExtendedCheckoutResponseSchema = CheckoutSchema.extend({
  fulfillment: FulfillmentResponseSchema.optional(),
  discounts: DiscountsObjectSchema.optional(),
  ap2: Ap2ResponseSchema.optional(),
  order_id: z.string().optional(),
  order_permalink_url: z.string().optional(),
  platform: PlatformConfigSchema.optional(),
}).passthrough();
export type ExtendedCheckoutResponse = z.infer<
  typeof ExtendedCheckoutResponseSchema
>;

export const ExtendedCheckoutCreateRequestSchema =
  CheckoutCreateRequestSchema.extend({
    fulfillment: FulfillmentRequestSchema.optional(),
    discounts: DiscountsObjectSchema.optional(),
    buyer: BuyerSchema.extend({ consent: ConsentSchema.optional() }).optional(),
  });
export type ExtendedCheckoutCreateRequest = z.infer<
  typeof ExtendedCheckoutCreateRequestSchema
>;

export const ExtendedCheckoutUpdateRequestSchema =
  CheckoutUpdateRequestSchema.extend({
    fulfillment: FulfillmentRequestSchema.optional(),
    discounts: DiscountsObjectSchema.optional(),
    buyer: BuyerSchema.extend({ consent: ConsentSchema.optional() }).optional(),
  });
export type ExtendedCheckoutUpdateRequest = z.infer<
  typeof ExtendedCheckoutUpdateRequestSchema
>;

// ---------------------------------------------------------------------------
// Order
// ---------------------------------------------------------------------------

export { OrderSchema };
export type Order = z.infer<typeof OrderSchema>;
export const OrderUpdateSchema = OrderSchema;
export type OrderUpdate = z.infer<typeof OrderUpdateSchema>;
