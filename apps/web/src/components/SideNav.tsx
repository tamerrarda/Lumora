"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ConnectButton } from "./ConnectButton";
import { StatusDot, cn } from "./ui";
import { NAV_LINKS } from "./navLinks";

const EASE = [0.22, 1, 0.36, 1] as const;

function Wordmark({ onClick, className }: { onClick?: () => void; className?: string }) {
  return (
    <Link
      href="/"
      onClick={onClick}
      className={cn(
        "font-serif font-normal italic uppercase leading-none tracking-wide text-fg transition-colors hover:text-accent",
        className
      )}
    >
      LUMORA
    </Link>
  );
}

function Burger({ open, onClick }: { open: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Toggle menu"
      aria-expanded={open}
      className={cn("burger", open && "is-open")}
    >
      <span />
      <span />
      <span />
    </button>
  );
}

/** Vertical nav list with a sliding accent bar on the active item. */
function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {NAV_LINKS.map((l) => {
        const active =
          pathname === l.href || (l.href !== "/" && pathname.startsWith(l.href));
        return (
          <Link
            key={l.href}
            href={l.href}
            onClick={onNavigate}
            className={cn(
              "group relative flex items-center rounded-lg px-3 py-2.5 text-sm transition-colors",
              active ? "text-accent" : "text-muted hover:bg-surface hover:text-fg"
            )}
          >
            {active && (
              <>
                <motion.span
                  layoutId="drawer-bar"
                  className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-accent"
                  transition={{ type: "spring", stiffness: 480, damping: 38 }}
                />
                <motion.span
                  layoutId="drawer-bg"
                  className="absolute inset-0 rounded-lg bg-accent-soft"
                  transition={{ type: "spring", stiffness: 480, damping: 38 }}
                />
              </>
            )}
            <span className={cn("relative z-10", active ? "font-semibold" : "font-medium")}>
              {l.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

export function SideNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* floating top-left: burger + elegant wordmark (no bar, no logo) */}
      <div className="fixed left-4 top-5 z-40 flex items-center gap-3 sm:left-6 sm:top-6 sm:gap-5 lg:left-10">
        <Burger open={open} onClick={() => setOpen((v) => !v)} />
        <Wordmark onClick={() => setOpen(false)} className="text-2xl sm:text-3xl md:text-4xl" />
      </div>

      {/* floating top-right: feedback + docs links + connect wallet.
          On small screens the text links live in the drawer instead, so the
          top bar never collides with the wordmark. */}
      <div className="fixed right-4 top-4 z-40 flex items-center gap-4 sm:right-6 sm:top-5 sm:gap-8 lg:right-10">
        <div className="hidden items-center gap-6 sm:flex">
          <a
            href="https://forms.gle/8jM5kg7TBzSxitu98"
            target="_blank"
            rel="noreferrer"
            className="text-sm font-semibold uppercase tracking-wide text-fg transition-colors hover:text-accent"
          >
            Feedback
          </a>
          <Link
            href="/docs"
            className="text-sm font-semibold uppercase tracking-wide text-fg transition-colors hover:text-accent"
          >
            Docs
          </Link>
        </div>
        <ConnectButton />
      </div>

      {/* desktop: far-left hover zone also opens the drawer */}
      <div
        onMouseEnter={() => setOpen(true)}
        className="group fixed inset-y-0 left-0 z-20 hidden w-3 lg:block"
        aria-hidden
      >
        <span className="absolute left-0 top-1/2 h-16 w-1 -translate-y-1/2 rounded-r-full bg-line transition-all duration-300 group-hover:h-24 group-hover:bg-accent" />
      </div>

      {/* drawer + overlay */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-fg/40"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              onMouseLeave={() => setOpen(false)}
              className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[82%] flex-col border-r border-line bg-base px-4 py-6 shadow-2xl"
            >
              <div className="flex items-center justify-between px-2">
                <Wordmark onClick={() => setOpen(false)} className="text-2xl" />
                <Burger open onClick={() => setOpen(false)} />
              </div>

              <div className="mt-8 flex-1">
                <div className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-faint">
                  Menu
                </div>
                <NavList onNavigate={() => setOpen(false)} />
              </div>

              <div className="space-y-4 border-t border-line pt-4">
                <a
                  href="https://forms.gle/8jM5kg7TBzSxitu98"
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setOpen(false)}
                  className="block px-1 text-sm font-semibold uppercase tracking-wide text-fg transition-colors hover:text-accent sm:hidden"
                >
                  Feedback ↗
                </a>
                <div className="flex items-center gap-2 px-1 text-xs text-muted">
                  <StatusDot tone="accent" pulse /> Testnet · live
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
