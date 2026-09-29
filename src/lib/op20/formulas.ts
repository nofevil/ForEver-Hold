/** Incremental cost of the T-th tier for Step S: S * T */
export function incrementalCost(step: number, tier: number): number {
  if (tier <= 0) return 0;
  return step * tier;
}

/**
 * Total Essence to reach tier T from 0.
 * Total(T) = S * T * (T + 1) / 2
 */
export function stepCost(step: number, tier: number): number {
  if (tier <= 0) return 0;
  return (step * tier * (tier + 1)) / 2;
}

export function baseHealth(endurance: number): number {
  return 5 + endurance * 5;
}

export function healthCap(endurance: number): number {
  return 5 + endurance * 15;
}

export function maxPurchasedHealth(endurance: number): number {
  return endurance * 10;
}

export function baseMovement(agility: number): number {
  return Math.floor(agility / 2) + 4;
}

export function floorHalf(a: number, b: number): number {
  return Math.floor((a + b) / 2);
}

/** Tic 5 is free. Each step down is 5ST: 5 / 15 / 30 / 50 for Tic 4 / 3 / 2 / 1. */
export function ticFromSteps(steps: number): number {
  return Math.max(1, 5 - steps);
}

export function qualityBand(essence: number): "Common" | "Uncommon" | "Rare" | "Legendary" | "Mythic" {
  if (essence <= 20) return "Common";
  if (essence <= 50) return "Uncommon";
  if (essence <= 100) return "Rare";
  if (essence <= 250) return "Legendary";
  return "Mythic";
}

/** Common 1, Uncommon 2, Rare 3, Legendary 4, Mythic 5. */
export function qualityTier(essence: number): number {
  switch (qualityBand(essence)) {
    case "Common":
      return 1;
    case "Uncommon":
      return 2;
    case "Rare":
      return 3;
    case "Legendary":
      return 4;
    default:
      return 5;
  }
}

/** "Soak 2/Quality Tier" becomes the amount for the equipped item. */
export function fillQualityTier(text: string, essence: number | null, gear: "armor" | "shield"): string {
  if (!/\d+\s*\/\s*Quality\s+Tier/i.test(text)) return text;
  if (essence == null) return text.replace(/Quality\s+Tier/gi, `Quality Tier (equip ${gear})`);
  const amount = qualityTier(essence);
  const band = qualityBand(essence);
  return text.replace(/(\d+)\s*\/\s*Quality\s+Tier/gi, (_, n) => `${Number(n) * amount} · ${band}`);
}

/** Demesne point pool: 5ST per Demesne Tier + 2ST per listed attribute. */
export function demesnePool(dt: number, primary: number, secondary = 0): number {
  return stepCost(5, dt) + stepCost(2, Math.max(0, primary)) + stepCost(2, Math.max(0, secondary));
}

export function soakDurCost(value: number): number {
  return stepCost(1, value);
}

export function weaponValueCost(wv: number): number {
  return stepCost(2, wv);
}

/** Included reach. Melee adds 5' at 5ST. Bows add 10' at 2ST. */
export const MELEE_RANGE_FEET = 5;
export const RANGED_RANGE_FEET = 30;

export function isRangedWeaponType(type: string | undefined): boolean {
  return type === "Bow";
}

export function rangeIncrementFeet(type: string | undefined): number {
  return isRangedWeaponType(type) ? 10 : 5;
}

export function defaultRangeFeet(type: string | undefined): number {
  return isRangedWeaponType(type) ? RANGED_RANGE_FEET : MELEE_RANGE_FEET;
}

export function parseRangeFeet(range: string | undefined): number {
  const n = Number.parseInt(String(range ?? "").replace(/[^\d-]/g, ""), 10);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

export function formatRangeFeet(feet: number): string {
  return `${Math.max(0, Math.round(feet))}'`;
}

/** How many paid steps sit past the weapon’s included range. */
export function rangeExtraSteps(feet: number, type: string | undefined): number {
  return Math.max(0, Math.round((feet - defaultRangeFeet(type)) / rangeIncrementFeet(type)));
}

/** Melee reach past 5' is 5ST. Ranged reach past 30' is 2ST, same step as damage. */
export function rangeStep(type: string | undefined): number {
  return isRangedWeaponType(type) ? 2 : 5;
}

export function rangeCost(feet: number, type: string | undefined): number {
  return stepCost(rangeStep(type), rangeExtraSteps(feet, type));
}

/** Essence for the next increment. Undefined while that step is still inside the included range. */
export function nextRangeCost(feet: number, type: string | undefined): number | undefined {
  if (feet + rangeIncrementFeet(type) <= defaultRangeFeet(type)) return undefined;
  return incrementalCost(rangeStep(type), rangeExtraSteps(feet, type) + 1);
}

const STOCK_RANGES = new Set(["", "5'", "30'"]);
const MELEE_DAMAGE = 4;
const RANGED_DAMAGE = 3;

/** Swap in the weapon’s included range unless the relic already has a custom one. */
export function rangeForWeaponType(type: string | undefined, current?: string): string {
  const cur = (current ?? "").trim();
  if (!STOCK_RANGES.has(cur)) return cur;
  return formatRangeFeet(defaultRangeFeet(type));
}

/** A common bow is damage 3. The rest of that budget is the 30' range, so it does not also start at 4. */
export function damageForWeaponType(type: string | undefined, current: number): number {
  if (current !== MELEE_DAMAGE && current !== RANGED_DAMAGE) return current;
  return isRangedWeaponType(type) ? RANGED_DAMAGE : MELEE_DAMAGE;
}

export const AIRSHIP_SIZE_ESSENCE = [0, 500, 2500, 5000, 10000, 25000];

export function airshipThrustCost(size: number, thrust: number): number {
  return stepCost(20 * size, thrust);
}

export function airshipManeuverCost(size: number, maneuver: number): number {
  return stepCost(10 * size, maneuver);
}
