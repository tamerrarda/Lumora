"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWallet } from "@/lib/wallet";
import { deriveEmployerAnalytics, type SeriesPoint } from "@/lib/analytics";
import { LineChart } from "@/components/LineChart";
import { formatUsdc, unitsToNumber } from "@/lib/format";
import { Badge, Card, EmptyState, PageHeader, Spinner, Stat } from "@/components/ui";

export default function AnalyticsPage() {
  const { address, connect } = useWallet();

  const { data, isPending, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["analytics", address],
    queryFn: () => deriveEmployerAnalytics(address!),
    enabled: !!address,
    staleTime: 15_000,
    retry: 2,
  });

  const yieldProjection = useMemo<SeriesPoint[]>(() => {
    if (!data) return [];
    const base = unitsToNumber(data.reserved);
    const apy = 0.05;
    return Array.from({ length: 13 }, (_, i) => ({ t: i, v: (base * apy * i) / 12 }));
  }, [data]);

  if (!address) {
    return (
      <EmptyState
        title="Analytics"
        description="Connect your wallet to see payroll analytics."
        action={<button type="button" className="box" onClick={connect}>Connect Wallet</button>}
      />
    );
  }

  if (isError) {
    return (
      <EmptyState
        title="Couldn't load analytics"
        description={
          error instanceof Error
            ? error.message
            : "The network didn't respond. Please try again."
        }
        action={
          <button type="button" className="box" onClick={() => refetch()}>
            Try again
          </button>
        }
      />
    );
  }

  if (isPending || !data) {
    return (
      <div className="flex items-center justify-center gap-3 py-20 text-muted">
        <Spinner className="h-5 w-5" />
        {isFetching ? "Computing analytics…" : "Preparing…"}
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Insights"
        title="Analytics"
        subtitle="Payroll spend and yield projection"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total Funded" value={formatUsdc(data.totalFunded, 2)} />
        <Stat label="Total Withdrawn" accent value={formatUsdc(data.totalWithdrawn, 2)} />
        <Stat label="Active Streams" value={String(data.activeStreams)} />
        <Stat label="Monthly Commitment" value={formatUsdc(data.monthlyCommitment, 2)} />
      </div>

      <Card className="p-6">
        <h3 className="mb-4 font-semibold">Payroll Spend (cumulative withdrawals)</h3>
        <LineChart data={data.spendSeries} color="#726a86" />
        <p className="mt-3 text-xs text-faint">
          Total USDC employees have withdrawn over time — from on-chain events (real).
        </p>
      </Card>

      <Card className="p-6">
        <div className="mb-4 flex items-center gap-3">
          <h3 className="font-semibold">Yield Projection (12 months)</h3>
          <Badge tone="yellow">SIMULATED · 5% APY</Badge>
        </div>
        <LineChart data={yieldProjection} color="#b48200" />
        <p className="mt-3 text-xs text-faint">
          Estimated 12-month accrual if the locked reserve ({formatUsdc(data.reserved, 2)} USDC)
          were deployed in a yield strategy. The real treasury isn&apos;t live yet (Phase 5).
        </p>
      </Card>
    </div>
  );
}
