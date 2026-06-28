# Lumora — Web

The Lumora frontend: a Next.js app for real-time stablecoin payroll on Stellar. Employers fund payroll and create salary streams; employees watch their balance grow by the second and withdraw anytime.

## Stack

- **Next.js 15** (App Router) + **React 19**
- **Tailwind CSS** (token-based design system in `tailwind.config.ts`)
- **@tanstack/react-query** for data fetching/caching
- **@stellar/stellar-sdk** + **Stellar Wallets Kit** (Freighter / xBull / Lobstr / Albedo)
- Auto-generated TypeScript contract bindings (no hand-written ABI)

## Run locally

```bash
cd apps/web
npm install
npm run dev          # http://localhost:3000
```

No `.env` is required — `src/lib/config.ts` ships with working **testnet** defaults (RPC, contract IDs, USDC SAC). Set your wallet (e.g. Freighter) to **testnet** and connect.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Next.js ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run bindings` | Regenerate TS bindings from the deployed contracts |

## Configuration

All settings have testnet defaults and can be overridden with `NEXT_PUBLIC_*` environment variables:

| Variable | Default |
|----------|---------|
| `NEXT_PUBLIC_NETWORK` | `testnet` |
| `NEXT_PUBLIC_RPC_URL` | `https://soroban-testnet.stellar.org` |
| `NEXT_PUBLIC_HORIZON_URL` | `https://horizon-testnet.stellar.org` |
| `NEXT_PUBLIC_NETWORK_PASSPHRASE` | `Test SDF Network ; September 2015` |
| `NEXT_PUBLIC_USDC_SAC_ADDRESS` | testnet USDC SAC |
| `NEXT_PUBLIC_USDC_ISSUER` | Circle testnet USDC issuer |
| `NEXT_PUBLIC_PAYROLL_STREAM_ID` | deployed `payroll_stream` |
| `NEXT_PUBLIC_PAYROLL_TREASURY_ID` | deployed `payroll_treasury` |
| `NEXT_PUBLIC_YIELD_STRATEGY_ID` | deployed `yield_strategy` |
| `NEXT_PUBLIC_INDEXER_URL` | _(empty)_ — if set, history/analytics read from the indexer; otherwise from Stellar RPC |

## Routes

| Route | Purpose |
|-------|---------|
| `/` | Landing |
| `/earnings` | Employee: auto-discovered streams, live withdrawable counter, claim salary, withdrawal history |
| `/payroll` | Employer: fund balance, create streams (monthly salary + start/end dates), manage (pause/resume/cancel), activity feed |
| `/vault` | Treasury: deposit idle USDC, accrue yield, fund payroll |
| `/analytics` | Payroll spend (real, on-chain) + yield projection |
| `/docs` | Documentation (introduction, how it works, features, architecture, FAQ) |

## Project structure

```
src/
  app/            # routes (App Router) + global styles
  components/     # UI primitives (ui.tsx) + feature components
  lib/            # config, wallet, contract clients, on-chain reads, formatting
  bindings/       # auto-generated contract bindings (payroll_stream, payroll_treasury)
```

## Contract bindings

Bindings are committed under `src/bindings/`. If a contract interface changes, regenerate them:

```bash
npm run bindings     # stellar contract bindings typescript → src/bindings
```

## Deploy (Vercel)

This is a monorepo with no root `package.json`. On Vercel, set the project's **Root Directory** to `apps/web` so it builds only the frontend (and skips the Rust contracts and the indexer's native dependencies). Next.js is auto-detected; no extra build configuration is needed. Environment variables are optional (testnet defaults apply).
