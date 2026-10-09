import { DEMESNE_META } from "./catalogs";
import { treeElements } from "./compute";
import type { AttrKey, Character, DemesneTree } from "./types";

function activeTrees(c: Character): DemesneTree[] {
  return (c.demesnes ?? []).filter((d) => (d.picks?.length || d.tier) > 0);
}

function hasAbility(trees: DemesneTree[], id: string, element?: string): boolean {
  return trees.some((d) =>
    d.picks?.some((p) => p.abilityId === id && (element == null || p.element === element)),
  );
}

function traitNamed(c: Character, pattern: RegExp): boolean {
  return (c.negativeTraits ?? []).some((t) => pattern.test(t.name ?? ""));
}

/** DP-attribute scores on these trees. The same attribute is counted once. */
function primaryScore(c: Character, trees: DemesneTree[]): number {
  const seen = new Set<AttrKey>();
  let total = 0;
  for (const tree of trees) {
    for (const el of treeElements(tree)) {
      const meta = DEMESNE_META[el];
      if (!meta) continue;
      const keys = [meta.dpAttr, meta.dpAttr2].filter((k): k is AttrKey => Boolean(k));
      for (const key of keys) {
        if (seen.has(key)) continue;
        seen.add(key);
        total += c.attributes[key] ?? 0;
      }
    }
  }
  return total;
}

function halfIf(amount: number, slow: boolean): number {
  return slow ? Math.floor(amount / 2) : amount;
}

/** One shift of rest spent on Health. Endurance, halved by Slow Healer. */
export function restHealth(c: Character): number {
  const end = Math.max(0, c.attributes.end ?? 0);
  return halfIf(end, traitNamed(c, /slow healer/i));
}

/**
 * One shift spent only on DP.
 * 2 × each Demesne’s DP attribute. Demesne Bonded makes that attribute 3×.
 * The same attribute is counted once, at the higher rate.
 * Slow Replenishment halves it, unless the character has Fire Channel.
 */
export function restDp(c: Character): number {
  const trees = activeTrees(c);
  if (!trees.length) return 0;
  const rate = new Map<AttrKey, number>();
  for (const tree of trees) {
    const mult = tree.picks?.some((p) => p.abilityId === "demesne-bonded") ? 3 : 2;
    for (const el of treeElements(tree)) {
      const meta = DEMESNE_META[el];
      if (!meta) continue;
      const keys = [meta.dpAttr, meta.dpAttr2].filter((k): k is AttrKey => Boolean(k));
      for (const key of keys) rate.set(key, Math.max(rate.get(key) ?? 0, mult));
    }
  }
  let amount = 0;
  for (const [key, mult] of rate) amount += mult * (c.attributes[key] ?? 0);
  const slow = traitNamed(c, /slow replenishment/i) && !hasAbility(trees, "channel", "fire");
  return halfIf(amount, slow);
}

/** DP regained on a rest that is not a pure DP rest, from Demesne Bonded. */
export function bondedRestDp(c: Character): number {
  const trees = activeTrees(c).filter((d) => d.picks?.some((p) => p.abilityId === "demesne-bonded"));
  if (!trees.length) return 0;
  const slow = traitNamed(c, /slow replenishment/i) && !hasAbility(activeTrees(c), "channel", "fire");
  return halfIf(primaryScore(c, trees), slow);
}

/** One shift recovers 1 Fatigue. */
export function restFatigue(): number {
  return 1;
}
