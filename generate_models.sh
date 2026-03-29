#!/bin/bash

if [[ -z "$1" ]]; then
  echo "Error: spec directory path is required."
  echo "Usage: $0 <spec_dir>"
  echo "Example: npm run generate -- /path/to/spec"
  exit 1
fi

SPEC_DIR="${1%/}"

quicktype \
  --lang typescript-zod \
  --src-lang schema \
  --src "$SPEC_DIR"/discovery/*.json \
  --src "$SPEC_DIR"/schemas/shopping/*.json \
  --src "$SPEC_DIR"/schemas/shopping/types/*.json \
  --src "$SPEC_DIR/schemas/shopping/ap2_mandate.json#/\$defs/complete_request_with_ap2" \
  --src "$SPEC_DIR/schemas/shopping/ap2_mandate.json#/\$defs/checkout_response_with_ap2" \
  --src "$SPEC_DIR/schemas/shopping/buyer_consent.create_req.json#/\$defs/checkout" \
  --src "$SPEC_DIR/schemas/shopping/buyer_consent.update_req.json#/\$defs/checkout" \
  --src "$SPEC_DIR/schemas/shopping/buyer_consent_resp.json#/\$defs/checkout" \
  --src "$SPEC_DIR/schemas/shopping/discount.create_req.json#/\$defs/checkout" \
  --src "$SPEC_DIR/schemas/shopping/discount.update_req.json#/\$defs/checkout" \
  --src "$SPEC_DIR/schemas/shopping/discount_resp.json#/\$defs/checkout" \
  --src "$SPEC_DIR/schemas/shopping/fulfillment.create_req.json#/\$defs/checkout" \
  --src "$SPEC_DIR/schemas/shopping/fulfillment.update_req.json#/\$defs/checkout" \
  --src "$SPEC_DIR/schemas/shopping/fulfillment_resp.json#/\$defs/checkout" \
  -o src/spec_generated.ts
