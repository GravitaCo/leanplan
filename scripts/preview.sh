#!/usr/bin/env bash
# Preview any branch of Tali on this Mac before it goes live (see docs/local-preview.md).
#
#   bash scripts/preview.sh                 # the branch you're on
#   bash scripts/preview.sh <branch-name>   # switch to that branch first
#
# Serves the production build at http://localhost:4173/ and prints a Wi-Fi address for your
# phone. Ctrl+C stops it.
set -euo pipefail
cd "$(dirname "$0")/.."

if ! command -v node >/dev/null 2>&1; then
  if command -v brew >/dev/null 2>&1; then
    echo "Installing Node.js with Homebrew…"
    brew install node
  else
    echo "Node.js isn't installed. Install the LTS version from https://nodejs.org, then run this again."
    open https://nodejs.org 2>/dev/null || true
    exit 1
  fi
fi
if [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 20 ]; then
  echo "Node.js $(node -v) is too old; Tali needs 20 or newer. Update it from https://nodejs.org."
  exit 1
fi

branch="${1:-}"
if [ -n "$branch" ]; then
  if [ -n "$(git status --porcelain)" ]; then
    echo "This folder has uncommitted changes, so I won't switch branches. Commit or discard them first."
    exit 1
  fi
  git fetch origin "$branch"
  git checkout "$branch" 2>/dev/null || git checkout -b "$branch" "origin/$branch"
  git pull --ff-only origin "$branch"
fi

echo "Previewing branch: $(git branch --show-current)"
npm install --no-audit --no-fund
npm run build
(sleep 2; open http://localhost:4173/ 2>/dev/null || true) &
npx vite preview --host --port 4173
