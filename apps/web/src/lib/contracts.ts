// Binding Client factories (auto-generated bindings).
import { Client as StreamClientImpl, type Stream } from "@/bindings/payroll_stream/src";
import {
  Client as TreasuryClientImpl,
  type EmployerVault,
} from "@/bindings/payroll_treasury/src";
import { config } from "./config";

export type { Stream, EmployerVault };

type Signer = (
  xdr: string,
  opts?: { networkPassphrase?: string; address?: string }
) => Promise<{ signedTxXdr: string; signerAddress?: string }>;

export interface ClientCtx {
  publicKey?: string;
  signTransaction?: Signer;
}

// Common client options. `address` is intentional: it explicitly tells the
// wallet WHICH account to sign with. If omitted, Freighter signs with the
// currently active account; if that doesn't match the transaction's source
// account, it yields txBadAuth. Even though `address` isn't listed in the SDK's
// ClientOptions type, at runtime it propagates to every method
// (assembled_transaction reads `options.address`) — hence the cast.
type ClientOptions = ConstructorParameters<typeof StreamClientImpl>[0];

function baseOptions(contractId: string, ctx?: ClientCtx): ClientOptions {
  return {
    contractId,
    networkPassphrase: config.networkPassphrase,
    rpcUrl: config.rpcUrl,
    allowHttp: config.rpcUrl.startsWith("http://"),
    publicKey: ctx?.publicKey,
    address: ctx?.publicKey,
    signTransaction: ctx?.signTransaction,
  } as ClientOptions;
}

/** payroll_stream — read-only (simulation) or signed transaction. */
export function streamClient(ctx?: ClientCtx): StreamClientImpl {
  return new StreamClientImpl(baseOptions(config.contracts.payrollStream, ctx));
}

/** payroll_treasury — read-only (simulation) or signed transaction. */
export function treasuryClient(ctx?: ClientCtx): TreasuryClientImpl {
  return new TreasuryClientImpl(baseOptions(config.contracts.payrollTreasury, ctx));
}
