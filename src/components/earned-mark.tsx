import { Plus } from "lucide-react";
import { createContext, useContext, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { addDedicated, itemEssenceLeft, spend } from "@/lib/op20/compute";
import type { Character } from "@/lib/op20/types";
import { useCharacters } from "@/store/characters";

/** When set, Essence grants write through immediately and also update a spend draft. */
export const EarnPersistContext = createContext<((fn: (c: Character) => Character) => void) | null>(
  null,
);

export const EarnCharacterContext = createContext<Character | null>(null);

export function EarnedMark({
  label,
  earned,
  left,
  onAdd,
}: {
  label: string;
  earned: number;
  /** Unspent Essence still sitting on this thing. Omit when it matches earned. */
  left?: number;
  onAdd: (amount: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const n = Math.floor(Number(amount) || 0);
  const unspent = left ?? earned;
  const add = () => {
    if (n <= 0) return;
    onAdd(n);
    setAmount("");
    setOpen(false);
  };

  const named = label !== "this";
  return (
    <div
      className="flex items-center gap-1.5 rounded-xl bg-cream px-2 py-1 text-ink shadow-[inset_0_0_0_1px_rgba(42,28,20,0.12)]"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <div className="min-w-[3.25rem] text-left leading-none">
        <div className="text-[9px] font-medium tracking-[0.14em] text-burgundy uppercase">Earned</div>
        <div className="mt-0.5 font-display text-lg tabular-nums">{earned}</div>
        {earned > unspent ? (
          <div className="mt-0.5 text-[10px] text-muted">{unspent} left</div>
        ) : null}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <Button
          type="button"
          size="icon-sm"
          variant="outline"
          className="text-burgundy"
          aria-label={named ? `Add Essence to ${label}` : "Add earned Essence"}
          onClick={() => setOpen(true)}
        >
          <Plus />
        </Button>
        <DialogContent title={named ? `Add Essence to ${label}` : "Add earned Essence"} className="space-y-3">
          <p className="text-sm text-muted">
            {named
              ? `This Essence stays on ${label}. It is not added to the general pool.`
              : "This Essence stays on this purchase. It is not added to the general pool."}
          </p>
          <Input
            type="number"
            min={1}
            inputMode="numeric"
            value={amount}
            placeholder="Amount"
            aria-label={`Essence earned for ${label}`}
            onChange={(e) => setAmount(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") add();
            }}
          />
          <Button className="w-full" disabled={n <= 0} onClick={add}>
            {n > 0 ? `Add ${n} Essence` : "Add Essence"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function DedicatedMark({
  character,
  spendKey,
  label,
}: {
  character?: Character;
  spendKey: string;
  label: string;
}) {
  const fromContext = useContext(EarnCharacterContext);
  const persist = useContext(EarnPersistContext);
  const update = useCharacters((s) => s.update);
  const c = character ?? fromContext;
  if (!c || !spendKey) return null;
  const earned = Math.max(0, Number(c.earnedByKey?.[spendKey]) || 0);
  const left = spend(c).dedicatedRemaining[spendKey] ?? 0;
  return (
    <EarnedMark
      label={label}
      earned={earned}
      left={left}
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
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-cream px-3 py-2">
      <div className="min-w-0">
        <div className="font-medium">{label}</div>
        {hint ? <div className="text-xs text-muted">{hint}</div> : null}
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
  return <EarnedMark label={label} earned={earned} left={itemEssenceLeft(item)} onAdd={grant} />;
}
