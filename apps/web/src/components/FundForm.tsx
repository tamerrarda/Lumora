"use client";

import { useState } from "react";
import { useWallet } from "@/lib/wallet";
import { streamClient } from "@/lib/contracts";
import { numberToUnits } from "@/lib/format";
import { Card, Button, Input } from "@/components/ui";

export function FundForm({ onFunded }: { onFunded: () => void }) {
  const { address, signTransaction } = useWallet();
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const submit = async () => {
    if (!address) return;
    const raw = numberToUnits(amount);
    if (raw <= 0n) {
      setErr("Enter a valid amount.");
      return;
    }
    setBusy(true);
    setErr(null);
    setOk(false);
    try {
      const c = streamClient({ publicKey: address, signTransaction });
      const tx = await c.fund({ from: address, employer: address, amount: raw });
      await tx.signAndSend();
      setOk(true);
      setAmount("");
      onFunded();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-6">
      <h3 className="font-semibold">Fund Payroll Balance</h3>
      <p className="mt-1 text-sm text-muted">
        Transfer USDC from your wallet to the contract; stream reserves are locked from this balance.
      </p>
      <div className="mt-4 flex gap-2">
        <Input
          inputMode="decimal"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <Button loading={busy} onClick={submit}>
          Deposit
        </Button>
      </div>
      {ok && <p className="mt-2 text-sm text-success">✓ Balance funded.</p>}
      {err && <p className="mt-2 text-sm text-danger">{err}</p>}
    </Card>
  );
}
