import type { ReactNode } from "react";
import { cn } from "./ui";

type Tone = "accent" | "yellow";

const TONES: Record<Tone, string> = {
  accent: "border-accent/30 bg-accent-soft",
  yellow: "border-yellow/40 bg-yellow-soft",
};

// Documentation admonition / note box.
export function Callout({
  title,
  tone = "accent",
  children,
}: {
  title?: string;
  tone?: Tone;
  children: ReactNode;
}) {
  return (
    <div className={cn("my-6 rounded-xl border-l-4 px-4 py-3", TONES[tone])}>
      {title && <div className="mb-1 text-sm font-semibold text-fg">{title}</div>}
      <div className="text-sm leading-relaxed text-muted [&>p]:my-0">{children}</div>
    </div>
  );
}
