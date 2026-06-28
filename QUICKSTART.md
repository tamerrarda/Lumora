# Lumora — Quickstart

## 0. Prerequisites (one time)

```bash
# Rust + Soroban tools
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup target add wasm32v1-none               # stellar-cli 26+ / soroban-sdk 25 target
cargo install --locked stellar-cli            # the 'stellar' command

# Node (for the frontend)
node -v        # 20+ recommended
```

Create and fund a testnet identity (XLM, for fees):

```bash
stellar keys generate --global lumora-dev --network testnet --fund
stellar keys address lumora-dev
```

---

## 1. Prepare the Repo 

```bash
git clone <repo-url> lumora && cd lumora
cp .env.example .env            # network + contract addresses
```

Environment variables in `.env` :

```
NETWORK=testnet
RPC_URL=https://soroban-testnet.stellar.org
NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
HORIZON_URL=https://horizon-testnet.stellar.org
USDC_SAC_ADDRESS=C...           # SAC address of Circle testnet USDC
USDC_DECIMALS=7
PAYROLL_STREAM_ID=C...
PAYROLL_TREASURY_ID=C...
YIELD_STRATEGY_ID=C...
```

---

## 2. Build and Test the Contracts 

```bash
cd contracts
cargo test                      # unit + invariant + TTL tests
stellar contract build          # WASM generation
```

---

## 3. Deploy to Testnet 

```bash
# payroll_stream
stellar contract deploy --wasm target/wasm32-unknown-unknown/release/payroll_stream.wasm \
  --source lumora-dev --network testnet \
  -- --admin $(stellar keys address lumora-dev) --token $USDC_SAC_ADDRESS

# payroll_treasury (similar; with payroll_stream + strategy + rate_bps arguments)
```

Write the resulting `C...` addresses into `.env`.

---

## 4. USDC Smoke Test 

BEFORE writing code, prove that the testnet USDC SAC actually behaves as you expect:

```bash
# Get USDC from the Circle testnet faucet (to the wallet), then:
stellar contract invoke --id $USDC_SAC_ADDRESS --source lumora-dev --network testnet \
  -- balance --id $(stellar keys address lumora-dev)

# Try a small transfer (decimals=7 verification):
stellar contract invoke --id $USDC_SAC_ADDRESS --source lumora-dev --network testnet \
  -- transfer --from $(stellar keys address lumora-dev) --to <another-address> --amount 1_0000000
```

Expected: the balance comes back with 7 decimals, the transfer passes. If it doesn't, solve the trustline/decimal problem **now** (not 3 phases later).

---

## 5. Frontend 

```bash
cd apps/web
npm install
npm run dev               # http://localhost:3000
```

The bindings (`src/bindings/payroll_stream`) are ready in the repo. If the contract
interface changes, regenerate them (no hand-written ABI):

```bash
npm run bindings          # stellar contract bindings typescript → src/bindings
```

Screens:
- **`/earnings` (Earnings):** connect wallet → your streams are found automatically →
  live withdrawable counter → one-click "Claim Salary" → tx link + withdrawal history.
- **`/payroll` (Payroll):** fund the balance → create a stream with monthly salary + start/end dates →
  StreamTable (pause/resume/cancel/settle) + activity feed.
- **`/vault` (Treasury):** deposit idle USDC → accrue yield → fund payroll (mock strategy on testnet).
- **`/analytics` (Analytics):** payroll spend (real, on-chain) + yield projection (SIMULATED).
- **`/docs` (Docs):** documentation — what it is, how it works, features, architecture, FAQ.

Set your Freighter (or xBull/Lobstr/Albedo) wallet to **testnet** and connect.

---

## 6. Seed Demo Data 

From the repo root (not from `apps/web`):

```bash
bash scripts/seed-demo.sh
# customize: MONTHLY_USDC=100 MONTHS=2 BACKDATE_DAYS=3 bash scripts/seed-demo.sh
```

Opens a stream with a backdated `start_time` → when the employee opens `/earnings` they
see a balance that is **instantly filled and growing second by second**. Prerequisite: USDC
in the employer identity (Circle faucet) + USDC trustline on the employee. See `scripts/README.md`.

---

## Troubleshooting

| Symptom | Possible cause | Solution |
|---------|-------------|-------|
| `transfer` blows up | Recipient has no USDC trustline | Add a trustline / conditional-prepare flow in the UI |
| Balance at wrong scale | 6 vs 7 decimal confusion | All amounts are 7 decimals (`1 USDC = 1_0000000`) |
| Data "disappeared" | Persistent state TTL expired | Make sure `extend_ttl` is called |
| Wallet won't connect | Wrong network | Set Freighter to testnet; passphrase must match |

For terms: [GLOSSARY.md](GLOSSARY.md).
