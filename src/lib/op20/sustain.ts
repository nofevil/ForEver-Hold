import type { AbilityDef, AbilitySustain } from "./catalogs";
import { DEMESNE_ABILITIES, DEMESNE_META, findAbility } from "./catalogs";
import { DEMESNE_DETAILS } from "./demesne-details";
import { stepCost } from "./formulas";
import type {
  BoundEffect,
  ChannelState,
  Character,
  DemesneElement,
  GearItem,
  SustainTarget,
} from "./types";
import { uid } from "@/lib/utils";

export function fillTierText(template: string, tier: number): string {
  return template
    .replaceAll("{tier}", String(tier))
    .replace(/\{(\d+)t\}/g, (_, n) => String(Number(n) * tier));
}

/** Power tier is the tree’s current tier. Buying another tier raises every ability in that tree. */
export function abilityPowerTier(c: Character, treeId: string, slotTier: number): number {
  const tree = c.demesnes.find((d) => d.id === treeId);
  if (!tree) return slotTier;
  const overall = tree.picks.length || tree.tier || 0;
  return overall > 0 ? overall : slotTier;
}

export function liveBound(c: Character, e: BoundEffect): BoundEffect {
  const sustain = abilityForPick(e.element, e.abilityId)?.sustain;
  if (!sustain || sustain.mode !== "bind") return e;
  const tier = abilityPowerTier(c, e.treeId, e.pickTier);
  return {
    ...e,
    effect: fillTierText(sustain.effect, tier),
    dp: sustainCost(sustain, tier),
  };
}

export function liveChannel(c: Character, ch: ChannelState): ChannelState {
  const sustain = abilityForPick(ch.element, ch.abilityId)?.sustain;
  if (!sustain || sustain.mode !== "channel") return ch;
  const tier = abilityPowerTier(c, ch.treeId, ch.pickTier);
  return {
    ...ch,
    effect: fillTierText(sustain.effect, tier),
    dpPerRound: sustainCost(sustain, tier),
  };
}

export function sustainCost(sustain: AbilitySustain, tier: number): number {
  if (sustain.freeAtTier && tier >= sustain.freeAtTier) return 0;
  if (sustain.cost.kind === "st") return stepCost(sustain.cost.step, tier);
  return sustain.cost.perTier ? sustain.cost.amount * tier : sustain.cost.amount;
}

export function sustainCostLabel(sustain: AbilitySustain, tier: number): string {
  const cost = sustainCost(sustain, tier);
  if (cost <= 0) return "free";
  return sustain.mode === "channel" ? `${cost} DP/round` : `${cost} DP`;
}

/** Ability text with per-tier numbers at tier 1. T3 and T5 riders are omitted. */
export function tierOneAbilityDetails(ability: AbilityDef): string {
  return resolveTierWording(ability.text, 1);
}

/** Full write-up when one exists. Otherwise the catalog line. */
export function abilityWriteup(element: DemesneElement | undefined, ability: AbilityDef): string {
  if (!element) return ability.text;
  return DEMESNE_DETAILS[`${element}:${ability.id}`] ?? DEMESNE_DETAILS[`shared:${ability.id}`] ?? ability.text;
}

/** Charm note: the whole ability, with per-tier numbers at tier 1. */
export function charmAbilityNote(element: DemesneElement, ability: AbilityDef): string {
  const body = resolveTierWording(abilityWriteup(element, ability), 1);
  return body ? `${ability.name}. ${body}` : ability.name;
}

/** The shortened catalog note previously written onto charms. */
export function shortCharmNote(ability: AbilityDef): string {
  const body = resolveTierWording(ability.text, 1);
  return body ? `${ability.name}. ${body}` : ability.name;
}

/** Stats an ability actually has at tier 1. Higher-tier riders (T3, T5) are omitted. */
export function tierOneAbilityLine(ability: AbilityDef): string {
  if (ability.sustain) {
    const effect = fillTierText(ability.sustain.effect, 1);
    const cost = sustainCostLabel(ability.sustain, 1);
    return cost === "free" ? effect : `${effect} (${cost})`;
  }
  return resolveTierWording(ability.text, 1);
}

/** Current totals for per-tier stats, so the sheet shows what the character can do now. */
export function playedAbilityText(text: string, tier: number): string {
  if (!text) return "";
  if (tier < 1) return text.replace(/\bWV\b/g, "Damage");
  const per = "(?:Demesne\\s+Tier|DT|Tier)";
  return text
    .replace(new RegExp(`(\\d+)\\s*'\\s*/\\s*${per}\\b`, "gi"), (_, n) => `${Number(n) * tier}'`)
    .replace(new RegExp(`(\\d+)\\s*'\\s*R\\s*/\\s*${per}\\b`, "gi"), (_, n) => `${Number(n) * tier}'`)
    .replace(
      new RegExp(`(\\d+)\\s*(?:[A-Za-z]+\\s+){0,3}(?:WV|Damage|Dmg)\\s*/\\s*${per}\\b`, "gi"),
      (_, n) => `${Number(n) * tier} Damage`,
    )
    .replace(
      new RegExp(`(\\d+)((?:\\s+[A-Za-z]+){0,4})\\s*/\\s*${per}\\b`, "gi"),
      (_, n, words) => `${Number(n) * tier}${words}`,
    )
    .replace(/\b(\d+)\s*ST\b/g, (_, n) => String(stepCost(Number(n), tier)))
    .replace(/\bWV\b/g, "Damage");
}

function stripTierRider(text: string, tag: "T3" | "T5"): string {
  const paren = new RegExp(`\\s*\\([^)]*\\b${tag}\\b[^)]*\\)`, "g");
  // Keep a preceding period so the next rider still has a sentence boundary.
  const sentence = new RegExp(`(?:^|\\.\\s*|\\s)\\b${tag}\\b[^.]*\\.?`, "g");
  return text.replace(paren, "").replace(sentence, (m) => (m.trimStart().startsWith(".") ? "." : ""));
}

function resolveTierWording(text: string, tier: number): string {
  let s = text
    .replace(/(\d+)\s*\/\s*Tier/gi, (_, n) => String(Number(n) * tier))
    .replace(/(\d+)\s*\/\s*DT/gi, (_, n) => String(Number(n) * tier))
    .replace(/\/Tier/gi, "")
    .replace(/\/DT/gi, "")
    .replace(/\b(\d+)\s*ST\b/g, (_, n) => String(stepCost(Number(n), tier)))
    .replace(/\bWV\b/g, "Damage");
  if (tier < 3) s = stripTierRider(s, "T3");
  if (tier < 5) s = stripTierRider(s, "T5");
  return s
    .replace(/\s{2,}/g, " ")
    .replace(/\s+\./g, ".")
    .replace(/\.{2,}/g, ".")
    .trim();
}

export function sustainTargetLabel(target: SustainTarget): string {
  switch (target) {
    case "self":
      return "self";
    case "melee-weapon":
      return "a melee weapon";
    case "blunt-weapon":
      return "a blunt weapon or unarmed";
    case "weapon":
      return "a weapon";
    case "metal":
      return "a metal item";
  }
}

export function abilityForPick(element: DemesneElement, abilityId: string): AbilityDef | undefined {
  return findAbility(DEMESNE_ABILITIES[element] ?? [], abilityId);
}

const BLUNT: ReadonlySet<string> = new Set(["Maul", "Gauntlet", "Flail"]);

export function itemMatchesTarget(item: GearItem, target: SustainTarget): boolean {
  if (target === "self") return false;
  if (target === "weapon") return item.kind === "weapon";
  if (target === "melee-weapon") return item.kind === "weapon" && item.weaponType !== "Bow";
  if (target === "blunt-weapon") {
    return item.kind === "weapon" && BLUNT.has(item.weaponType ?? "");
  }
  if (target === "metal") {
    return item.kind === "weapon" || item.kind === "armor" || item.kind === "shield";
  }
  return false;
}

export function eligibleSustainItems(c: Character, target: SustainTarget): GearItem[] {
  if (target === "self") return [];
  return (c.items ?? []).filter((i) => itemMatchesTarget(i, target));
}

export function allowsUnarmed(target: SustainTarget): boolean {
  return target === "blunt-weapon";
}

export function boundOnAbility(
  c: Character,
  treeId: string,
  pickTier: number,
): BoundEffect | undefined {
  return (c.boundEffects ?? []).find((e) => e.treeId === treeId && e.pickTier === pickTier);
}

export function isChannelingAbility(c: Character, treeId: string, pickTier: number): boolean {
  const ch = c.channel;
  return Boolean(ch && ch.treeId === treeId && ch.pickTier === pickTier);
}

export function effectsOnItem(c: Character, itemId: string): string[] {
  const lines: string[] = [];
  for (const raw of c.boundEffects ?? []) {
    const e = liveBound(c, raw);
    if (e.itemId === itemId) {
      const name = abilityForPick(e.element, e.abilityId)?.name ?? e.abilityId;
      lines.push(`Bound · ${name}: ${e.effect} (${e.dp}DP Bound)`);
    }
  }
  const ch = c.channel ? liveChannel(c, c.channel) : null;
  if (ch) {
    const ability = abilityForPick(ch.element, ch.abilityId);
    const sustain = ability?.sustain;
    const item = c.items.find((i) => i.id === itemId);
    if (item && sustain && itemMatchesTarget(item, sustain.target)) {
      const name = ability?.name ?? ch.abilityId;
      lines.push(`Channeling · ${name}: ${ch.effect}`);
    }
  }
  return lines;
}

export function selfSustainLines(c: Character): string[] {
  const lines: string[] = [];
  for (const raw of c.boundEffects ?? []) {
    const e = liveBound(c, raw);
    if (e.itemId) continue;
    const ability = abilityForPick(e.element, e.abilityId);
    const name = ability?.name ?? e.abilityId;
    const unarmed = ability?.sustain && allowsUnarmed(ability.sustain.target) ? " (Unarmed)" : "";
    lines.push(`${name}: ${e.effect} (${e.dp}DP Bound)${unarmed}`);
  }
  const ch = c.channel ? liveChannel(c, c.channel) : null;
  if (ch) {
    const ability = abilityForPick(ch.element, ch.abilityId);
    const sustain = ability?.sustain;
    const name = ability?.name ?? ch.abilityId;
    if (!sustain || sustain.target === "self") {
      lines.push(`Channeling ${name}: ${ch.effect}`);
    } else if (allowsUnarmed(sustain.target)) {
      lines.push(`Channeling ${name}: ${ch.effect} (Unarmed)`);
    }
  }
  return lines;
}

function spendCurrentDp(c: Character, cost: number): Character {
  return {
    ...c,
    tracker: {
      ...c.tracker,
      currentDp: Math.max(0, (c.tracker.currentDp ?? 0) - cost),
    },
  };
}

export function bindSustain(
  c: Character,
  treeId: string,
  pickTier: number,
  itemId: string | null,
): Character {
  const tree = c.demesnes.find((d) => d.id === treeId);
  const pick = tree?.picks.find((p) => p.tier === pickTier);
  if (!pick) return c;
  const ability = abilityForPick(pick.element, pick.abilityId);
  const sustain = ability?.sustain;
  if (!sustain || sustain.mode !== "bind") return c;
  if (boundOnAbility(c, treeId, pickTier)) return c;
  const tier = abilityPowerTier(c, treeId, pickTier);
  const cost = sustainCost(sustain, tier);
  if (cost > 0 && (c.tracker.currentDp ?? 0) < cost) return c;
  if (sustain.target !== "self") {
    if (itemId) {
      if (!c.items.some((i) => i.id === itemId && itemMatchesTarget(i, sustain.target))) return c;
    } else if (!allowsUnarmed(sustain.target)) {
      return c;
    }
  }
  const effect: BoundEffect = {
    id: uid(),
    abilityId: pick.abilityId,
    element: pick.element,
    treeId,
    pickTier,
    dp: cost,
    itemId: sustain.target === "self" ? null : itemId,
    effect: fillTierText(sustain.effect, tier),
  };
  return spendCurrentDp({ ...c, boundEffects: [...(c.boundEffects ?? []), effect] }, cost);
}

export function unbindSustain(c: Character, treeId: string, pickTier: number): Character {
  return {
    ...c,
    boundEffects: (c.boundEffects ?? []).filter(
      (e) => !(e.treeId === treeId && e.pickTier === pickTier),
    ),
  };
}

export function startChannel(c: Character, treeId: string, pickTier: number): Character {
  const tree = c.demesnes.find((d) => d.id === treeId);
  const pick = tree?.picks.find((p) => p.tier === pickTier);
  if (!pick) return c;
  const ability = abilityForPick(pick.element, pick.abilityId);
  const sustain = ability?.sustain;
  if (!sustain || sustain.mode !== "channel") return c;
  if (isChannelingAbility(c, treeId, pickTier)) return c;
  const tier = abilityPowerTier(c, treeId, pickTier);
  const cost = sustainCost(sustain, tier);
  if (cost > 0 && (c.tracker.currentDp ?? 0) < cost) return c;
  const channel: ChannelState = {
    abilityId: pick.abilityId,
    element: pick.element,
    treeId,
    pickTier,
    itemId: null,
    effect: fillTierText(sustain.effect, tier),
    dpPerRound: cost,
  };
  return spendCurrentDp({ ...c, channel }, cost);
}

export function stopChannel(c: Character): Character {
  if (!c.channel) return c;
  return { ...c, channel: null };
}

export function channelLabel(ch: ChannelState): string {
  const ability = abilityForPick(ch.element, ch.abilityId);
  const name = ability?.name ?? ch.abilityId;
  const court = DEMESNE_META[ch.element]?.name ?? ch.element;
  const target = ability?.sustain?.target;
  const extra =
    target === "melee-weapon"
      ? " on melee weapons"
      : target === "blunt-weapon"
        ? " on blunt / unarmed"
        : target === "weapon"
          ? " on weapons"
          : target === "metal"
            ? " on metal"
            : "";
  return `${court} · ${name}${extra}`;
}
