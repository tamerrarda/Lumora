"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useWallet } from "@/lib/wallet";
import { readVaultState } from "@/lib/vault";
import { readUsdcBalance } from "@/lib/stellar";
import { formatUsdc } from "@/lib/format";
import { DepositForm, WithdrawForm, FundPayrollForm } from "@/components/VaultForms";
import { Button, EmptyState, PageHeader, Stat } from "@/components/ui";

export default function VaultPage() {
  const { address, connect } = useWallet();
  const qc = useQueryClient();

  const vault = useQuery({
    queryKey: ["vault", address],
    queryFn: () => readVaultState(address!),
    enabled: !!address,
    refetchInterval: 10_000,
  });
  const wallet = useQuery({
    queryKey: ["usdc-balance", address],
    queryFn: () => readUsdcBalance(address!),
    enabled: !!address,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["vault", address] });
    qc.invalidateQueries({ queryKey: ["usdc-balance", address] });
  };

  return (
    <div className="space-y-7">
      <PageHeader
        title="Treasury & Yield"
        subtitle="Deposit idle USDC, accrue yield, fund payroll"
      />

      <p className="max-w-2xl text-sm leading-relaxed text-muted">
        Deposit idle USDC not reserved for payroll into the treasury; a separate yield
        strategy contract puts it to work. Payroll reserves and yield-seeking capital are
        held in <em>two separate contracts</em> (reserve safety).
      </p>

      {!address ? (
        <EmptyState
          title="Connect to use the treasury"
          action={<Button size="lg" variant="secondary" onClick={connect}>Connect Wallet</Button>}
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Total Treasury" accent value={vault.data ? formatUsdc(vault.data.totalBalance, 2) : "…"} />
            <Stat label="Principal" value={vault.data ? formatUsdc(vault.data.principal, 2) : "…"} />
            <Stat label="Accrued Yield" accent value={vault.data ? `+${formatUsdc(vault.data.pendingYield, 7)}` : "…"} />
            <Stat
              label="APY"
              value={vault.data ? `${(vault.data.annualRateBps / 100).toFixed(2)}%` : "…"}
              sub={`wallet: ${wallet.data !== undefined ? formatUsdc(wallet.data, 2) : "…"} USDC`}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <DepositForm onDone={refresh} />
            <WithdrawForm onDone={refresh} />
            <FundPayrollForm onDone={refresh} />
          </div>
        </>
      )}
    </div>
  );
}
