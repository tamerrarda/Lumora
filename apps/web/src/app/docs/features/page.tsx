import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Features — Lumora Docs",
  description: "Real-time streaming, instant withdrawals, yield-aware treasury, reserve isolation and more.",
};

export default function FeaturesPage() {
  return (
    <>
      <h1>Features</h1>
      <p className="lead">
        Everything Lumora does, and why it matters for employers and employees.
      </p>

      <h3>Real-time streaming</h3>
      <p>
        Salary accrues every second instead of once a month. The employee&apos;s balance is always
        an exact, up-to-the-second reflection of what they&apos;ve earned.
      </p>

      <h3>Withdraw anytime</h3>
      <p>
        Employees withdraw earned USDC whenever they want — all of it or just part of it — with no
        approval step and no waiting for a pay cycle.
      </p>

      <h3>Yield-aware treasury</h3>
      <p>
        Idle USDC that isn&apos;t actively streaming can earn yield in a dedicated treasury contract,
        so payroll reserves don&apos;t sit idle between cycles.
      </p>

      <h3>Reserve isolation</h3>
      <p>
        Salary reserves and yield-seeking capital are held in two separate contracts. Money owed to
        employees is structurally protected — it is never exposed to yield strategy risk.
      </p>

      <h3>Date-based streams</h3>
      <p>
        Employers set a monthly salary plus an exact start and end date; the per-second rate and the
        locked reserve are derived automatically.
      </p>

      <h3>Fully on-chain &amp; transparent</h3>
      <p>
        Every funding, stream and withdrawal is a verifiable Stellar transaction. Activity history is
        read directly from the chain.
      </p>

      <h3>Automatic discovery</h3>
      <p>
        Employees just connect a wallet — Lumora finds the streams paid to that address
        automatically. There are no contract IDs or stream IDs to copy around.
      </p>
    </>
  );
}
