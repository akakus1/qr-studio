#!/bin/bash
set -e

echo "=== Step 1: Build frontend with Vite ==="
pnpm vite build

echo "=== Step 2: Compile API function as CJS with esbuild ==="
mkdir -p .vercel/output/functions/api/index.func

npx esbuild api/index.ts \
  --platform=node \
  --target=node18 \
  --bundle \
  --format=cjs \
  --footer:js="// Vercel compatibility: ensure handler is directly callable
if (module.exports && module.exports.default && typeof module.exports.default === 'function') {
  var _handler = module.exports.default;
  module.exports = _handler;
  module.exports.default = _handler;
}" \
  --outfile=.vercel/output/functions/api/index.func/index.js

echo "=== Step 3: Create function config ==="
cat > .vercel/output/functions/api/index.func/.vc-config.json << 'EOF'
{
  "runtime": "nodejs18.x",
  "handler": "index.js",
  "launcherType": "Nodejs"
}
EOF

# Add package.json to force CJS module resolution in the function directory
cat > .vercel/output/functions/api/index.func/package.json << 'EOF'
{"type": "commonjs"}
EOF

echo "=== Step 4: Copy static files ==="
mkdir -p .vercel/output/static
cp -r dist/public/. .vercel/output/static/

echo "=== Step 5: Create Vercel output config ==="
cat > .vercel/output/config.json << 'EOF'
{
  "version": 3,
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/index"
    },
    {
      "handle": "filesystem"
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ]
}
EOF

echo "=== Build complete ==="
