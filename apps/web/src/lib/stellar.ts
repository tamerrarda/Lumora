// Low-level Stellar RPC access (for reads not covered by the binding).
import * as StellarSdk from "@stellar/stellar-sdk";
import { config } from "./config";

export const rpc = new StellarSdk.rpc.Server(config.rpcUrl, {
  allowHttp: config.rpcUrl.startsWith("http://"),
});

/** Read an address's balance via the USDC SAC (raw i128 units). */
export async function readUsdcBalance(address: string): Promise<bigint> {
  let account: StellarSdk.Account;
  try {
    account = await rpc.getAccount(address);
  } catch {
    return 0n; // account not funded
  }

  const contract = new StellarSdk.Contract(config.usdc.sac);
  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: config.networkPassphrase,
  })
    .addOperation(
      contract.call("balance", StellarSdk.Address.fromString(address).toScVal())
    )
    .setTimeout(30)
    .build();

  const sim = await rpc.simulateTransaction(tx);
  if (StellarSdk.rpc.Api.isSimulationError(sim) || !sim.result) return 0n;
  return StellarSdk.scValToNative(sim.result.retval) as bigint;
}

export interface TrustlineStatus {
  funded: boolean; // does the account exist on chain
  hasTrustline: boolean; // is the USDC trustline open
}

/** Read an account's funded + USDC trustline status from Horizon. */
export async function checkUsdcTrustline(
  address: string
): Promise<TrustlineStatus> {
  try {
    const res = await fetch(`${config.horizonUrl}/accounts/${address}`);
    if (res.status === 404) return { funded: false, hasTrustline: false };
    if (!res.ok) return { funded: true, hasTrustline: true }; // uncertain → don't block
    const acc = (await res.json()) as {
      balances?: { asset_code?: string; asset_issuer?: string }[];
    };
    const hasTrustline = (acc.balances ?? []).some(
      (b) =>
        b.asset_code === config.usdc.code &&
        b.asset_issuer === config.usdc.issuer
    );
    return { funded: true, hasTrustline };
  } catch {
    return { funded: true, hasTrustline: true }; // network error → don't block
  }
}
