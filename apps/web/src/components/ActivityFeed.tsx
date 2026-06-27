"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchStreamEvents, KIND_LABEL, type ActivityEvent } from "@/lib/events";
import { formatUsdc, explorerTx, shortAddr } from "@/lib/format";
import { Card, Spinner } from "@/components/ui";

const KIND_ICON: Record<string, string> = {
  created: "✨",
  withdraw: "↗",
  funded: "＋",
  paused: "⏸",
  resumed: "▶",
  canceled: "✕",
  settled: "✓",
  rate_upd: "✎",
  mgr_upd: "⚙",
};

function detail(e: ActivityEvent): string {
  const parts: string[] = [];
  const t1 = e.topics[1];
  if (typeof t1 === "bigint") parts.push(`#${t1.toString()}`);
  else if (typeof t1 === "string" && t1.startsWith("G")) parts.push(shortAddr(t1));
  if (typeof e.value === "bigint") parts.push(`${formatUsdc(e.value)} USDC`);
  return parts.join(" · ");
}

function timeAgo(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

interface Props {
  title?: string;
  filter?: (e: ActivityEvent) => boolean;
  emptyText?: string;
}

export function ActivityFeed({ title = "Activity", filter, emptyText }: Props) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["stream-events"],
    queryFn: fetchStreamEvents,
    staleTime: 15_000,
  });

  const rows = (data ?? []).filter((e) => (filter ? filter(e) : true));

  return (
    <Card className="p-5">
      <h3 className="mb-4 font-semibold">{title}</h3>
      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted">
          <Spinner className="h-4 w-4" /> Loading…
        </div>
      ) : isError ? (
        <p className="text-sm text-faint">Couldn't load event history (may be outside the RPC window).</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-faint">{emptyText ?? "No records yet."}</p>
      ) : (
        <ul className="divide-y divide-line">
          {rows.map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-3 py-3">
              <div className="flex items-center gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent-soft text-sm text-accent">
                  {KIND_ICON[e.kind] ?? "•"}
                </span>
                <div>
                  <div className="text-sm">
                    {KIND_LABEL[e.kind] ?? e.kind}
                    <span className="ml-2 font-mono text-xs text-muted tnum">{detail(e)}</span>
                  </div>
                  <div className="text-xs text-faint">{timeAgo(e.at)}</div>
                </div>
              </div>
              {e.txHash && (
                <a
                  href={explorerTx(e.txHash)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-accent hover:underline"
                >
                  tx ↗
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
