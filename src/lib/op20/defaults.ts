import { uid } from "@/lib/utils";
import { airshipFreeHardpoints, emptyAttrs, relicSpend } from "./campaign";
import type { Airship, Character, GameTable, GearItem, Mob, Relic } from "./types";

export function emptyTracker() {
  return {
    currentHealth: 5,
    currentDp: 0,
    currentCp: 0,
    currentSp: 0,
    fatigue: 0,
    statuses: [] as string[],
    initiative: null as number | null,
    equippedWeaponId: null as string | null,
    notes: "",
  };
}

export function blankCharacter(partial: Partial<Character> = {}): Character {
  const now = new Date().toISOString();
  return {
    id: uid(),
    name: "",
    profession: "",
    bio: "",
    epoch: "",
    startingEssence: 100,
    earnedEssence: 0,
    earnedByKey: {},
    gildar: 0,
    airshipId: null,
    role: "player",
    attributes: {
      str: 0,
      agi: 0,
      end: 0,
      per: 0,
      intel: 0,
      wp: 0,
      poise: 0,
      pres: 0,
    },
    purchasedHealth: 0,
    purchasedDpEssence: 0,
    movementTree: 0,
    resistPhysical: 0,
    resistDemesneAll: 0,
    resistSpecific: [],
    movementActions: 0,
    extraAttackActions: 0,
    ticSteps: 0,
    wp: { tier: 0, types: [], picks: [] },
    armor: { weight: "", tier: 0, picks: [], bonuses: [] },
    shield: { weight: "", tier: 0, picks: [], bonuses: [] },
    demesnes: [],
    tricks: [],
    socialTricks: [],
    athletics: { tier: 0, picks: [] },
    subterfuge: { tier: 0, picks: [] },
    subterfugeAddons: [],
    smith: 0,
    harvest: 0,
    hunting: 0,
    foraging: 0,
    mining: 0,
    items: [],
    negativeTraits: [],
    notes: "",
    otherAbilities: "",
    tracker: emptyTracker(),
    sheetOpened: false,
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

export function makeItem(partial: Partial<GearItem> & { name: string; kind: GearItem["kind"] }): GearItem {
  return {
    id: uid(),
    essence: 0,
    abilities: "",
    equipped: false,
    ...partial,
  };
}

export function blankRelic(partial: Partial<Relic> = {}): Relic {
  const now = new Date().toISOString();
  return {
    id: uid(),
    name: "",
    kind: "weapon",
    bio: "",
    weaponType: "Sword",
    wv: 4,
    range: "",
    soak: 0,
    durability: 0,
    extraActions: 0,
    wpTier: 0,
    demesnes: [],
    extraDpEssence: 0,
    boundDp: 0,
    abilities: [],
    notes: "",
    listed: true,
    createdAt: now,
    updatedAt: now,
    ...partial,
    attributes: { ...emptyAttrs(), ...(partial.attributes ?? {}) },
  };
}

export function blankMob(partial: Partial<Mob> = {}): Mob {
  const now = new Date().toISOString();
  return {
    id: uid(),
    name: "",
    kind: "mob",
    bio: "",
    accuracy: 2,
    hits: 1,
    damage: 3,
    damageType: "Physical",
    movement: 4,
    special: "",
    packSize: 6,
    notes: "",
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

export function blankAirship(partial: Partial<Airship> = {}): Airship {
  const now = new Date().toISOString();
  const size = partial.size ?? 3;
  return {
    id: uid(),
    name: "",
    bio: "",
    size,
    crew: 1,
    hull: 10,
    carapace: 10,
    armor: 0,
    demesneResist: 0,
    hardpoints: airshipFreeHardpoints(size),
    thrust: 1,
    maneuver: 1,
    pods: [],
    notes: "",
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

export function blankTable(partial: Partial<GameTable> = {}): GameTable {
  const now = new Date().toISOString();
  return {
    id: uid(),
    name: "",
    notes: "",
    epoch: "",
    playerIds: [],
    npcIds: [],
    encounter: [],
    loot: [],
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

export function relicToGear(r: Relic): GearItem {
  return makeItem({
    name: r.name || "Relic",
    kind: r.kind,
    essence: relicSpend(r).spent,
    wv: r.wv || undefined,
    range: r.range || undefined,
    soak: r.soak || undefined,
    durability: r.durability || undefined,
    currentDurability: r.durability || undefined,
    weaponType: r.weaponType || undefined,
    relicId: r.id,
    abilities: [
      r.bio,
      r.abilities.map((a) => `${a.name}: ${a.text}`).join(" · "),
      r.notes,
    ]
      .filter(Boolean)
      .join("\n"),
    equipped: r.kind === "weapon" || r.kind === "armor" || r.kind === "shield",
  });
}
