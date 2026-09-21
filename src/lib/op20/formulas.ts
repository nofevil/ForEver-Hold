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

export const AIRSHIP_SIZE_ESSENCE = [0, 500, 2500, 5000, 10000, 25000];

export function airshipThrustCost(size: number, thrust: number): number {
  return stepCost(20 * size, thrust);
}

export function airshipManeuverCost(size: number, maneuver: number): number {
  return stepCost(10 * size, maneuver);
}
