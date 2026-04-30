#!/bin/bash
# ============================================================================
#  Deploy script: builds frontend, bundles backend, syncs to /tmp, restarts
# ============================================================================
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"

# ── Build frontend ───────────────────────────────────────────────────────────

echo "Building frontend..."
cd "$DIR/frontend" && npm run build

echo "Copying built frontend into backend/static..."
rm -rf "$DIR/backend/static"
cp -r "$DIR/frontend/dist" "$DIR/backend/static"

# ── Sync to /tmp/citation-backend ────────────────────────────────────────────

echo "Syncing to /tmp/citation-backend..."
mkdir -p /tmp/citation-backend
rsync -av --delete "$DIR/backend/app/" /tmp/citation-backend/app/
rsync -av --delete "$DIR/backend/static/" /tmp/citation-backend/static/
cp "$DIR/backend/requirements.txt" /tmp/citation-backend/requirements.txt
find /tmp/citation-backend -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true

# ── Restart backend ──────────────────────────────────────────────────────────

echo "Restarting backend on port 49292..."
lsof -ti:49292 | xargs kill -9 2>/dev/null || true
sleep 1
cd /tmp/citation-backend && nohup python3 -m uvicorn app.main:app --host 0.0.0.0 --port 49292 > /tmp/citation-backend/server.log 2>&1 &

sleep 2
if curl -s -o /dev/null -w "" http://localhost:49292/; then
    echo ""
    echo "==> App running at http://localhost:49292"
    echo ""
    echo "To share with colleagues:"
    echo "  1. Zip the project:  cd $(dirname "$DIR") && zip -r citation-monitor.zip citation-monitor/ -x '*/node_modules/*' '*/.venv/*' '*/__pycache__/*' '*/.git/*'"
    echo "  2. Send the zip file"
    echo "  3. They run:  chmod +x start.sh && ./start.sh"
else
    echo "ERROR: Failed to start. Check /tmp/citation-backend/server.log"
fi
