#!/bin/bash
set -e
cd "$(dirname "$0")"
export npm_config_registry="https://registry.npmjs.org/"
if [ ! -d node_modules ]; then
  npm ci
fi
npm run dev
