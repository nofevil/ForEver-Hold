import type { AbilityDef, AbilitySustain } from "./catalogs";
import { DEMESNE_ABILITIES, DEMESNE_META, findAbility } from "./catalogs";
import { DEMESNE_DETAILS } from "./demesne-details";
import { stepCost } from "./formulas";
import type {
  AttrKey,
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
    dpPerRound: channelCost(c, sustain, tier),
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

const CHANNEL_MASTER = "channel-master";

/** Tree tier of Channel Master, or 1 if it sits on an equipped charm. 0 if they do not have it. */
export function channelMasterTier(c: Character): number {
  let best = 0;
  for (const tree of c.demesnes ?? []) {
    for (const pick of tree.picks ?? []) {
      if (pick.abilityId !== CHANNEL_MASTER) continue;
      best = Math.max(best, abilityPowerTier(c, tree.id, pick.tier));
    }
  }
  for (const item of c.items ?? []) {
    if (!item.equipped || !item.charm || item.charmAbilityId !== CHANNEL_MASTER) continue;
    best = Math.max(best, 1);
  }
  return best;
}

/** One channel, or two when Channel Master is on the sheet. */
export function channelLimit(c: Character): number {
  return channelMasterTier(c) > 0 ? 2 : 1;
}

/** Channel DP this round, after Channel Master’s −1 DP per its tier. Never below 0. */
export function channelCost(c: Character, sustain: AbilitySustain, tier: number): number {
  const base = sustainCost(sustain, tier);
  if (sustain.mode !== "channel") return base;
  return Math.max(0, base - channelMasterTier(c));
}

export function channelPayLabel(c: Character, sustain: AbilitySustain, tier: number): string {
  const cost = channelCost(c, sustain, tier);
  return cost <= 0 ? "free" : `${cost} DP/round`;
}

/** What this channel skill costs per round, including the Channel Master cut. */
export function channelCostLine(c: Character, sustain: AbilitySustain, tier: number): string {
  const base = sustainCost(sustain, tier);
  const cost = channelCost(c, sustain, tier);
  const cut = Math.max(0, base - cost);
  const price = cost <= 0 ? "free" : `${cost} DP/round`;
  return cut > 0 ? `Channel cost: ${price} · Channel Master −${cut}` : `Channel cost: ${price}`;
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
  const body = demesnePlayText(element, ability, 1);
  return body ? `${ability.name}. ${body}` : ability.name;
}

const PER_TIER = "(?:Demesne\\s+Tier|DT|Tier)";

/**
 * Turn “N … /Tier” into the total at this tier.
 * Leaves /Strength, /Str, and /Quality Tier alone — those are not this tier.
 */
export function fillScaledTierText(text: string, tier: number): string {
  if (!text || tier < 1) return text;
  let s = text.replace(
    new RegExp(String.raw`(\d+)\s*ST\s+DP(?:\s*/\s*[A-Za-z]+)*\s*/\s*${PER_TIER}\b`, "gi"),
    (_, n) => `${stepCost(Number(n), tier)} DP`,
  );
  s = s.replace(
    new RegExp(String.raw`(\d+)([^/\d\n]{0,48}?)((?:/[A-Za-z][A-Za-z ]*)*)/\s*${PER_TIER}\b`, "gi"),
    (match, n, mid: string, slashes: string) => {
      if (/\/\s*(?:Strength|Str)\b/i.test(match)) return match;
      if (/Quality/i.test(`${mid}${slashes}`)) return match;
      return `${Number(n) * tier}${mid}${slashes}`;
    },
  );
  s = s.replace(
    new RegExp(
      String.raw`(\d+)(\s+[A-Za-z]+(?:\s+[A-Za-z]+){0,4})\s+per\s+${PER_TIER}\b(?!\s+of\b)`,
      "gi",
    ),
    (_, n, words: string) => `${Number(n) * tier}${words}`,
  );
  return s;
}

const ATTR_SCALE: Record<string, AttrKey> = {
  strength: "str",
  str: "str",
  agility: "agi",
  agi: "agi",
  endurance: "end",
  end: "end",
  perception: "per",
  per: "per",
  willpower: "wp",
  intellect: "intel",
  int: "intel",
  poise: "poise",
  poi: "poise",
  presence: "pres",
  pre: "pres",
};

/**
 * On the sheet, “5'/Strength” becomes the feet at the character’s Strength.
 * The purchase list keeps the attribute name so the player can see what raises it.
 */
export function fillAttributeText(
  text: string,
  attributes: Record<AttrKey, number> | undefined,
): string {
  if (!text || !attributes) return text;
  return text.replace(
    /(\d+)(\s*'|\s+[A-Za-z]+(?:\s+[A-Za-z]+)?)?\s*\/\s*(Strength|Str|Agility|Agi|Endurance|End|Perception|Per|Willpower|Intellect|Int|Poise|Poi|Presence|Pre)\b(?!\s+Tier)/gi,
    (match, n: string, mid: string | undefined, name: string) => {
      const key = ATTR_SCALE[name.toLowerCase()];
      if (!key) return match;
      return `${Number(n) * (attributes[key] || 0)}${mid ?? ""}`;
    },
  );
}

/** Full write-up with this tier’s numbers. Keeps how the ability is used, including later riders. */
export function demesnePlayText(
  element: DemesneElement | undefined,
  ability: AbilityDef,
  tier: number,
): string {
  const power = Math.max(1, tier);
  const filled = fillScaledTierText(abilityWriteup(element, ability), power)
    .replace(/\b(\d+)\s*ST\b/g, (_, n) => String(stepCost(Number(n), power)))
    .replace(/\bWV\b/g, "Damage")
    .replace(/\bDmg\b/g, "Damage");
  return filled.replace(/\s{2,}/g, " ").replace(/\s+\./g, ".").trim();
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
  if (tier < 1) return text.replace(/\bWV\b/g, "Damage").replace(/\bDmg\b/g, "Damage");
  return fillScaledTierText(text, tier)
    .replace(/\b(\d+)\s*ST\b/g, (_, n) => String(stepCost(Number(n), tier)))
    .replace(/\bWV\b/g, "Damage")
    .replace(/\bDmg\b/g, "Damage");
}

function stripTierRider(text: string, tag: "T3" | "T5"): string {
  const paren = new RegExp(`\\s*\\([^)]*\\b${tag}\\b[^)]*\\)`, "g");
  // Keep a preceding period so the next rider still has a sentence boundary.
  const sentence = new RegExp(`(?:^|\\.\\s*|\\s)\\b${tag}\\b[^.]*\\.?`, "g");
  return text.replace(paren, "").replace(sentence, (m) => (m.trimStart().startsWith(".") ? "." : ""));
}

function resolveTierWording(text: string, tier: number): string {
  let s = fillScaledTierText(text, tier)
    .replace(/\b(\d+)\s*ST\b/g, (_, n) => String(stepCost(Number(n), tier)))
    .replace(/\bWV\b/g, "Damage")
    .replace(/\bDmg\b/g, "Damage");
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

export function sustainSourceMatches(
  c: Character,
  source: { treeId: string; pickTier: number; element: DemesneElement; abilityId: string },
): boolean {
  if (source.treeId.startsWith("charm:")) {
    const itemId = source.treeId.slice("charm:".length);
    const item = c.items.find((i) => i.id === itemId);
    return Boolean(
      item?.charm && item.charmElement === source.element && item.charmAbilityId === source.abilityId,
    );
  }
  const pick = c.demesnes
    .find((d) => d.id === source.treeId)
    ?.picks.find((p) => p.tier === source.pickTier);
  return Boolean(pick && pick.element === source.element && pick.abilityId === source.abilityId);
}

/** DP reserved from the character pool by binds whose ability is still on the sheet. */
export function matchingPoolBindDp(c: Character): number {
  return poolBindDp(c, false);
}

/** DP reserved by binds whose ability was changed or removed. */
export function stalePoolBindDp(c: Character): number {
  return poolBindDp(c, true);
}

function poolBindDp(c: Character, stale: boolean): number {
  return (c.boundEffects ?? []).reduce((n, e) => {
    if (e.poolItemId) return n;
    if (sustainSourceMatches(c, e) === stale) return n;
    return n + liveBound(c, e).dp;
  }, 0);
}

export function boundOnAbility(
  c: Character,
  treeId: string,
  pickTier: number,
): BoundEffect | undefined {
  const effect = (c.boundEffects ?? []).find((e) => e.treeId === treeId && e.pickTier === pickTier);
  if (!effect || !sustainSourceMatches(c, effect)) return undefined;
  return effect;
}

export function activeChannels(c: Character): ChannelState[] {
  const live = (c.channels ?? [])
    .filter((ch) => sustainSourceMatches(c, ch))
    .map((ch) => liveChannel(c, ch));
  return live.slice(0, channelLimit(c));
}

/** Drop channels whose ability is gone, and any past the Channel Master limit. */
export function settleChannels(c: Character, raw: ChannelState[]): ChannelState[] {
  const matched = raw.filter(
    (ch) =>
      ch &&
      (!ch.itemId || c.items.some((i) => i.id === ch.itemId)) &&
      sustainSourceMatches(c, ch),
  );
  return matched.map((ch) => liveChannel(c, ch)).slice(0, channelLimit(c));
}

export function channelOnAbility(
  c: Character,
  treeId: string,
  pickTier: number,
): ChannelState | undefined {
  return activeChannels(c).find((ch) => ch.treeId === treeId && ch.pickTier === pickTier);
}

export function isChannelingAbility(c: Character, treeId: string, pickTier: number): boolean {
  return Boolean(channelOnAbility(c, treeId, pickTier));
}

export function effectsOnItem(c: Character, itemId: string): string[] {
  const lines: string[] = [];
  for (const raw of c.boundEffects ?? []) {
    if (!sustainSourceMatches(c, raw)) continue;
    const e = liveBound(c, raw);
    if (e.itemId === itemId) {
      const name = abilityForPick(e.element, e.abilityId)?.name ?? e.abilityId;
      lines.push(`Bound · ${name}: ${e.effect} (${e.dp}DP Bound)`);
    }
  }
  for (const ch of activeChannels(c)) {
    const ability = abilityForPick(ch.element, ch.abilityId);
    const sustain = ability?.sustain;
    const item = c.items.find((i) => i.id === itemId);
    if (item && sustain && itemMatchesTarget(item, sustain.target)) {
      const name = ability?.name ?? ch.abilityId;
      const price = ch.dpPerRound > 0 ? `${ch.dpPerRound} DP/round` : "free";
      lines.push(`Channeling · ${name}: ${ch.effect} (${price})`);
    }
  }
  return lines;
}

export function selfSustainLines(c: Character): string[] {
  const lines: string[] = [];
  for (const raw of c.boundEffects ?? []) {
    if (!sustainSourceMatches(c, raw)) continue;
    const e = liveBound(c, raw);
    const ability = abilityForPick(e.element, e.abilityId);
    const name = ability?.name ?? e.abilityId;
    const where = e.itemId ? gearLabel(c, e.itemId) : "";
    const unarmed = !where && ability?.sustain && allowsUnarmed(ability.sustain.target) ? " (Unarmed)" : "";
    const on = where ? ` on ${where}` : "";
    lines.push(`${name}: ${e.effect}${on} (${e.dp}DP Bound)${unarmed}`);
  }
  for (const ch of activeChannels(c)) {
    const ability = abilityForPick(ch.element, ch.abilityId);
    const name = ability?.name ?? ch.abilityId;
    const price = ch.dpPerRound > 0 ? `${ch.dpPerRound} DP/round` : "free";
    lines.push(`Channeling ${name}: ${ch.effect} (${price})`);
  }
  return lines;
}

function isShieldAbility(ability: AbilityDef | undefined): boolean {
  return Boolean(ability && /shield/i.test(ability.name));
}

/** Demesne shields the character has, including one on an equipped charm. */
export function defenseShields(c: Character): { key: string; label: string; detail: string }[] {
  const rows: { key: string; label: string; detail: string }[] = [];
  for (const tree of c.demesnes) {
    for (const pick of tree.picks) {
      if (!pick.abilityId || !pick.element) continue;
      const ability = abilityForPick(pick.element, pick.abilityId);
      if (!isShieldAbility(ability) || !ability) continue;
      const bound = boundOnAbility(c, tree.id, pick.tier);
      const channeling = isChannelingAbility(c, tree.id, pick.tier);
      if (!bound && !channeling) continue;
      const tier = abilityPowerTier(c, tree.id, pick.tier);
      const up = bound ? " · Bound" : " · Channeling";
      rows.push({
        key: `${tree.id}:${pick.tier}`,
        label: `${ability.name}${up}`,
        detail: ability.sustain ? fillTierText(ability.sustain.effect, tier) : ability.name,
      });
    }
  }
  for (const item of c.items) {
    if (!item.equipped || !item.charm || !item.charmElement || !item.charmAbilityId) continue;
    const ability = abilityForPick(item.charmElement, item.charmAbilityId);
    if (!isShieldAbility(ability) || !ability) continue;
    const treeId = charmTreeId(item.id);
    const bound = boundOnAbility(c, treeId, 1);
    const channeling = isChannelingAbility(c, treeId, 1);
    if (!bound && !channeling) continue;
    const up = bound ? " · Bound" : " · Channeling";
    const where = item.name?.trim() || "Charm";
    rows.push({
      key: `charm:${item.id}`,
      label: `${ability.name}${up} · ${where}`,
      detail: ability.sustain ? fillTierText(ability.sustain.effect, 1) : ability.name,
    });
  }
  return rows;
}

function gearLabel(c: Character, itemId: string): string {
  const item = c.items.find((i) => i.id === itemId);
  if (!item) return "item";
  return item.name?.trim() || item.weaponType || "item";
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

export function charmTreeId(itemId: string): string {
  return `charm:${itemId}`;
}

function itemDpLeft(item: GearItem): number {
  const cap = item.dp ?? 0;
  if (item.currentDp == null) return cap;
  return Math.max(0, Math.min(cap, item.currentDp));
}

export function bindCharm(c: Character, itemId: string, targetItemId: string | null): Character {
  const item = c.items.find((i) => i.id === itemId && i.charm);
  if (!item?.charmElement || !item.charmAbilityId) return c;
  const ability = abilityForPick(item.charmElement, item.charmAbilityId);
  const sustain = ability?.sustain;
  if (!sustain || sustain.mode !== "bind") return c;
  const treeId = charmTreeId(itemId);
  if (boundOnAbility(c, treeId, 1)) return c;
  const cost = sustainCost(sustain, 1);
  const have = itemDpLeft(item);
  if (cost > 0 && have < cost) return c;
  if (sustain.target !== "self") {
    if (targetItemId) {
      if (!c.items.some((i) => i.id === targetItemId && itemMatchesTarget(i, sustain.target))) return c;
    } else if (!allowsUnarmed(sustain.target)) {
      return c;
    }
  }
  const effect: BoundEffect = {
    id: uid(),
    abilityId: item.charmAbilityId,
    element: item.charmElement,
    treeId,
    pickTier: 1,
    dp: cost,
    itemId: sustain.target === "self" ? null : targetItemId,
    poolItemId: itemId,
    effect: fillTierText(sustain.effect, 1),
  };
  return {
    ...c,
    boundEffects: [...(c.boundEffects ?? []), effect],
    items: c.items.map((i) => (i.id === itemId ? { ...i, currentDp: have - cost } : i)),
  };
}

export function unbindCharm(c: Character, itemId: string): Character {
  const treeId = charmTreeId(itemId);
  const effect = (c.boundEffects ?? []).find((e) => e.treeId === treeId && e.pickTier === 1);
  const refund = effect ? liveBound(c, effect).dp : 0;
  const next: Character = {
    ...c,
    boundEffects: (c.boundEffects ?? []).filter((e) => !(e.treeId === treeId && e.pickTier === 1)),
  };
  if (!effect || refund <= 0) return next;
  const poolId = effect.poolItemId || itemId;
  return {
    ...next,
    items: next.items.map((i) => {
      if (i.id !== poolId) return i;
      const cap = i.dp ?? 0;
      return { ...i, currentDp: Math.min(cap, itemDpLeft(i) + refund) };
    }),
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

function addChannel(c: Character, next: ChannelState): Character {
  const limit = channelLimit(c);
  const existing = activeChannels(c).filter(
    (ch) => !(ch.treeId === next.treeId && ch.pickTier === next.pickTier),
  );
  const room = Math.max(0, limit - 1);
  const kept = existing.slice(Math.max(0, existing.length - room));
  return { ...c, channels: [...kept, next] };
}

export function startCharmChannel(c: Character, itemId: string): Character {
  const item = c.items.find((i) => i.id === itemId && i.charm && i.equipped);
  if (!item?.charmElement || !item.charmAbilityId) return c;
  const ability = abilityForPick(item.charmElement, item.charmAbilityId);
  const sustain = ability?.sustain;
  if (!sustain || sustain.mode !== "channel") return c;
  const treeId = charmTreeId(itemId);
  if (isChannelingAbility(c, treeId, 1)) return c;
  const cost = channelCost(c, sustain, 1);
  const have = itemDpLeft(item);
  if (cost > 0 && have < cost) return c;
  const channel: ChannelState = {
    abilityId: item.charmAbilityId,
    element: item.charmElement,
    treeId,
    pickTier: 1,
    itemId: null,
    effect: fillTierText(sustain.effect, 1),
    dpPerRound: cost,
  };
  const next = addChannel(c, channel);
  return {
    ...next,
    items:
      cost > 0
        ? next.items.map((i) => (i.id === itemId ? { ...i, currentDp: have - cost } : i))
        : next.items,
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
  const cost = channelCost(c, sustain, tier);
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
  return spendCurrentDp(addChannel(c, channel), cost);
}

export function stopChannel(c: Character, treeId?: string, pickTier?: number): Character {
  if (!treeId) return { ...c, channels: [] };
  return {
    ...c,
    channels: (c.channels ?? []).filter((ch) => !(ch.treeId === treeId && ch.pickTier === pickTier)),
  };
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
