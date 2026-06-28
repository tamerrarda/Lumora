"use client";

import { useState } from "react";
import { useWallet } from "@/lib/wallet";
import { streamClient } from "@/lib/contracts";
import type { DiscoveredStream } from "@/lib/streams";
import { formatUsdc, rateToMonthly, shortAddr } from "@/lib/format";
import { Card, Button, Badge } from "@/components/ui";

type Action = "pause" | "resume" | "cancel" | "settle";

function StatusBadge({ status }: { status: string }) {
  if (status === "Active") return <Badge tone="accent">Active</Badge>;
  if (status === "Paused") return <Badge tone="amber">Paused</Badge>;
  if (status === "Canceled") return <Badge tone="muted">Canceled</Badge>;
  return <Badge tone="neutral">{status}</Badge>;
}

function StreamRow({ ds, onChanged }: { ds: DiscoveredStream; onChanged: () => void }) {
  const { address, signTransaction } = useWallet();
  const s = ds.stream;
  const [busy, setBusy] = useState<Action | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const nowSec = Math.floor(Date.now() / 1000);
  const ended = nowSec >= Number(s.end_time);
  const status = s.canceled
    ? "Canceled"
    : s.paused
      ? "Paused"
      : ended
        ? "Ended"
        : "Active";

  const run = async (action: Action) => {
    if (!address) return;
    setBusy(action);
    setErr(null);
    try {
      const c = streamClient({ publicKey: address, signTransaction });
      const tx = await c[action]({ stream_id: ds.id });
      await tx.signAndSend();
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const Act = ({ a, label }: { a: Action; label: string }) => (
    <Button size="sm" variant="subtle" loading={busy === a} disabled={busy !== null} onClick={() => run(a)}>
      {label}
    </Button>
  );

  return (
    <tr className="border-t border-line">
      <td className="py-3 pr-3 font-mono text-sm tnum">#{ds.id.toString()}</td>
      <td className="py-3 pr-3 font-mono text-sm">{shortAddr(s.employee)}</td>
      <td className="py-3 pr-3 font-mono text-sm tnum">{formatUsdc(rateToMonthly(s.rate_per_second), 2)}</td>
      <td className="py-3 pr-3 font-mono text-sm tnum">{formatUsdc(s.withdrawn)}</td>
      <td className="py-3 pr-3 text-sm"><StatusBadge status={status} /></td>
      <td className="py-3">
        <div className="flex flex-wrap gap-1.5">
          {!s.canceled && !s.paused && !ended && <Act a="pause" label="Pause" />}
          {!s.canceled && s.paused && <Act a="resume" label="Resume" />}
          {!s.canceled && ended && <Act a="settle" label="Settle" />}
          {!s.canceled && <Act a="cancel" label="Cancel" />}
        </div>
        {err && <p className="mt-1 text-xs text-danger">{err}</p>}
      </td>
    </tr>
  );
}

export function StreamTable({
  streams,
  onChanged,
}: {
  streams: DiscoveredStream[];
  onChanged: () => void;
}) {
  if (streams.length === 0) {
    return (
      <Card className="px-8 py-10 text-center text-muted">
        No salary streams yet. Create your first one above.
      </Card>
    );
  }

  return (
    <Card className="overflow-x-auto p-4">
      <table className="w-full text-left">
        <thead>
          <tr className="text-xs uppercase tracking-wide text-muted">
            <th className="py-2 pr-3 font-medium">ID</th>
            <th className="py-2 pr-3 font-medium">Employee</th>
            <th className="py-2 pr-3 font-medium">Monthly (USDC)</th>
            <th className="py-2 pr-3 font-medium">Withdrawn</th>
            <th className="py-2 pr-3 font-medium">Status</th>
            <th className="py-2 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {streams.map((ds) => (
            <StreamRow key={ds.id.toString()} ds={ds} onChanged={onChanged} />
          ))}
        </tbody>
      </table>
    </Card>
  );
}
