"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useState } from "react";
import { cn } from "@/components/ui";
import { NAV_LINKS } from "./navLinks";

// Desktop segmented pill nav: a sliding active indicator + a gliding hover pill.
export function Nav({ layoutId = "nav" }: { layoutId?: string }) {
  const pathname = usePathname();
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <nav
      onMouseLeave={() => setHovered(null)}
      className="inline-flex w-max items-center gap-1"
    >
      {NAV_LINKS.map((l) => {
        const active =
          pathname === l.href || (l.href !== "/" && pathname.startsWith(l.href));
        return (
          <Link
            key={l.href}
            href={l.href}
            onMouseEnter={() => setHovered(l.href)}
            className="relative rounded-full px-3.5 py-1.5 text-sm"
          >
            {hovered === l.href && !active && (
              <motion.span
                layoutId={`${layoutId}-hover`}
                className="absolute inset-0 rounded-full bg-fg/[0.05]"
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
              />
            )}
            {active && (
              <motion.span
                layoutId={`${layoutId}-active`}
                className="absolute inset-0 rounded-full bg-panel shadow-sm"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <span
              className={cn(
                "relative z-10 text-fg transition-colors duration-150",
                active ? "font-semibold" : "font-medium"
              )}
            >
              {l.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
