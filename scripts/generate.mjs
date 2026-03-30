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
import os from "node:os";
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
// Pre-processing — resolve circular self-refs in $defs before dereferencing
// ---------------------------------------------------------------------------

/**
 * Replaces `$ref: "#"` inside $defs with the file's top-level schema.
 * This prevents $RefParser from leaving unresolvable circular refs.
 */
function replaceHashRef(node, topLevel) {
  if (!node || typeof node !== "object") return node;
  if (Array.isArray(node)) return node.map((item) => replaceHashRef(item, topLevel));
  if (node.$ref === "#") return JSON.parse(JSON.stringify(topLevel));

  const result = {};
  for (const [k, v] of Object.entries(node)) {
    result[k] = replaceHashRef(v, topLevel);
  }
  return result;
}

/**
 * Copies the spec directory to a temp location, resolving `$ref: "#"` inside
 * `$defs` to eliminate circular self-references before $RefParser processes them.
 */
function prepareSpecDir(specDir) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ucp-prepared-"));

  function copyDir(src, dest) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      if (entry.isDirectory()) {
        copyDir(srcPath, destPath);
      } else if (entry.name.endsWith(".json")) {
        try {
          const schema = JSON.parse(fs.readFileSync(srcPath, "utf8"));
          if (schema.$defs && hasSelfRef(schema.$defs)) {
            const { $defs, $schema: _s, $id: _i, ...topLevel } = schema;
            const fixedDefs = {};
            for (const [defName, defSchema] of Object.entries($defs)) {
              fixedDefs[defName] = replaceHashRef(defSchema, topLevel);
            }
            const fixedSchema = { ...schema, $defs: fixedDefs };
            fs.writeFileSync(destPath, JSON.stringify(fixedSchema, null, 2));
          } else {
            fs.copyFileSync(srcPath, destPath);
          }
        } catch {
          fs.copyFileSync(srcPath, destPath);
        }
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  function hasSelfRef(node) {
    if (!node || typeof node !== "object") return false;
    if (node.$ref === "#") return true;
    return Object.values(node).some((v) => hasSelfRef(v));
  }

  copyDir(specDir, tmpDir);
  return tmpDir;
}

// ---------------------------------------------------------------------------
// Schema normalization — fixes patterns that json-schema-to-zod mishandles
// ---------------------------------------------------------------------------

/**
 * Adds `type: "object"` to schema nodes that have `properties` or `required`
 * but no explicit type. JSON Schema Draft 2020-12 allows this, but
 * json-schema-to-zod needs the explicit type to generate proper Zod code.
 *
 * Also resolves remaining circular $ref entries by looking them up in the
 * root schema's $defs.
 */
function normalizeSchema(schema, visited = new WeakSet()) {
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
    return schema;
  }

  if (visited.has(schema)) return schema;
  visited.add(schema);

  let result = schema;

  // Infer missing type from structural keywords
  if (
    !result.type &&
    !result.allOf &&
    !result.anyOf &&
    !result.oneOf &&
    !result.$ref
  ) {
    const hasObjectKeywords =
      result.properties ||
      result.required ||
      (typeof result.additionalProperties === "object" &&
        result.additionalProperties !== null) ||
      result.propertyNames;
    const hasArrayKeywords = result.items || result.prefixItems;

    if (hasObjectKeywords) {
      result = { ...result, type: "object" };
    } else if (hasArrayKeywords) {
      result = { ...result, type: "array" };
    }
  }

  // Replace additionalProperties: true with nothing (it's the default)
  // so json-schema-to-zod doesn't generate .catchall(z.any())
  if (result.additionalProperties === true) {
    const { additionalProperties: _, ...rest } = result;
    result = rest;
  }

  // Recurse into subschemas
  if (result.properties) {
    const newProps = {};
    for (const [k, v] of Object.entries(result.properties)) {
      newProps[k] = normalizeSchema(v, visited);
    }
    result = { ...result, properties: newProps };
  }

  if (result.items) {
    result = { ...result, items: normalizeSchema(result.items, visited) };
  }

  if (result.allOf) {
    result = {
      ...result,
      allOf: result.allOf.map((s) => normalizeSchema(s, visited)),
    };
  }

  if (result.anyOf) {
    result = {
      ...result,
      anyOf: result.anyOf.map((s) => normalizeSchema(s, visited)),
    };
  }

  if (result.oneOf) {
    result = {
      ...result,
      oneOf: result.oneOf.map((s) => normalizeSchema(s, visited)),
    };
  }

  if (
    result.additionalProperties &&
    typeof result.additionalProperties === "object"
  ) {
    result = {
      ...result,
      additionalProperties: normalizeSchema(
        result.additionalProperties,
        visited
      ),
    };
  }

  return result;
}

/**
 * Resolves circular $ref pointers left by $RefParser.dereference().
 * Traverses the schema tree with a depth limit to avoid infinite recursion.
 */
function resolveCircularRefs(schema, rootSchema, depth = 0) {
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
    return schema;
  }

  // Prevent infinite recursion from truly circular structures
  if (depth > 15) return schema;

  // Handle $ref that was left unresolved (circular)
  if (schema.$ref) {
    const ref = schema.$ref;

    // Self-reference $ref: "#" — inline the root schema (minus $defs)
    if (ref === "#" && rootSchema) {
      const { $defs, $schema: _s, $id: _i, ...topLevel } = rootSchema;
      return resolveCircularRefs(topLevel, rootSchema, depth + 1);
    }

    // Internal $defs reference: "#/$defs/name"
    if (ref.startsWith("#/$defs/") && rootSchema?.$defs) {
      const defName = ref.slice("#/$defs/".length);
      const defSchema = rootSchema.$defs[defName];
      if (defSchema) {
        return resolveCircularRefs(defSchema, rootSchema, depth + 1);
      }
    }

    return schema;
  }

  const result = {};
  for (const [key, value] of Object.entries(schema)) {
    if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        resolveCircularRefs(item, rootSchema, depth + 1)
      );
    } else if (typeof value === "object" && value !== null) {
      result[key] = resolveCircularRefs(value, rootSchema, depth + 1);
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Post-processes generated Zod code to clean up z.any() artifacts.
 */
function postProcessZodCode(code) {
  let result = code;

  // Replace .catchall(z.any()) with .passthrough()
  result = result.replace(/\.catchall\(z\.any\(\)\)/g, ".passthrough()");

  // Replace z.record(z.any()) with z.record(z.string(), z.unknown())
  // for freeform config objects — preserves type safety
  result = result.replace(/z\.record\(z\.any\(\)\)/g, "z.record(z.string(), z.unknown())");

  // Replace z.any().superRefine with z.unknown().superRefine — the oneOf
  // validation pattern uses z.any() as an unconstrained input, z.unknown()
  // is semantically identical but produces `unknown` instead of `any` in TS
  result = result.replace(/z\.any\(\)\.superRefine\(/g, "z.unknown().superRefine(");

  return result;
}

// ---------------------------------------------------------------------------
// $defs-only schema handling
// ---------------------------------------------------------------------------

/**
 * Determines if a schema file has only $defs and no top-level type/properties.
 */
function isDefsOnlySchema(raw) {
  return raw.$defs && !raw.type && !raw.properties;
}

/**
 * $def names to skip: checkout/cart extensions (compose onto Checkout, not
 * standalone types) and dot-notation names.
 */
function shouldSkipDef(defName) {
  if (defName.includes(".")) return true;
  if (defName === "checkout") return true;
  if (defName === "cart") return true;
  return false;
}

/**
 * Derives export name for a $def.
 * E.g., "UcpSchema" + "entity" → "UcpEntitySchema"
 *       "DiscountSchema" + "applied_discount" → "DiscountAppliedDiscountSchema"
 *
 * For well-known patterns (base, platform_schema, etc.) uses shorter names.
 */
function deriveDefExportName(parentBaseName, defName) {
  // Strip trailing "_schema" from def names for cleaner export names
  const cleanName = defName.replace(/_schema$/, "");
  return `${parentBaseName}${toPascalCase(cleanName)}Schema`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function generate() {
  const args = parseArgs();
  const rawSpecDir = await resolveSpecDir(args);
  const specDir = prepareSpecDir(rawSpecDir);
  console.log(`Prepared spec dir: ${specDir}`);
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

  for (const { name, filePath, raw } of baseSchemas) {
    try {
      const schema = await deref(filePath, resolver);

      // --- $defs-only schemas: extract individual $defs as exports ---
      if (isDefsOnlySchema(raw)) {
        console.log(`  DEFS  ${name} — extracting $defs`);

        const defs = schema.$defs || {};
        for (const [defName, defSchema] of Object.entries(defs)) {
          if (shouldSkipDef(defName)) {
            console.log(`  SKIP  ${name}/$defs/${defName}`);
            continue;
          }

          const baseName = name.replace(/Schema$/, "");
          const exportName = deriveDefExportName(baseName, defName);

          try {
            // Resolve any remaining circular $refs within the $def
            const resolved = resolveCircularRefs(defSchema, schema);
            const normalized = normalizeSchema(resolved);

            const zodCode = jsonSchemaToZod(normalized, {
              name: exportName,
              module: "none",
              noImport: true,
              zodVersion: 3,
            });

            const processed = postProcessZodCode(
              zodCode.replace(/^const /, "export const ")
            );
            lines.push(processed);
            // Add type export
            const typeName = exportName.replace(/Schema$/, "");
            lines.push(
              `export type ${typeName} = z.infer<typeof ${exportName}>;`,
              ""
            );
            console.log(`  OK    ${exportName} (from $defs/${defName})`);
          } catch (err) {
            console.error(
              `  ERROR ${exportName} ($defs/${defName}): ${err.message}`
            );
            errors++;
          }
        }

        continue;
      }

      // --- Regular schemas ---
      const resolved = resolveCircularRefs(schema, schema);
      const normalized = normalizeSchema(resolved);

      const zod = jsonSchemaToZod(normalized, {
        name,
        module: "none",
        noImport: true,
        zodVersion: 3,
      });

      const processed = postProcessZodCode(
        zod.replace(/^const /, "export const ")
      );
      lines.push(processed);
      // Add type export
      const typeName = name.replace(/Schema$/, "");
      lines.push(`export type ${typeName} = z.infer<typeof ${name}>;`, "");
      console.log(`  OK    ${name}`);

      if (!hasUcpRequestAnnotations(schema)) continue;

      const baseName = name.replace(/Schema$/, "");
      for (const op of REQUEST_OPERATIONS) {
        const requestJson = buildRequestJson(schema, op);
        if (!requestJson) continue;

        const requestName = `${baseName}${toPascalCase(op)}RequestSchema`;
        try {
          const requestNormalized = normalizeSchema(requestJson);
          const requestZod = jsonSchemaToZod(requestNormalized, {
            name: requestName,
            module: "none",
            noImport: true,
            zodVersion: 3,
          });
          const requestProcessed = postProcessZodCode(
            requestZod.replace(/^const /, "export const ")
          );
          lines.push(requestProcessed);
          const requestTypeName = requestName.replace(/Schema$/, "");
          lines.push(
            `export type ${requestTypeName} = z.infer<typeof ${requestName}>;`,
            ""
          );
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
