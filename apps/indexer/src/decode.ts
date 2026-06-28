// ScVal decode + JSON-safe serialization (bigint → {"__bigint__": "..."}).
import * as StellarSdk from "@stellar/stellar-sdk";

export const BIGINT_TAG = "__bigint__";

/** Make a native JS value JSON-safe (tag bigints). */
export function toJsonSafe(v: unknown): unknown {
  if (typeof v === "bigint") return { [BIGINT_TAG]: v.toString() };
  if (Array.isArray(v)) return v.map(toJsonSafe);
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v)) out[k] = toJsonSafe(val);
    return out;
  }
  return v;
}

export function decodeScVal(v: StellarSdk.xdr.ScVal): unknown {
  return toJsonSafe(StellarSdk.scValToNative(v));
}

/** Check whether tagged values contain a specific address (G…/C…). */
export function containsAddress(value: unknown, address: string): boolean {
  return JSON.stringify(value).includes(address);
}
