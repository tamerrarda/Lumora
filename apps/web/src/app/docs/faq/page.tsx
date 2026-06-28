import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQ — Lumora Docs",
  description: "Common questions about Lumora: fund safety, yield, requirements and mainnet.",
};

export default function FaqPage() {
  return (
    <>
      <h1>FAQ</h1>
      <p className="lead">Common questions about how Lumora works and what to expect.</p>

      <h3>Is an employee&apos;s salary safe?</h3>
      <p>
        Yes. Salary reserves are held in a contract that is separate from yield-seeking capital, so
        money owed to employees is never exposed to strategy risk. See{" "}
        <a href="/docs/architecture">Architecture</a> for the reserve-isolation design.
      </p>

      <h3>Is the yield real?</h3>
      <p>
        On testnet the yield is computed by the contract and backed by a reserve to demonstrate the
        mechanism. A real DeFi yield adapter is planned for mainnet.
      </p>

      <h3>Do I need crypto experience?</h3>
      <p>
        You need a Stellar wallet (such as Freighter) and some USDC. The app then finds your salary
        streams automatically — there are no contract IDs to copy.
      </p>

      <h3>How do employees access their pay?</h3>
      <p>
        Employees connect their wallet on the <a href="/earnings">Earnings</a> page, watch their
        balance grow in real time, and withdraw earned USDC with one click — any time they like.
      </p>

      <h3>Is it live? When is mainnet?</h3>
      <p>
        Lumora is fully functional on Stellar testnet today. A production mainnet launch is the next
        milestone.
      </p>
    </>
  );
}
