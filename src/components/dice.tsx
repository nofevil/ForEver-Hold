import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { Dices } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signed } from "@/lib/op20/compute";
import { cn } from "@/lib/utils";

export interface DiceResult {
  id: number;
  label: string;
  d20: number;
  bonus: number;
  total: number;
}

interface DiceCtx {
  last: DiceResult | null;
  roll: (label?: string, bonus?: number) => DiceResult;
}

const Ctx = createContext<DiceCtx | null>(null);

let seq = 1;

export function DiceProvider({ children }: { children: ReactNode }) {
  const [last, setLast] = useState<DiceResult | null>(null);

  const roll = useCallback((label = "d20", bonus = 0) => {
    const d20 = 1 + Math.floor(Math.random() * 20);
    const result: DiceResult = { id: seq++, label, d20, bonus, total: d20 + bonus };
    setLast(result);
    return result;
  }, []);

  return (
    <Ctx.Provider value={{ last, roll }}>
      {children}
      {last ? <DiceToast key={last.id} result={last} onDismiss={() => setLast(null)} /> : null}
    </Ctx.Provider>
  );
}

export function useDice(): DiceCtx {
  const ctx = useContext(Ctx);
  if (!ctx) {
    return {
      last: null,
      roll: (label = "d20", bonus = 0) => {
        const d20 = 1 + Math.floor(Math.random() * 20);
        return { id: seq++, label, d20, bonus, total: d20 + bonus };
      },
    };
  }
  return ctx;
}

export function DiceButton({
  className,
  ghost,
}: {
  className?: string;
  ghost?: boolean;
}) {
  const { roll } = useDice();
  return (
    <Button
      variant={ghost ? "ghost" : "outline"}
      size="icon-sm"
      className={className}
      aria-label="Roll d20"
      onClick={() => roll("d20", 0)}
    >
      <Dices />
    </Button>
  );
}

function DiceToast({ result, onDismiss }: { result: DiceResult; onDismiss: () => void }) {
  const crit = result.d20 === 20;
  const miss = result.d20 === 1;
  return (
    <button
      type="button"
      onClick={onDismiss}
      className={cn(
        "fixed bottom-24 left-1/2 z-50 w-[min(92vw,22rem)] -translate-x-1/2 rounded-[28px] px-5 py-4 text-left shadow-[0_16px_40px_-16px_rgba(42,28,20,0.45)]",
        "bg-leather text-parchment no-print",
      )}
    >
      <p className="text-[10px] tracking-[0.2em] text-parchment/60 uppercase">{result.label}</p>
      <p className="font-display text-3xl leading-none">
        <span className={crit ? "text-ok" : miss ? "text-danger" : ""}>{result.d20}</span>
        {result.bonus !== 0 ? (
          <span className="ml-2 text-lg text-parchment/80">
            {signed(result.bonus)} = {result.total}
          </span>
        ) : null}
      </p>
      <p className="mt-1 text-xs text-parchment/60">
        d20{result.bonus !== 0 ? ` ${signed(result.bonus)}` : ""} · tap to dismiss
      </p>
    </button>
  );
}
