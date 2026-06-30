# Lumora

**A real-time, yield-aware stablecoin payroll system on Stellar.**

🔗 **Live demo:** [lumora-stream.vercel.app](https://lumora-stream.vercel.app)
🎥 **Demo video:** [youtu.be/721Y2YrENd4](https://youtu.be/721Y2YrENd4)
📊 **Pitch deck:** [Google Slides](https://docs.google.com/presentation/d/1SjpuAG90ND0ZyV_UWDFNXMdJyC9D8p7uV3hO79ngUHM/edit?usp=sharing)

Employers deposit USDC, create salary streams for employees, and employees can withdraw their earned salary at any time. Idle employer funds not allocated to payroll can earn yield in a treasury layer while active salary reserves stay protected.

## Screenshots

| Landing | Earnings — live per-second counters |
|---|---|
| ![Landing](docs/screenshots/01-landing.png) | ![Earnings](docs/screenshots/02-earnings.png) |
| **Payroll — fund & create stream** | **Payroll — streams & activity** |
| ![Payroll create](docs/screenshots/03-payroll-create.png) | ![Payroll streams](docs/screenshots/04-payroll-streams.png) |
| **Treasury & yield** | **Analytics** |
| ![Treasury](docs/screenshots/05-treasury.png) | ![Analytics](docs/screenshots/06-analytics.png) |
| **Docs** | |
| ![Docs](docs/screenshots/07-docs.png) | |

**Mobile**

<p>
  <img src="docs/screenshots/08-mobile-landing.png" width="240" alt="Mobile landing" />
  <img src="docs/screenshots/09-mobile-how-it-works.png" width="240" alt="Mobile how it works" />
</p>

---

- **payroll_stream:** `CCAY3UKTW6G4XUXLTWVOUYPHDIR2KOYDWELJ72PZGFBTRGRKC6NSH6OD`
- **payroll_treasury:** `CD5ERANICKKDMD3G7ULGMV5AWXAOMK4AYTIENGZNUTZEMSBIEVVJTFRY`
- **yield_strategy:** `CDYPGBBKXLO7MTTSTRU2K52LOHM7HMOISFABCIA7Y4SYSXQWHIVH22QY`
- **USDC SAC (testnet):** `CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA` (7 decimals)

```bash
cd apps/web && npm install && npm run dev    # http://localhost:3000
bash scripts/seed-demo.sh                     # (from repo root) demo data
```

Details: **[QUICKSTART.md](QUICKSTART.md)**.

---

## Repository Layout

| Path | Contents |
|------|----------|
| `contracts/` | Soroban smart contracts (Rust): `payroll_stream`, `payroll_treasury`, `yield_strategy` |
| `apps/web/` | Next.js frontend (Earnings / Payroll / Treasury / Analytics / Docs) |
| `apps/indexer/` | Lightweight event indexer (poller → SQLite → REST) |
| `scripts/` | Deployment & demo seeding scripts |

---

## Technology Stack

- **Smart Contracts:** Rust + Soroban SDK 25 (Stellar testnet → mainnet)
- **Token:** USDC, via Stellar Asset Contract (SAC) / SEP-41 token interface (7 decimals)
- **Frontend:** Next.js 15 + React 19 + Tailwind + React Query + `@stellar/stellar-sdk`
- **Wallet:** Stellar Wallets Kit (Freighter / xBull / Lobstr / Albedo)
- **Contract client:** Auto-generated TypeScript bindings (no hand-written ABI)
- **Data:** Stellar RPC `getEvents`/simulation (primary) + Horizon (trustline/history)

---

## User Onboarding & Feedback

Users onboard through a **Google Form** that collects their name, email, Stellar wallet
address, a 1–5 product rating, and open feedback. Submissions flow into a linked Google Sheet,
which we export to Excel for analysis and record-keeping.

- **Onboarding form:** [forms.gle/8jM5kg7TBzSxitu98](https://forms.gle/8jM5kg7TBzSxitu98) 
- **Exported responses (Excel):** [`docs/lumora-user-feedback.xlsx`](docs/lumora-user-feedback.xlsx) 

### Feedback iteration summary

- **Loved:** per-second salary accrual, instant on-demand withdrawals, treasury yield on idle funds, and reserve isolation.
- **Most-requested next:** multi-asset payroll (EURC alongside USDC), role-based access for employer org accounts, and bulk stream creation.
- **Friction reported:** occasional first-load delay on withdrawal history and a one-time wallet `txBadAuth` on first sign — both already addressed (see below).

**Already shipped (from early feedback):**

- Date-based stream end dates instead of month-only — [`00dfbab`](https://github.com/tamerrarda/Lumora/commit/00dfbab)
- Reliable withdrawal history & live earnings counter — [`7f4c973`](https://github.com/tamerrarda/Lumora/commit/7f4c973)
- Yield-aware treasury with reserve isolation — [`e27b6ca`](https://github.com/tamerrarda/Lumora/commit/e27b6ca)
- On-chain spend analytics + yield projection — [`9380725`](https://github.com/tamerrarda/Lumora/commit/9380725)

**Next phase — planned (next milestone):**

- Multi-asset payroll (EURC and other SEP-41 assets alongside USDC)
- Role-based access control for employer organization accounts
- CSV bulk-import to create many streams in one transaction
- Selectable treasury yield strategies + exportable payroll/audit event log
- Mobile push notifications when funds are claimable, and dark mode

---

## Practical Files

- **[QUICKSTART.md](QUICKSTART.md)** — run in 10 minutes (setup, deploy, USDC smoke test, demo seed)
- **[GLOSSARY.md](GLOSSARY.md)** — single source of definitions for all terms

---

