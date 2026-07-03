"use client";

import { useWallet } from "@/lib/wallet";
import { shortAddr } from "@/lib/format";
import { StatusDot } from "@/components/ui";

export function ConnectButton() {
  const { address, connect, disconnect, connecting } = useWallet();

  if (address) {
    return (
      <div className="flex items-center gap-2">
        <span className="hidden items-center gap-2 rounded-lg border border-line bg-panel px-3 py-1.5 text-sm font-mono text-fg sm:inline-flex">
          <StatusDot tone="accent" />
          {shortAddr(address)}
        </span>
        <button type="button" className="push-btn" onClick={disconnect}>
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button type="button" className="push-btn" onClick={connect} disabled={connecting}>
      {connecting ? "Connecting…" : "Connect Wallet"}
    </button>
  );
}
