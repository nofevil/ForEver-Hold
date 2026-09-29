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
  step = 1,
  suffix,
}: {
  value: number;
  min?: number;
  max?: number;
  onChange: (next: number) => void;
  nextCost?: number;
  spendKey?: string;
  className?: string;
  step?: number;
  suffix?: string;
}) {
  const remaining = useRemainingEssence(spendKey);
  const atMax = value >= max;
  const shortfall =
    nextCost != null && !atMax && remaining < nextCost ? Math.ceil(nextCost - remaining) : 0;
  const plusDisabled = atMax || shortfall > 0;

  return (
    <div className={cn("flex shrink-0 flex-nowrap items-center justify-end gap-x-2", className)}>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label="Decrease"
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - step))}
      >
        <Minus />
      </Button>
      <span className="w-12 text-center font-display text-xl tabular-nums">
        {value}
        {suffix}
      </span>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label="Increase"
        disabled={plusDisabled}
        title={
          atMax
            ? "Highest tier this character’s stats allow"
            : shortfall > 0
              ? `${shortfall} more essence is needed to increase this tier`
              : nextCost != null
                ? `Next costs ${nextCost} Essence`
                : undefined
        }
        onClick={() => {
          if (plusDisabled) return;
          onChange(Math.min(max, value + step));
        }}
      >
        <Plus />
      </Button>
      {nextCost != null && !atMax ? (
        <span className="w-14 shrink-0 text-right text-xs leading-tight text-muted">{nextCost} ess</span>
      ) : null}
    </div>
  );
}
