// Employer analytics: chain state (streams) + event history → derived metrics.
import { discoverEmployerStreams } from "./streams";
import { fetchStreamEvents } from "./events";
import { rateToMonthly } from "./format";

export interface SeriesPoint {
  t: number; // unix seconds
  v: number; // cumulative value (USDC, float)
}

export interface EmployerAnalytics {
  totalFunded: bigint;
  totalWithdrawn: bigint;
  activeStreams: number;
  monthlyCommitment: bigint; // total monthly commitment of active streams
  reserved: bigint; // reserve locked in active streams
  spendSeries: SeriesPoint[]; // cumulative withdrawal (actual)
  fundSeries: SeriesPoint[]; // cumulative funding (actual)
}

import { unitsToNumber } from "./format";

export async function deriveEmployerAnalytics(
  employer: string
): Promise<EmployerAnalytics> {
  const [streams, events] = await Promise.all([
    discoverEmployerStreams(employer),
    fetchStreamEvents(),
  ]);

  const streamIds = new Set(streams.map((s) => s.id.toString()));
  const nowSec = Math.floor(Date.now() / 1000);

  let monthlyCommitment = 0n;
  let reserved = 0n;
  let activeStreams = 0;
  for (const { stream: s } of streams) {
    const ended = nowSec >= Number(s.end_time);
    if (!s.canceled && !s.paused && !ended) {
      activeStreams++;
      monthlyCommitment += rateToMonthly(s.rate_per_second);
    }
    if (!s.canceled) reserved += s.reserved_amount;
  }

  // Events arrive newest→oldest; reverse for chronological order.
  const chrono = [...events].reverse();

  let totalFunded = 0n;
  let totalWithdrawn = 0n;
  const fundSeries: SeriesPoint[] = [];
  const spendSeries: SeriesPoint[] = [];

  for (const e of chrono) {
    const t = Math.floor(Date.parse(e.at) / 1000) || nowSec;
    if (
      e.kind === "funded" &&
      e.topics[1] === employer &&
      typeof e.value === "bigint"
    ) {
      totalFunded += e.value;
      fundSeries.push({ t, v: unitsToNumber(totalFunded) });
    }
    if (
      e.kind === "withdraw" &&
      typeof e.topics[1] === "bigint" &&
      streamIds.has(e.topics[1].toString()) &&
      typeof e.value === "bigint"
    ) {
      totalWithdrawn += e.value;
      spendSeries.push({ t, v: unitsToNumber(totalWithdrawn) });
    }
  }

  return {
    totalFunded,
    totalWithdrawn,
    activeStreams,
    monthlyCommitment,
    reserved,
    spendSeries,
    fundSeries,
  };
}
