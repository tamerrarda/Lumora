import Link from "next/link";
import { config } from "@/lib/config";
import { explorerContract } from "@/lib/format";
import { Card, Button, Badge, StatusDot } from "@/components/ui";
import { Reveal } from "@/components/Reveal";

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
  },
  {
    title: "USDC, on-chain",
    body: "Payouts settle in USDC via the Stellar Asset Contract — stable, fast, and verifiable.",
  },
  {
    title: "Reserve isolation",
    body: "Payroll reserves and yield capital live in separate contracts, so wages are never at strategy risk.",
  },
  {
    title: "Auto-generated bindings",
    body: "The frontend talks to contracts through type-safe bindings generated from the WASM — no hand-written ABI.",
  },
];

export default function Home() {
  return (
    <div className="space-y-24 pb-8">
      {/* ───────── Hero ───────── */}
      <section className="grid items-center gap-10 pt-4 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12">
        <div className="space-y-6">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-faint">
            Stellar · Soroban · USDC
          </div>
          <h1 className="text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl md:text-6xl md:leading-[1.04]">
            Payroll that streams{" "}
            <span className="text-accent">by the second</span>.
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-muted">
            Lumora is real-time stablecoin payroll on Stellar. Employees withdraw the USDC
            they&apos;ve earned the instant they want it, while employers earn yield on idle
            capital — with payroll reserves kept structurally safe.
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            <Link href="/earnings">
              <Button size="lg">Open earnings →</Button>
            </Link>
            <Link href="/payroll">
              <Button size="lg" variant="secondary">
                Employer panel
              </Button>
            </Link>
            <Link href="/docs">
              <Button size="lg" variant="ghost">
                Read the docs
              </Button>
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-3 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5">
              <StatusDot tone="accent" pulse /> Testnet · live
            </span>
            <span className="font-mono">USDC · 7 decimals</span>
            <span className="font-mono">3 Soroban contracts</span>
          </div>
        </div>

        <HeroPreview />
      </section>

      {/* ───────── How it works ───────── */}
      <Reveal>
        <section className="space-y-8">
          <SectionHead
            eyebrow="How it works"
            title="From funded payroll to withdrawn wages — in one flow."
          />
          <div className="grid gap-5 md:grid-cols-3">
            {STEPS.map((s) => (
              <Card key={s.n} className="p-6">
                <div className="font-mono text-sm font-bold text-accent">{s.n}</div>
                <h3 className="mt-3 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
              </Card>
            ))}
          </div>
        </section>
      </Reveal>

      {/* ───────── Reserve isolation band ───────── */}
      <Reveal>
        <section className="space-y-8">
          <SectionHead
            eyebrow="Reserve isolation"
            title="Two contracts, one flow — wages are never at risk."
            sub="Money owed to employees and capital chasing yield never share a contract. Even if a yield strategy failed, salaries would be untouched."
          />
          <div className="grid gap-5 md:grid-cols-2">
            <Card className="p-6">
              <Badge tone="accent">Payroll reserve</Badge>
              <h3 className="mt-4 font-mono text-sm text-muted">payroll_stream</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Holds funds owed to employees. Locked on stream creation, released second by
                second, and never exposed to yield strategy risk.
              </p>
            </Card>
            <Card className="p-6">
              <Badge tone="yellow">Yield treasury</Badge>
              <h3 className="mt-4 font-mono text-sm text-muted">payroll_treasury</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Holds idle employer USDC that accrues yield in a separate strategy contract
                until it&apos;s moved into payroll.
              </p>
            </Card>
          </div>
        </section>
      </Reveal>

      {/* ───────── Under the hood ───────── */}
      <Reveal>
        <section className="space-y-8">
          <SectionHead
            eyebrow="Under the hood"
            title="Built on Stellar, verifiable end to end."
          />
          <div className="grid gap-5 sm:grid-cols-2">
            {UNDER_HOOD.map((f) => (
              <Card key={f.title} className="p-6">
                <h3 className="font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{f.body}</p>
              </Card>
            ))}
          </div>
          <Card className="flex flex-wrap items-center gap-x-6 gap-y-2 p-5 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5 font-medium text-fg">
              <StatusDot tone="accent" /> Live on testnet
            </span>
            <ExplorerLink label="payroll_stream" id={config.contracts.payrollStream} />
            <ExplorerLink label="payroll_treasury" id={config.contracts.payrollTreasury} />
            <ExplorerLink label="yield_strategy" id={config.contracts.yieldStrategy} />
          </Card>
        </section>
      </Reveal>

      {/* ───────── Closing CTA ───────── */}
      <Reveal>
        <section className="rounded-xl2 border border-line bg-panel px-8 py-12 text-center shadow-card">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Start streaming payroll.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted">
            Connect a wallet and see your salary grow by the second, or open the employer panel
            to fund payroll and create your first stream.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href="/earnings">
              <Button size="lg">Open earnings →</Button>
            </Link>
            <Link href="/payroll">
              <Button size="lg" variant="secondary">
                Employer panel
              </Button>
            </Link>
          </div>
        </section>
      </Reveal>
    </div>
  );
}

function SectionHead({
  eyebrow,
  title,
  sub,
}: {
  eyebrow: string;
  title: string;
  sub?: string;
}) {
  return (
    <div className="max-w-2xl space-y-2">
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
        {eyebrow}
      </div>
      <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>
      {sub && <p className="text-muted">{sub}</p>}
    </div>
  );
}

// Static product preview shown in the hero (representative figures).
function HeroPreview() {
  return (
    <Card glow className="overflow-hidden p-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted">Stream #128</div>
          <div className="mt-0.5 text-sm text-muted">≈ 4,000 USDC / mo</div>
        </div>
        <Badge tone="accent">
          <StatusDot tone="accent" pulse /> Active
        </Badge>
      </div>
      <div className="mt-6">
        <div className="text-xs uppercase tracking-wide text-muted">Available now</div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="font-mono text-4xl font-bold tabular-nums text-accent sm:text-5xl">
            1,284.50
          </span>
          <span className="text-sm font-medium text-muted">USDC</span>
        </div>
      </div>
      <div className="mt-6">
        <div className="mb-1.5 flex justify-between text-xs text-muted">
          <span>Withdrawn 2,715.50</span>
          <span>Cap 12,000.00</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-surface">
          <div className="h-full w-[34%] rounded-full bg-accent" />
        </div>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-surface px-3 py-2">
          <div className="text-[11px] uppercase tracking-wide text-faint">Rate</div>
          <div className="font-mono text-sm text-fg">0.0015432 / s</div>
        </div>
        <div className="rounded-lg bg-surface px-3 py-2">
          <div className="text-[11px] uppercase tracking-wide text-faint">Treasury APY</div>
          <div className="font-mono text-sm text-fg">5.00%</div>
        </div>
      </div>
    </Card>
  );
}

function ExplorerLink({ label, id }: { label: string; id: string }) {
  return (
    <a
      href={explorerContract(id)}
      target="_blank"
      rel="noreferrer"
      className="font-mono text-accent hover:underline"
      title={id}
    >
      {label} ↗
    </a>
  );
}
