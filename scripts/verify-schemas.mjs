#!/usr/bin/env node
/**
 * Verifies that spec_generated.ts exports exactly the schemas discoverable
 * from the UCP spec — no more, no less.
 *
 * Usage:
 *   npm run verify:schemas                          # default release
 *   npm run verify:schemas -- --release v2026-04-08 # specific release tag
 *   npm run verify:schemas -- --branch main         # latest commit on branch
 *   npm run verify:schemas -- --commit abc1234      # exact commit SHA
 *   npm run verify:schemas -- /local/path/to/source # local spec clone
 *
 * Exit codes:
 *   0 — all schemas match
 *   1 — mismatch (missing or extra exports found)
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  detectRequestOperations,
  discoverBaseSchemas,
  discoverEnums,
  parseArgs,
  resolveSpecDir,
  toPascalCase,
} from "./spec-utils.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GENERATED_FILE = path.resolve(__dirname, "../src/spec_generated.ts");

// ---------------------------------------------------------------------------
// Build the full set of expected export names
// ---------------------------------------------------------------------------

/**
 * $def names to skip — same logic as generate.mjs
 */
function shouldSkipDef(defName) {
  if (defName.includes(".")) return true;
  if (defName === "checkout") return true;
  if (defName === "cart") return true;
  return false;
}

function deriveDefExportName(parentBaseName, defName) {
  const cleanName = defName.replace(/_schema$/, "");
  return `${parentBaseName}${toPascalCase(cleanName)}Schema`;
}

function isDefsOnlySchema(raw) {
  return raw.$defs && !raw.type && !raw.properties;
}

function buildExpectedNames(specDir) {
  const names = new Set();

  for (const { name, raw } of discoverBaseSchemas(specDir)) {
    const baseName = name.replace(/Schema$/, "");

    // Inline enum exports apply to all schemas (including $defs-only)
    const enums = discoverEnums(raw, baseName);
    for (const { exportName } of enums) {
      names.add(exportName);
    }

    // $defs-only schemas produce per-$def exports, not a single top-level
    if (isDefsOnlySchema(raw)) {
      for (const defName of Object.keys(raw.$defs || {})) {
        if (shouldSkipDef(defName)) continue;
        names.add(deriveDefExportName(baseName, defName));
      }
      continue;
    }

    names.add(name);

    // Add request variant names derived from ucp_request annotations
    const ops = detectRequestOperations(raw);
    for (const op of ops) {
      names.add(`${baseName}${toPascalCase(op)}RequestSchema`);
    }
  }

  return names;
}

// ---------------------------------------------------------------------------
// Read actual exports from spec_generated.ts
// ---------------------------------------------------------------------------

function readActualExports(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`spec_generated.ts not found at ${filePath}`);
  }
  const src = fs.readFileSync(filePath, "utf8");
  return new Set(
    [...src.matchAll(/^export const (\w+)\s*=/gm)].map((m) => m[1])
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function verify() {
  const args = parseArgs();
  const specDir = await resolveSpecDir(args);

  console.log("Discovering expected schemas from spec...");
  const expected = buildExpectedNames(specDir);

  console.log("Reading actual exports from spec_generated.ts...");
  const actual = readActualExports(GENERATED_FILE);

  const missing = [...expected].filter((n) => !actual.has(n));
  const extra = [...actual].filter((n) => !expected.has(n));

  console.log(`\nSpec schemas expected   : ${expected.size}`);
  console.log(`spec_generated.ts exports: ${actual.size}`);

  if (missing.length === 0 && extra.length === 0) {
    console.log("\n✅ All schemas match.\n");
    return;
  }

  if (missing.length > 0) {
    console.error(`\n❌ Missing from spec_generated.ts (${missing.length}):`);
    missing.forEach((n) => console.error(`   - ${n}`));
  }

  if (extra.length > 0) {
    console.warn(`\n⚠️  Extra in spec_generated.ts (${extra.length}):`);
    extra.forEach((n) => console.warn(`   + ${n}`));
  }

  console.error(
    "\nRun `npm run generate` to regenerate spec_generated.ts from the spec.\n"
  );
  process.exit(1);
}

verify().catch((err) => {
  console.error(err);
  process.exit(1);
});
