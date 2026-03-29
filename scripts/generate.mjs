#!/usr/bin/env node
/**
 * Generates src/spec_generated.ts from the UCP spec.
 *
 * Usage:
 *   npm run generate                          # downloads default release (v2026-01-23)
 *   npm run generate -- --release v2026-01-23 # explicit release tag
 *   npm run generate -- /local/path/to/source # use local spec clone (backward compat)
 *
 * - Downloads the spec tarball from the GitHub release if no local path is given.
 * - Auto-discovers all JSON Schema files under source/schemas/ and source/discovery/.
 * - Generates Zod v3 schemas via json-schema-to-zod (supports Draft 2020-12).
 * - For schemas with ucp_request annotations on their properties, also emits
 *   Create / Update / Complete request schema variants.
 */

import $RefParser from "@apidevtools/json-schema-ref-parser";
import { jsonSchemaToZod } from "json-schema-to-zod";
import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const OUT_FILE = path.join(REPO_ROOT, "src", "spec_generated.ts");

const SPEC_REPO = "Universal-Commerce-Protocol/ucp";
const DEFAULT_RELEASE = "v2026-01-23";

// ---------------------------------------------------------------------------
// Arg parsing
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
// Download / extract release tarball
// ---------------------------------------------------------------------------

async function downloadRelease(tag) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ucp-spec-"));
  const tarPath = path.join(tmpDir, "spec.tar.gz");

  console.log(`Downloading UCP spec ${tag} from ${SPEC_REPO}...`);
  const url = `https://api.github.com/repos/${SPEC_REPO}/tarball/${tag}`;
  const resp = await fetch(url, {
    headers: { "User-Agent": "ucp-js-sdk-generator" },
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

  const sourceDir = path.join(tmpDir, entries[0], "source");
  if (!fs.existsSync(sourceDir)) {
    throw new Error(
      `source/ directory not found in extracted tarball at ${sourceDir}`
    );
  }

  console.log(`Extracted to ${sourceDir}`);
  return sourceDir;
}

// ---------------------------------------------------------------------------
// $id → localPath resolver
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
          /* skip non-JSON files */
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
// Schema discovery
// ---------------------------------------------------------------------------

// Explicit name overrides for files whose auto-derived names conflict.
const NAME_OVERRIDES = {
  "schemas/shopping/fulfillment.json": "FulfillmentExtensionSchema",
};

// Files to skip — hand-authored in extensions.ts due to known spec issues.
const SKIP_SCHEMAS = new Set([
  "discovery/profile_schema.json", // broken relative $refs in the spec
]);

function toPascalCase(snakeName) {
  return snakeName
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
}

function deriveSchemaName(relFromSource) {
  if (NAME_OVERRIDES[relFromSource]) return NAME_OVERRIDES[relFromSource];
  const base = path.basename(relFromSource, ".json");
  return toPascalCase(base) + "Schema";
}

function discoverSchemas(specDir) {
  const results = [];
  const seen = new Set();

  function scanDir(dir, relBase) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      const rel = path.join(relBase, entry.name);
      if (entry.isDirectory()) {
        scanDir(full, rel);
      } else if (entry.name.endsWith(".json")) {
        try {
          const raw = JSON.parse(fs.readFileSync(full, "utf8"));
          // Skip non-JSON-Schema files (OpenAPI specs, etc.)
          if (!raw.$id) continue;
          // Skip files with known spec issues (hand-authored in extensions.ts)
          if (SKIP_SCHEMAS.has(rel)) {
            console.log(`  SKIP  ${rel} (hand-authored in extensions.ts)`);
            continue;
          }
          const name = deriveSchemaName(rel);
          if (seen.has(name)) {
            console.warn(
              `  WARN  Duplicate name "${name}" for ${rel} — skipping`
            );
            continue;
          }
          seen.add(name);
          results.push({ name, filePath: full, relFromSource: rel });
        } catch {
          /* skip */
        }
      }
    }
  }

  scanDir(path.join(specDir, "schemas"), "schemas");
  scanDir(path.join(specDir, "discovery"), "discovery");

  return results;
}

// ---------------------------------------------------------------------------
// ucp_request annotation processing
// ---------------------------------------------------------------------------

const REQUEST_OPERATIONS = ["create", "update", "complete"];

function resolveUcpRequestBehavior(annotation, operation) {
  if (annotation === undefined || annotation === null) return null;
  if (typeof annotation === "string") return annotation;
  const val = annotation[operation];
  if (val === undefined) return null;
  if (typeof val === "string") return val;
  // transition object: { transition: { from, to, description } }
  if (val && typeof val === "object" && val.transition)
    return val.transition.to;
  return null;
}

function buildRequestJson(derefedSchema, operation) {
  const props = derefedSchema.properties;
  if (!props) return null;

  const properties = {};
  const required = [];
  let hasAny = false;

  for (const [key, propSchema] of Object.entries(props)) {
    if (typeof propSchema !== "object" || propSchema === null) continue;
    const behavior = resolveUcpRequestBehavior(
      propSchema.ucp_request,
      operation
    );
    if (behavior === "omit") continue;
    if (behavior === null) continue; // no annotation = response-only, omit

    hasAny = true;
    // Strip ucp_request from the property schema before passing to code-gen
    const { ucp_request: _ignored, ...cleanProp } = propSchema;
    properties[key] = cleanProp;
    if (behavior === "required") required.push(key);
  }

  if (!hasAny) return null;

  return {
    type: "object",
    properties,
    ...(required.length > 0 ? { required } : {}),
    additionalProperties: false,
  };
}

function hasUcpRequestAnnotations(schema) {
  const props = schema.properties;
  if (!props) return false;
  return Object.values(props).some(
    (p) => typeof p === "object" && p !== null && p.ucp_request !== undefined
  );
}

// ---------------------------------------------------------------------------
// Main generation
// ---------------------------------------------------------------------------

async function generate() {
  const specDir = localSpecDir ?? (await downloadRelease(release));
  const resolver = makeResolver(specDir);
  const schemas = discoverSchemas(specDir);

  console.log(`\nFound ${schemas.length} schemas to generate\n`);

  const lines = [
    "// AUTO-GENERATED — do not edit by hand.",
    `// Generated from UCP spec ${localSpecDir ? "(local)" : release}`,
    "// Run: npm run generate",
    "import * as z from 'zod';",
    "",
  ];

  let errors = 0;

  for (const { name, filePath } of schemas) {
    if (!fs.existsSync(filePath)) {
      console.warn(`  SKIP  ${name} — file not found`);
      continue;
    }

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

      // Generate request variants if the schema has ucp_request annotations
      if (hasUcpRequestAnnotations(schema)) {
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
