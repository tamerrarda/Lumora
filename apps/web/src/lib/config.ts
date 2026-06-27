// Lumora frontend config — read from environment variables (see .env.example)
// Contract addresses are filled in after the Phase 1+ deploy.

export const config = {
  network: process.env.NEXT_PUBLIC_NETWORK ?? "testnet",
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL ?? "https://soroban-testnet.stellar.org",
  horizonUrl:
    process.env.NEXT_PUBLIC_HORIZON_URL ?? "https://horizon-testnet.stellar.org",
  networkPassphrase:
    process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE ?? "Test SDF Network ; September 2015",
  usdc: {
    sac:
      process.env.NEXT_PUBLIC_USDC_SAC_ADDRESS ??
      "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA",
    // Circle testnet USDC (classic asset) — for trustline checks.
    issuer:
      process.env.NEXT_PUBLIC_USDC_ISSUER ??
      "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
    code: "USDC",
    decimals: 7,
  },
  faucetUrl: "https://faucet.circle.com",
  // Optional: if set, event history/analytics are read from the indexer (RPC fallback).
  indexerUrl: process.env.NEXT_PUBLIC_INDEXER_URL ?? "",
  contracts: {
    // Testnet deploy (Phase 1) — public address, used as fallback when env is unset.
    payrollStream:
      process.env.NEXT_PUBLIC_PAYROLL_STREAM_ID ??
      "CCAY3UKTW6G4XUXLTWVOUYPHDIR2KOYDWELJ72PZGFBTRGRKC6NSH6OD",
    payrollTreasury:
      process.env.NEXT_PUBLIC_PAYROLL_TREASURY_ID ??
      "CD5ERANICKKDMD3G7ULGMV5AWXAOMK4AYTIENGZNUTZEMSBIEVVJTFRY",
    yieldStrategy:
      process.env.NEXT_PUBLIC_YIELD_STRATEGY_ID ??
      "CDYPGBBKXLO7MTTSTRU2K52LOHM7HMOISFABCIA7Y4SYSXQWHIVH22QY",
  },
} as const;

export type Config = typeof config;
