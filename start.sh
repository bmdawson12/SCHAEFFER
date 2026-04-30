#!/bin/bash
# ============================================================================
#  Citation Monitor - One-Command Startup
#  Just run: ./start.sh
# ============================================================================
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND="$DIR/backend"
VENV="$BACKEND/.venv"
PORT=49292
URL="http://localhost:$PORT"

# ── Helpers ──────────────────────────────────────────────────────────────────

print_step()  { printf "\n\033[1;34m==> %s\033[0m\n" "$1"; }
print_ok()    { printf "    \033[1;32m%s\033[0m\n" "$1"; }
print_warn()  { printf "    \033[1;33m%s\033[0m\n" "$1"; }
print_err()   { printf "    \033[1;31m%s\033[0m\n" "$1"; }

# ── Check Python 3 ──────────────────────────────────────────────────────────

print_step "Checking Python 3..."

if command -v python3 &>/dev/null; then
    PYTHON=python3
    PY_VERSION=$($PYTHON --version 2>&1)
    print_ok "Found $PY_VERSION"
else
    print_err "Python 3 is required but not found."
    print_err "On macOS, install Xcode Command Line Tools: xcode-select --install"
    exit 1
fi

# ── Set up virtual environment ───────────────────────────────────────────────

print_step "Setting up Python environment..."

if [ ! -d "$VENV" ]; then
    print_warn "Creating virtual environment (first run only)..."
    $PYTHON -m venv "$VENV"
    print_ok "Virtual environment created at backend/.venv"
fi

# Activate venv
source "$VENV/bin/activate"

# Install/update dependencies if needed
MARKER="$VENV/.deps-installed"
REQ="$BACKEND/requirements.txt"

if [ ! -f "$MARKER" ] || [ "$REQ" -nt "$MARKER" ]; then
    print_warn "Installing Python dependencies (first run only, may take 1-2 min)..."
    pip install --quiet --upgrade pip
    pip install --quiet -r "$REQ"
    touch "$MARKER"
    print_ok "Dependencies installed"
else
    print_ok "Dependencies already installed"
fi

# ── Build frontend (optional) ───────────────────────────────────────────────

print_step "Checking frontend..."

STATIC="$BACKEND/static"

if [ -d "$STATIC" ] && [ -f "$STATIC/index.html" ]; then
    print_ok "Pre-built frontend found"
elif command -v npm &>/dev/null; then
    print_warn "Building frontend from source..."
    cd "$DIR/frontend" && npm install --silent && npm run build --silent
    rm -rf "$STATIC"
    cp -r "$DIR/frontend/dist" "$STATIC"
    print_ok "Frontend built successfully"
else
    print_err "No pre-built frontend found and npm is not available."
    print_err "Run this on a machine with Node.js first, or copy the backend/static/ folder."
    exit 1
fi

# ── Stop any existing server ────────────────────────────────────────────────

if lsof -ti:$PORT &>/dev/null; then
    print_step "Stopping existing server on port $PORT..."
    lsof -ti:$PORT | xargs kill -9 2>/dev/null || true
    sleep 1
fi

# ── Start the server ────────────────────────────────────────────────────────

print_step "Starting Citation Monitor on port $PORT..."

cd "$BACKEND"
nohup "$VENV/bin/python" -m uvicorn app.main:app \
    --host 0.0.0.0 --port $PORT \
    > "$BACKEND/server.log" 2>&1 &

SERVER_PID=$!

# Wait for server to be ready
for i in $(seq 1 15); do
    if curl -s -o /dev/null -w "%{http_code}" "$URL/" 2>/dev/null | grep -q "200"; then
        break
    fi
    sleep 1
done

if curl -s -o /dev/null -w "%{http_code}" "$URL/" 2>/dev/null | grep -q "200"; then
    print_ok "Server running (PID $SERVER_PID)"
else
    print_err "Server failed to start. Check backend/server.log"
    cat "$BACKEND/server.log" 2>/dev/null | tail -20
    exit 1
fi

# ── Open browser ─────────────────────────────────────────────────────────────

print_step "Opening browser..."
if command -v open &>/dev/null; then
    open "$URL"
elif command -v xdg-open &>/dev/null; then
    xdg-open "$URL"
fi

# ── Done ─────────────────────────────────────────────────────────────────────

printf "\n"
printf "\033[1;32m============================================================\033[0m\n"
printf "\033[1;32m  Citation Monitor is running!\033[0m\n"
printf "\033[1;32m============================================================\033[0m\n"
printf "\n"
printf "    URL:  \033[1;4m%s\033[0m\n" "$URL"
printf "    Log:  backend/server.log\n"
printf "    Stop: kill %s  (or: lsof -ti:%s | xargs kill)\n" "$SERVER_PID" "$PORT"
printf "\n"
