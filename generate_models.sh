#!/bin/bash
# Deprecated: quicktype does not support JSON Schema Draft 2020-12 (used by
# the current UCP spec). This script no longer works against the current spec.
#
# Use the new generator instead:
#   npm run generate -- /path/to/ucp/source
#
# The new generator (scripts/generate.mjs) uses @apidevtools/json-schema-ref-parser
# + json-schema-to-zod, which correctly handles Draft 2020-12 and cross-file $refs.
echo "Error: quicktype does not support JSON Schema Draft 2020-12."
echo "Use: npm run generate -- /path/to/ucp/source"
echo "See scripts/generate.mjs for the current generator."
exit 1
