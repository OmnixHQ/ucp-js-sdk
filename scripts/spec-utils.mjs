/**
 * Shared utilities for generate.mjs and verify-schemas.mjs.
 *
 * Both tools accept the same source flags:
 *   --release <tag>    git tag, e.g. v2026-01-23  (default)
 *   --branch  <name>   branch name, e.g. main
 *   --commit  <sha>    exact commit SHA
 *   <local-path>       path to an already-cloned source/ directory
 *
 * All three remote flags resolve to the same GitHub tarball endpoint:
 *   GET /repos/{owner}/{repo}/tarball/{ref}
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const SPEC_REPO = "Universal-Commerce-Protocol/ucp";
export const DEFAULT_RELEASE = "v2026-01-23";
export const REQUEST_OPERATIONS = ["create", "update", "complete"];

// Explicit name overrides for files whose auto-derived names conflict.
export const NAME_OVERRIDES = {
  "schemas/shopping/fulfillment.json": "FulfillmentExtensionSchema",
};

// Files to skip — hand-authored in extensions.ts due to known spec issues.
// (Currently empty — profile_schema.json relative $refs are now resolved by
// the doubled-URL map in generate.mjs's buildUrlMap.)
export const SKIP_SCHEMAS = new Set([]);

// ---------------------------------------------------------------------------
// Arg parsing
// ---------------------------------------------------------------------------

/**
 * Returns { localSpecDir, specRef, refLabel }.
 * Exactly one of localSpecDir or specRef will be set.
 */
export function parseArgs(argv = process.argv) {
  let localSpecDir = null;
  let specRef = null;
  let refLabel = null;

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === "--release" && argv[i + 1]) {
      specRef = argv[++i];
      refLabel = `release ${specRef}`;
    } else if (arg.startsWith("--release=")) {
      specRef = arg.slice("--release=".length);
      refLabel = `release ${specRef}`;
    } else if (arg === "--branch" && argv[i + 1]) {
      specRef = argv[++i];
      refLabel = `branch ${specRef}`;
    } else if (arg.startsWith("--branch=")) {
      specRef = arg.slice("--branch=".length);
      refLabel = `branch ${specRef}`;
    } else if (arg === "--commit" && argv[i + 1]) {
      specRef = argv[++i];
      refLabel = `commit ${specRef}`;
    } else if (arg.startsWith("--commit=")) {
      specRef = arg.slice("--commit=".length);
      refLabel = `commit ${specRef}`;
    } else if (!arg.startsWith("--")) {
      localSpecDir = path.resolve(arg);
      refLabel = `local ${localSpecDir}`;
    }
  }

  if (!specRef && !localSpecDir) {
    specRef = DEFAULT_RELEASE;
    refLabel = `release ${specRef} (default)`;
  }

  return { localSpecDir, specRef, refLabel };
}

// ---------------------------------------------------------------------------
// Download
// ---------------------------------------------------------------------------

/**
 * Downloads the UCP spec tarball for the given git ref (tag, branch, or SHA)
 * and returns the path to the extracted source/ directory.
 */
export async function downloadSpec(ref, label) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ucp-spec-"));
  const tarPath = path.join(tmpDir, "spec.tar.gz");

  console.log(`Downloading UCP spec (${label}) from ${SPEC_REPO}...`);
  const url = `https://api.github.com/repos/${SPEC_REPO}/tarball/${encodeURIComponent(ref)}`;
  const resp = await fetch(url, {
    headers: { "User-Agent": "ucp-js-sdk-tools" },
  });
  if (!resp.ok) {
    throw new Error(
      `Failed to download spec: ${resp.status} ${resp.statusText} (ref: ${ref})`
    );
  }

  fs.writeFileSync(tarPath, Buffer.from(await resp.arrayBuffer()));
  execSync(`tar -xzf "${tarPath}" -C "${tmpDir}"`);
  fs.unlinkSync(tarPath);

  const entries = fs.readdirSync(tmpDir);
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

/**
 * Resolves the spec directory from parsed args, downloading if needed.
 */
export async function resolveSpecDir({ localSpecDir, specRef, refLabel }) {
  return localSpecDir ?? (await downloadSpec(specRef, refLabel));
}

// ---------------------------------------------------------------------------
// Naming
// ---------------------------------------------------------------------------

export function toPascalCase(snakeName) {
  return snakeName
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
}

export function deriveSchemaName(relFromSource) {
  if (NAME_OVERRIDES[relFromSource]) return NAME_OVERRIDES[relFromSource];
  return toPascalCase(path.basename(relFromSource, ".json")) + "Schema";
}

// ---------------------------------------------------------------------------
// Schema discovery
// ---------------------------------------------------------------------------

/**
 * Discovers all JSON Schema files in source/schemas/ and source/discovery/.
 * Returns [{ name, filePath, relFromSource, raw }] — raw is the parsed JSON
 * without any $ref resolution.
 *
 * Does NOT include request variant entries (callers handle those separately).
 */
export function discoverBaseSchemas(specDir) {
  const results = [];
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
      if (seen.has(name)) {
        console.warn(`  WARN  Duplicate name "${name}" for ${rel} — skipping`);
        continue;
      }
      seen.add(name);
      results.push({ name, filePath: full, relFromSource: rel, raw });
    }
  }

  scanDir(path.join(specDir, "schemas"), "schemas");
  scanDir(path.join(specDir, "discovery"), "discovery");

  return results;
}

// ---------------------------------------------------------------------------
// ucp_request annotation helpers
// ---------------------------------------------------------------------------

export function resolveUcpRequestBehavior(annotation, operation) {
  if (annotation === undefined || annotation === null) return null;
  if (typeof annotation === "string") return annotation;
  const val = annotation[operation];
  if (val === undefined) return null;
  if (typeof val === "string") return val;
  if (val && typeof val === "object" && val.transition)
    return val.transition.to;
  return null;
}

/**
 * Returns the request operations (create/update/complete) that have at least
 * one non-omit field in the raw (un-dereferenced) schema.
 * Works on inline property definitions; $ref-only properties are skipped.
 */
export function detectRequestOperations(rawSchema) {
  const props = rawSchema.properties;
  if (!props) return [];

  const opsWithFields = new Set();
  for (const propSchema of Object.values(props)) {
    if (typeof propSchema !== "object" || propSchema === null) continue;
    const ann = propSchema.ucp_request;
    if (ann === undefined) continue;

    for (const op of REQUEST_OPERATIONS) {
      const behavior = resolveUcpRequestBehavior(ann, op);
      if (behavior && behavior !== "omit") opsWithFields.add(op);
    }
  }

  return [...opsWithFields];
}

/**
 * Returns true if the (dereferenced) schema has any top-level property
 * with a ucp_request annotation.
 */
export function hasUcpRequestAnnotations(schema) {
  const props = schema.properties;
  if (!props) return false;
  return Object.values(props).some(
    (p) => typeof p === "object" && p !== null && p.ucp_request !== undefined
  );
}

/**
 * Builds a request-specific JSON Schema for the given operation by filtering
 * and categorising properties according to their ucp_request annotations.
 */
export function buildRequestJson(derefedSchema, operation) {
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
    if (behavior === "omit" || behavior === null) continue;

    hasAny = true;
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
