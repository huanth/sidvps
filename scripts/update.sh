#!/bin/bash
set -e

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"

echo "[Update] Starting SidVPS update..."

# Verify we're in a git repo
if [ ! -d .git ]; then
    echo "[Error] Not a git repository"
    exit 1
fi

# Pull latest changes
echo "[Update] Pulling latest code from origin/main..."
git fetch origin main
git reset --hard origin/main

# Install backend dependencies
echo "[Update] Installing backend dependencies..."
npm install --prefix backend

# Install frontend dependencies
echo "[Update] Installing frontend dependencies..."
npm install --prefix frontend

# Build frontend
echo "[Update] Building frontend..."
npm run build --prefix frontend

echo "[Update] Update completed successfully"
exit 0
