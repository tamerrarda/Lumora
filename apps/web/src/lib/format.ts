// USDC has 7 decimals (Stellar). All chain amounts are i128 = bigint (raw units).
import { config } from "./config";

export const USDC_DECIMALS = 7;
export const USDC_SCALE = 10n ** BigInt(USDC_DECIMALS);

/** raw bigint units → human-readable number (float, for display only). */
export function unitsToNumber(raw: bigint): number {
  return Number(raw) / Number(USDC_SCALE);
}

/** human-readable text ("12.5") → raw bigint units. */
export function numberToUnits(human: string): bigint {
  const trimmed = human.trim();
  if (!trimmed) return 0n;
  const neg = trimmed.startsWith("-");
  const [whole, frac = ""] = trimmed.replace("-", "").split(".");
  const fracPadded = (frac + "0".repeat(USDC_DECIMALS)).slice(0, USDC_DECIMALS);
  const raw = BigInt(whole || "0") * USDC_SCALE + BigInt(fracPadded || "0");
  return neg ? -raw : raw;
}

/** raw units → fixed-decimal USDC text like "12.5000". */
export function formatUsdc(raw: bigint, dp = 4): string {
  const n = unitsToNumber(raw);
  return n.toLocaleString("en-US", {
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  });
}

/** format a float value with fixed decimals (for the live counter). */
export function formatNumber(n: number, dp = 4): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  });
}

// Payroll time constant: month = 30 days (rate ↔ monthly salary conversion).
export const SECONDS_PER_MONTH = 30 * 24 * 60 * 60; // 2.592.000

/** Monthly salary (raw units) → rate per second (raw units, floor division). */
export function monthlyToRate(monthlyRaw: bigint): bigint {
  return monthlyRaw / BigInt(SECONDS_PER_MONTH);
}

/** Rate per second (raw) → monthly salary (raw units). */
export function rateToMonthly(rateRaw: bigint): bigint {
  return rateRaw * BigInt(SECONDS_PER_MONTH);
}

/** Stellar address (public key) format check. */
export function isValidAddress(a: string): boolean {
  return /^G[A-Z2-7]{55}$/.test(a.trim());
}

export function shortAddr(a: string, n = 4): string {
  if (!a) return "";
  return `${a.slice(0, n)}…${a.slice(-n)}`;
}

const EXPLORER =
  config.network === "mainnet"
    ? "https://stellar.expert/explorer/public"
    : "https://stellar.expert/explorer/testnet";

export function explorerTx(hash: string): string {
  return `${EXPLORER}/tx/${hash}`;
}

export function explorerContract(id: string): string {
  return `${EXPLORER}/contract/${id}`;
}
