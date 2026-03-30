import { z } from "zod";

import {
  CheckoutCreateRequestSchema,
  CheckoutCompleteRequestSchema,
  CheckoutSchema,
  CheckoutStatusEnumSchema,
  CheckoutUpdateRequestSchema,
  FulfillmentMethodSchema,
  FulfillmentSchema,
  ItemSchema,
  LineItemSchema,
  OrderSchema,
  PaymentInstrumentSchema,
  PaymentSchema,
  ProfileSchemaBaseSchema,
  ProfileSchemaBusinessProfileSchema,
  ProfileSchemaPlatformProfileSchema,
  ProfileSchemaSigningKeySchema,
  TotalSchema,
  PaymentHandlerResponseSchema as GeneratedPaymentHandlerResponseSchema,
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
// Checkout status — alias for the generated enum
// ---------------------------------------------------------------------------

export const CheckoutResponseStatusSchema = CheckoutStatusEnumSchema;
export type CheckoutResponseStatus = z.infer<
  typeof CheckoutResponseStatusSchema
>;

// ---------------------------------------------------------------------------
// Payment handler / credential
// ---------------------------------------------------------------------------

// Re-export the generated spec-based schema
export { GeneratedPaymentHandlerResponseSchema as PaymentHandlerResponseSchema };

export const PaymentResponseSchema = PaymentSchema.passthrough();
export type PaymentResponse = z.infer<typeof PaymentResponseSchema>;

export const PaymentInstrumentResponseSchema =
  PaymentInstrumentSchema.passthrough();
export type PaymentInstrumentResponse = z.infer<
  typeof PaymentInstrumentResponseSchema
>;

// ---------------------------------------------------------------------------
// Discovery profile aliases — stable names for the generated profile schemas
// ---------------------------------------------------------------------------

export const UcpDiscoveryProfileSchema = ProfileSchemaBaseSchema;
export type UcpDiscoveryProfile = z.infer<typeof UcpDiscoveryProfileSchema>;

export const UcpDiscoveryPlatformProfileSchema =
  ProfileSchemaPlatformProfileSchema;
export type UcpDiscoveryPlatformProfile = z.infer<
  typeof UcpDiscoveryPlatformProfileSchema
>;

export const UcpDiscoveryBusinessProfileSchema =
  ProfileSchemaBusinessProfileSchema;
export type UcpDiscoveryBusinessProfile = z.infer<
  typeof UcpDiscoveryBusinessProfileSchema
>;

export const UcpSigningKeySchema = ProfileSchemaSigningKeySchema;
export type UcpSigningKey = z.infer<typeof UcpSigningKeySchema>;

// ---------------------------------------------------------------------------
// Checkout request schemas — auto-generated from ucp_request annotations
// ---------------------------------------------------------------------------

export {
  CheckoutCreateRequestSchema,
  CheckoutUpdateRequestSchema,
  CheckoutCompleteRequestSchema,
};

// ---------------------------------------------------------------------------
// Checkout response schema
// ---------------------------------------------------------------------------

export const CheckoutResponseSchema = CheckoutSchema.passthrough();
export type CheckoutResponse = z.infer<typeof CheckoutResponseSchema>;

// ---------------------------------------------------------------------------
// Order
// ---------------------------------------------------------------------------

export { OrderSchema };
export const OrderUpdateSchema = OrderSchema;
export type OrderUpdate = z.infer<typeof OrderUpdateSchema>;
