"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DOC_NAV } from "./docsNav";
import { cn } from "./ui";

export function DocsSidebar() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-6 overflow-x-auto pb-2 text-sm lg:flex-col lg:gap-7 lg:overflow-visible lg:pb-0">
      {DOC_NAV.map((group) => (
        <div key={group.title} className="shrink-0">
          <div className="mb-2 hidden text-xs font-semibold uppercase tracking-wide text-faint lg:block">
            {group.title}
          </div>
          <ul className="flex gap-1 lg:flex-col lg:gap-0.5">
            {group.items.map((item) => {
              const active = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "block whitespace-nowrap rounded-lg px-3 py-1.5 transition-colors lg:rounded-none lg:border-l-2 lg:pl-3",
                      active
                        ? "bg-accent-soft font-medium text-accent lg:bg-transparent lg:border-accent"
                        : "text-muted hover:bg-surface hover:text-fg lg:hover:bg-transparent lg:border-transparent"
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
