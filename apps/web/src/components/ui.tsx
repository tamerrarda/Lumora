// Lumora design system — reusable UI primitives.
// Goal: eliminate scattered Tailwind strings for consistency + a professional feel.
import {
  type ReactNode,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  forwardRef,
} from "react";

/** Class merging (clsx-lite). */
export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

/* ---------------- Card ---------------- */
export function Card({
  children,
  className,
  glow,
}: {
  children: ReactNode;
  className?: string;
  glow?: boolean;
}) {
  return (
    <div
      className={cn(
        "border border-line bg-panel shadow-card",
        glow && "shadow-glow",
        className
      )}
    >
      {children}
    </div>
  );
}

/* ---------------- Button ---------------- */
type Variant = "primary" | "secondary" | "ghost" | "subtle" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-accent text-ink font-semibold hover:bg-accent-dark active:bg-accent-dark shadow-[0_1px_2px_rgba(21,21,26,0.12)]",
  secondary:
    "bg-yellow text-fg font-semibold hover:bg-yellow-dark active:bg-yellow-dark shadow-[0_1px_2px_rgba(21,21,26,0.12)]",
  ghost: "text-muted hover:text-fg hover:bg-surface",
  subtle: "bg-surface text-fg border border-line hover:bg-line",
  danger: "bg-danger text-white font-semibold hover:brightness-110",
};
const SIZES: Record<Size, string> = {
  sm: "px-2.5 py-1.5 text-xs rounded-lg",
  md: "px-4 py-2 text-sm rounded-lg",
  lg: "px-5 py-3 text-sm rounded-xl",
};

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  full?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, BtnProps>(function Button(
  { variant = "primary", size = "md", loading, full, className, children, disabled, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed",
        VARIANTS[variant],
        SIZES[size],
        full && "w-full",
        className
      )}
      {...rest}
    >
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
});

/* ---------------- Badge ---------------- */
type Tone = "accent" | "yellow" | "amber" | "neutral" | "muted";
const TONES: Record<Tone, string> = {
  accent: "bg-accent-soft text-accent ring-accent-ring",
  yellow: "bg-yellow text-fg ring-black/10",
  amber: "bg-amber-soft text-amber ring-amber/30",
  neutral: "bg-surface text-fg ring-line",
  muted: "bg-surface text-muted ring-line",
};

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1",
        TONES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

/** Live/status dot. */
export function StatusDot({ tone = "accent", pulse }: { tone?: Tone; pulse?: boolean }) {
  const color =
    tone === "amber" ? "bg-amber" : tone === "muted" ? "bg-faint" : "bg-accent";
  return (
    <span className="relative flex h-2 w-2">
      {pulse && (
        <span className={cn("absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping", color)} />
      )}
      <span className={cn("relative inline-flex h-2 w-2 rounded-full", color)} />
    </span>
  );
}

/* ---------------- Stat ---------------- */
export function Stat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  accent?: boolean;
}) {
  return (
    <Card className="p-5">
      <div className="text-xs font-medium uppercase tracking-wide text-muted">{label}</div>
      <div className={cn("mt-1.5 font-mono text-2xl font-bold tnum", accent && "text-accent")}>
        {value}
      </div>
      {sub && <div className="mt-1 text-xs text-faint">{sub}</div>}
    </Card>
  );
}

/* ---------------- PageHeader ---------------- */
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  badge,
  right,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="space-y-2">
        {eyebrow && (
          <div className="flex items-center gap-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            <span className="h-px w-6 bg-accent/40" />
            {eyebrow}
          </div>
        )}
        <div className="flex items-center gap-3">
          <h1 className="font-serif text-3xl font-normal italic tracking-tight sm:text-4xl">
            {title}
          </h1>
          {badge}
        </div>
        {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
      </div>
      {right && <div className="flex items-center gap-3">{right}</div>}
    </div>
  );
}

/* ---------------- EmptyState ---------------- */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center border border-line bg-panel px-8 py-14 text-center shadow-card">
      {icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-2xl">
          {icon}
        </div>
      )}
      <h2 className="font-serif text-2xl font-bold italic tracking-tight sm:text-3xl">{title}</h2>
      {description && <p className="mt-3 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-7">{action}</div>}
    </div>
  );
}

/* ---------------- Spinner ---------------- */
export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn("animate-spin", className)} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-90" d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/* ---------------- Form: Field + Input ---------------- */
export function Field({
  label,
  hint,
  error,
  children,
}: {
  label?: string;
  hint?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-xs font-medium text-muted">{label}</span>}
      {children}
      {error ? (
        <span className="mt-1 block text-xs text-danger">{error}</span>
      ) : (
        hint && <span className="mt-1 block text-xs text-faint">{hint}</span>
      )}
    </label>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "w-full rounded-lg border border-line bg-surface px-3 py-2 font-mono text-sm tnum text-fg",
          "placeholder:text-faint transition-colors focus:border-accent/50 focus:outline-none",
          className
        )}
        {...rest}
      />
    );
  }
);
