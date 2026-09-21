import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Panel({
  title,
  action,
  children,
  className,
  id,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        "ornament-frame rounded-[28px] p-5 sm:p-6",
        className,
      )}
    >
      <header className="mb-4 flex items-end justify-between gap-3 border-b border-rule pb-3">
        <h2 className="font-display text-xl leading-tight text-burgundy">{title}</h2>
        {action ? <div className="shrink-0 text-sm text-muted">{action}</div> : null}
      </header>
      {children}
    </section>
  );
}

export function StatChip({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl bg-cream px-3 py-2.5 shadow-[inset_0_0_0_1px_rgba(42,28,20,0.08)]">
      <div className="text-[11px] font-medium tracking-wide text-muted uppercase">{label}</div>
      <div className="font-display text-2xl tabular-nums leading-none text-ink">{value}</div>
      {hint ? <div className="mt-1 text-xs text-muted">{hint}</div> : null}
    </div>
  );
}
