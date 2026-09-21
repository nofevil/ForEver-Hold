import { DEMESNE_META } from "./catalogs";
import {
  baseHealth,
  baseMovement,
  floorHalf,
  healthCap,
  incrementalCost,
  maxPurchasedHealth,
  stepCost,
  ticFromSteps,
} from "./formulas";
import { migrateCharacter } from "./normalize";
import type {
  Character,
  DemesneElement,
  DerivedStats,
  GearItem,
  SpendBreakdown,
  SpendLine,
  WeaponType,
} from "./types";
import { ATTR_LABELS, MELEE_WEAPON_TYPES, RANGED_WEAPON_TYPES } from "./types";

export function treeElements(tree: { picks: Array<{ element?: DemesneElement }> }): DemesneElement[] {
  const seen: DemesneElement[] = [];
  for (const p of tree.picks) {
    if (p.element && !seen.includes(p.element)) seen.push(p.element);
  }
  return seen;
}

export function demesneDpPool(c: Character): number {
  const char = migrateCharacter(c);
  let total = 0;
  for (const d of char.demesnes) {
    const tier = d.picks.length || d.tier;
    if (tier <= 0) continue;
    total += stepCost(5, tier);
    for (const el of treeElements(d)) {
      const meta = DEMESNE_META[el];
      if (!meta) continue;
      total += stepCost(2, char.attributes[meta.dpAttr] ?? 0);
      if (meta.dpAttr2) total += stepCost(2, char.attributes[meta.dpAttr2] ?? 0);
    }
  }
  total += char.purchasedDpEssence * 2;
  return total;
}

export function hasAthleticsDodge(c: Character): boolean {
  return c.athletics.picks.some((p) => p.abilityId === "dodge");
}

export function equippedWeapon(c: Character): GearItem | undefined {
  if (c.tracker.equippedWeaponId) {
    const found = c.items.find((i) => i.id === c.tracker.equippedWeaponId);
    if (found) return found;
  }
  return c.items.find((i) => i.kind === "weapon" && i.equipped);
}

export function isProficient(c: Character, type: WeaponType | undefined): boolean {
  if (!type) return false;
  return c.wp.types.includes(type);
}

function isMelee(type: WeaponType | undefined): boolean {
  return Boolean(type && (MELEE_WEAPON_TYPES as readonly string[]).includes(type));
}

function isRanged(type: WeaponType | undefined): boolean {
  return Boolean(type && (RANGED_WEAPON_TYPES as readonly string[]).includes(type));
}

export function maxWeaponProficiency(c: Character): number {
  const a = c.attributes;
  const melee = Math.max(a.str, a.agi);
  const ranged = Math.max(a.agi, a.per);
  const types = c.wp.types;
  const hasMelee = types.some((t) => (MELEE_WEAPON_TYPES as readonly string[]).includes(t));
  const hasRanged = types.some((t) => (RANGED_WEAPON_TYPES as readonly string[]).includes(t));
  if (hasMelee && hasRanged) return Math.min(melee, ranged);
  if (hasRanged && !hasMelee) return ranged;
  if (hasMelee) return melee;
  return Math.max(melee, ranged);
}

export function maxArmorProficiency(c: Character): number {
  const a = c.attributes;
  const w = c.armor.weight;
  if (w === "light") return a.agi;
  if (w === "medium") return a.str;
  if (w === "heavy") return a.str + a.end;
  return Math.max(a.agi, a.str, a.str + a.end);
}

export function maxShieldProficiency(c: Character): number {
  const a = c.attributes;
  const w = c.shield.weight;
  if (w === "light") return a.agi;
  if (w === "medium") return a.str;
  if (w === "heavy") return a.str + a.end;
  return Math.max(a.agi, a.str, a.str + a.end);
}

export function accuracyForWeapon(c: Character, item: GearItem): number {
  const char = migrateCharacter(c);
  const a = char.attributes;
  const type = item.weaponType;
  const proficient = isProficient(char, type);
  if (isMelee(type)) {
    let acc = floorHalf(a.str, a.agi);
    if (proficient) acc += char.wp.tier;
    else acc -= 2;
    if (proficient && !(a.str >= char.wp.tier || a.agi >= char.wp.tier || char.wp.tier === 0)) acc -= 2;
    return acc;
  }
  if (isRanged(type)) {
    let acc = floorHalf(a.agi, a.per);
    if (proficient) acc += char.wp.tier;
    else acc -= 2;
    if (proficient && !(a.agi >= char.wp.tier || a.per >= char.wp.tier || char.wp.tier === 0)) acc -= 2;
    return acc;
  }
  return 0;
}

export function derive(c: Character): DerivedStats {
  const char = migrateCharacter(c);
  const a = char.attributes;
  const prowess = floorHalf(a.str, a.agi);
  const precision = floorHalf(a.agi, a.per);
  const dodge = floorHalf(a.agi, a.per);
  const showDodge = hasAthleticsDodge(char);
  const athleticsDodge = showDodge ? char.athletics.tier : 0;
  const weapon = equippedWeapon(char);
  const type = weapon?.weaponType;
  const proficient = isProficient(char, type);
  const meleeType = isMelee(type);
  const rangedType = isRanged(type);
  const untrainedMelee = Boolean(type && meleeType && !proficient);
  const untrainedRanged = Boolean(type && rangedType && !proficient);
  const attrMatchMelee = a.str >= char.wp.tier || a.agi >= char.wp.tier || char.wp.tier === 0;
  const attrMatchRanged = a.agi >= char.wp.tier || a.per >= char.wp.tier || char.wp.tier === 0;

  let meleeAccuracy = prowess;
  if (type && meleeType) {
    if (proficient) meleeAccuracy += char.wp.tier;
    else meleeAccuracy -= 2;
    if (proficient && !attrMatchMelee) meleeAccuracy -= 2;
  }

  let rangedAccuracy = precision;
  if (type && rangedType) {
    if (proficient) rangedAccuracy += char.wp.tier;
    else rangedAccuracy -= 2;
    if (proficient && !attrMatchRanged) rangedAccuracy -= 2;
  }

  const primary = char.demesnes.find((d) => (d.picks.length || d.tier) > 0);
  let demesneAccuracy = 0;
  if (primary) {
    const dt = primary.picks.length || primary.tier;
    const lead = treeElements(primary)[0];
    if (lead === "fire" || lead === "lava") {
      demesneAccuracy = dt + floorHalf(a.pres, a.per);
    } else if (lead === "air") {
      demesneAccuracy = dt + floorHalf(a.intel, a.per);
    } else if (lead === "earth") {
      demesneAccuracy = dt + floorHalf(a.end, a.wp);
    } else if (lead === "water") {
      demesneAccuracy = dt + floorHalf(a.str, a.poise);
    }
  }

  const extraHealth = Math.min(char.purchasedHealth, maxPurchasedHealth(a.end));
  const healthMax = Math.min(baseHealth(a.end) + extraHealth, healthCap(a.end));

  const armorSoakBonus = char.armor.bonuses.filter((b) => b === "soak").length;
  const armorDurBonus = char.armor.bonuses.filter((b) => b === "durability").length;
  const shieldSoakBonus = char.shield.bonuses.filter((b) => b === "soak").length;
  const shieldDurBonus = char.shield.bonuses.filter((b) => b === "durability").length;

  const furyLabel = char.demesnes.some((d) => treeElements(d).includes("fire") && (d.picks.length || d.tier) > 0);

  return {
    prowess,
    precision,
    dodge,
    dodgeWithAthletics: dodge + athleticsDodge,
    discernment: floorHalf(a.intel, a.per),
    forceOfWill: floorHalf(a.pres, a.per),
    fortitude: floorHalf(a.end, a.wp),
    reflex: floorHalf(a.agi, a.intel),
    aura: floorHalf(a.str, a.poise),
    majesty: floorHalf(a.poise, a.pres),
    resolve: floorHalf(a.str, a.wp),
    withstanding: floorHalf(a.str, a.end),
    healthBase: baseHealth(a.end),
    healthMax,
    healthCap: healthCap(a.end),
    movement: baseMovement(a.agi) + char.movementTree,
    tic: ticFromSteps(char.ticSteps),
    attackActions: 1 + char.extraAttackActions,
    moveActions: char.movementActions,
    dpMax: demesneDpPool(char),
    furyLabel,
    combatPool: 3 * char.tricks.length,
    socialPool: 3 * char.socialTricks.length,
    armorSoakBonus,
    armorDurBonus,
    shieldSoakBonus,
    shieldDurBonus,
    edgeOfDeath: a.end,
    demesneAccuracy,
    meleeAccuracy,
    rangedAccuracy,
    untrainedMelee,
    untrainedRanged,
    attrMatchMelee,
    attrMatchRanged,
    showDodge,
  };
}

export function spend(c: Character): SpendBreakdown {
  const char = migrateCharacter(c);
  const lines: SpendLine[] = [];
  const add = (key: string, label: string, essence: number) => {
    if (essence !== 0) lines.push({ key, label, essence });
  };

  for (const key of Object.keys(char.attributes) as Array<keyof typeof char.attributes>) {
    add(`attr-${key}`, ATTR_LABELS[key], stepCost(3, char.attributes[key]));
  }
  add("health", "Extra Health", char.purchasedHealth);
  add("dp", "Extra Demesne Points", char.purchasedDpEssence);
  add("move", "Movement", stepCost(5, char.movementTree));
  add("rphys", "Resist Physical", stepCost(5, char.resistPhysical));
  add("rall", "Resist Demesne (All)", stepCost(5, char.resistDemesneAll));
  for (const r of char.resistSpecific) {
    add(`rspec-${r.id}`, `Resist ${r.label}`, stepCost(1, r.tier));
  }
  add("move-act", "Movement Actions", stepCost(10, char.movementActions));
  add("atk-act", "Attack Actions", stepCost(20, char.extraAttackActions));
  add("tic", "Tic", stepCost(5, char.ticSteps));
  add("wp", "Weapon Proficiency", stepCost(5, char.wp.tier));
  add("armor", "Armor Proficiency", stepCost(5, char.armor.tier));
  add("shield", "Shield Proficiency", stepCost(3, char.shield.tier));
  char.demesnes.forEach((d) => {
    const els = treeElements(d);
    const label = els.map((el) => DEMESNE_META[el]?.name ?? el).join(" / ") || "Demesne";
    add(`dem-${d.id}`, label, stepCost(10, d.picks.length || d.tier));
  });
  add("tricks", "Combat Tricks", stepCost(3, char.tricks.length));
  add("social", "Social Tricks", stepCost(3, char.socialTricks.length));
  add("ath", "Athletics", stepCost(3, char.athletics.tier));
  add("sub", "Subterfuge", stepCost(3, char.subterfuge.tier));
  add("sub-addons", "Subterfuge add-ons", char.subterfugeAddons.length * 10);
  add("smith", "Smithing", stepCost(5, char.smith));
  add("harvest", "Harvest", stepCost(3, char.harvest));
  add("hunt", "Monster Hunting", stepCost(3, char.hunting));
  add("forage", "Foraging", stepCost(3, char.foraging));
  add("mine", "Mining", stepCost(3, char.mining));

  const spent = lines.reduce((n, l) => n + l.essence, 0);
  const granted = char.negativeTraits.reduce((n, t) => n + (Number(t.essence) || 0), 0);
  const generalBudget = char.startingEssence + char.earnedEssence + granted;

  const dedicatedLeft: Record<string, number> = { ...(char.earnedByKey ?? {}) };
  let generalSpent = 0;
  for (const line of lines) {
    let cost = line.essence;
    const ded = dedicatedLeft[line.key] ?? 0;
    const fromDed = Math.min(cost, ded);
    dedicatedLeft[line.key] = ded - fromDed;
    cost -= fromDed;
    generalSpent += cost;
  }
  const remaining = generalBudget - generalSpent;
  return {
    lines,
    spent,
    granted,
    budget: generalBudget,
    remaining,
    overspent: remaining < 0,
    generalBudget,
    dedicatedRemaining: dedicatedLeft,
  };
}

export function nextTierCost(step: number, currentTier: number): number {
  return incrementalCost(step, currentTier + 1);
}

export function remainingFor(s: SpendBreakdown, key?: string): number {
  if (!key) return s.remaining;
  return s.remaining + (s.dedicatedRemaining[key] ?? 0);
}

export function warnings(c: Character): string[] {
  const char = migrateCharacter(c);
  const w: string[] = [];
  const s = spend(char);
  if (s.overspent) w.push(`Overspent by ${-s.remaining} Essence.`);
  return w;
}

export function signed(n: number): string {
  if (n > 0) return `+${n}`;
  return String(n);
}
