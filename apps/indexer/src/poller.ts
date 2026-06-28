// getEvents poller: advances from the cursor, decodes, writes to SQLite.
import * as StellarSdk from "@stellar/stellar-sdk";
import { config, contractIds } from "./config.js";
import { decodeScVal } from "./decode.js";
import { insertBatch, getCursor, setCursor, stats } from "./db.js";

const rpc = new StellarSdk.rpc.Server(config.rpcUrl, {
  allowHttp: config.rpcUrl.startsWith("http://"),
});

async function startLedgerFromBackfill(): Promise<number> {
  const latest = await rpc.getLatestLedger();
  return Math.max(1, latest.sequence - config.backfillLedgers);
}

async function pollOnce(): Promise<number> {
  const cursor = getCursor();
  const baseFilter = {
    type: "contract" as const,
    contractIds,
  };

  let total = 0;
  let nextCursor = cursor;
  // Fetch at most a few pages per poll (the rest on the next tick).
  for (let page = 0; page < 5; page++) {
    const req = nextCursor
      ? { cursor: nextCursor, filters: [baseFilter], limit: 200 }
      : { startLedger: await startLedgerFromBackfill(), filters: [baseFilter], limit: 200 };

    let res;
    try {
      res = await rpc.getEvents(req);
    } catch (e) {
      // If the cursor fell outside retention, reset → continue from backfill.
      if (nextCursor) {
        console.warn("[poller] cursor rejected, falling back to backfill:", String(e).slice(0, 80));
        nextCursor = null;
        continue;
      }
      throw e;
    }

    if (res.events.length > 0) {
      const rows = res.events.map((e) => ({
        id: e.id,
        contract: e.contractId?.toString() ?? "",
        kind: String(StellarSdk.scValToNative(e.topic[0])),
        ledger: e.ledger,
        ts: e.ledgerClosedAt,
        tx_hash: (e as { txHash?: string }).txHash ?? null,
        topics: e.topic.map(decodeScVal),
        value: decodeScVal(e.value),
      }));
      total += insertBatch(rows);
    }

    if (res.cursor) {
      nextCursor = res.cursor;
      setCursor(res.cursor);
    }
    if (res.events.length < 200) break; // if the page isn't full, we're done
  }
  return total;
}

export async function runPoller(): Promise<void> {
  console.log(`[poller] started · contracts: ${contractIds.join(", ")}`);
  // Infinite loop; on errors, waits and retries.
  for (;;) {
    try {
      const added = await pollOnce();
      const s = stats();
      if (added > 0) {
        console.log(`[poller] +${added} new events · total ${s.count} · last ledger ${s.maxLedger}`);
      }
    } catch (e) {
      console.error("[poller] error:", String(e).slice(0, 160));
    }
    await new Promise((r) => setTimeout(r, config.pollIntervalMs));
  }
}
