"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { Button, StatusDot } from "@/components/ui";

/* ────────────────────────────────────────────────────────────
   Live stream figures — a representative active stream.
   The "available now" balance accrues in real time so the hero
   physically demonstrates the product: payroll by the second.
   ──────────────────────────────────────────────────────────── */
const RATE = 0.0015432; // USDC / second
const START = 1284.5028; // balance at mount
const CAP = 12000; // stream cap

/** Split a number into grouped integer, the lead 2 decimals, and the fast tail. */
function parseAmount(v: number) {
  const [int, dec] = v.toFixed(6).split(".");
  return {
    int: Number(int).toLocaleString("en-US"),
    lead: dec.slice(0, 2),
    tail: dec.slice(2),
  };
}

/** rAF-driven accruing balance; frozen when the user prefers reduced motion. */
function useLiveBalance(reduced: boolean) {
  const [value, setValue] = useState(START);
  useEffect(() => {
    if (reduced) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      setValue(Math.min(CAP, START + RATE * ((t - t0) / 1000)));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduced]);
  return value;
}

const EASE = [0.22, 1, 0.36, 1] as const;

/** One headline line that clip-reveals up from a masked baseline. */
function RevealLine({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <span className="block overflow-hidden pb-[0.12em] pl-[0.06em] -ml-[0.06em]">
      <motion.span
        className="block"
        initial={{ y: "110%" }}
        animate={{ y: 0 }}
        transition={{ duration: 0.8, delay, ease: EASE }}
      >
        {children}
      </motion.span>
    </span>
  );
}

export function Hero() {
  const reduced = useReducedMotion() ?? false;
  const value = useLiveBalance(reduced);
  const amount = parseAmount(value);
  const pct = Math.min(100, (value / CAP) * 100);

  // Scroll-linked parallax: text drifts down, card floats up & fades as you leave.
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const yText = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : 60]);
  const yCard = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : -70]);
  const fade = useTransform(scrollYProgress, [0, 0.85], [1, reduced ? 1 : 0]);

  return (
    <section ref={ref} className="relative grid items-center gap-10 pt-4 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
      {/* soft brand glow behind the hero for depth */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 right-0 -z-10 h-[420px] w-[520px] rounded-full opacity-60 blur-3xl"
        style={{ background: "radial-gradient(closest-side, rgba(114,106,134,0.22), transparent)" }}
      />

      {/* ── Copy ── */}
      <motion.div style={{ y: yText, opacity: fade }} className="space-y-6">
        <h1 className="font-serif text-[3rem] font-normal italic leading-[1.0] tracking-normal sm:text-6xl md:text-[4.6rem]">
          <RevealLine delay={0.05}>Payroll that</RevealLine>
          <RevealLine delay={0.15}>
            streams <span className="text-accent">by the</span>
          </RevealLine>
          <RevealLine delay={0.25}>
            <span className="text-accent">second</span>.
          </RevealLine>
        </h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="max-w-xl text-lg leading-relaxed text-muted"
        >
          Lumora is real-time stablecoin payroll on Stellar. Employees withdraw the USDC
          they&apos;ve earned the instant they want it, while employers earn yield on idle
          capital — with payroll reserves kept structurally safe.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.62, ease: EASE }}
          className="flex flex-wrap gap-3 pt-1"
        >
          <Link href="/earnings" className="box">
            Open earnings
          </Link>
          <Link href="/payroll" className="box">
            Employer panel
          </Link>
          <Link href="/docs">
            <Button size="lg" variant="ghost">
              Read the docs
            </Button>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.75 }}
          className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-3 text-xs text-muted"
        >
          <span className="inline-flex items-center gap-1.5">
            <StatusDot tone="accent" pulse /> Testnet · live
          </span>
          <span className="font-mono">USDC · 7 decimals</span>
          <span className="font-mono">3 Soroban contracts</span>
        </motion.div>
      </motion.div>

      {/* ── Live product card ── */}
      <motion.div style={{ y: yCard, opacity: fade }}>
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.25, ease: EASE }}
        >
          {/* gentle idle float — a "wallet" holding the live stream card */}
          <motion.div
            animate={reduced ? undefined : { y: [0, -9, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
            className="relative"
          >
            {/* cream wallet backing + stitched edge */}
            <div
              aria-hidden
              className="absolute -inset-3 rounded-[2rem] bg-base shadow-[0_34px_70px_-30px_rgba(21,21,26,0.4)] ring-1 ring-inset ring-line"
            />
            <div
              aria-hidden
              className="absolute -inset-1.5 rounded-[1.7rem] border border-dashed border-line"
            />

            {/* fanned cards peeking above the top edge */}
            <div aria-hidden className="absolute inset-x-6 -top-5 z-0">
              <div className="absolute left-1 right-8 top-0 h-28 -rotate-[4deg] rounded-2xl bg-accent/25" />
              <div className="absolute left-10 right-0 top-1 h-28 rotate-[3deg] rounded-2xl bg-yellow/60" />
            </div>

            {/* main live card */}
            <div className="relative z-10 rounded-[1.5rem] border border-line bg-panel p-6 shadow-card">
              {/* header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent-soft text-accent">
                    <BroadcastIcon />
                  </span>
                  <div>
                    <div className="text-sm font-bold uppercase tracking-wide text-fg">Stream #128</div>
                    <div className="mt-0.5 text-xs text-muted">≈ 4,000 USDC / mo</div>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent ring-1 ring-accent-ring">
                  <StatusDot tone="accent" pulse /> Streaming
                </span>
              </div>

              {/* available now — live */}
              <div className="mt-6">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                  Available now
                </div>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="font-display text-4xl font-bold tabular-nums text-accent sm:text-5xl">
                    {amount.int}.{amount.lead}
                  </span>
                  <span className="font-display text-xl font-semibold tabular-nums text-accent/40 sm:text-2xl">
                    {amount.tail}
                  </span>
                  <span className="ml-0.5 text-sm font-semibold text-muted">USDC</span>
                </div>
              </div>

              {/* progress */}
              <div className="mt-5">
                <div className="mb-1.5 flex justify-between text-xs text-muted">
                  <span>Withdrawn 2,715.50</span>
                  <span>Cap 12,000.00</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-accent to-accent-dark"
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 1.1, delay: 0.6, ease: EASE }}
                  />
                </div>
              </div>

              {/* rate + apy */}
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2.5 rounded-xl bg-surface px-3 py-2.5">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
                    <ClockIcon />
                  </span>
                  <div className="min-w-0">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-faint">Rate</div>
                    <div className="truncate font-mono text-sm text-fg">0.0015432 / s</div>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 rounded-xl bg-surface px-3 py-2.5">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
                    <TrendIcon />
                  </span>
                  <div className="min-w-0">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-faint">Treasury APY</div>
                    <div className="truncate font-mono text-sm text-fg">5.00%</div>
                  </div>
                </div>
              </div>

              {/* actions */}
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Link
                  href="/earnings"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-accent to-accent-dark px-4 py-3 text-sm font-semibold text-white shadow-[0_8px_18px_-8px_rgba(114,106,134,0.75)] transition-transform active:scale-[0.98]"
                >
                  <DownloadIcon /> Withdraw
                </Link>
                <Link
                  href="/earnings"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-panel px-4 py-3 text-sm font-semibold text-fg transition-colors hover:bg-surface"
                >
                  <BarsIcon /> Stream Details
                </Link>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  );
}

/* ── inline icons (stroke = currentColor) ── */
const svg = "h-[18px] w-[18px]";

function BroadcastIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" className={svg}>
      <circle cx="12" cy="12" r="1.8" fill="currentColor" stroke="none" />
      <path d="M8.6 8.6a4.8 4.8 0 0 0 0 6.8M15.4 8.6a4.8 4.8 0 0 1 0 6.8" />
      <path d="M6.1 6.1a8.3 8.3 0 0 0 0 11.8M17.9 6.1a8.3 8.3 0 0 1 0 11.8" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 1.8" />
    </svg>
  );
}

function TrendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M4 15l4.5-4.5 3 3L20 6" />
      <path d="M15 6h5v5" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M12 4v10m0 0l-3.5-3.5M12 14l3.5-3.5" />
      <path d="M5 18.5h14" />
    </svg>
  );
}

function BarsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" className="h-4 w-4">
      <path d="M6 19v-6M12 19V7M18 19v-9" />
    </svg>
  );
}
