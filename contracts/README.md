# Lumora — Smart Contracts (Soroban)

The on-chain layer of Lumora: real-time salary streaming and a yield-aware treasury, written in Rust for [Soroban](https://soroban.stellar.org) (Stellar's smart contract platform).

## Design: reserve isolation

Lumora separates concerns across small, single-purpose contracts. The key decision is **reserve isolation** — money owed to employees (payroll reserves) and capital chasing yield never live in the same contract. Even if a yield strategy failed, salaries owed to employees would be untouched.

| Crate | Role |
|-------|------|
| `payroll_stream` | Holds funded payroll balances and manages salary streams (create, fund, withdraw, pause, resume, cancel, settle). Source of truth for what each employee has earned. |
| `payroll_treasury` | Holds idle employer USDC that earns yield; tracks each employer's principal + accrued yield; can move funds into payroll. |
| `yield_strategy` | A pluggable strategy contract defining how idle capital earns yield. Swappable without touching payroll logic. |

## Conventions

- **Money:** `i128`, **7 decimals** (`1 USDC = 1_0000000`). Rates are in **basis points** (`bps`; 5% = `500`).
- **Auth:** every state-changing function is guarded by an explicit `require_auth` on the relevant `Address`.
- **Safety:** checked arithmetic throughout; CEI ordering (state changes before token transfers); persistent state uses TTL/`extend_ttl`.
- **Token:** USDC via the Stellar Asset Contract (SAC) / SEP-41 token interface.

## Build & test

```bash
cd contracts
cargo test                 # unit + invariant + boundary + TTL tests (44 total)
stellar contract build     # produce WASM under target/wasm32-unknown-unknown/release/
```

Prerequisites: Rust, `wasm32v1-none` target, and `stellar-cli` (see [QUICKSTART.md](../QUICKSTART.md)).

---

## payroll_stream

Salary stream engine. Reserves are locked from a per-employer balance when a stream is created, then released to the employee second by second.

**Constructor:** `__constructor(admin, token)`

**Key functions**

| Function | Purpose |
|----------|---------|
| `fund(from, employer, amount)` | Add USDC to an employer balance (permissionless; the treasury's `fund_payroll` uses this path). |
| `create_stream(employer, employee, rate_per_second, start_time, end_time, max_total_amount)` | Open a stream; locks `max_total_amount` from the employer balance. |
| `batch_create(...)` | Create multiple streams in one call. |
| `withdraw(stream_id, amount)` | Employee withdraws earned (accrued, not-yet-withdrawn) USDC. |
| `claimable(stream_id) -> i128` | View the currently withdrawable amount. |
| `pause / resume / cancel / settle(stream_id)` | Stream lifecycle management. |
| `update_rate(stream_id, new_rate)` | Change the per-second rate (checkpointed). |
| `get_stream / employer_balance / next_stream_id / admin / token` | Views. |
| `upgrade(new_wasm_hash)` | Admin-only WASM upgrade (address + state preserved). |

**Events:** `created`, `funded`, `withdraw`, `paused`, `resumed`, `canceled`, `settled`, `rate_upd`, `mgr_upd`

**Error codes:** `1` Unauthorized · `2` InvalidStream · `3` InvalidArguments · `4` NotEmployee · `5` StreamInactive · `6` InsufficientTreasury · `7` AlreadyInitialized

---

## payroll_treasury

Holds idle employer USDC and accrues yield on it. Withdrawals deduct **yield first, then principal**. Yield is paid from a `YieldReserve` (seeded via `fund_yield_reserve`).

**Constructor:** `__constructor(admin, token, payroll_stream, strategy, annual_rate_bps)`

**Key functions**

| Function | Purpose |
|----------|---------|
| `deposit(employer, amount)` | Deposit idle USDC to start earning yield. |
| `withdraw(employer, amount)` | Withdraw a specific amount (yield-first). |
| `withdraw_all(employer)` | Withdraw principal + accrued yield. |
| `fund_payroll(employer, amount)` | Move funds from treasury into `payroll_stream` (cross-contract). |
| `fund_yield_reserve(funder, amount)` | Seed the reserve that backs yield payouts (permissionless). |
| `set_annual_rate(bps)` | Admin: set the annual yield rate (basis points). |
| `pending_yield / total_balance / get_vault` | Per-employer views. |
| `annual_rate_bps / yield_reserve / total_deposits / admin / token / payroll_stream` | Global views. |
| `upgrade(new_wasm_hash)` | Admin-only WASM upgrade. |

**Events:** `deposit`, `withdraw`, `fund_pay`, `res_fund`, `rate_upd`

**Error codes:** `100` Unauthorized · `101` InvalidArguments · `102` InsufficientBalance · `103` InsufficientYieldReserve · `104` AlreadyInitialized

---

## yield_strategy

A minimal strategy adapter. On testnet this is a mock that demonstrates the interface; on mainnet it can be swapped for a real DeFi yield source without changing the treasury.

**Constructor:** `__constructor(admin, token)`

**Key functions**

| Function | Purpose |
|----------|---------|
| `deposit(from, amount)` | Receive capital to deploy. |
| `withdraw(to, amount) -> i128` | Withdraw capital. Returns the **realized** amount (may differ from requested). |
| `balance / pending` | Views. |
| `upgrade(new_wasm_hash)` | Admin-only WASM upgrade. |

**Error codes:** `200` AlreadyInitialized · `201` Unauthorized · `202` InvalidArguments

---

## Deployment

Each contract is deployed with its constructor arguments, e.g.:

```bash
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/payroll_stream.wasm \
  --source <identity> --network testnet \
  -- --admin <G...> --token <USDC_SAC_ADDRESS>
```

See [QUICKSTART.md](../QUICKSTART.md) for the full deploy + smoke-test walkthrough. Current testnet addresses are listed in the root [README.md](../README.md).

## Upgradeability

Every contract exposes an admin-gated `upgrade(new_wasm_hash)` that swaps the WASM in place — the contract **address and stored state are preserved**. This allows bug fixes in a fund-holding system without forcing users to move to a new contract.
