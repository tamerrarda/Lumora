"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useWallet } from "@/lib/wallet";
import { streamClient } from "@/lib/contracts";
import { type DiscoveredStream, readClaimable } from "@/lib/streams";
import {
  unitsToNumber,
  numberToUnits,
  formatNumber,
  formatUsdc,
  explorerTx,
} from "@/lib/format";
import { Card, Button, Badge, Input, StatusDot } from "@/components/ui";

interface Props {
  ds: DiscoveredStream;
  onWithdrawn: () => void;
}

export function EarningsCard({ ds, onWithdrawn }: Props) {
  const { address, signTransaction } = useWallet();
  const s = ds.stream;

  const rate = unitsToNumber(s.rate_per_second);
  const withdrawn = unitsToNumber(s.withdrawn);
  const cap = unitsToNumber(s.max_total_amount);
  const capRemaining = cap - withdrawn;
  const monthly = rate * 60 * 60 * 24 * 30;

  const baseRef = useRef<{ value: number; ts: number }>({ value: 0, ts: Date.now() / 1000 });
  // After a withdrawal, ignore chain reads until this time (so RPC lag doesn't override the optimistic drop).
  const suppressUntil = useRef(0);
  const [live, setLive] = useState(0);
  const [synced, setSynced] = useState(false);
  const [amountInput, setAmountInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const resync = useCallback(async () => {
    if (!address) return;
    if (Date.now() < suppressUntil.current) return;
    try {
      const raw = await readClaimable(ds.id, address);
      baseRef.current = { value: unitsToNumber(raw), ts: Date.now() / 1000 };
      setSynced(true);
    } catch {
      /* keep the last value */
    }
  }, [address, ds.id]);

  // Periodic chain sync (10 s)
  useEffect(() => {
    resync();
    const t = setInterval(resync, 10_000);
    return () => clearInterval(t);
  }, [resync]);

  // Live interpolation (250 ms)
  useEffect(() => {
    const tick = () => {
      const { value, ts } = baseRef.current;
      const nowSec = Date.now() / 1000;
      const cappedNow = Math.min(nowSec, Number(s.end_time));
      const elapsed = s.paused ? 0 : Math.max(0, cappedNow - ts);
      setLive(Math.min(value + rate * elapsed, capRemaining));
    };
    tick();
    const t = setInterval(tick, 250);
    return () => clearInterval(t);
  }, [rate, capRemaining, s.paused, s.end_time]);

  const fillMax = () => setAmountInput(live.toFixed(7));

  const withdraw = async () => {
    if (!address) return;
    let enteredRaw: bigint;
    try {
      enteredRaw = numberToUnits(amountInput);
    } catch {
      setErr("Invalid amount.");
      return;
    }
    if (enteredRaw <= 0n) {
      setErr("Enter an amount to withdraw (or Max).");
      return;
    }

    setBusy(true);
    setErr(null);
    setTxHash(null);
    try {
      const fresh = await readClaimable(ds.id, address);
      if (fresh <= 0n) {
        setErr("Nothing available to withdraw right now.");
        return;
      }
      // Clamp the entered amount to claimable (the chain amount is the cap).
      const toWithdraw = enteredRaw > fresh ? fresh : enteredRaw;

      const c = streamClient({ publicKey: address, signTransaction });
      const tx = await c.withdraw({ stream_id: ds.id, amount: toWithdraw });
      const sent = await tx.signAndSend();
      setTxHash(sent.sendTransactionResponse?.hash ?? null);

      // Optimistic drop: immediately decrease by the known withdrawal amount + briefly suppress resync.
      suppressUntil.current = Date.now() + 8000;
      baseRef.current = {
        value: Math.max(0, unitsToNumber(fresh - toWithdraw)),
        ts: Date.now() / 1000,
      };
      setAmountInput("");
      onWithdrawn();

      // Delayed chain reconciliation (settle to the real value once state finalizes).
      window.setTimeout(() => {
        suppressUntil.current = 0;
        resync();
      }, 8500);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const progress = cap > 0 ? Math.min(100, (withdrawn / cap) * 100) : 0;

  return (
    <Card glow={!s.paused} className="overflow-hidden p-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted">
            Stream #{ds.id.toString()}
          </div>
          <div className="mt-0.5 text-sm text-muted">≈ {formatNumber(monthly, 2)} USDC / mo</div>
        </div>
        {s.paused ? (
          <Badge tone="amber">
            <StatusDot tone="amber" /> Paused
          </Badge>
        ) : (
          <Badge tone="accent">
            <StatusDot tone="accent" pulse /> Active
          </Badge>
        )}
      </div>

      {/* Hero counter */}
      <div className="mt-6">
        <div className="text-xs uppercase tracking-wide text-muted">Available now</div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="font-mono text-3xl font-bold tnum text-accent sm:text-4xl md:text-5xl">
            {synced ? formatNumber(live, 7) : "—"}
          </span>
          <span className="text-sm font-medium text-muted">USDC</span>
        </div>
      </div>

      {/* Progress: withdrawn / cap */}
      <div className="mt-6">
        <div className="mb-1.5 flex justify-between text-xs text-muted">
          <span>Withdrawn {formatNumber(withdrawn, 2)}</span>
          <span>Cap {formatNumber(cap, 2)}</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-surface">
          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Withdrawal amount selection */}
      <div className="mt-6 space-y-2">
        <div className="flex items-center justify-between text-xs text-muted">
          <span>Amount to withdraw (USDC)</span>
          <button
            type="button"
            onClick={fillMax}
            disabled={!synced}
            className="font-medium text-accent hover:underline disabled:opacity-50"
          >
            Max: {synced ? formatNumber(live, 4) : "—"}
          </button>
        </div>
        <Input
          inputMode="decimal"
          placeholder="0.0000000"
          value={amountInput}
          onChange={(e) => setAmountInput(e.target.value.replace(/[^0-9.]/g, ""))}
          disabled={busy}
        />
      </div>

      <Button full size="lg" className="mt-3" loading={busy} disabled={!synced} onClick={withdraw}>
        {busy ? "Processing…" : "Claim Salary"}
      </Button>

      {txHash && (
        <a
          href={explorerTx(txHash)}
          target="_blank"
          rel="noreferrer"
          className="mt-3 block text-center text-sm text-accent hover:underline"
        >
          ✓ Withdrawal successful — view transaction ↗
        </a>
      )}
      {err && <p className="mt-3 text-center text-sm text-danger">{err}</p>}
    </Card>
  );
}
