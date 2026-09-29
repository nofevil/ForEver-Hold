import {
  ATHLETICS,
  DEMESNE_META,
  MONSTER_HUNTING,
  SMITHING,
  SMITH_MAX,
  SUBTERFUGE,
  SUBTERFUGE_ADDONS,
  armorSkillsForWeights,
  findAbility,
  shieldSkillsForWeights,
  wpSkillsForTypes,
} from "./catalogs";
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
import { liveBound } from "./sustain";
import type {
  ArmorWeight,
  Character,
  DemesneElement,
  DerivedStats,
  GearItem,
  SpendBreakdown,
  SpendLine,
  WeaponType,
} from "./types";
import { ATTR_KEYS, ATTR_LABELS, ARMOR_WEIGHTS, CORE_DEMESNE_ELEMENTS, MELEE_WEAPON_TYPES, RANGED_WEAPON_TYPES } from "./types";

export function treeElements(tree: { picks: Array<{ element?: DemesneElement }> }): DemesneElement[] {
  const seen: DemesneElement[] = [];
  for (const p of tree.picks) {
    if (p.element && !seen.includes(p.element)) seen.push(p.element);
  }
  return seen;
}

export function hasDemesneTier(c: Character): boolean {
  return c.demesnes.some((d) => (d.picks?.length || d.tier) > 0);
}

export function proficientWeaponTypes(c: Character): WeaponType[] {
  const extra = (c.wp.picks ?? [])
    .filter((p) => p.abilityId?.startsWith("type:"))
    .map((p) => p.abilityId.slice(5) as WeaponType);
  const listed = c.wp.types ?? [];
  return [...new Set([...listed, ...extra].filter(Boolean))] as WeaponType[];
}

export function syncWeaponProficiency(w: Character["wp"]): Character["wp"] {
  const extra = (w.picks ?? [])
    .filter((p) => p.abilityId?.startsWith("type:"))
    .map((p) => p.abilityId.slice(5) as WeaponType);
  const first = w.types[0];
  const types = [...new Set([first, ...extra].filter(Boolean))] as WeaponType[];
  return { ...w, types };
}

function extraWeightsFromPicks(picks: Array<{ abilityId?: string }> | undefined): ArmorWeight[] {
  return (picks ?? [])
    .filter((p) => p.abilityId?.startsWith("type:"))
    .map((p) => p.abilityId!.slice(5) as ArmorWeight)
    .filter((w): w is ArmorWeight => (ARMOR_WEIGHTS as readonly string[]).includes(w));
}

export function proficientArmorWeights(c: Character): ArmorWeight[] {
  const first = c.armor.weight;
  const list = [first, ...extraWeightsFromPicks(c.armor.picks)].filter(
    (w): w is ArmorWeight => (ARMOR_WEIGHTS as readonly string[]).includes(w),
  );
  return [...new Set(list)];
}

export function proficientShieldWeights(c: Character): ArmorWeight[] {
  const first = c.shield.weight;
  const list = [first, ...extraWeightsFromPicks(c.shield.picks)].filter(
    (w): w is ArmorWeight => (ARMOR_WEIGHTS as readonly string[]).includes(w),
  );
  return [...new Set(list)];
}

export function capForWeight(a: Character["attributes"], w: ArmorWeight): number {
  if (w === "light") return a.agi;
  if (w === "medium") return a.str;
  return a.str + a.end;
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
  if (hasDemesneTier(char)) total += char.purchasedDpEssence * 2;
  return total;
}

export function hasAthleticsDodge(c: Character): boolean {
  return c.athletics.picks.some((p) => p.abilityId === "dodge");
}

export function equippedWeapon(c: Character): GearItem | undefined {
  if (c.tracker.equippedWeaponId) {
    const found = c.items.find((i) => i.id === c.tracker.equippedWeaponId && i.kind === "weapon");
    if (found?.equipped) return found;
  }
  return c.items.find((i) => i.kind === "weapon" && i.equipped);
}

export function equippedArmor(c: Character): GearItem | undefined {
  return c.items.find((i) => i.kind === "armor" && i.equipped);
}

export function equippedShield(c: Character): GearItem | undefined {
  return c.items.find((i) => i.kind === "shield" && i.equipped);
}

export function isArmorProficient(c: Character, weight: ArmorWeight | "" | undefined): boolean {
  if (!weight) return false;
  return proficientArmorWeights(c).includes(weight);
}

export function isShieldProficient(c: Character, weight: ArmorWeight | "" | undefined): boolean {
  if (!weight) return false;
  return proficientShieldWeights(c).includes(weight);
}

export function equipReason(c: Character, item: GearItem): string | null {
  if (item.kind === "armor") {
    if (!item.armorWeight) return "Choose Light, Medium, or Heavy before equipping.";
    if (!isArmorProficient(c, item.armorWeight)) {
      return "You do not have the proficiency required to equip this armor.";
    }
  }
  if (item.kind === "shield") {
    if (!item.shieldWeight) return "Choose Light, Medium, or Heavy before equipping.";
    if (!isShieldProficient(c, item.shieldWeight)) {
      return "You do not have the proficiency required to equip this shield.";
    }
  }
  return null;
}

export function boundDpOf(c: Character): number {
  const fromItems = (c.items ?? [])
    .filter((i) => i.equipped)
    .reduce((n, i) => n + (i.boundDp ?? 0), 0);
  const fromEffects = (c.boundEffects ?? []).reduce((n, e) => n + liveBound(c, e).dp, 0);
  return Math.max(0, (c.boundDp ?? 0) + fromItems + fromEffects);
}

export function fillResources(c: Character): Character {
  const d = derive(c);
  return {
    ...c,
    tracker: {
      ...c.tracker,
      currentHealth: d.healthMax,
      currentDp: d.dpMax,
      currentCp: d.combatPool,
      currentSp: d.socialPool,
    },
  };
}

export function autoEquipItems(c: Character): Character {
  let next = c;
  for (const kind of ["weapon", "armor", "shield"] as const) {
    if (next.items.some((i) => i.kind === kind && i.equipped)) continue;
    const candidate = next.items.find((i) => i.kind === kind && !equipReason(next, i));
    if (candidate) next = setItemEquipped(next, candidate.id, true);
  }
  return next;
}

export function setItemEquipped(c: Character, itemId: string, equipped: boolean): Character {
  const item = c.items.find((i) => i.id === itemId);
  if (!item) return c;
  if (equipped) {
    const reason = equipReason(c, item);
    if (reason) return c;
  }
  const exclusive = item.kind === "armor" || item.kind === "shield" || item.kind === "weapon";
  const items = c.items.map((i) => {
    if (i.id === itemId) return { ...i, equipped };
    if (equipped && exclusive && i.kind === item.kind) return { ...i, equipped: false };
    return i;
  });
  let equippedWeaponId = c.tracker.equippedWeaponId;
  if (item.kind === "weapon") {
    equippedWeaponId = equipped ? itemId : equippedWeaponId === itemId ? null : equippedWeaponId;
  }
  return { ...c, items, tracker: { ...c.tracker, equippedWeaponId } };
}

export function isProficient(c: Character, type: WeaponType | undefined): boolean {
  if (!type) return false;
  return proficientWeaponTypes(c).includes(type);
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
  const types = proficientWeaponTypes(c);
  const hasMelee = types.some((t) => (MELEE_WEAPON_TYPES as readonly string[]).includes(t));
  const hasRanged = types.some((t) => (RANGED_WEAPON_TYPES as readonly string[]).includes(t));
  if (hasMelee && hasRanged) return Math.min(melee, ranged);
  if (hasRanged && !hasMelee) return ranged;
  if (hasMelee) return melee;
  return Math.max(melee, ranged);
}

export function maxArmorProficiency(c: Character): number {
  const a = c.attributes;
  const weights = proficientArmorWeights(c);
  if (weights.length === 0) return Math.max(a.agi, a.str, a.str + a.end);
  return Math.min(...weights.map((w) => capForWeight(a, w)));
}

export function maxShieldProficiency(c: Character): number {
  const a = c.attributes;
  const weights = proficientShieldWeights(c);
  if (weights.length === 0) return Math.max(a.agi, a.str, a.str + a.end);
  return Math.min(...weights.map((w) => capForWeight(a, w)));
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

/** Flat CP/SP from an ability that says "Gain N CP" or "Gain N SP". Not 3 × tier. */
function grantedFromText(text: string | undefined, pool: "CP" | "SP"): number {
  const match = text?.match(new RegExp(`^Gain (\\d+) ${pool}\\b`, "i"));
  return match ? Number(match[1]) : 0;
}

function grantedPool(c: Character, pool: "CP" | "SP"): number {
  const texts: Array<string | undefined> = [];
  const wp = wpSkillsForTypes([...MELEE_WEAPON_TYPES, ...RANGED_WEAPON_TYPES]);
  for (const p of c.wp.picks) {
    if (!p.abilityId || p.abilityId.startsWith("type:")) continue;
    texts.push(findAbility(wp, p.abilityId)?.text);
  }
  const armor = armorSkillsForWeights([...ARMOR_WEIGHTS]);
  for (const p of c.armor.picks) {
    if (!p.abilityId || p.abilityId.startsWith("type:")) continue;
    texts.push(findAbility(armor, p.abilityId)?.text);
  }
  const shield = shieldSkillsForWeights([...ARMOR_WEIGHTS]);
  for (const p of c.shield.picks) {
    if (!p.abilityId || p.abilityId.startsWith("type:")) continue;
    texts.push(findAbility(shield, p.abilityId)?.text);
  }
  const simple = [
    [ATHLETICS, c.athletics.picks],
    [SUBTERFUGE, c.subterfuge.picks],
    [MONSTER_HUNTING, c.hunting.picks],
    [SMITHING, c.smith.picks],
  ] as const;
  for (const [list, picks] of simple) {
    for (const p of picks) texts.push(findAbility(list, p.abilityId)?.text);
  }
  return texts.reduce((n, text) => n + grantedFromText(text, pool), 0);
}

export function derive(c: Character): DerivedStats {
  const char = migrateCharacter(c);
  const a = char.attributes;
  const prowess = floorHalf(a.str, a.agi);
  const precision = floorHalf(a.agi, a.per);
  // Dodge is not shown as a derived stat. The roll, when the ability is taken, is Precision + Athletics tier.
  const dodge = precision;
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
  const wornArmor = equippedArmor(char);
  const wornShield = equippedShield(char);
  const armorApplies = Boolean(wornArmor && isArmorProficient(char, wornArmor.armorWeight));
  const shieldApplies = Boolean(wornShield && isShieldProficient(char, wornShield.shieldWeight));
  const armorSoak = wornArmor ? (wornArmor.soak ?? 0) + (armorApplies ? armorSoakBonus : 0) : 0;
  const armorDur = wornArmor ? (wornArmor.durability ?? 0) + (armorApplies ? armorDurBonus : 0) : 0;
  const shieldSoak = wornShield ? (wornShield.soak ?? 0) + (shieldApplies ? shieldSoakBonus : 0) : 0;
  const shieldDur = wornShield ? (wornShield.durability ?? 0) + (shieldApplies ? shieldDurBonus : 0) : 0;
  const itemActions = char.items
    .filter((i) => i.equipped)
    .reduce((n, i) => n + (i.extraActions ?? 0), 0);
  const dpPool = demesneDpPool(char);
  const boundDp = Math.min(boundDpOf(char), dpPool);

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
    ingenuity: floorHalf(a.str, a.intel),
    healthBase: baseHealth(a.end),
    healthMax,
    healthCap: healthCap(a.end),
    movement: baseMovement(a.agi) + char.movementTree,
    tic: ticFromSteps(char.ticSteps),
    attackActions: 1 + char.extraAttackActions + itemActions,
    moveActions: 1 + char.movementActions,
    dpMax: Math.max(0, dpPool - boundDp),
    dpPool,
    boundDp,
    combatPool: 3 * char.tricks.length + grantedPool(char, "CP"),
    socialPool: 3 * char.socialTricks.length + grantedPool(char, "SP"),
    armorSoakBonus,
    armorDurBonus,
    shieldSoakBonus,
    shieldDurBonus,
    armorSoak,
    armorDur,
    shieldSoak,
    shieldDur,
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
  add("move-act", "Extra Movement Actions", stepCost(10, char.movementActions));
  add("atk-act", "Extra Attack Actions", stepCost(20, char.extraAttackActions));
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
  add("smith", "Smithing", stepCost(5, char.smith.tier));
  add("harvest", "Harvest", stepCost(3, char.harvest));
  add("hunt", "Monster Hunting", stepCost(3, char.hunting.tier));
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

/**
 * Leftover starting Essence plus leftover general earned (and trait grants).
 * Dedicated ability/weapon grants are not included — those only buy their key.
 */
export function availableEssence(c: Character): number {
  return spend(c).remaining;
}

/** Dedicated Essence granted for a specific spend key. */
export function dedicatedEarned(c: Character): number {
  return Object.values(c.earnedByKey ?? {}).reduce((n, v) => n + (Number(v) || 0), 0);
}

/** Essence earned onto items (weapons, armor, relics). */
export function itemEarned(c: Character): number {
  return (c.items ?? []).reduce((n, i) => n + (Number(i.earnedEssence) || 0), 0);
}

/**
 * All Essence this character has ever received — starting, general earned,
 * dedicated ability/weapon grants, item grants, and negative-trait Essence.
 * Spent Essence is already part of that total; this is the “level” number.
 */
export function totalEssence(c: Character): number {
  const char = migrateCharacter(c);
  const granted = char.negativeTraits.reduce((n, t) => n + (Number(t.essence) || 0), 0);
  return char.startingEssence + char.earnedEssence + dedicatedEarned(char) + itemEarned(char) + granted;
}

export function nextTierCost(step: number, currentTier: number): number {
  return incrementalCost(step, currentTier + 1);
}

export function remainingFor(s: SpendBreakdown, key?: string): number {
  if (!key) return s.remaining;
  return s.remaining + (s.dedicatedRemaining[key] ?? 0);
}

/** True when the character can afford at least one next purchase. */
export function canSpendEssence(c: Character): boolean {
  const char = migrateCharacter(c);
  const s = spend(char);
  const ok = (key: string, cost: number, allowed = true) =>
    Boolean(allowed && cost > 0 && remainingFor(s, key) >= cost);

  const a = char.attributes;
  for (const key of ATTR_KEYS) {
    if (a[key] < 8 && ok(`attr-${key}`, nextTierCost(3, a[key]))) return true;
  }
  if (ok("health", 1, char.purchasedHealth < maxPurchasedHealth(a.end))) return true;
  if (ok("dp", 1, hasDemesneTier(char) && char.purchasedDpEssence < 40)) return true;
  if (ok("move", nextTierCost(5, char.movementTree))) return true;
  if (ok("tic", nextTierCost(5, char.ticSteps), char.ticSteps < 4)) return true;
  if (ok("rphys", nextTierCost(5, char.resistPhysical))) return true;
  if (ok("rall", nextTierCost(5, char.resistDemesneAll))) return true;
  if (ok("", 1, char.resistSpecific.length < CORE_DEMESNE_ELEMENTS.length)) return true;
  for (const r of char.resistSpecific) {
    if (ok(`rspec-${r.id}`, nextTierCost(1, r.tier))) return true;
  }
  if (ok("atk-act", nextTierCost(20, char.extraAttackActions), char.extraAttackActions < 3)) return true;
  if (ok("move-act", nextTierCost(10, char.movementActions), char.movementActions < 3)) return true;
  if (ok("wp", nextTierCost(5, char.wp.tier), char.wp.tier < Math.min(8, maxWeaponProficiency(char)))) {
    return true;
  }
  if (ok("armor", nextTierCost(5, char.armor.tier), char.armor.tier < Math.min(8, maxArmorProficiency(char)))) {
    return true;
  }
  if (ok("shield", nextTierCost(3, char.shield.tier), char.shield.tier < Math.min(8, maxShieldProficiency(char)))) {
    return true;
  }
  for (const d of char.demesnes) {
    const t = d.picks.length || d.tier;
    if (ok(`dem-${d.id}`, nextTierCost(10, t))) return true;
  }
  if (char.demesnes.length < 2 && s.remaining >= 10) return true;
  if (ok("tricks", nextTierCost(3, char.tricks.length))) return true;
  if (ok("social", nextTierCost(3, char.socialTricks.length))) return true;
  if (ok("ath", nextTierCost(3, char.athletics.tier))) return true;
  if (ok("sub", nextTierCost(3, char.subterfuge.tier))) return true;
  if (ok("sub-addons", 10, char.subterfugeAddons.length < SUBTERFUGE_ADDONS.length)) return true;
  if (ok("smith", nextTierCost(5, char.smith.tier), char.smith.tier < SMITH_MAX)) return true;
  if (ok("harvest", nextTierCost(3, char.harvest))) return true;
  if (ok("hunt", nextTierCost(3, char.hunting.tier), char.hunting.tier < MONSTER_HUNTING.length)) return true;
  if (ok("forage", nextTierCost(3, char.foraging))) return true;
  if (ok("mine", nextTierCost(3, char.mining))) return true;
  return false;
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
