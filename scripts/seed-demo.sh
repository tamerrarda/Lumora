#!/usr/bin/env bash
# Lumora — staged data for the jury demo.
# Opens a salary stream with a backdated start → when the employee opens /earnings
# they INSTANTLY see a filled balance that grows second by second.
#
# Prerequisites:
#   - stellar-cli installed, testnet network defined (`stellar network ls`)
#   - Employer identity funded + USDC trustline + >= CAP USDC in wallet
#     (Circle testnet faucet: https://faucet.circle.com  — select USDC, Stellar Testnet)
#   - Employee identity exists + USDC trustline open (for withdrawal)
#
# Usage:
#   bash scripts/seed-demo.sh
#   MONTHLY_USDC=100 MONTHS=2 BACKDATE_DAYS=3 bash scripts/seed-demo.sh
set -euo pipefail

# --- Configuration (can be overridden) ---
NETWORK="${NETWORK:-testnet}"
EMPLOYER_ID="${EMPLOYER_ID:-lumora-dev}"
EMPLOYEE_ID="${EMPLOYEE_ID:-lumora-employee}"
STREAM_ID="${STREAM_ID:-CCAY3UKTW6G4XUXLTWVOUYPHDIR2KOYDWELJ72PZGFBTRGRKC6NSH6OD}"
MONTHLY_USDC="${MONTHLY_USDC:-30}"      # monthly salary (USDC)
MONTHS="${MONTHS:-1}"                   # stream duration (months)
BACKDATE_DAYS="${BACKDATE_DAYS:-2}"     # how many days to backdate the start (pre-accrual)

# --- Constants ---
DECIMALS=7
SCALE=$((10 ** DECIMALS))
SECONDS_PER_MONTH=$((30 * 24 * 60 * 60))

echo "▸ Resolving identity addresses…"
EMPLOYER=$(stellar keys address "$EMPLOYER_ID")
EMPLOYEE=$(stellar keys address "$EMPLOYEE_ID")
echo "  employer ($EMPLOYER_ID): $EMPLOYER"
echo "  employee ($EMPLOYEE_ID): $EMPLOYEE"

# --- Amount calculations (integer / raw units) ---
MONTHLY_RAW=$((MONTHLY_USDC * SCALE))
RATE=$((MONTHLY_RAW / SECONDS_PER_MONTH))
TOTAL_SECONDS=$((MONTHS * SECONDS_PER_MONTH))
CAP=$((RATE * TOTAL_SECONDS))
NOW=$(date +%s)
START=$((NOW - BACKDATE_DAYS * 24 * 60 * 60))
END=$((NOW + TOTAL_SECONDS))
PREACCRUED=$((RATE * (NOW - START)))

echo "▸ Stream parameters:"
echo "  rate/sec     : $RATE raw  (≈ $MONTHLY_USDC USDC/month)"
echo "  reserve (cap): $CAP raw   (≈ $((CAP / SCALE)) USDC)"
echo "  pre-accrued  : $PREACCRUED raw (≈ $((PREACCRUED / SCALE)).$(printf '%07d' $((PREACCRUED % SCALE)) | cut -c1-2) USDC, instantly withdrawable)"

# --- Read the employer contract balance, fund the shortfall ---
echo "▸ Reading employer contract balance…"
BAL=$(stellar contract invoke --id "$STREAM_ID" --source "$EMPLOYER_ID" --network "$NETWORK" \
  -- employer_balance --employer "$EMPLOYER" 2>/dev/null | tr -d '"' || echo 0)
echo "  current: $BAL raw"

if [ "$BAL" -lt "$CAP" ]; then
  SHORT=$((CAP - BAL))
  echo "▸ Funding the missing reserve: $SHORT raw (≈ $((SHORT / SCALE)) USDC)…"
  stellar contract invoke --id "$STREAM_ID" --source "$EMPLOYER_ID" --network "$NETWORK" \
    -- fund --from "$EMPLOYER" --employer "$EMPLOYER" --amount "$SHORT"
else
  echo "  sufficient balance, funding skipped."
fi

# --- Create the stream (backdated) ---
echo "▸ Creating the salary stream (start=$START, end=$END)…"
NEW_ID=$(stellar contract invoke --id "$STREAM_ID" --source "$EMPLOYER_ID" --network "$NETWORK" \
  -- create_stream \
  --employer "$EMPLOYER" \
  --employee "$EMPLOYEE" \
  --rate_per_second "$RATE" \
  --start_time "$START" \
  --end_time "$END" \
  --max_total_amount "$CAP" | tr -d '"')

echo ""
echo "✅ Seed complete. Stream #$NEW_ID opened."
echo "   Employee wallet: $EMPLOYEE"
echo "   → http://localhost:3000/earnings (connect with this wallet, see the filled+streaming balance)"
