"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { StatusDot, cn } from "@/components/ui";

const EASE = [0.22, 1, 0.36, 1] as const;

/* ── Section heading — eyebrow w/ rule + big display title ── */
export function SectionHead({
  eyebrow,
  title,
  sub,
  align = "left",
}: {
  eyebrow: string;
  title: ReactNode;
  sub?: string;
  align?: "left" | "center";
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease: EASE }}
      className={cn("max-w-2xl space-y-3", align === "center" && "mx-auto text-center")}
    >
      <div
        className={cn(
          "flex items-center gap-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-accent",
          align === "center" && "justify-center"
        )}
      >
        <span className="h-px w-6 bg-accent/40" />
        {eyebrow}
      </div>
      <h2 className="text-balance font-serif text-[2.1rem] font-normal italic leading-[1.06] tracking-normal sm:text-4xl md:text-[3.1rem]">
        {title}
      </h2>
      {sub && <p className="text-pretty text-muted">{sub}</p>}
    </motion.div>
  );
}

/* ── Staggered reveal container + item ── */
const containerV: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};
const itemV: Variants = {
  hidden: { opacity: 0, y: 26 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

export function Stagger({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={containerV}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-70px" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div variants={itemV} className={className}>
      {children}
    </motion.div>
  );
}

/* ── Hover card — reference-style lift + arrow reveal ── */
export function HoverCard({
  children,
  className,
  arrow = true,
}: {
  children: ReactNode;
  className?: string;
  arrow?: boolean;
}) {
  return (
    <motion.div
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      className={cn(
        "group relative h-full overflow-hidden rounded-xl2 border border-line bg-panel/85 p-6 shadow-card backdrop-blur-sm",
        "transition-colors duration-300 hover:border-accent/35 hover:shadow-glow",
        className
      )}
    >
      {/* sheen that sweeps on hover */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-10 -top-24 h-40 -translate-x-full bg-gradient-to-r from-transparent via-accent/[0.06] to-transparent transition-transform duration-700 group-hover:translate-x-[130%]"
      />
      {arrow && (
        <span
          aria-hidden
          className="absolute right-5 top-5 text-muted opacity-0 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent group-hover:opacity-100"
        >
          ↗
        </span>
      )}
      {children}
    </motion.div>
  );
}

/* ── Editorial feature card — hairline border + sliding lilac accent bar ── */
export function FeatureCard({
  index,
  badge,
  title,
  mono,
  body,
}: {
  index?: string;
  badge?: ReactNode;
  title?: string;
  mono?: string;
  body: string;
}) {
  return (
    <div className="group relative h-full overflow-hidden rounded-xl border border-line bg-panel/80 p-6 backdrop-blur-sm transition-colors duration-300 hover:border-accent/40 hover:bg-panel">
      {/* left accent bar reveals on hover */}
      <span
        aria-hidden
        className="absolute inset-y-5 left-0 w-[3px] origin-top scale-y-0 rounded-r-full bg-accent transition-transform duration-300 ease-out group-hover:scale-y-100"
      />
      {badge ? (
        <div>{badge}</div>
      ) : (
        index && (
          <span className="font-serif text-3xl italic leading-none text-accent/60 transition-colors duration-300 group-hover:text-accent">
            {index}
          </span>
        )
      )}
      {title && <h3 className="mt-4 font-semibold text-fg">{title}</h3>}
      {mono && <div className="mt-4 font-mono text-sm text-muted">{mono}</div>}
      <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
    </div>
  );
}

/* ── Reserve isolation as two stacked strips with a continuous flowing marquee ── */
type Reserve = {
  badge: string;
  tone: "accent" | "yellow";
  name: string;
  desc: string;
};

function FlowStrip({ badge, tone, name, desc, dir }: Reserve & { dir: "left" | "right" }) {
  const tokens = Array.from({ length: 8 });
  return (
    <div className="relative overflow-hidden border-b-2 border-accent">
      {/* the strip's own description, continuously flowing in a dark, readable mauve */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 flex w-max items-center text-base font-semibold text-[#3a3547] sm:text-lg"
        animate={{ x: dir === "left" ? ["0%", "-50%"] : ["-50%", "0%"] }}
        transition={{ duration: 32, ease: "linear", repeat: Infinity }}
      >
        {tokens.map((_, k) => (
          <span key={k} className="flex items-center whitespace-nowrap">
            {desc}
            <span className="mx-6 text-[#3a3547]/50">●</span>
          </span>
        ))}
      </motion.div>

      {/* fixed left label on a solid cream block, then a fade into the flow */}
      <div className="relative flex w-fit items-stretch">
        <div className="flex items-center gap-3 bg-base py-9 pr-6">
          <span
            className={cn(
              "inline-flex items-center rounded-none px-2.5 py-1 text-xs font-semibold ring-1",
              tone === "accent"
                ? "bg-accent-soft text-accent-dark ring-accent-ring"
                : "bg-yellow text-fg ring-black/10"
            )}
          >
            {badge}
          </span>
          <span className="font-mono text-sm font-semibold text-accent-dark">{name}</span>
        </div>
        <div aria-hidden className="w-20 bg-gradient-to-r from-base to-transparent" />
      </div>
    </div>
  );
}

export function ReserveStrips({ items }: { items: Reserve[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-70px" }}
      transition={{ duration: 0.6, ease: EASE }}
      className="border-t-2 border-accent"
    >
      {items.map((it, i) => (
        <FlowStrip key={it.name} {...it} dir={i % 2 === 0 ? "left" : "right"} />
      ))}
    </motion.div>
  );
}

/* ── Full-width list rows: mauve icon + serif title, grow & reveal on hover ── */
export function FeatureList({
  items,
}: {
  items: { title: string; body: string; icon?: ReactNode }[];
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-70px" }}
      transition={{ duration: 0.6, ease: EASE }}
      className="border-t-2 border-accent"
    >
      {items.map((f) => (
        <div
          key={f.title}
          className="group flex cursor-default items-start gap-5 border-b-2 border-accent py-6 pr-1 transition-colors duration-300 hover:bg-surface/50 sm:gap-8"
        >
          {/* mauve icon on the left */}
          <span className="mt-1 shrink-0 text-accent/70 transition-all duration-300 group-hover:scale-110 group-hover:text-accent">
            {f.icon}
          </span>

          {/* title + hover-revealed description */}
          <div className="min-w-0 flex-1">
            <h3 className="font-serif text-2xl leading-tight text-fg sm:text-3xl">{f.title}</h3>
            <div className="grid grid-rows-[0fr] opacity-0 transition-all duration-300 ease-out group-hover:mt-2 group-hover:grid-rows-[1fr] group-hover:opacity-100">
              <p className="max-w-2xl overflow-hidden text-sm leading-relaxed text-muted">{f.body}</p>
            </div>
          </div>
        </div>
      ))}
    </motion.div>
  );
}

/* ── Steps as a horizontal expand-on-hover accordion (reference style) ── */
type Step = { n: string; title: string; body: string };

// Mid-tone dusty mauve (between ink and cream) — on-brand, elegant.
const STEP_BG = "#726a86";

export function StepsAccordion({ steps }: { steps: Step[] }) {
  const [active, setActive] = useState(0);

  return (
    <>
      {/* Desktop: seamless mid-tone columns, expand on hover — fully squared */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-70px" }}
        transition={{ duration: 0.6, ease: EASE }}
        onMouseLeave={() => setActive(0)}
        className="hidden h-[440px] overflow-hidden shadow-[0_26px_56px_-28px_rgba(21,21,26,0.4)] md:flex"
        style={{ background: STEP_BG }}
      >
        {steps.map((s, i) => {
          const open = active === i;
          return (
            <motion.div
              key={s.n}
              onMouseEnter={() => setActive(i)}
              animate={{ flexGrow: open ? 6 : 1 }}
              transition={{ duration: 0.5, ease: EASE }}
              className={cn(
                "group relative h-full min-w-[80px] cursor-pointer overflow-hidden",
                i > 0 && "border-l border-white/15"
              )}
            >
              {/* collapsed: tracked vertical label + serif number */}
              <div
                className={cn(
                  "absolute inset-0 flex flex-col items-center justify-between py-8 transition-opacity duration-300",
                  open ? "opacity-0" : "opacity-100"
                )}
              >
                <span className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.28em] text-white/65 [writing-mode:vertical-rl] rotate-180">
                  {s.title}
                </span>
                <span className="font-serif text-4xl italic text-white/30">{s.n}</span>
              </div>

              {/* expanded: serif number + title + body */}
              <div
                className={cn(
                  "absolute inset-0 flex flex-col justify-between p-8 transition-opacity duration-300",
                  open ? "opacity-100 delay-100" : "pointer-events-none opacity-0"
                )}
              >
                <span className="font-serif text-5xl italic text-white">{s.n}</span>
                <div>
                  <h3 className="text-2xl font-semibold tracking-tight text-white">{s.title}</h3>
                  <p className="mt-2.5 max-w-sm text-sm leading-relaxed text-white/75">{s.body}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Mobile: stacked mid-tone rows — squared */}
      <div
        className="overflow-hidden shadow-[0_18px_44px_-24px_rgba(21,21,26,0.4)] md:hidden"
        style={{ background: STEP_BG }}
      >
        {steps.map((s, i) => (
          <div key={s.n} className={cn("relative p-6", i > 0 && "border-t border-white/15")}>
            <span className="font-serif text-4xl italic text-white">{s.n}</span>
            <h3 className="mt-2 text-xl font-semibold tracking-tight text-white">{s.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-white/75">{s.body}</p>
          </div>
        ))}
      </div>
    </>
  );
}

/* ── Closing CTA — ink band for color rhythm ── */
export function CtaBand() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, ease: EASE }}
      className="relative overflow-hidden rounded-none bg-fg px-8 py-16 text-center sm:px-12"
    >
      {/* lilac + yellow depth glows */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full opacity-60 blur-3xl"
        style={{ background: "radial-gradient(closest-side, rgba(114,106,134,0.5), transparent)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-20 -right-10 h-72 w-72 rounded-full opacity-40 blur-3xl"
        style={{ background: "radial-gradient(closest-side, rgba(255,200,61,0.28), transparent)" }}
      />
      <div className="relative">
        <div className="mb-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
          <StatusDot tone="accent" pulse /> Live on Stellar testnet
        </div>
        <h2 className="text-balance font-serif text-4xl font-normal italic tracking-normal text-white sm:text-5xl md:text-[3.6rem]">
          Start streaming payroll.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-pretty text-white/70">
          Connect a wallet and see your salary grow by the second, or open the employer panel to
          fund payroll and create your first stream.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/earnings" className="box box-on-dark">
            Open earnings
          </Link>
          <Link href="/payroll" className="box box-on-dark">
            Employer panel
          </Link>
        </div>
      </div>
    </motion.section>
  );
}
