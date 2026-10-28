import { Plus } from "lucide-react";
import { createContext, useContext, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { addDedicated, itemEssenceLeft, spend } from "@/lib/op20/compute";
import type { Character } from "@/lib/op20/types";
import { cn } from "@/lib/utils";
import { useCharacters } from "@/store/characters";

/** A failed d20 of 1, 2, or 3 earns Essence on the thing that was rolled. */
const ROLL_GAINS = [
  { die: 1, amount: 10 },
  { die: 2, amount: 5 },
  { die: 3, amount: 2 },
] as const;

/** When set, Essence grants write through immediately and also update a spend draft. */
export const EarnPersistContext = createContext<((fn: (c: Character) => Character) => void) | null>(
  null,
);

/** When set, a spend draft may draw this thing's Essence before the general pool. */
export const SpendBaselineContext = createContext<Record<string, number> | null>(null);

export const EarnCharacterContext = createContext<Character | null>(null);

export function EarnedMark({
  label,
  earned,
  left,
  onAdd,
  fit,
}: {
  label: string;
  earned: number;
  /** Unspent Essence still sitting on this thing. Omit when it matches earned. */
  left?: number;
  onAdd: (amount: number) => void;
  /** Hug the contents. Default fills the attribute or item card. */
  fit?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const unspent = left ?? earned;
  const named = label !== "this";
  const grant = (amount: number) => {
    onAdd(amount);
    setOpen(false);
  };

  return (
    <div
      className={cn(
        "flex h-10 min-w-0 flex-nowrap items-center gap-1.5 rounded-xl bg-cream py-1 pl-2.5 pr-1 text-ink shadow-[inset_0_0_0_1px_rgba(42,28,20,0.12)]",
        fit ? "w-fit max-w-full" : "w-full",
      )}
      title={
        earned > 0
          ? `${earned} earned, ${unspent} left. This is spent before general Essence.`
          : "Nothing earned yet"
      }
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <span className="shrink-0 text-[9px] font-medium tracking-[0.12em] text-burgundy uppercase">
        Earned
      </span>
      <span className="shrink-0 font-display text-lg leading-none tabular-nums">{earned}</span>
      <span
        className={cn(
          "min-w-0 truncate text-[10px] leading-none whitespace-nowrap text-muted",
          earned > 0 ? (fit ? "max-w-16" : "flex-1") : fit ? "hidden" : "flex-1",
        )}
      >
        {earned > 0 ? `${unspent} left` : ""}
      </span>
      <Dialog open={open} onOpenChange={setOpen}>
        <Button
          type="button"
          size="icon-sm"
          variant="outline"
          className="size-7 shrink-0 text-burgundy"
          aria-label={named ? `Add Essence to ${label}` : "Add earned Essence"}
          onClick={() => setOpen(true)}
        >
          <Plus />
        </Button>
        <DialogContent
          title={named ? `Add Essence to ${label}` : "Add earned Essence"}
          className="space-y-3"
        >
          <p className="text-sm text-muted">
            {named
              ? `A failed roll earns Essence on ${label}. A 1 is 10, a 2 is 5, and a 3 is 2. It stays on ${label} until you buy a tier, and it is spent before general Essence.`
              : "A failed roll earns Essence on the thing you were using. A 1 is 10, a 2 is 5, and a 3 is 2. It stays on this thing until you buy a tier, and it is spent before general Essence."}
          </p>
          <div className="grid gap-2">
            {ROLL_GAINS.map((row) => (
              <Button
                key={row.die}
                type="button"
                variant="outline"
                className="h-11 justify-between"
                onClick={() => grant(row.amount)}
              >
                <span>Rolled a {row.die}</span>
                <span className="tabular-nums">+{row.amount}</span>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function DedicatedMark({
  character,
  spendKey,
  label,
  fit,
}: {
  character?: Character;
  spendKey: string;
  label: string;
  fit?: boolean;
}) {
  const fromContext = useContext(EarnCharacterContext);
  const baseline = useContext(SpendBaselineContext);
  const persist = useContext(EarnPersistContext);
  const update = useCharacters((s) => s.update);
  const c = character ?? fromContext;
  if (!c || !spendKey) return null;
  const earned = Math.max(0, Number(c.earnedByKey?.[spendKey]) || 0);
  const left = spend(c, baseline ? { baseline } : undefined).dedicatedRemaining[spendKey] ?? 0;
  return (
    <EarnedMark
      label={label}
      earned={earned}
      left={left}
      fit={fit}
      onAdd={(n) => {
        const apply = (cur: Character) => addDedicated(cur, spendKey, n);
        if (persist) persist(apply);
        else update(c.id, apply);
      }}
    />
  );
}

export function EarnRow({
  character,
  spendKey,
  label,
  hint,
}: {
  character: Character;
  spendKey: string;
  label: string;
  hint?: string;
}) {
  return (
    <div className="min-w-0">
      <div className="mb-1 truncate text-xs font-medium" title={hint ? `${label}. ${hint}` : label}>
        {label}
      </div>
      <DedicatedMark character={character} spendKey={spendKey} label={label} />
    </div>
  );
}

export function ItemEarnedMark({
  character,
  itemId,
  label,
}: {
  character: Character;
  itemId: string;
  label: string;
}) {
  const persist = useContext(EarnPersistContext);
  const update = useCharacters((s) => s.update);
  const item = character.items.find((i) => i.id === itemId);
  if (!item) return null;
  const earned = Math.max(0, Number(item.earnedEssence) || 0);
  const grant = (n: number) => {
    const apply = (cur: Character) => ({
      ...cur,
      items: cur.items.map((i) =>
        i.id === itemId ? { ...i, earnedEssence: (i.earnedEssence ?? 0) + n } : i,
      ),
    });
    if (persist) persist(apply);
    else update(character.id, apply);
  };
  return (
    <div className="w-full max-w-56">
      <EarnedMark label={label} earned={earned} left={itemEssenceLeft(item)} onAdd={grant} />
    </div>
  );
}
