"use client";

import { useWallet } from "@/lib/wallet";
import { shortAddr } from "@/lib/format";
import { Button, StatusDot } from "@/components/ui";

export function ConnectButton() {
  const { address, connect, disconnect, connecting } = useWallet();

  if (address) {
    return (
      <div className="flex items-center gap-2">
        <span className="hidden items-center gap-2 rounded-lg border border-line bg-panel px-3 py-1.5 text-sm font-mono text-fg sm:inline-flex">
          <StatusDot tone="accent" />
          {shortAddr(address)}
        </span>
        <Button variant="ghost" size="sm" onClick={disconnect}>
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <Button size="md" variant="secondary" loading={connecting} onClick={connect}>
      {connecting ? "Connecting…" : "Connect Wallet"}
    </Button>
  );
}
