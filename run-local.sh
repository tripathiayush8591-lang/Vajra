#!/usr/bin/env bash
# CivicPulse AI — one-click local startup (Linux/macOS)
set -e
cd "$(dirname "$0")"

echo "== CivicPulse AI local startup =="

cd backend
if [ ! -f venv/bin/python ] && [ ! -f venv/Scripts/python.exe ]; then
  echo "Creating backend venv + installing deps..."
  python3 -m venv venv
  venv/bin/python -m pip install -q -r requirements.txt || venv/Scripts/python.exe -m pip install -q -r requirements.txt
fi
echo "Starting backend on http://localhost:8000"
(./venv/bin/python run.py || ./venv/Scripts/python.exe run.py) &
BACK_PID=$!

cd ../frontend
if [ ! -d node_modules ]; then
  echo "Installing frontend deps..."
  npm install --no-audit --no-fund
fi
echo "Starting frontend on http://localhost:5173"
npm run dev &
FRONT_PID=$!

trap "kill $BACK_PID $FRONT_PID 2>/dev/null" EXIT
echo ""
echo "Open http://localhost:5173 — API docs at http://localhost:8000/docs"
wait
