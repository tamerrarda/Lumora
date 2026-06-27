"use client";

import { useQuery } from "@tanstack/react-query";
import { useWallet } from "@/lib/wallet";
import { discoverEmployeeStreams } from "@/lib/streams";
import { EarningsCard } from "@/components/EarningsCard";
import { ActivityFeed } from "@/components/ActivityFeed";
import { TrustlineNotice } from "@/components/TrustlineNotice";
import { Button, EmptyState, PageHeader, Spinner } from "@/components/ui";

export default function EarningsPage() {
  const { address, connect } = useWallet();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["employee-streams", address],
    queryFn: () => discoverEmployeeStreams(address!),
    enabled: !!address,
    refetchInterval: 15_000,
  });

  if (!address) {
    return (
      <EmptyState
        title="Connect to see your earnings"
        description="Connect your wallet and we'll find your salary streams automatically. No stream ID needed."
        action={<Button size="lg" variant="secondary" onClick={connect}>Connect Wallet</Button>}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-3 py-20 text-muted">
        <Spinner className="h-5 w-5" /> Searching for your salary streams…
      </div>
    );
  }

  if (isError) {
    return (
      <EmptyState
        title="Couldn't load streams"
        description={error instanceof Error ? error.message : "Unknown error"}
        action={<Button variant="subtle" onClick={() => refetch()}>Try again</Button>}
      />
    );
  }

  if (!data || data.length === 0) {
    return (
      <EmptyState
        title="No active salary streams for you"
        description={`Your employer needs to open a stream to this wallet (${address.slice(0, 6)}…).`}
      />
    );
  }

  return (
    <div className="space-y-7">
      <PageHeader
        title="My Earnings"
        subtitle={`${data.length} active stream(s) · values increase every second`}
      />

      <TrustlineNotice />

      <div className="grid gap-6 sm:grid-cols-2">
        {data.map((ds) => (
          <EarningsCard key={ds.id.toString()} ds={ds} onWithdrawn={() => refetch()} />
        ))}
      </div>

      <ActivityFeed
        title="My Withdrawal History"
        filter={(e) => e.kind === "withdraw" && e.topics[2] === address}
        emptyText="You haven't made any withdrawals yet."
      />
    </div>
  );
}
