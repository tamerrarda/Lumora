// Indexer configuration (from environment variables; testnet fallbacks are public).
export const config = {
  rpcUrl: process.env.RPC_URL ?? "https://soroban-testnet.stellar.org",
  contracts: {
    payrollStream:
      process.env.PAYROLL_STREAM_ID ??
      "CCAY3UKTW6G4XUXLTWVOUYPHDIR2KOYDWELJ72PZGFBTRGRKC6NSH6OD",
    payrollTreasury:
      process.env.PAYROLL_TREASURY_ID ??
      "CD5ERANICKKDMD3G7ULGMV5AWXAOMK4AYTIENGZNUTZEMSBIEVVJTFRY",
  },
  dbPath: process.env.DB_PATH ?? "./lumora-index.db",
  port: Number(process.env.PORT ?? 4000),
  pollIntervalMs: Number(process.env.POLL_INTERVAL_MS ?? 5000),
  // How many ledgers to start back from on first run (when there is no cursor).
  backfillLedgers: Number(process.env.BACKFILL_LEDGERS ?? 17000),
};

export const contractIds = [
  config.contracts.payrollStream,
  config.contracts.payrollTreasury,
];
