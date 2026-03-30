#!/usr/bin/env node
/**
 * Verifies that spec_generated.ts exports exactly the schemas discoverable
 * from the UCP spec release — no more, no less.
 *
 * Usage:
 *   npm run verify:schemas                          # uses default release
 *   npm run verify:schemas -- --release v2026-01-23
 *   npm run verify:schemas -- /local/path/to/source
 *
 * Exit codes:
 *   0 — all schemas match
 *   1 — mismatch (missing or extra schemas found)
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const GENERATED_FILE = path.join(REPO_ROOT, "src", "spec_generated.ts");

const SPEC_REPO = "Universal-Commerce-Protocol/ucp";
const DEFAULT_RELEASE = "v2026-01-23";

// ---------------------------------------------------------------------------
// Arg parsing (mirrors generate.mjs)
// ---------------------------------------------------------------------------

let localSpecDir = null;
let release = DEFAULT_RELEASE;

for (let i = 2; i < process.argv.length; i++) {
  const arg = process.argv[i];
  if (arg === "--release" && process.argv[i + 1]) {
    release = process.argv[++i];
  } else if (arg.startsWith("--release=")) {
    release = arg.slice("--release=".length);
  } else if (!arg.startsWith("--")) {
    localSpecDir = path.resolve(arg);
  }
}

// ---------------------------------------------------------------------------
// Download (mirrors generate.mjs)
// ---------------------------------------------------------------------------

async function downloadRelease(tag) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ucp-verify-"));
  const tarPath = path.join(tmpDir, "spec.tar.gz");

  console.log(`Downloading UCP spec ${tag}...`);
  const url = `https://api.github.com/repos/${SPEC_REPO}/tarball/${tag}`;
  const resp = await fetch(url, {
    headers: { "User-Agent": "ucp-js-sdk-verify" },
  });
  if (!resp.ok) {
    throw new Error(
      `Failed to download spec: ${resp.status} ${resp.statusText}`
    );
  }

  fs.writeFileSync(tarPath, Buffer.from(await resp.arrayBuffer()));
  execSync(`tar -xzf "${tarPath}" -C "${tmpDir}"`);
  fs.unlinkSync(tarPath);

  const entries = fs
    .readdirSync(tmpDir)
    .filter((e) => e !== path.basename(tarPath));
  if (entries.length === 0)
    throw new Error("Tarball extraction produced no directories");

  return path.join(tmpDir, entries[0], "source");
}

// ---------------------------------------------------------------------------
// Schema discovery (mirrors generate.mjs — lightweight, no deref needed)
// ---------------------------------------------------------------------------

const NAME_OVERRIDES = {
  "schemas/shopping/fulfillment.json": "FulfillmentExtensionSchema",
};

const SKIP_SCHEMAS = new Set([
  "discovery/profile_schema.json", // broken relative $refs, hand-authored
]);

const REQUEST_OPERATIONS = ["create", "update", "complete"];

function toPascalCase(snakeName) {
  return snakeName
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
}

function deriveSchemaName(relFromSource) {
  if (NAME_OVERRIDES[relFromSource]) return NAME_OVERRIDES[relFromSource];
  return toPascalCase(path.basename(relFromSource, ".json")) + "Schema";
}

// Lightweight check for ucp_request without full $ref resolution.
// Scans raw (un-dereferenced) top-level properties for the annotation.
function detectRequestOperations(rawSchema) {
  const props = rawSchema.properties;
  if (!props) return [];

  const opsWithFields = new Set();
  for (const propSchema of Object.values(props)) {
    if (typeof propSchema !== "object" || propSchema === null) continue;
    const ann = propSchema.ucp_request;
    if (ann === undefined) continue;

    for (const op of REQUEST_OPERATIONS) {
      let behavior;
      if (typeof ann === "string") {
        behavior = ann;
      } else {
        const val = ann[op];
        if (val === undefined) continue;
        behavior =
          typeof val === "string" ? val : (val?.transition?.to ?? null);
      }
      if (behavior && behavior !== "omit") {
        opsWithFields.add(op);
      }
    }
  }

  return [...opsWithFields];
}

function discoverExpected(specDir) {
  const schemas = [];
  const seen = new Set();

  function scanDir(dir, relBase) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      const rel = path.join(relBase, entry.name);
      if (entry.isDirectory()) {
        scanDir(full, rel);
        continue;
      }
      if (!entry.name.endsWith(".json")) continue;
      let raw;
      try {
        raw = JSON.parse(fs.readFileSync(full, "utf8"));
      } catch {
        continue;
      }
      if (!raw.$id) continue;
      if (SKIP_SCHEMAS.has(rel)) continue;

      const name = deriveSchemaName(rel);
      if (seen.has(name)) continue;
      seen.add(name);
      schemas.push({ name, raw });

      // Request variant names (derived from ucp_request annotations)
      const ops = detectRequestOperations(raw);
      const baseName = name.replace(/Schema$/, "");
      for (const op of ops) {
        const reqName = `${baseName}${toPascalCase(op)}RequestSchema`;
        if (!seen.has(reqName)) {
          seen.add(reqName);
          schemas.push({ name: reqName, raw: null });
        }
      }
    }
  }

  scanDir(path.join(specDir, "schemas"), "schemas");
  scanDir(path.join(specDir, "discovery"), "discovery");

  return schemas.map((s) => s.name);
}

// ---------------------------------------------------------------------------
// Read actual exports from spec_generated.ts
// ---------------------------------------------------------------------------

function readActualExports(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`spec_generated.ts not found at ${filePath}`);
  }
  const src = fs.readFileSync(filePath, "utf8");
  const matches = [...src.matchAll(/^export const (\w+)\s*=/gm)];
  return new Set(matches.map((m) => m[1]));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function verify() {
  const specDir = localSpecDir ?? (await downloadRelease(release));

  console.log("Discovering expected schemas from spec...");
  const expected = new Set(discoverExpected(specDir));

  console.log("Reading actual exports from spec_generated.ts...");
  const actual = readActualExports(GENERATED_FILE);

  const missing = [...expected].filter((n) => !actual.has(n));
  const extra = [...actual].filter((n) => !expected.has(n));

  console.log(`\nSpec schemas expected : ${expected.size}`);
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
