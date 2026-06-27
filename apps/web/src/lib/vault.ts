// payroll_treasury read layer (live on testnet; mock yield strategy).
import { treasuryClient } from "./contracts";

export interface VaultState {
  principal: bigint; // deposited principal
  pendingYield: bigint; // accrued (not yet withdrawn) yield
  totalBalance: bigint; // principal + pendingYield
  annualRateBps: number; // annual rate (bps)
}

const safe = async (p: Promise<{ result: bigint }>): Promise<bigint> => {
  try {
    return (await p).result;
  } catch {
    return 0n; // if vault doesn't exist / can't be read
  }
};

export async function readVaultState(employer: string): Promise<VaultState> {
  const c = treasuryClient({ publicKey: employer });
  const [totalBalance, pendingYield, rate] = await Promise.all([
    safe(c.total_balance({ employer })),
    safe(c.pending_yield({ employer })),
    c.annual_rate_bps().then((r) => r.result).catch(() => 0),
  ]);
  return {
    totalBalance,
    pendingYield,
    principal: totalBalance - pendingYield,
    annualRateBps: Number(rate),
  };
}
