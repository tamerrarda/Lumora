import type { Metadata } from "next";
import { Callout } from "@/components/Callout";

export const metadata: Metadata = {
  title: "Introduction — Lumora Docs",
  description: "What Lumora is and the problem it solves: real-time stablecoin payroll on Stellar.",
};

export default function DocsIntroPage() {
  return (
    <>
      <h1>Introduction</h1>
      <p className="lead">
        Lumora is real-time stablecoin payroll on Stellar. Employees earn their salary
        continuously — every second — and withdraw it whenever they want, while employers
        earn yield on idle payroll capital.
      </p>

      <h2>What is Lumora?</h2>
      <p>
        Traditional payroll pays a lump sum once or twice a month. Lumora replaces that with a
        continuous <strong>stream</strong>: the moment an employer creates a salary stream, the
        employee&apos;s balance starts growing second by second and can be withdrawn at any time —
        no payday, no approvals, no waiting.
      </p>
      <p>
        Everything runs on-chain in <strong>USDC</strong>, so balances are stable, transfers settle
        in seconds, and every payment is transparent and verifiable.
      </p>

      <h2>The problem</h2>
      <ul>
        <li>
          <strong>Waiting for payday.</strong> Workers wait weeks to access money they have already
          earned — but rent, bills and emergencies don&apos;t wait for the 1st of the month.
        </li>
        <li>
          <strong>Idle payroll capital.</strong> Money set aside for salaries sits in a bank account
          earning nothing between pay cycles. That is dead capital for the employer.
        </li>
        <li>
          <strong>Slow, costly transfers.</strong> Cross-border and contractor payroll runs through
          traditional rails: high fees, multi-day settlement, opaque status.
        </li>
      </ul>

      <h2>The solution</h2>
      <p>
        Lumora turns salary into a live stream and idle reserves into productive capital, in one
        flow. Employees get instant access to earned wages; employers get yield on funds that would
        otherwise sit still — without ever putting the money owed to employees at risk.
      </p>

      <Callout title="New here?">
        Continue to <a href="/docs/how-it-works">How it works</a> for a step-by-step walkthrough of
        the employer and employee flow.
      </Callout>
    </>
  );
}
