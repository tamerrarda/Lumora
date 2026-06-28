import type { Metadata } from "next";
import { config } from "@/lib/config";
import { explorerContract } from "@/lib/format";
import { Callout } from "@/components/Callout";

export const metadata: Metadata = {
  title: "Architecture — Lumora Docs",
  description: "Lumora's two-contract design on Soroban: payroll stream, treasury, and yield strategy.",
};

export default function ArchitecturePage() {
  return (
    <>
      <h1>Architecture</h1>
      <p className="lead">
        Lumora is built from small, single-purpose smart contracts on Soroban — Stellar&apos;s smart
        contract platform. The design keeps employee funds safe by separating concerns.
      </p>

      <h2>Two-contract design</h2>
      <p>
        The most important decision is <strong>reserve isolation</strong>: the money owed to
        employees and the capital chasing yield never live in the same place. Payroll reserves sit in
        one contract; yield-seeking funds sit in another. Even if a yield strategy failed, salaries
        owed to employees would be untouched.
      </p>

      <h2>The contracts</h2>

      <h3>payroll_stream</h3>
      <p>
        Holds funded payroll balances and manages salary streams: create, fund, withdraw, pause,
        resume and cancel. It is the source of truth for what each employee has earned and withdrawn.
      </p>

      <h3>payroll_treasury</h3>
      <p>
        Holds idle USDC that employers deposit to earn yield, tracks each employer&apos;s balance and
        accrued yield, and can move funds into payroll when needed.
      </p>

      <h3>yield_strategy</h3>
      <p>
        A pluggable strategy contract that defines how idle capital earns yield. This separation
        means the yield source can be upgraded without touching payroll logic.
      </p>

      <Callout title="On testnet today" tone="yellow">
        On testnet the yield is computed by the contract and backed by a reserve to demonstrate the
        mechanism. Connecting a real DeFi yield source is planned for mainnet.
      </Callout>

      <h2>On-chain references</h2>
      <p>The contracts are live on Stellar testnet — inspect them on the explorer:</p>
      <ul>
        <li>
          <a href={explorerContract(config.contracts.payrollStream)} target="_blank" rel="noreferrer">
            payroll_stream ↗
          </a>
        </li>
        <li>
          <a href={explorerContract(config.contracts.payrollTreasury)} target="_blank" rel="noreferrer">
            payroll_treasury ↗
          </a>
        </li>
        <li>
          <a href={explorerContract(config.contracts.yieldStrategy)} target="_blank" rel="noreferrer">
            yield_strategy ↗
          </a>
        </li>
      </ul>
    </>
  );
}
