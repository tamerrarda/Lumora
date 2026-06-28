"use client";

import { useMemo, useState } from "react";
import { useWallet } from "@/lib/wallet";
import { streamClient } from "@/lib/contracts";
import {
  numberToUnits,
  monthlyToRate,
  formatUsdc,
  isValidAddress,
} from "@/lib/format";
import { Card, Button, Input, Field } from "@/components/ui";

// "YYYY-MM-DD" → local midnight Unix seconds
function dateToTs(d: string): number {
  if (!d) return 0;
  const t = new Date(`${d}T00:00:00`).getTime();
  return Number.isFinite(t) ? Math.floor(t / 1000) : 0;
}

// +n days from today, in <input type="date"> format
function isoPlusDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const DAY = 86_400;

export function CreateStreamForm({
  available,
  onCreated,
}: {
  available: bigint;
  onCreated: () => void;
}) {
  const { address, signTransaction } = useWallet();
  const [employee, setEmployee] = useState("");
  const [monthly, setMonthly] = useState("");
  const [startDate, setStartDate] = useState(isoPlusDays(0));
  const [endDate, setEndDate] = useState(isoPlusDays(90));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const preview = useMemo(() => {
    const now = Math.floor(Date.now() / 1000);
    // If start is today, begin immediately; if a future date, the start of that day.
    const startTs = Math.max(now, dateToTs(startDate));
    // End: the end of the selected day (so salary flows through that day inclusive).
    const endTs = dateToTs(endDate) + DAY;
    const totalSeconds = BigInt(Math.max(0, endTs - startTs));

    const monthlyRaw = numberToUnits(monthly);
    const rate = monthlyToRate(monthlyRaw);
    const cap = rate * totalSeconds;
    const days = Number(totalSeconds) / DAY;
    return { rate, totalSeconds, cap, startTs, endTs, days };
  }, [monthly, startDate, endDate]);

  const insufficient = preview.cap > available;
  const validDates = preview.totalSeconds > 0n;
  const valid =
    isValidAddress(employee) &&
    preview.rate > 0n &&
    validDates &&
    !insufficient;

  const submit = async () => {
    if (!address || !valid) return;
    setBusy(true);
    setErr(null);
    setOk(false);
    try {
      const c = streamClient({ publicKey: address, signTransaction });
      const tx = await c.create_stream({
        employer: address,
        employee: employee.trim(),
        rate_per_second: preview.rate,
        start_time: BigInt(preview.startTs),
        end_time: BigInt(preview.endTs),
        max_total_amount: preview.cap,
      });
      await tx.signAndSend();
      setOk(true);
      setEmployee("");
      setMonthly("");
      onCreated();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-6">
      <h3 className="font-semibold">Create New Salary Stream</h3>
      <div className="mt-4 space-y-3">
        <Field
          label="Employee address (G…)"
          error={employee && !isValidAddress(employee) ? "Invalid Stellar address." : undefined}
        >
          <Input
            placeholder="GABC…"
            value={employee}
            onChange={(e) => setEmployee(e.target.value)}
          />
        </Field>
        <Field label="Monthly salary (USDC)">
          <Input
            inputMode="decimal"
            placeholder="3000"
            value={monthly}
            onChange={(e) => setMonthly(e.target.value)}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start date">
            <Input
              type="date"
              value={startDate}
              min={isoPlusDays(0)}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </Field>
          <Field
            label="End date"
            error={!validDates && endDate ? "End must be after start." : undefined}
          >
            <Input
              type="date"
              value={endDate}
              min={startDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </Field>
        </div>
      </div>

      {preview.rate > 0n && validDates && (
        <div className="mt-4 space-y-1.5 rounded-lg border border-line bg-surface/60 p-3 text-sm">
          <Row label="Duration" value={`${preview.days.toFixed(0)} days (≈ ${(preview.days / 30).toFixed(1)} mo)`} />
          <Row label="Per second" value={`${formatUsdc(preview.rate, 7)} USDC`} />
          <Row label="Reserve to lock (cap)" value={`${formatUsdc(preview.cap)} USDC`} />
          <Row label="Available balance" value={`${formatUsdc(available)} USDC`} />
        </div>
      )}

      {insufficient && (
        <p className="mt-2 text-sm text-amber">Insufficient balance — fund this much USDC first.</p>
      )}

      <Button full size="lg" className="mt-4" loading={busy} disabled={!valid} onClick={submit}>
        Start Stream
      </Button>

      {ok && <p className="mt-2 text-sm text-success">✓ Salary stream created.</p>}
      {err && <p className="mt-2 text-sm text-danger">{err}</p>}
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted">{label}</span>
      <span className="font-mono tnum">{value}</span>
    </div>
  );
}
