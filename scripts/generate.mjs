#!/usr/bin/env node
/**
 * Generates src/spec_generated.ts from the UCP spec.
 *
 * Usage:
 *   npm run generate                          # default release (v2026-01-23)
 *   npm run generate -- --release v2026-01-23 # specific release tag
 *   npm run generate -- --branch main         # latest commit on a branch
 *   npm run generate -- --commit abc1234      # exact commit SHA
 *   npm run generate -- /local/path/to/source # local spec clone
 */

import $RefParser from "@apidevtools/json-schema-ref-parser";
import { jsonSchemaToZod } from "json-schema-to-zod";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildRequestJson,
  discoverBaseSchemas,
  hasUcpRequestAnnotations,
  parseArgs,
  REQUEST_OPERATIONS,
  resolveSpecDir,
  toPascalCase,
} from "./spec-utils.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_FILE = path.resolve(__dirname, "../src/spec_generated.ts");

// ---------------------------------------------------------------------------
// $ref resolver — maps https://ucp.dev/schemas/* to local spec files
// ---------------------------------------------------------------------------

function buildUrlMap(specDir) {
  const map = new Map();
  function scan(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scan(full);
      } else if (entry.name.endsWith(".json")) {
        try {
          const raw = JSON.parse(fs.readFileSync(full, "utf8"));
          if (raw.$id) map.set(raw.$id, full);
        } catch {
          /* skip */
        }
      }
    }
  }
  scan(specDir);
  return map;
}

function makeResolver(specDir) {
  const urlMap = buildUrlMap(specDir);
  return {
    order: 1,
    canRead(file) {
      return file.url.startsWith("https://ucp.dev/");
    },
    read(file) {
      let url = file.url;
      // Work around broken relative $ref in the spec: ../schemas/X from
      // a schemas/discovery/ base resolves to schemas/schemas/X.
      if (!urlMap.has(url)) {
        url = url.replace(
          "https://ucp.dev/schemas/schemas/",
          "https://ucp.dev/schemas/"
        );
      }
      const localPath = urlMap.get(url);
      if (!localPath)
        throw new Error(`No local file found for $id: ${file.url}`);
      return fs.readFileSync(localPath, "utf8");
    },
  };
}

async function deref(filePath, resolver) {
  return $RefParser.dereference(filePath, {
    resolve: { ucpLocal: resolver },
    dereference: { circular: "ignore" },
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function generate() {
  const args = parseArgs();
  const specDir = await resolveSpecDir(args);
  const resolver = makeResolver(specDir);
  const baseSchemas = discoverBaseSchemas(specDir);

  console.log(`\nFound ${baseSchemas.length} schemas to generate\n`);

  const lines = [
    "// AUTO-GENERATED — do not edit by hand.",
    `// Generated from UCP spec (${args.refLabel})`,
    "// Run: npm run generate",
    "import * as z from 'zod';",
    "",
  ];

  let errors = 0;

  for (const { name, filePath } of baseSchemas) {
    try {
      const schema = await deref(filePath, resolver);
      const zod = jsonSchemaToZod(schema, {
        name,
        module: "none",
        noImport: true,
        zodVersion: 3,
      });
      lines.push(zod.replace(/^const /, "export const "), "");
      console.log(`  OK    ${name}`);

      if (!hasUcpRequestAnnotations(schema)) continue;

      const baseName = name.replace(/Schema$/, "");
      for (const op of REQUEST_OPERATIONS) {
        const requestJson = buildRequestJson(schema, op);
        if (!requestJson) continue;

        const requestName = `${baseName}${toPascalCase(op)}RequestSchema`;
        try {
          const requestZod = jsonSchemaToZod(requestJson, {
            name: requestName,
            module: "none",
            noImport: true,
            zodVersion: 3,
          });
          lines.push(requestZod.replace(/^const /, "export const "), "");
          console.log(`  OK    ${requestName} (from ucp_request)`);
        } catch (err) {
          console.error(`  ERROR ${requestName}: ${err.message}`);
          errors++;
        }
      }
    } catch (err) {
      console.error(`  ERROR ${name}: ${err.message}`);
      errors++;
    }
  }

  if (errors > 0) {
    console.error(`\n${errors} schema(s) failed to generate.`);
    process.exit(1);
  }

  fs.writeFileSync(OUT_FILE, lines.join("\n"), "utf8");
  console.log(`\nWrote ${OUT_FILE}`);
}

generate().catch((err) => {
  console.error(err);
  process.exit(1);
});
