import { createContext, useContext, type ReactNode } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";

const EssenceBudgetContext = createContext({
  remaining: Number.POSITIVE_INFINITY,
  dedicatedRemaining: {} as Record<string, number>,
});

export function EssenceBudgetProvider({
  remaining,
  dedicatedRemaining = {},
  children,
}: {
  remaining: number;
  dedicatedRemaining?: Record<string, number>;
  children: ReactNode;
}) {
  return (
    <EssenceBudgetContext.Provider value={{ remaining, dedicatedRemaining }}>
      {children}
    </EssenceBudgetContext.Provider>
  );
}

export function useRemainingEssence(spendKey?: string): number {
  const ctx = useContext(EssenceBudgetContext);
  if (!spendKey) return ctx.remaining;
  return ctx.remaining + (ctx.dedicatedRemaining[spendKey] ?? 0);
}

export function useCanAfford(cost: number, spendKey?: string): boolean {
  return cost <= useRemainingEssence(spendKey);
}

export function AffordButton({
  cost,
  spendKey,
  children,
  onClick,
  ...props
}: ButtonProps & { cost: number; spendKey?: string }) {
  const remaining = useRemainingEssence(spendKey);
  const shortfall = cost > remaining ? Math.ceil(cost - remaining) : 0;
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <Button
        {...props}
        title={shortfall > 0 ? `${shortfall} more essence is needed to increase this tier` : props.title}
        onClick={(e) => {
          if (shortfall > 0) return;
          onClick?.(e);
        }}
      >
        {children}
      </Button>
      {shortfall > 0 ? (
        <span className="text-xs text-muted">
          {shortfall} more essence is needed to increase this tier
        </span>
      ) : null}
    </span>
  );
}
