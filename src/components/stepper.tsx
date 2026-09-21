import { Minus, Plus } from "lucide-react";
import { useRemainingEssence } from "@/components/essence-budget";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Stepper({
  value,
  min = 0,
  max = 5,
  onChange,
  nextCost,
  spendKey,
  className,
}: {
  value: number;
  min?: number;
  max?: number;
  onChange: (next: number) => void;
  nextCost?: number;
  spendKey?: string;
  className?: string;
}) {
  const remaining = useRemainingEssence(spendKey);
  const atMax = value >= max;
  const canStep = value < max;
  const shortfall =
    nextCost != null && canStep && remaining < nextCost ? Math.ceil(nextCost - remaining) : 0;

  return (
    <div className={cn("flex flex-wrap items-center justify-end gap-x-2 gap-y-1", className)}>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label="Decrease"
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        <Minus />
      </Button>
      <span className="w-8 text-center font-display text-xl tabular-nums">{value}</span>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label="Increase"
        disabled={atMax}
        title={
          shortfall > 0
            ? `${shortfall} more essence is needed to increase this tier`
            : nextCost != null
              ? `Next costs ${nextCost} Essence`
              : undefined
        }
        onClick={() => {
          if (atMax || shortfall > 0) return;
          onChange(Math.min(max, value + 1));
        }}
      >
        <Plus />
      </Button>
      {canStep && nextCost != null ? (
        <span className={cn("max-w-40 text-right text-xs leading-tight", shortfall > 0 ? "text-muted" : "text-muted")}>
          {shortfall > 0
            ? `${shortfall} more essence is needed to increase this tier`
            : `${nextCost} ess`}
        </span>
      ) : null}
    </div>
  );
}
