# Lumora — Glossary

The **single definition source** for terms across all documents. A term is used everywhere exactly as it is here (for consistency).

> Rule: when describing a concept, keep the English technical term (e.g. "stream", "treasury"). Three-way spellings like "stream / flow / payment flow" are forbidden — use one consistent term.

---

## Core Product Concepts

| Term | Definition |
|-------|-------|
| **Stream (salary stream)** | A salary contract that accrues per second (`rate_per_second`) from an employer to an employee. State machine: create → accrue → withdraw; pause/resume/cancel/settle. |
| **Treasury** | A separate contract (`payroll_treasury`) where idle employer funds are held and can earn yield. |
| **Yield** | The income that idle funds in the treasury earn over time. On testnet it is **mock** (simulated, fixed rate); on mainnet a DeFi adapter. |
| **Yield strategy** | An adapter trait that abstracts the yield source. `MockStrategy` (testnet) / `DefiStrategy` (mainnet). |
| **Reserve isolation** | The principle that an employee's locked salary funds (reserved) are **never** exposed to yield risk. Ensured physically via two separate contracts. |

## Stream Accounting

| Term | Definition |
|-------|-------|
| **Claimable** | The accrued but not-yet-withdrawn amount an employee can withdraw right now. **Rounded down** in the employee's favor. |
| **Accrued** | The total salary accumulated since the start of the stream (`accrued_stored` + time elapsed since the last checkpoint × rate). Bounded by `max_total_amount`. |
| **Checkpoint** | The moment the accrual is recorded on-chain; the `last_checkpoint` timestamp. Accrual is frozen before a rate change/pause. |
| **Reserved amount (reserve)** | The budget locked from the employer balance when the stream is created. The money the employee will withdraw comes from here. |
| **Employer available balance** | The amount the employer has funded into `payroll_stream` but has not yet locked into a stream. |
| **Withdrawn** | The total an employee has withdrawn from that stream to date. `≤ accrued`. |
| **Settle** | Returning the unused reserve (+ dust) to the employer for a stream that has ended/been canceled/reached its cap. |
| **Dust** | The sub-cent rounding remainder left over from `i128` integer division. Returned to the **employer** at settle. |
| **max_total_amount (budget cap)** | The total upper limit a stream can pay; accrual cannot exceed it. |

## Stellar / Soroban

| Term | Definition |
|-------|-------|
| **Soroban** | Stellar's smart contract platform (Rust → WASM). |
| **SAC (Stellar Asset Contract)** | A wrapper that exposes a classic Stellar asset (e.g. USDC) as a SEP-41-compatible Soroban token contract. `C...` address. |
| **SEP-41** | The Soroban token interface standard (`transfer`, `balance`, `decimals`, ...). Lumora talks to the token through this interface. |
| **Trustline** | The permission/link a Stellar account opens to be able to hold a specific asset (USDC). A user who receives USDC usually already has one. |
| **TTL / rent (state rent)** | The requirement that Soroban persistent data periodically calls `extend_ttl` to stay alive. If it expires, the data is archived/unreadable. |
| **require_auth** | The Soroban authorization mechanism that requires an operation to be signed by the relevant `Address`. |
| **i128 / basis points (bps)** | Money amounts are `i128`; the yield rate is `u32` bps (500 = 5%). USDC has **7 decimals** (`1 USDC = 1_0000000`). |

## Tools / Data / Frontend

| Term | Definition |
|-------|-------|
| **Freighter** | A Stellar browser wallet; transaction signing. |
| **Stellar Wallets Kit** | A library that connects multiple wallets (Freighter, xBull, Albedo, Lobstr...) through a single interface. |
| **Stellar RPC** | The canonical RPC for Soroban; `simulateTransaction` (read), `getEvents` (event history), submission/confirmation. |
| **Horizon** | Stellar's REST API; account history, operations, effects (secondary/historical data). |
| **Bindings (TS bindings)** | A type-safe client **generated automatically** from the contract WASM with `stellar contract bindings typescript`. No hand-written ABI. |

## Engineering Principles

| Term | Definition |
|-------|-------|
| **CEI (Checks-Effects-Interactions)** | Checks first → update state → `transfer` last. A reentrancy defense. |
| **Invariant** | A rule that must remain true in all cases (e.g. `token.balance == Σ available + Σ reserved`). Verified with fuzz/invariant tests. |
| **ADR (Architecture Decision Record)** | The record of an architectural decision along with its rationale + trade-off. |
| **Contract-first** | The contract is the single source of truth; the frontend/indexer derive from it (binding + event-spec). |

## Roles

| Term | Definition |
|-------|-------|
| **Admin** | A privileged account: APY, yield reserve, manager assignment, (mainnet) upgrade. A single key on testnet; multisig on mainnet. |
| **Payroll manager** | An authorized role that can create and manage streams on behalf of the employer. |
| **Employer** | The party that deposits funds and creates streams. |
| **Employee** | The party that withdraws only what they have earned; the most fragile user (UX focus). |
