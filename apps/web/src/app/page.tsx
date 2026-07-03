import { config } from "@/lib/config";
import { explorerContract } from "@/lib/format";
import { StatusDot } from "@/components/ui";
import { Hero } from "@/components/Hero";
import { SectionHead, FeatureList, ReserveStrips, CtaBand, StepsAccordion } from "@/components/landing";

const STEPS = [
  {
    n: "01",
    title: "Fund payroll",
    body: "The employer deposits USDC into the payroll contract — the reserve salary streams are paid from.",
  },
  {
    n: "02",
    title: "Stream by the second",
    body: "A stream releases USDC to the employee continuously over the chosen start and end dates.",
  },
  {
    n: "03",
    title: "Withdraw anytime",
    body: "The employee withdraws whatever they've earned, the moment they want it — no payday, no waiting.",
  },
];

const UNDER_HOOD = [
  {
    title: "Soroban smart contracts",
    body: "Rust contracts with checked arithmetic, CEI ordering and explicit per-address authorization.",
    icon: <CodeIcon />,
  },
  {
    title: "USDC, on-chain",
    body: "Payouts settle in USDC via the Stellar Asset Contract — stable, fast, and verifiable.",
    icon: <CoinIcon />,
  },
  {
    title: "Reserve isolation",
    body: "Payroll reserves and yield capital live in separate contracts, so wages are never at strategy risk.",
    icon: <ShieldIcon />,
  },
  {
    title: "Auto-generated bindings",
    body: "The frontend talks to contracts through type-safe bindings generated from the WASM — no hand-written ABI.",
    icon: <LinkIcon />,
  },
];

export default function Home() {
  return (
    <div className="space-y-24 pb-8">
      {/* ───────── Hero ───────── */}
      <Hero />

      {/* ───────── How it works ───────── */}
      <section className="space-y-10">
        <SectionHead
          eyebrow="How it works"
          title="From funded payroll to withdrawn wages — in one flow."
        />
        <StepsAccordion steps={STEPS} />
      </section>

      {/* ───────── Reserve isolation band ───────── */}
      <section className="space-y-10">
        <SectionHead
          eyebrow="Reserve isolation"
          title="Two contracts, one flow — wages are never at risk."
          sub="Money owed to employees and capital chasing yield never share a contract. Even if a yield strategy failed, salaries would be untouched."
        />
        <ReserveStrips
          items={[
            {
              badge: "Payroll reserve",
              tone: "accent",
              name: "payroll_stream",
              desc: "Holds funds owed to employees — locked on stream creation, released second by second, never exposed to yield risk.",
            },
            {
              badge: "Yield treasury",
              tone: "yellow",
              name: "payroll_treasury",
              desc: "Holds idle employer USDC that accrues yield in a separate strategy contract until it's moved into payroll.",
            },
          ]}
        />
      </section>

      {/* ───────── Under the hood ───────── */}
      <section className="space-y-10">
        <SectionHead
          eyebrow="Under the hood"
          title="Built on Stellar, verifiable end to end."
        />
        <FeatureList items={UNDER_HOOD} />
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-fg">
            <StatusDot tone="accent" pulse /> Live on testnet
          </span>
          <ExplorerLink label="payroll_stream" id={config.contracts.payrollStream} />
          <ExplorerLink label="payroll_treasury" id={config.contracts.payrollTreasury} />
          <ExplorerLink label="yield_strategy" id={config.contracts.yieldStrategy} />
        </div>
      </section>

      {/* ───────── Closing CTA — ink band ───────── */}
      <CtaBand />
    </div>
  );
}

/* ── mauve line icons for the feature list ── */
const ic = "h-7 w-7";
function CodeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={ic}>
      <path d="M8.5 8L5 12l3.5 4M15.5 8l3.5 4-3.5 4M13 5l-2 14" />
    </svg>
  );
}
function CoinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={ic}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5v9M14.2 9.3c-.5-.7-1.3-1-2.2-1-1.3 0-2.2.7-2.2 1.8 0 2.4 4.4 1.2 4.4 3.6 0 1.1-.9 1.8-2.2 1.8-.9 0-1.7-.3-2.2-1" />
    </svg>
  );
}
function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={ic}>
      <path d="M12 3l7 2.5v5.5c0 4.3-2.9 7.5-7 9-4.1-1.5-7-4.7-7-9V5.5L12 3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}
function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={ic}>
      <path d="M10 14a4 4 0 0 0 6 .5l2-2a4 4 0 0 0-5.7-5.7l-1.1 1.1" />
      <path d="M14 10a4 4 0 0 0-6-.5l-2 2a4 4 0 0 0 5.7 5.7l1.1-1.1" />
    </svg>
  );
}

function ExplorerLink({ label, id }: { label: string; id: string }) {
  return (
    <a
      href={explorerContract(id)}
      target="_blank"
      rel="noreferrer"
      title={id}
      className="group inline-flex items-center gap-2 rounded-none border border-line bg-panel/60 px-3 py-1.5 font-mono text-xs text-muted transition-colors duration-200 hover:border-accent/40 hover:bg-panel hover:text-fg"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-accent" />
      {label}
      <span className="text-accent transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5">
        ↗
      </span>
    </a>
  );
}
