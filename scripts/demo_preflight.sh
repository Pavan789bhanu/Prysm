#!/usr/bin/env bash
# Preflight checks for a stakeholder demo.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API_URL="${NEXT_PUBLIC_API_URL:-http://localhost:8000}"

echo "== Prysm demo preflight =="
echo "Root: $ROOT"
echo "API:  $API_URL"
echo

pass=0
fail=0

check() {
  local name="$1"
  shift
  if "$@"; then
    echo "✅ $name"
    pass=$((pass + 1))
  else
    echo "❌ $name"
    fail=$((fail + 1))
  fi
}

check "Backend health" curl -fsS "$API_URL/api/health" >/dev/null
check "Demo status endpoint" curl -fsS "$API_URL/api/demo/status" >/dev/null
check "Backend tests" bash -lc "cd '$ROOT/backend' && DEMO_MODE=true python3 -m pytest -q"
check "Frontend lint" bash -lc "cd '$ROOT/frontend' && npm run lint"
check "Frontend build" bash -lc "cd '$ROOT/frontend' && npm run build"

echo
echo "Passed: $pass  Failed: $fail"
if [[ "$fail" -gt 0 ]]; then
  exit 1
fi

echo
echo "Demo ready. Suggested path:"
echo "  1) Open http://localhost:3000/pitch"
echo "  2) Register / sign in"
echo "  3) Dashboard → Analyze → One-click demo"
echo "  4) Present + Export report"
