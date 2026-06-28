"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useWallet } from "@/lib/wallet";
import { discoverEmployerStreams, readEmployerBalance } from "@/lib/streams";
import { readUsdcBalance } from "@/lib/stellar";
import { formatUsdc } from "@/lib/format";
import { FundForm } from "@/components/FundForm";
import { CreateStreamForm } from "@/components/CreateStreamForm";
import { StreamTable } from "@/components/StreamTable";
import { ActivityFeed } from "@/components/ActivityFeed";
import { Button, EmptyState, PageHeader, Stat, Spinner } from "@/components/ui";

export default function PayrollPage() {
  const { address, connect } = useWallet();
  const qc = useQueryClient();

  const balance = useQuery({
    queryKey: ["employer-balance", address],
    queryFn: () => readEmployerBalance(address!),
    enabled: !!address,
    refetchInterval: 10_000,
  });
  const wallet = useQuery({
    queryKey: ["usdc-balance", address],
    queryFn: () => readUsdcBalance(address!),
    enabled: !!address,
    refetchInterval: 10_000,
  });
  const streams = useQuery({
    queryKey: ["employer-streams", address],
    queryFn: () => discoverEmployerStreams(address!),
    enabled: !!address,
    refetchInterval: 10_000,
  });

  const refresh = () => {
    const keys = [
      ["employer-balance", address],
      ["usdc-balance", address],
      ["employer-streams", address],
    ];
    const run = () => keys.forEach((queryKey) => qc.invalidateQueries({ queryKey }));
    run();
    // RPC reflects the new ledger state a few seconds after signAndSend resolves;
    // re-pull so the table + balance show the just-created stream without a manual refresh.
    window.setTimeout(run, 4000);
    window.setTimeout(run, 9000);
  };

  if (!address) {
    return (
      <EmptyState
        title="Employer panel"
        description="Connect your wallet to manage payroll."
        action={<Button size="lg" variant="secondary" onClick={connect}>Connect Wallet</Button>}
      />
    );
  }

  return (
    <div className="space-y-7">
      <PageHeader title="Payroll" subtitle="Fund · create salary streams · manage" />

      <div className="grid gap-4 sm:grid-cols-2">
        <Stat
          label="Wallet USDC"
          value={wallet.data !== undefined ? formatUsdc(wallet.data, 2) : "…"}
        />
        <Stat
          label="Contract balance"
          accent
          value={balance.data !== undefined ? formatUsdc(balance.data, 2) : "…"}
          sub="stream reserves are locked from here"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <FundForm onFunded={refresh} />
        <CreateStreamForm available={balance.data ?? 0n} onCreated={refresh} />
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Salary Streams</h2>
        {streams.isLoading ? (
          <div className="flex items-center gap-2 py-8 text-muted">
            <Spinner className="h-4 w-4" /> Loading…
          </div>
        ) : streams.isError ? (
          <p className="py-8 text-danger">Couldn't load streams.</p>
        ) : (
          <StreamTable streams={streams.data ?? []} onChanged={refresh} />
        )}
      </div>

      <ActivityFeed title="Payroll Activity" />
    </div>
  );
}
