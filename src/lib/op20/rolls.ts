import { playedAbilityText } from "@/lib/op20/sustain";
import type { AttrKey, Character } from "@/lib/op20/types";
import { derive } from "@/lib/op20/compute";

export type RollOffer = { label: string; bonus: number };

const ATTR_FROM_ABBR: Record<string, AttrKey> = {
  agi: "agi",
  str: "str",
  end: "end",
  per: "per",
  wp: "wp",
  int: "intel",
  pre: "pres",
  pres: "pres",
  poi: "poise",
};

const ATTR_LABEL: Record<string, string> = {
  agi: "Agility",
  str: "Strength",
  end: "Endurance",
  per: "Perception",
  wp: "Willpower",
  int: "Intellect",
  pre: "Presence",
  pres: "Presence",
  poi: "Poise",
};

/**
 * Bonus for an ability that asks for a roll.
 * Dodge is Precision + the Athletics tier. It is not listed with the derived stats.
 */
export function abilityRoll(
  c: Character,
  abilityId: string,
  text: string,
  tier: number,
): RollOffer | null {
  if (abilityId === "dodge") return { label: "Dodge", bonus: derive(c).precision + tier };

  const filled = playedAbilityText(text, tier);
  const attrTree = filled.match(
    /\b(Agi|Str|End|Per|WP|Int|Pre|Pres|Poi)\s*\+\s*(Athletics|Subterfuge|Smith|Monster Hunting)\b/i,
  );
  if (attrTree) {
    const abbr = attrTree[1].toLowerCase();
    const key = ATTR_FROM_ABBR[abbr];
    if (!key) return null;
    return { label: ATTR_LABEL[abbr] ?? attrTree[1], bonus: (c.attributes[key] ?? 0) + tier };
  }

  if (!/\bvs\b/i.test(filled)) return null;
  const named = filled.match(
    /\b(Force of Will|Discernment|Fortitude|Reflex|Aura|Prowess|Precision|Resolve|Majesty|Ingenuity|Withstanding)\b/,
  );
  if (!named) return null;
  const d = derive(c);
  const base: Record<string, number> = {
    "Force of Will": d.forceOfWill,
    Discernment: d.discernment,
    Fortitude: d.fortitude,
    Reflex: d.reflex,
    Aura: d.aura,
    Prowess: d.prowess,
    Precision: d.precision,
    Resolve: d.resolve,
    Majesty: d.majesty,
    Ingenuity: d.ingenuity,
    Withstanding: d.withstanding,
  };
  let bonus = base[named[1]] ?? 0;
  if (/smith/i.test(filled)) bonus += c.smith?.tier ?? 0;
  if (/monster hunting/i.test(filled)) bonus += c.hunting?.tier ?? 0;
  return { label: named[1], bonus };
}
