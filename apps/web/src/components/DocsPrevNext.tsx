"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DOC_ORDER } from "./docsNav";

export function DocsPrevNext() {
  const pathname = usePathname();
  const i = DOC_ORDER.findIndex((d) => d.href === pathname);
  if (i === -1) return null;
  const prev = DOC_ORDER[i - 1];
  const next = DOC_ORDER[i + 1];

  return (
    <div className="mt-14 flex items-stretch justify-between gap-4 border-t border-line pt-6">
      {prev ? (
        <Link
          href={prev.href}
          className="group flex flex-col rounded-xl border border-line bg-panel px-4 py-3 transition-colors hover:border-accent/50"
        >
          <span className="text-xs text-faint">Previous</span>
          <span className="text-sm font-medium text-fg group-hover:text-accent">← {prev.label}</span>
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link
          href={next.href}
          className="group flex flex-col items-end rounded-xl border border-line bg-panel px-4 py-3 text-right transition-colors hover:border-accent/50"
        >
          <span className="text-xs text-faint">Next</span>
          <span className="text-sm font-medium text-fg group-hover:text-accent">{next.label} →</span>
        </Link>
      ) : (
        <span />
      )}
    </div>
  );
}
