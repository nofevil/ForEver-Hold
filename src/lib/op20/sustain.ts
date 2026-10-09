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
    dpPerRound: channelCost(c, sustain, tier, ch.treeId),
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

/** Channel Master tier on this tree or charm only. Another tree’s purchase does not count. */
export function channelMasterTier(c: Character, treeId: string): number {
  if (treeId.startsWith("charm:")) {
    const itemId = treeId.slice("charm:".length);
    const item = (c.items ?? []).find((i) => i.id === itemId);
    if (!item?.equipped || !item.charm || item.charmAbilityId !== CHANNEL_MASTER) return 0;
    return 1;
  }
  const tree = (c.demesnes ?? []).find((d) => d.id === treeId);
  if (!tree) return 0;
  const pick = (tree.picks ?? []).find((p) => p.abilityId === CHANNEL_MASTER);
  if (!pick) return 0;
  return abilityPowerTier(c, tree.id, pick.tier);
}

/** Channel DP this round. Channel Master cuts only channels from the tree that has it. */
export function channelCost(
  c: Character,
  sustain: AbilitySustain,
  tier: number,
  treeId: string,
): number {
  const base = sustainCost(sustain, tier);
  if (sustain.mode !== "channel") return base;
  return Math.max(0, base - channelMasterTier(c, treeId));
}

export function channelPayLabel(
  c: Character,
  sustain: AbilitySustain,
  tier: number,
  treeId: string,
): string {
  const cost = channelCost(c, sustain, tier, treeId);
  return cost <= 0 ? "free" : `${cost} DP/round`;
}

/** What this channel skill costs per round. The cut is shown only when this tree has Channel Master. */
export function channelCostLine(
  c: Character,
  sustain: AbilitySustain,
  tier: number,
  treeId: string,
): string {
  const base = sustainCost(sustain, tier);
  const cost = channelCost(c, sustain, tier, treeId);
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
  const matched = (c.channels ?? []).filter((ch) => sustainSourceMatches(c, ch));
  return keepTreeChannels(c, matched).map((ch) => liveChannel(c, ch));
}

/**
 * One channel at a time. Channel Master on a tree keeps one extra channel of that
 * tree’s own abilities. It does not give another tree a second channel or a cheaper cost.
 * Newest channels are kept. `channels` is oldest-first.
 */
function keepTreeChannels(c: Character, channels: ChannelState[]): ChannelState[] {
  const nonCm: ChannelState[] = [];
  const fromMaster: ChannelState[] = [];
  for (let i = channels.length - 1; i >= 0; i--) {
    const ch = channels[i];
    if (channelMasterTier(c, ch.treeId) > 0) fromMaster.push(ch);
    else nonCm.push(ch);
  }
  const kept = new Set<ChannelState>();
  if (nonCm[0]) kept.add(nonCm[0]);
  const baseFree = nonCm.length === 0;
  const extraUsed = new Set<string>();
  let baseTakenByMaster = false;
  for (const ch of fromMaster) {
    if (!extraUsed.has(ch.treeId)) {
      kept.add(ch);
      extraUsed.add(ch.treeId);
      continue;
    }
    if (baseFree && !baseTakenByMaster) {
      kept.add(ch);
      baseTakenByMaster = true;
    }
  }
  return channels.filter((ch) => kept.has(ch));
}

/** Drop channels whose ability is gone, and any a tree is not allowed to keep. */
export function settleChannels(c: Character, raw: ChannelState[]): ChannelState[] {
  const matched = raw.filter(
    (ch) =>
      ch &&
      (!ch.itemId || c.items.some((i) => i.id === ch.itemId)) &&
      sustainSourceMatches(c, ch),
  );
  return keepTreeChannels(c, matched).map((ch) => liveChannel(c, ch));
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

function channelKey(ch: { treeId: string; pickTier: number }): string {
  return `${ch.treeId}:${ch.pickTier}`;
}

/** 1 channel, plus one extra for each tree or charm that has Channel Master. */
export function channelLimit(c: Character): number {
  const ids = new Set<string>();
  for (const tree of c.demesnes ?? []) {
    if ((tree.picks?.length || tree.tier) > 0 && channelMasterTier(c, tree.id) > 0) ids.add(tree.id);
  }
  for (const item of c.items ?? []) {
    if (!item.equipped || !item.charm) continue;
    const id = charmTreeId(item.id);
    if (channelMasterTier(c, id) > 0) ids.add(id);
  }
  return 1 + ids.size;
}

function keptIfStarted(c: Character, next: ChannelState, stop?: { treeId: string; pickTier: number }): ChannelState[] {
  const existing = (c.channels ?? []).filter(
    (ch) =>
      sustainSourceMatches(c, ch) &&
      channelKey(ch) !== channelKey(next) &&
      !(stop && channelKey(ch) === channelKey(stop)),
  );
  return keepTreeChannels(c, [...existing, next]);
}

export type ChannelStartPlan = {
  limit: number;
  /** Active channels that would turn off if this starts without a choice. */
  replaced: ChannelState[];
  /** Channels that can be stopped so this one starts and every other channel stays. */
  choices: ChannelState[];
};

/** What starting `next` would turn off, and which active channels can be chosen instead. */
export function planChannelStart(c: Character, next: ChannelState): ChannelStartPlan {
  const active = activeChannels(c).filter((ch) => channelKey(ch) !== channelKey(next));
  const kept = new Set(keptIfStarted(c, next).map(channelKey));
  const replaced = active.filter((ch) => !kept.has(channelKey(ch)));
  const choices = active.filter((stop) => {
    const after = keptIfStarted(c, next, stop);
    const keys = new Set(after.map(channelKey));
    return (
      keys.has(channelKey(next)) &&
      active.every((ch) => channelKey(ch) === channelKey(stop) || keys.has(channelKey(ch)))
    );
  });
  return { limit: channelLimit(c), replaced, choices };
}

function addChannel(c: Character, next: ChannelState): Character {
  const existing = (c.channels ?? []).filter(
    (ch) =>
      sustainSourceMatches(c, ch) && !(ch.treeId === next.treeId && ch.pickTier === next.pickTier),
  );
  return { ...c, channels: keepTreeChannels(c, [...existing, next]) };
}

export function demesneChannelDraft(c: Character, treeId: string, pickTier: number): ChannelState | null {
  const tree = c.demesnes.find((d) => d.id === treeId);
  const pick = tree?.picks.find((p) => p.tier === pickTier);
  if (!pick) return null;
  const ability = abilityForPick(pick.element, pick.abilityId);
  const sustain = ability?.sustain;
  if (!sustain || sustain.mode !== "channel") return null;
  if (isChannelingAbility(c, treeId, pickTier)) return null;
  const tier = abilityPowerTier(c, treeId, pickTier);
  const cost = channelCost(c, sustain, tier, treeId);
  if (cost > 0 && (c.tracker.currentDp ?? 0) < cost) return null;
  return {
    abilityId: pick.abilityId,
    element: pick.element,
    treeId,
    pickTier,
    itemId: null,
    effect: fillTierText(sustain.effect, tier),
    dpPerRound: cost,
  };
}

export function charmChannelDraft(c: Character, itemId: string): ChannelState | null {
  const item = c.items.find((i) => i.id === itemId && i.charm && i.equipped);
  if (!item?.charmElement || !item.charmAbilityId) return null;
  const ability = abilityForPick(item.charmElement, item.charmAbilityId);
  const sustain = ability?.sustain;
  if (!sustain || sustain.mode !== "channel") return null;
  const treeId = charmTreeId(itemId);
  if (isChannelingAbility(c, treeId, 1)) return null;
  const cost = channelCost(c, sustain, 1, treeId);
  if (cost > 0 && itemDpLeft(item) < cost) return null;
  return {
    abilityId: item.charmAbilityId,
    element: item.charmElement,
    treeId,
    pickTier: 1,
    itemId: null,
    effect: fillTierText(sustain.effect, 1),
    dpPerRound: cost,
  };
}

export function startCharmChannel(c: Character, itemId: string): Character {
  const draft = charmChannelDraft(c, itemId);
  if (!draft) return c;
  const item = c.items.find((i) => i.id === itemId);
  const have = item ? itemDpLeft(item) : 0;
  const cost = draft.dpPerRound;
  const next = addChannel(c, draft);
  return {
    ...next,
    items:
      cost > 0
        ? next.items.map((i) => (i.id === itemId ? { ...i, currentDp: have - cost } : i))
        : next.items,
  };
}

export function startChannel(c: Character, treeId: string, pickTier: number): Character {
  const draft = demesneChannelDraft(c, treeId, pickTier);
  if (!draft) return c;
  return spendCurrentDp(addChannel(c, draft), draft.dpPerRound);
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
