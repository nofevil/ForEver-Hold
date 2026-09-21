import { DEMESNE_META } from "./catalogs";
import {
  AIRSHIP_SIZE_ESSENCE,
  airshipManeuverCost,
  airshipThrustCost,
  qualityBand,
  stepCost,
} from "./formulas";
import type {
  Airship,
  AirshipPod,
  AirshipPodType,
  AttrKey,
  Mob,
  Relic,
  SpendBreakdown,
  SpendLine,
} from "./types";
import { ATTR_KEYS, ATTR_LABELS } from "./types";

export const AIRSHIP_POD_META: Record<
  AirshipPodType,
  { name: string; text: string; cost: (size: number) => number }
> = {
  ballista: {
    name: "Ballista",
    text: "10 WV, 100' range.",
    cost: () => 165,
  },
  burst: {
    name: "Burst Pod",
    text: "Double movement speed for 10 rounds. 100 Essence × Size.",
    cost: (size) => 100 * size,
  },
  cargo: {
    name: "Cargo Pod",
    text: "250 lb of supplies or goods.",
    cost: () => 100,
  },
  drop: {
    name: "Drop Pod",
    text: "Disposable fast deploy.",
    cost: () => 100,
  },
  rudder: {
    name: "Rudder Pod",
    text: "Reduce turn distance by 3. 100 Essence × Size.",
    cost: (size) => 100 * size,
  },
  dock: {
    name: "Ship Dock",
    text: "Dock a smaller craft or launch boat.",
    cost: () => 100,
  },
};

export function relicDp(r: Relic): { total: number; available: number } {
  let total = r.extraDpEssence * 2;
  for (const d of r.demesnes) {
    if (d.tier <= 0) continue;
    const meta = DEMESNE_META[d.element];
    const primary = meta ? r.attributes[meta.dpAttr] : 0;
    const second = meta?.dpAttr2 ? r.attributes[meta.dpAttr2] : 0;
    total += stepCost(5, d.tier) + stepCost(2, primary) + (meta?.dpAttr2 ? stepCost(2, second) : 0);
  }
  return { total, available: Math.max(0, total - r.boundDp) };
}

export function relicSpend(r: Relic): SpendBreakdown {
  const lines: SpendLine[] = [];
  const add = (key: string, label: string, essence: number) => {
    if (essence !== 0) lines.push({ key, label, essence });
  };
  add("wv", "Weapon Value", stepCost(2, r.wv));
  add("soak", "Soak", stepCost(1, r.soak));
  add("dur", "Durability", stepCost(1, r.durability));
  add("wp", "Weapon Proficiency", stepCost(5, r.wpTier));
  add("act", "Extra Actions", stepCost(20, r.extraActions));
  for (const k of ATTR_KEYS) {
    add(`attr-${k}`, ATTR_LABELS[k], stepCost(3, r.attributes[k]));
  }
  for (const d of r.demesnes) {
    add(`dem-${d.element}`, `Demesne (${DEMESNE_META[d.element]?.name ?? d.element})`, stepCost(10, d.tier));
  }
  add("dp", "Extra Demesne Points", r.extraDpEssence);
  r.abilities.forEach((a, i) => add(`ab-${a.id || i}`, a.name || "Ability", a.essence));
  const spent = lines.reduce((s, l) => s + l.essence, 0);
  return {
    lines,
    spent,
    granted: 0,
    budget: spent,
    remaining: 0,
    overspent: false,
    generalBudget: spent,
    dedicatedRemaining: {},
  };
}

export function relicQuality(r: Relic): ReturnType<typeof qualityBand> {
  return qualityBand(relicSpend(r).spent);
}

export function emptyAttrs(): Record<AttrKey, number> {
  return { str: 0, agi: 0, end: 0, per: 0, intel: 0, wp: 0, poise: 0, pres: 0 };
}

export function mobThreat(m: Mob): string {
  if (m.kind === "named") return "Named";
  const score = m.accuracy + m.damage + m.hits * 3;
  if (m.hits >= 3) return "Named-grade";
  if (score <= 8) return "Rabble";
  if (score <= 12) return "Hardened";
  return "Elite";
}

export function airshipFreeHardpoints(size: number): number {
  return Math.max(0, size);
}

export function airshipMaxPods(size: number): number {
  return Math.max(0, size * 2);
}

export function podCost(pod: AirshipPod, size: number): number {
  return AIRSHIP_POD_META[pod.type]?.cost(size) ?? 0;
}

export function airshipSpend(ship: Airship): SpendBreakdown {
  const size = Math.max(1, Math.min(5, ship.size));
  const lines: SpendLine[] = [];
  const add = (key: string, label: string, essence: number) => {
    if (essence !== 0) lines.push({ key, label, essence });
  };
  add("crew", "Crew Quarters", stepCost(10, ship.crew));
  add("hull", "Hull", stepCost(1, ship.hull));
  add("carapace", "Carapace", stepCost(1, ship.carapace));
  add("armor", "Armor", stepCost(5, ship.armor));
  add("resist", "Demesne Resist", stepCost(5, ship.demesneResist));
  const extraHp = Math.max(0, ship.hardpoints - airshipFreeHardpoints(size));
  add("hp", "Extra Hardpoints", extraHp * 250);
  add("thrust", "Thrust", airshipThrustCost(size, ship.thrust));
  add("maneuver", "Maneuver", airshipManeuverCost(size, ship.maneuver));
  ship.pods.forEach((p, i) => add(`pod-${p.id || i}`, AIRSHIP_POD_META[p.type].name, podCost(p, size)));
  const spent = lines.reduce((s, l) => s + l.essence, 0);
  const band = AIRSHIP_SIZE_ESSENCE[size] ?? 0;
  return {
    lines,
    spent,
    granted: 0,
    budget: band,
    remaining: band - spent,
    overspent: spent > band && size < 5,
    generalBudget: band,
    dedicatedRemaining: {},
  };
}

export function airshipWarnings(ship: Airship): string[] {
  const w: string[] = [];
  const size = Math.max(1, Math.min(5, ship.size));
  const maxPods = airshipMaxPods(size);
  const free = airshipFreeHardpoints(size);
  if (ship.hardpoints < ship.pods.length) {
    w.push(`Need ${ship.pods.length} hardpoints for the current pods (have ${ship.hardpoints}).`);
  }
  if (ship.pods.length > maxPods) {
    w.push(`Size ${size} ships cap at ${maxPods} pods (2 per size tier).`);
  }
  if (ship.hardpoints > maxPods) {
    w.push(`Size ${size} ships cap at ${maxPods} hardpoints.`);
  }
  if (ship.hardpoints < free) {
    w.push(`Size ${size} includes ${free} free hardpoints.`);
  }
  const s = airshipSpend(ship);
  if (s.spent > s.budget && size < 5) {
    w.push(`Spent ${s.spent} Essence — above the Size ${size} band of ${s.budget}. Consider Size ${size + 1}.`);
  }
  return w;
}

export function relicWarnings(r: Relic): string[] {
  const w: string[] = [];
  const spent = relicSpend(r).spent;
  if (spent > 500) w.push("Over 500 Essence — beyond the Mythic band.");
  if (r.kind === "weapon" && r.wv <= 0) w.push("Weapons need a Weapon Value.");
  if ((r.kind === "armor" || r.kind === "shield") && r.soak <= 0) w.push("Armor and shields need Soak.");
  if (r.boundDp > relicDp(r).total) w.push("Bound DP exceeds the item’s DP pool.");
  return w;
}

export const MOB_PRESETS: Array<Omit<Mob, "id" | "createdAt" | "updatedAt">> = [
  {
    name: "Conscripted Militia",
    kind: "mob",
    bio: "Average guards, goblins, or pressed townsfolk.",
    accuracy: 2,
    hits: 1,
    damage: 3,
    damageType: "Physical",
    movement: 4,
    special: "Any successful attack kills one hit.",
    packSize: 8,
    notes: "Base mob. Use in numbers. Flank and rear bonuses still apply.",
  },
  {
    name: "Elite Soldiers",
    kind: "mob",
    bio: "Palace guard or veteran line infantry.",
    accuracy: 4,
    hits: 1,
    damage: 5,
    damageType: "Physical",
    movement: 5,
    special: "Higher accuracy. Still one hit apiece.",
    packSize: 6,
    notes: "",
  },
  {
    name: "Knights of the Hall",
    kind: "mob",
    bio: "A handful of armored retainers. Track the extra hit.",
    accuracy: 4,
    hits: 2,
    damage: 6,
    damageType: "Physical",
    movement: 4,
    special: "2 Hits. Limited numbers — do not field a horde of these.",
    packSize: 6,
    notes: "2 Hits is the recommended ceiling for mob toughness.",
  },
  {
    name: "Hill Giants",
    kind: "mob",
    bio: "Big, slow, and ugly. Still a mob if you do not want a full sheet.",
    accuracy: 3,
    hits: 2,
    damage: 8,
    damageType: "Physical",
    movement: 6,
    special: "Reach 10'. Knock prone on +10.",
    packSize: 3,
    notes: "",
  },
  {
    name: "Swarm of Spiders",
    kind: "mob",
    bio: "A square of Swarm. From the Age after Darkness.",
    accuracy: 3,
    hits: 2,
    damage: 3,
    damageType: "Venom",
    movement: 4,
    special:
      "Covers one square. Destroyed only by Elemental or Light (2 hits). Any creature it passes: Tier vs Strength or Webbed; Tier vs Endurance or Poison Tier.",
    packSize: 4,
    notes: "A Past Forgotten. A Swarm Witch often brings 4.",
  },
  {
    name: "Magnetism Pawn",
    kind: "named",
    bio: "A construct remnant hunting metal that should no longer exist.",
    accuracy: 5,
    hits: 3,
    damage: 6,
    damageType: "Magnetism",
    movement: 5,
    special: "Drawn to metal weapons and relics. On +10, yank a metal item 10'.",
    packSize: 1,
    notes: "Use as a named encounter, not a horde.",
  },
];

export const RELIC_PRESETS: Array<Omit<Relic, "id" | "createdAt" | "updatedAt">> = [];
