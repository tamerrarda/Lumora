// Activity/history reads based on Stellar RPC getEvents.
// Topic names from the contract: created/withdraw/funded/paused/resumed/canceled/settled/rate_upd/mgr_upd.
import * as StellarSdk from "@stellar/stellar-sdk";
import { rpc } from "./stellar";
import { config } from "./config";

export interface ActivityEvent {
  id: string;
  kind: string; // topic[0] symbol
  ledger: number;
  at: string; // ledgerClosedAt (ISO)
  txHash: string;
  topics: unknown[]; // decoded (kind included)
  value: unknown; // decoded data
}

const decode = (v: StellarSdk.xdr.ScVal): unknown => StellarSdk.scValToNative(v);

// Convert indexer {"__bigint__":"..."} tags into real bigints (same shape as via RPC).
function reviveBigints(v: unknown): unknown {
  if (v && typeof v === "object") {
    const obj = v as Record<string, unknown>;
    if ("__bigint__" in obj) return BigInt(obj.__bigint__ as string);
    if (Array.isArray(v)) return v.map(reviveBigints);
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(obj)) out[k] = reviveBigints(val);
    return out;
  }
  return v;
}

/** If an indexer exists, read from it (fast, unlimited retention); otherwise fall back to RPC. */
async function fetchFromIndexer(): Promise<ActivityEvent[] | null> {
  if (!config.indexerUrl) return null;
  try {
    const res = await fetch(
      `${config.indexerUrl}/events?contract=${config.contracts.payrollStream}&limit=500`
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as {
      id: string;
      kind: string;
      ledger: number;
      ts: string;
      tx_hash: string | null;
      topics: unknown[];
      value: unknown;
    }[];
    return rows.map((r) => ({
      id: r.id,
      kind: r.kind,
      ledger: r.ledger,
      at: r.ts,
      txHash: r.tx_hash ?? "",
      topics: reviveBigints(r.topics) as unknown[],
      value: reviveBigints(r.value),
    }));
  } catch {
    return null; // network error → fall back to RPC
  }
}

/** All events of the payroll_stream contract from the last N ledgers (newest→oldest). */
export async function fetchStreamEvents(): Promise<ActivityEvent[]> {
  const indexed = await fetchFromIndexer();
  if (indexed) return indexed;

  const latest = await rpc.getLatestLedger();
  // Cover the full RPC retention (~7 days / ~120k ledgers on testnet). Start as wide
  // as retention allows and narrow on error (getEvents rejects an out-of-range start).
  const windows = [120_000, 90_000, 60_000, 30_000, 17_000, 9_000, 4_000, 1_500];
  let startLedger = 0;
  for (const w of windows) {
    startLedger = Math.max(1, latest.sequence - w);
    try {
      await rpc.getEvents({
        startLedger,
        filters: [
          { type: "contract", contractIds: [config.contracts.payrollStream] },
        ],
        limit: 1,
      });
      break; // this window was accepted
    } catch {
      startLedger = 0; // try the next (narrower) window
    }
  }
  if (!startLedger) return [];

  const out: ActivityEvent[] = [];
  let cursor: string | undefined;
  // getEvents scans only a bounded ledger chunk per call and returns a cursor even
  // for an EMPTY chunk. So we must keep paging by cursor (NOT stop on an empty page),
  // otherwise events past the first chunk are missed. The try/catch ends the loop
  // cleanly when the cursor walks past the retention tip.
  for (let page = 0; page < 40; page++) {
    let res;
    try {
      res = await rpc.getEvents({
        ...(cursor ? { cursor } : { startLedger }),
        filters: [
          { type: "contract", contractIds: [config.contracts.payrollStream] },
        ],
        limit: 100,
      });
    } catch {
      break; // cursor ran past the ledger tip — done
    }
    for (const e of res.events) {
      out.push({
        id: e.id,
        kind: String(decode(e.topic[0])),
        ledger: e.ledger,
        at: e.ledgerClosedAt,
        txHash: (e as { txHash?: string }).txHash ?? "",
        topics: e.topic.map(decode),
        value: decode(e.value),
      });
    }
    if (!res.cursor) break;
    cursor = res.cursor;
  }
  // newest on top
  return out.reverse();
}

export const KIND_LABEL: Record<string, string> = {
  created: "Stream created",
  withdraw: "Withdrawal",
  funded: "Balance funded",
  paused: "Paused",
  resumed: "Resumed",
  canceled: "Canceled",
  settled: "Settled",
  rate_upd: "Salary updated",
  mgr_upd: "Manager updated",
};
