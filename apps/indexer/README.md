# Lumora Indexer

Lightweight indexer service: Stellar RPC `getEvents` → **SQLite** → **REST API**.

The frontend works without this service too (directly via RPC `getEvents`). When the indexer is running:
- **Fast** history/analytics (no chain scan on every query),
- **Unlimited retention** of history (events outside the RPC window stay in the DB),
- Server-side **analytics** endpoints.

## Architecture

```
Stellar RPC getEvents (poller, persistent cursor)
        │  decode (ScVal → JSON, bigint tagged)
        ▼
   SQLite (better-sqlite3)  ── events + meta(cursor)
        │
        ▼
   REST API (built-in http)  ──►  Frontend / reports
```

Indexed contracts: `payroll_stream` + `payroll_treasury` (from config).

## Running

```bash
cd apps/indexer
npm install
npm start          # poller + API (default :4000)
# or development:
npm run dev
```

Environment variables (all optional — testnet fallbacks are public):

| Variable | Default |
|----------|-----------|
| `RPC_URL` | `https://soroban-testnet.stellar.org` |
| `PAYROLL_STREAM_ID` | deployed stream |
| `PAYROLL_TREASURY_ID` | deployed treasury |
| `DB_PATH` | `./lumora-index.db` |
| `PORT` | `4000` |
| `POLL_INTERVAL_MS` | `5000` |
| `BACKFILL_LEDGERS` | `17000` (how many ledgers to start back from on first run) |

## REST API

| Endpoint | Description |
|----------|----------|
| `GET /health` | status: event count, last ledger, contracts |
| `GET /events?contract=&kind=&address=&limit=` | filtered event list (new→old) |
| `GET /analytics/employer/:G…` | total funding/withdrawal, stream counts, cumulative series |
| `GET /analytics/employee/:G…` | total withdrawals + withdrawal history (with txHash) |

Amounts are returned with the `{"__bigint__":"..."}` tag (i128 raw units, 7 decimals). The frontend converts these to real `bigint`.

### Example

```bash
curl localhost:4000/health
curl "localhost:4000/events?kind=withdraw&limit=10"
curl localhost:4000/analytics/employer/GD56OVJY...DAQQ
```

## Connecting to the frontend

Add the following to the `apps/web` environment:

```
NEXT_PUBLIC_INDEXER_URL=http://localhost:4000
```

When set, `ActivityFeed`, withdrawal history, and `/analytics` read from the indexer; if it is unreachable, it automatically falls back to RPC.

## Note (production)

For demo/testnet, a single-file SQLite + CORS `*` is enough. In production, consider: Postgres, authentication, rate limiting, and cursor locking for multiple replicas.
