import type { ReactNode } from "react";
import { useDice } from "@/components/dice";
import { signed } from "@/lib/op20/compute";
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
  compact,
  rollBonus,
}: {
  label: string;
  value: string | number;
  hint?: string;
  compact?: boolean;
  /** When set, tapping the box rolls a d20 plus this number. */
  rollBonus?: number;
}) {
  const { roll } = useDice();
  const clickable = rollBonus !== undefined;
  return (
    <div
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      title={clickable ? `Roll d20 ${signed(rollBonus)}` : undefined}
      aria-label={clickable ? `Roll ${label}, d20 ${signed(rollBonus)}` : undefined}
      onClick={clickable ? () => roll(label, rollBonus) : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                roll(label, rollBonus);
              }
            }
          : undefined
      }
      className={cn(
        "min-w-0 bg-cream shadow-[inset_0_0_0_1px_rgba(42,28,20,0.08)]",
        compact
          ? "flex h-full flex-col items-center justify-center rounded-2xl px-1 py-2 text-center"
          : "rounded-2xl px-3 py-2.5",
        clickable && "cursor-pointer hover:shadow-[inset_0_0_0_2px_rgba(124,45,34,0.45)]",
      )}
    >
      <div
        className={cn(
          "font-medium text-muted uppercase",
          compact
            ? "w-full text-center text-[8px] leading-[1.15] tracking-tight sm:text-[10px]"
            : "text-[11px] tracking-wide",
        )}
      >
        {label}
      </div>
      <div
        className={cn(
          "font-display tabular-nums leading-none text-ink",
          compact ? "mt-0.5 w-full text-center text-xl" : "text-2xl",
        )}
      >
        {value}
      </div>
      {hint ? (
        <div className={cn("mt-1 text-xs text-muted", compact && "w-full text-center")}>{hint}</div>
      ) : null}
    </div>
  );
}

/** Shield-style stat from the companion sheet: big number, short label. */
export function ShieldStat({
  label,
  value,
  sub,
  danger,
  parts,
  rollBonus,
}: {
  label: string;
  value?: string | number;
  sub?: string;
  danger?: boolean;
  parts?: Array<{ label: string; value: string | number }>;
  /** When set, tapping the box rolls a d20 plus this number. */
  rollBonus?: number;
}) {
  const { roll } = useDice();
  const clickable = rollBonus !== undefined;
  return (
    <div
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      title={clickable ? `Roll d20 ${signed(rollBonus)}` : undefined}
      aria-label={clickable ? `Roll ${label}, d20 ${signed(rollBonus)}` : undefined}
      onClick={clickable ? () => roll(label, rollBonus) : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                roll(label, rollBonus);
              }
            }
          : undefined
      }
      className={cn(
        "stat-shield flex h-full min-h-[6.5rem] flex-col items-center justify-center px-2 py-3 text-center",
        clickable && "cursor-pointer hover:shadow-[inset_0_0_0_2px_rgba(124,45,34,0.55)]",
      )}
    >
      <div className="text-[10px] font-medium tracking-[0.16em] text-burgundy uppercase">{label}</div>
      {parts?.length ? (
        <div className="mt-1.5 grid w-full grid-cols-2 gap-1">
          {parts.map((p) => (
            <div key={p.label} className="min-w-0">
              <div className="text-[10px] font-medium tracking-wide text-muted uppercase">{p.label}</div>
              <div
                className={cn(
                  "font-display text-[2rem] leading-none tabular-nums",
                  danger ? "text-danger" : "text-ink",
                )}
              >
                {p.value}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div
            className={cn(
              "font-display text-[2.35rem] leading-none tabular-nums",
              danger ? "text-danger" : "text-ink",
            )}
          >
            {value}
          </div>
          {sub ? <div className="mt-1 text-[11px] text-muted">{sub}</div> : null}
        </>
      )}
    </div>
  );
}