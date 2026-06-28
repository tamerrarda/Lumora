import type { Metadata } from "next";
import { Callout } from "@/components/Callout";

export const metadata: Metadata = {
  title: "How it works — Lumora Docs",
  description: "The end-to-end Lumora flow: fund, earn yield, stream by the second, withdraw anytime.",
};

export default function HowItWorksPage() {
  return (
    <>
      <h1>How it works</h1>
      <p className="lead">
        Lumora connects an employer&apos;s funds to an employee&apos;s wallet through a continuous
        salary stream. Here is the full flow, end to end.
      </p>

      <h2>The flow</h2>
      <ol>
        <li>
          <strong>Employer funds payroll.</strong> The employer deposits USDC into the payroll
          contract. This is the reserve that salary streams are paid from.
        </li>
        <li>
          <strong>Idle capital earns yield.</strong> USDC that isn&apos;t actively streaming can be
          placed in a separate treasury contract, where it accrues yield until it&apos;s needed.
        </li>
        <li>
          <strong>Salary streams by the second.</strong> The employer creates a stream for an
          employee with a start and end date. From that moment the employee&apos;s claimable balance
          grows continuously.
        </li>
        <li>
          <strong>Employee withdraws anytime.</strong> The employee opens the app, sees their live
          balance, and withdraws as much as they&apos;ve earned — instantly.
        </li>
      </ol>

      <h2>For employers</h2>
      <p>
        From the <a href="/payroll">Payroll</a> panel, an employer funds the contract, creates
        streams (by monthly salary and a start–end date), and manages them — pause, resume or cancel.
        From the <a href="/vault">Treasury</a>, idle USDC can be deposited to earn yield and later
        moved into payroll.
      </p>

      <h2>For employees</h2>
      <p>
        From the <a href="/earnings">Earnings</a> page, an employee connects their wallet and the app
        automatically finds the streams paid to that address — no contract IDs to copy. The balance
        ticks up live, and a single click withdraws earned USDC.
      </p>

      <Callout title="No spreadsheets, no payday" tone="yellow">
        Because the stream lives on-chain, the employee&apos;s earned amount is always correct to the
        second and available on demand.
      </Callout>
    </>
  );
}
