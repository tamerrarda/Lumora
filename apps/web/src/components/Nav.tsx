"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useState } from "react";
import { cn } from "@/components/ui";
import { NAV_LINKS } from "./navLinks";

/**
 * Minimal editorial nav (reference style): quiet text links with a single
 * sliding underline indicator that glides to the hovered / active item.
 */
export function Nav({ layoutId = "nav" }: { layoutId?: string }) {
  const pathname = usePathname();
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <nav
      onMouseLeave={() => setHovered(null)}
      className="inline-flex w-max items-center gap-1 font-display"
    >
      {NAV_LINKS.map((l) => {
        const active =
          pathname === l.href || (l.href !== "/" && pathname.startsWith(l.href));
        const lit = hovered === l.href || (hovered === null && active);
        return (
          <Link
            key={l.href}
            href={l.href}
            onMouseEnter={() => setHovered(l.href)}
            className="relative px-3 py-2 text-sm"
          >
            <span
              className={cn(
                "relative z-10 transition-colors duration-200",
                lit ? "text-fg" : "text-muted hover:text-fg",
                active ? "font-semibold" : "font-medium"
              )}
            >
              {l.label}
            </span>
            {lit && (
              <motion.span
                layoutId={`${layoutId}-underline`}
                className="absolute inset-x-3 bottom-1 h-[2px] rounded-full bg-accent"
                transition={{ type: "spring", stiffness: 480, damping: 38 }}
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
