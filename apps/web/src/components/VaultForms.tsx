"use client";

import { useState } from "react";
import { useWallet } from "@/lib/wallet";
import { treasuryClient } from "@/lib/contracts";
import { numberToUnits } from "@/lib/format";
import { Card, Button, Input } from "@/components/ui";

type AmountAction = (raw: bigint, employer: string) => Promise<void>;

function AmountForm({
  title,
  desc,
  button,
  action,
  onDone,
}: {
  title: string;
  desc: string;
  button: string;
  action: AmountAction;
  onDone: () => void;
}) {
  const { address } = useWallet();
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
      await action(raw, address);
      setOk(true);
      setAmount("");
      onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="flex h-full flex-col p-5">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted">{desc}</p>
      <div className="mt-auto flex gap-2 pt-4">
        <Input
          inputMode="decimal"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <Button loading={busy} onClick={submit}>
          {button}
        </Button>
      </div>
      {ok && <p className="mt-2 text-sm text-success">✓ Transaction successful.</p>}
      {err && <p className="mt-2 text-sm text-danger">{err}</p>}
    </Card>
  );
}

export function DepositForm({ onDone }: { onDone: () => void }) {
  const { signTransaction } = useWallet();
  return (
    <AmountForm
      title="Deposit"
      desc="Deposit idle USDC into the treasury; the mock strategy accrues yield."
      button="Deposit"
      onDone={onDone}
      action={async (raw, employer) => {
        const c = treasuryClient({ publicKey: employer, signTransaction });
        await (await c.deposit({ employer, amount: raw })).signAndSend();
      }}
    />
  );
}

export function WithdrawForm({ onDone }: { onDone: () => void }) {
  const { address, signTransaction } = useWallet();
  const [busyAll, setBusyAll] = useState(false);

  const withdrawAll = async () => {
    if (!address) return;
    setBusyAll(true);
    try {
      const c = treasuryClient({ publicKey: address, signTransaction });
      await (await c.withdraw_all({ employer: address })).signAndSend();
      onDone();
    } catch {
      /* ana yenileme yeterli */
    } finally {
      setBusyAll(false);
    }
  };

  return (
    <div className="flex h-full flex-col gap-2">
      <AmountForm
        title="Withdraw"
        desc="Yield is deducted first, then principal (yield-first)."
        button="Withdraw"
        onDone={onDone}
        action={async (raw, employer) => {
          const c = treasuryClient({ publicKey: employer, signTransaction });
          await (await c.withdraw({ employer, amount: raw })).signAndSend();
        }}
      />
      <Button variant="subtle" size="sm" full loading={busyAll} onClick={withdrawAll}>
        Withdraw All (principal + yield)
      </Button>
    </div>
  );
}

export function FundPayrollForm({ onDone }: { onDone: () => void }) {
  const { signTransaction } = useWallet();
  return (
    <AmountForm
      title="Fund Payroll"
      desc="Transfer from the treasury to the payroll contract (yield-first). Salary reserves are locked from here."
      button="Transfer"
      onDone={onDone}
      action={async (raw, employer) => {
        const c = treasuryClient({ publicKey: employer, signTransaction });
        await (await c.fund_payroll({ employer, amount: raw })).signAndSend();
      }}
    />
  );
}
