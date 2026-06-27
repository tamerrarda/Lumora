"use client";

import { useQuery } from "@tanstack/react-query";
import { useWallet } from "@/lib/wallet";
import { checkUsdcTrustline } from "@/lib/stellar";
import { config } from "@/lib/config";

export function TrustlineNotice() {
  const { address } = useWallet();
  const { data } = useQuery({
    queryKey: ["trustline", address],
    queryFn: () => checkUsdcTrustline(address!),
    enabled: !!address,
    staleTime: 30_000,
  });

  if (!data || (data.funded && data.hasTrustline)) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl2 border border-yellow/50 bg-yellow-soft p-5">
      <div>
        <h3 className="font-semibold text-fg">
          {!data.funded ? "Your wallet isn't funded yet" : "USDC trustline required"}
        </h3>
        <p className="mt-1 text-sm text-fg/70">
          {!data.funded
            ? "To withdraw your salary, your wallet must be active on testnet and have a USDC trustline."
            : "To receive USDC, your wallet needs an open USDC trustline. Getting USDC from the faucet sets one up too."}
        </p>
      </div>
      <a
        href={config.faucetUrl}
        target="_blank"
        rel="noreferrer"
        className="shrink-0 rounded-lg bg-yellow px-4 py-2 text-sm font-semibold text-fg transition-all hover:bg-yellow-dark"
      >
        Circle Faucet ↗
      </a>
    </div>
  );
}
