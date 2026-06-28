// Analytics derived from stored events.
import { allEvents, type StoredEvent } from "./db.js";
import { BIGINT_TAG } from "./decode.js";
import { config } from "./config.js";

function asBig(v: unknown): bigint {
  if (v && typeof v === "object" && BIGINT_TAG in (v as Record<string, unknown>)) {
    return BigInt((v as Record<string, string>)[BIGINT_TAG]);
  }
  if (typeof v === "string") return BigInt(v);
  return 0n;
}
const tsec = (iso: string) => Math.floor(Date.parse(iso) / 1000) || 0;

interface Point {
  t: number;
  v: string;
}

export interface EmployerAnalytics {
  employer: string;
  totalFunded: string;
  payrollWithdrawn: string;
  streamsCreated: number;
  streamsCanceled: number;
  fundSeries: Point[];
  spendSeries: Point[];
}

export function employerAnalytics(employer: string): EmployerAnalytics {
  const ev = allEvents(); // chronological (ledger ASC)
  const stream = config.contracts.payrollStream;

  // stream_id → employer mapping (from created events)
  const streamEmployer = new Map<string, string>();
  for (const e of ev) {
    if (e.contract === stream && e.kind === "created") {
      const id = asBig((e.topics as unknown[])[1]).toString();
      streamEmployer.set(id, (e.topics as unknown[])[2] as string);
    }
  }

  let totalFunded = 0n;
  let payrollWithdrawn = 0n;
  let streamsCreated = 0;
  let streamsCanceled = 0;
  const fundSeries: Point[] = [];
  const spendSeries: Point[] = [];

  for (const e of ev) {
    if (e.contract !== stream) continue;
    const topics = e.topics as unknown[];
    if (e.kind === "created" && topics[2] === employer) streamsCreated++;
    if (e.kind === "canceled") {
      const id = asBig(topics[1]).toString();
      if (streamEmployer.get(id) === employer) streamsCanceled++;
    }
    if (e.kind === "funded" && topics[1] === employer) {
      totalFunded += asBig(e.value);
      fundSeries.push({ t: tsec(e.ts), v: totalFunded.toString() });
    }
    if (e.kind === "withdraw") {
      const id = asBig(topics[1]).toString();
      if (streamEmployer.get(id) === employer) {
        payrollWithdrawn += asBig(e.value);
        spendSeries.push({ t: tsec(e.ts), v: payrollWithdrawn.toString() });
      }
    }
  }

  return {
    employer,
    totalFunded: totalFunded.toString(),
    payrollWithdrawn: payrollWithdrawn.toString(),
    streamsCreated,
    streamsCanceled,
    fundSeries,
    spendSeries,
  };
}

export interface EmployeeAnalytics {
  employee: string;
  totalWithdrawn: string;
  withdrawals: { t: number; amount: string; streamId: string; txHash: string | null }[];
}

export function employeeAnalytics(employee: string): EmployeeAnalytics {
  const ev = allEvents();
  const stream = config.contracts.payrollStream;
  let total = 0n;
  const withdrawals: EmployeeAnalytics["withdrawals"] = [];
  for (const e of ev) {
    if (e.contract !== stream || e.kind !== "withdraw") continue;
    const topics = e.topics as unknown[];
    if (topics[2] !== employee) continue;
    const amount = asBig(e.value);
    total += amount;
    withdrawals.push({
      t: tsec(e.ts),
      amount: amount.toString(),
      streamId: asBig(topics[1]).toString(),
      txHash: e.tx_hash,
    });
  }
  withdrawals.reverse(); // newest first
  return { employee, totalWithdrawn: total.toString(), withdrawals };
}
