"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Nav } from "./Nav";
import { ConnectButton } from "./ConnectButton";
import { NAV_LINKS } from "./navLinks";
import { cn } from "./ui";

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <motion.header
      initial={{ y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="sticky top-0 z-30 border-b border-line bg-base/80 backdrop-blur-xl"
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-6">
        {/* Left: logo + nav */}
        <div className="flex items-center gap-7">
          <Link
            href="/"
            onClick={() => setOpen(false)}
            className="flex shrink-0 items-center gap-2.5 text-lg font-bold tracking-tight"
          >
            <motion.span
              whileHover={{ scale: 1.08, rotate: -3 }}
              whileTap={{ scale: 0.94 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
              className="inline-flex"
            >
              <Image
                src="/lumora-mark.png"
                alt="Lumora"
                width={256}
                height={256}
                className="h-8 w-8 rounded-lg shadow-sm"
                priority
              />
            </motion.span>
            <span>Lumora</span>
          </Link>

          <div className="hidden lg:block">
            <Nav />
          </div>
        </div>

        {/* Right: connect + mobile toggle */}
        <div className="flex shrink-0 items-center gap-2">
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <ConnectButton />
          </motion.div>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={open}
            className="grid h-9 w-9 place-items-center rounded-lg border border-line bg-surface/60 transition-colors hover:bg-surface lg:hidden"
          >
            <MenuIcon open={open} />
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-line lg:hidden"
          >
            <motion.ul
              initial="hidden"
              animate="show"
              variants={{ show: { transition: { staggerChildren: 0.05 } } }}
              className="space-y-1 px-4 py-3"
            >
              {NAV_LINKS.map((l) => {
                const active =
                  pathname === l.href ||
                  (l.href !== "/" && pathname.startsWith(l.href));
                return (
                  <motion.li
                    key={l.href}
                    variants={{
                      hidden: { opacity: 0, x: -12 },
                      show: { opacity: 1, x: 0 },
                    }}
                  >
                    <Link
                      href={l.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "block rounded-lg px-3 py-2.5 text-sm text-fg transition-colors",
                        active
                          ? "bg-accent-soft font-semibold"
                          : "font-medium hover:bg-surface"
                      )}
                    >
                      {l.label}
                    </Link>
                  </motion.li>
                );
              })}
            </motion.ul>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}

// Animated hamburger → X
function MenuIcon({ open }: { open: boolean }) {
  const bar = "absolute left-0 top-1/2 h-0.5 w-5 -translate-y-1/2 rounded-full bg-fg";
  return (
    <div className="relative h-4 w-5">
      <motion.span
        className={bar}
        animate={open ? { rotate: 45, y: 0 } : { rotate: 0, y: -5 }}
        transition={{ duration: 0.2 }}
      />
      <motion.span
        className={bar}
        animate={open ? { opacity: 0 } : { opacity: 1 }}
        transition={{ duration: 0.15 }}
      />
      <motion.span
        className={bar}
        animate={open ? { rotate: -45, y: 0 } : { rotate: 0, y: 5 }}
        transition={{ duration: 0.2 }}
      />
    </div>
  );
}
