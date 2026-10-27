import { Minus, Plus } from "lucide-react";
import { DedicatedMark } from "@/components/earned-mark";
import { useRemainingEssence } from "@/components/essence-budget";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Stepper({
  value,
  min = 0,
  max,
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
  const atMax = max != null && value >= max;
  const shortfall =
    nextCost != null && !atMax && remaining < nextCost ? Math.ceil(nextCost - remaining) : 0;
  const plusDisabled = atMax || shortfall > 0;

  return (
    <div className={cn("flex w-full min-w-0 max-w-full flex-wrap items-center justify-between gap-x-2 gap-y-1.5 sm:w-auto sm:justify-end", className)}>
      {spendKey ? <DedicatedMark spendKey={spendKey} label="this" fit /> : null}
      <div className="flex flex-nowrap items-center gap-x-1.5">
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        className="size-8"
        aria-label="Decrease"
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - step))}
      >
        <Minus />
      </Button>
      <span className="w-7 text-center font-display text-xl tabular-nums">
        {value}
        {suffix}
      </span>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        className="size-8"
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
          onChange(max == null ? value + step : Math.min(max, value + step));
        }}
      >
        <Plus />
      </Button>
      {nextCost != null && !atMax ? (
        <span className="shrink-0 text-xs leading-tight text-muted tabular-nums">{nextCost} ess</span>
      ) : null}
      </div>
    </div>
  );
}
