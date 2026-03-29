#!/usr/bin/env node
/**
 * Generates src/spec_generated.ts from the official UCP spec JSON schemas.
 *
 * Usage: node scripts/generate.mjs <path-to-ucp-spec-source-dir>
 * Example: npm run generate -- /path/to/ucp/source
 *
 * Replaces quicktype (which doesn't support JSON Schema Draft 2020-12).
 * Uses @apidevtools/json-schema-ref-parser to dereference $ref chains,
 * mapping https://ucp.dev/schemas/* to local spec files, then
 * json-schema-to-zod to emit Zod v3 schemas.
 */

import $RefParser from '@apidevtools/json-schema-ref-parser';
import { jsonSchemaToZod } from 'json-schema-to-zod';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const OUT_FILE = path.join(REPO_ROOT, 'src', 'spec_generated.ts');

const specDir = process.argv[2];
if (!specDir) {
  console.error('Error: spec source directory path is required.');
  console.error('Usage: npm run generate -- /path/to/ucp/source');
  process.exit(1);
}

const SPEC_DIR = path.resolve(specDir);

// Build a $id → localPath map by scanning all JSON files in specDir.
// Handles cases where the $id URL path doesn't match the file path
// (e.g. discovery/profile_schema.json has $id .../discovery/profile.json).
function buildUrlMap(specDir) {
  const map = new Map();
  function scan(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scan(full);
      } else if (entry.name.endsWith('.json')) {
        try {
          const raw = JSON.parse(fs.readFileSync(full, 'utf8'));
          if (raw.$id) map.set(raw.$id, full);
        } catch { /* skip unparseable files */ }
      }
    }
  }
  scan(specDir);
  return map;
}

// Map https://ucp.dev/schemas/* → local spec files using the $id → path map.
function localResolver(specDir) {
  const urlMap = buildUrlMap(specDir);
  return {
    order: 1,
    canRead(file) {
      return file.url.startsWith('https://ucp.dev/');
    },
    read(file) {
      let url = file.url;
      // Work around a relative-ref bug in the spec where ../schemas/X from
      // a schemas/discovery/ base resolves to schemas/schemas/X instead of schemas/X.
      if (!urlMap.has(url)) {
        url = url.replace('https://ucp.dev/schemas/schemas/', 'https://ucp.dev/schemas/');
      }
      const localPath = urlMap.get(url);
      if (!localPath) throw new Error(`No local file found for $id: ${file.url}`);
      return fs.readFileSync(localPath, 'utf8');
    },
  };
}

async function deref(filePath) {
  return $RefParser.dereference(filePath, {
    resolve: { ucpLocal: localResolver(SPEC_DIR) },
    dereference: { circular: 'ignore' },
  });
}

// Schemas to generate: [outputName, relativePathInSpecDir]
// NOTE: UcpDiscoveryProfileSchema is hand-authored in extensions.ts because
// profile_schema.json contains broken relative $refs (../schemas/ucp.json from
// a schemas/discovery/ base URL resolves to schemas/schemas/ucp.json).
// Filed upstream: https://github.com/Universal-Commerce-Protocol/js-sdk/issues/19
const SCHEMAS = [
  // Shopping types
  ['MessageSchema',             'schemas/shopping/types/message.json'],
  ['MessageErrorSchema',        'schemas/shopping/types/message_error.json'],
  ['MessageInfoSchema',         'schemas/shopping/types/message_info.json'],
  ['MessageWarningSchema',      'schemas/shopping/types/message_warning.json'],
  ['PostalAddressSchema',       'schemas/shopping/types/postal_address.json'],
  ['TotalSchema',               'schemas/shopping/types/total.json'],
  ['TotalsSchema',              'schemas/shopping/types/totals.json'],
  ['LineItemSchema',            'schemas/shopping/types/line_item.json'],
  ['ItemSchema',                'schemas/shopping/types/item.json'],
  ['BuyerSchema',               'schemas/shopping/types/buyer.json'],
  ['PaymentInstrumentSchema',   'schemas/shopping/types/payment_instrument.json'],
  ['FulfillmentSchema',         'schemas/shopping/types/fulfillment.json'],
  ['FulfillmentMethodSchema',   'schemas/shopping/types/fulfillment_method.json'],
  ['FulfillmentGroupSchema',    'schemas/shopping/types/fulfillment_group.json'],
  ['FulfillmentOptionSchema',   'schemas/shopping/types/fulfillment_option.json'],
  ['FulfillmentEventSchema',    'schemas/shopping/types/fulfillment_event.json'],
  ['FulfillmentDestinationSchema', 'schemas/shopping/types/fulfillment_destination.json'],
  ['FulfillmentAvailableMethodSchema', 'schemas/shopping/types/fulfillment_available_method.json'],
  ['OrderLineItemSchema',       'schemas/shopping/types/order_line_item.json'],
  ['OrderConfirmationSchema',   'schemas/shopping/types/order_confirmation.json'],
  ['SignalsSchema',             'schemas/shopping/types/signals.json'],

  // Shopping core
  ['CheckoutSchema',            'schemas/shopping/checkout.json'],
  ['OrderSchema',               'schemas/shopping/order.json'],
  ['CartSchema',                'schemas/shopping/cart.json'],
  ['FulfillmentExtensionSchema','schemas/shopping/fulfillment.json'],
  ['DiscountSchema',            'schemas/shopping/discount.json'],
  ['BuyerConsentSchema',        'schemas/shopping/buyer_consent.json'],
  ['Ap2MandateSchema',          'schemas/shopping/ap2_mandate.json'],
  ['PaymentSchema',             'schemas/shopping/payment.json'],
];

async function generate() {
  const lines = [
    '// AUTO-GENERATED — do not edit by hand.',
    '// Run: npm run generate -- /path/to/ucp/source',
    "import * as z from 'zod';",
    '',
  ];

  let errors = 0;

  for (const [name, relPath] of SCHEMAS) {
    const filePath = path.join(SPEC_DIR, relPath);
    if (!fs.existsSync(filePath)) {
      console.warn(`  SKIP  ${name} — file not found: ${relPath}`);
      continue;
    }

    try {
      const schema = await deref(filePath);
      const zod = jsonSchemaToZod(schema, {
        name,
        module: 'none',
        noImport: true,
        zodVersion: 3,
      });
      // json-schema-to-zod emits `const X = ...` — prefix with export
      lines.push(zod.replace(/^const /, 'export const '), '');
      console.log(`  OK    ${name}`);
    } catch (err) {
      console.error(`  ERROR ${name}: ${err.message}`);
      errors++;
    }
  }

  if (errors > 0) {
    console.error(`\n${errors} schema(s) failed to generate.`);
    process.exit(1);
  }

  fs.writeFileSync(OUT_FILE, lines.join('\n'), 'utf8');
  console.log(`\nWrote ${OUT_FILE}`);
}

generate().catch((err) => {
  console.error(err);
  process.exit(1);
});
