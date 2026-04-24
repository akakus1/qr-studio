#!/bin/bash
set -e

echo "=== Step 1: Build frontend with Vite ==="
pnpm vite build

echo "=== Step 2: Pre-compile API function as CJS with esbuild ==="
# Compile api/server.ts (renamed from api/index.ts to avoid Vercel path conflict)
# Output to api/index.js which Vercel will use as the serverless function
npx esbuild api/server.ts \
  --platform=node \
  --target=node18 \
  --bundle \
  --format=cjs \
  --footer:js="// Ensure module.exports is the Express app directly
if (module.exports && module.exports.default) { module.exports = module.exports.default; }" \
  --outfile=api/index.js

echo "=== Build complete ==="
echo "api/index.js size: $(ls -la api/index.js | awk '{print $5}') bytes"
