import { createContext, useContext, type ReactNode } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";

const EssenceBudgetContext = createContext({
  remaining: Number.POSITIVE_INFINITY,
  dedicatedRemaining: {} as Record<string, number>,
  shop: false,
});

export function EssenceBudgetProvider({
  remaining,
  dedicatedRemaining = {},
  shop = false,
  children,
}: {
  remaining: number;
  dedicatedRemaining?: Record<string, number>;
  shop?: boolean;
  children: ReactNode;
}) {
  return (
    <EssenceBudgetContext.Provider value={{ remaining, dedicatedRemaining, shop }}>
      {children}
    </EssenceBudgetContext.Provider>
  );
}

export function useShopMode(): boolean {
  return useContext(EssenceBudgetContext).shop;
}

export function useBudget() {
  return useContext(EssenceBudgetContext);
}

export function useRemainingEssence(spendKey?: string): number {
  const ctx = useContext(EssenceBudgetContext);
  if (!spendKey) return ctx.remaining;
  return ctx.remaining + (ctx.dedicatedRemaining[spendKey] ?? 0);
}

export function useCanAfford(cost: number, spendKey?: string): boolean {
  return cost <= useRemainingEssence(spendKey);
}

/** Hide a purchase in spend-shop mode when the next cost is out of reach. */
export function useShopVisible(cost: number, spendKey?: string, canIncrease = true): boolean {
  const shop = useShopMode();
  const remaining = useRemainingEssence(spendKey);
  if (!canIncrease) return !shop;
  if (!shop) return true;
  return remaining >= cost;
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