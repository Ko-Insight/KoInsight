#!/usr/bin/env bash
set -euo pipefail

# Copy this file to deploy.sh on the deployment host and adjust these paths.
# Keep deploy.sh uncommitted if it contains host-specific directories.
APP_DIR="/opt/koinsight"
SRC_DIR="/opt/koinsight-src"
APP_URL="http://127.0.0.1:3000"

BACKUP_DIR="$APP_DIR/backups/data-$(date +%Y%m%d-%H%M%S)"

cd "$APP_DIR"

echo "Stopping KoInsight..."
docker compose down

echo "Backing up data..."
mkdir -p "$APP_DIR/backups"
cp -a "$APP_DIR/data" "$BACKUP_DIR"

echo "Updating source..."
cd "$SRC_DIR"
git pull --ff-only

echo "Building and starting..."
cd "$APP_DIR"
# The compose file in APP_DIR should set build.context to SRC_DIR.
docker compose up -d --build

echo "Smoke testing..."
sleep 5
curl -fsS "$APP_URL/" >/dev/null
curl -fsS "$APP_URL/api/plugin/download" >/dev/null

docker compose ps
