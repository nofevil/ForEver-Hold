import { uid } from "@/lib/utils";
import { makeJoinCode } from "@/lib/join-code";
import { airshipFreeHardpoints, commonRelicName, emptyAttrs, isStockRelicName, relicSpend } from "./campaign";
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
    targetId: "",
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
    dedicatedPaidByKey: {},
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
    smith: { tier: 0, picks: [] },
    harvest: { tier: 0, picks: [] },
    hunting: { tier: 0, picks: [] },
    foraging: { tier: 0, picks: [] },
    mining: { tier: 0, picks: [] },
    items: [],
    negativeTraits: [],
    notes: "",
    otherAbilities: "",
    boundDp: 0,
    boundEffects: [],
    channels: [],
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
  const relic: Relic = {
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
    movementActions: 0,
    purchasedHealth: 0,
    movementTree: 0,
    ticSteps: 0,
    resistPhysical: 0,
    resistDemesneAll: 0,
    resistSpecific: [],
    wpTier: 0,
    wpType: "",
    wpPicks: [],
    demesnes: [],
    extraDpEssence: 0,
    boundDp: 0,
    abilities: [],
    trees: [],
    notes: "",
    listed: true,
    epoch: "",
    armorWeight: "",
    createdAt: now,
    updatedAt: now,
    ...partial,
    attributes: { ...emptyAttrs(), ...(partial.attributes ?? {}) },
  };
  if ((!relic.name.trim() || isStockRelicName(relic.name)) && relicSpend(relic).spent <= 20) {
    relic.name = commonRelicName(relic);
  }
  return relic;
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
    joinCode: makeJoinCode(),
    invites: [],
    playerIds: [],
    npcIds: [],
    encounter: [],
    loot: [],
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

export function gearToRelic(item: GearItem): Relic {
  if (item.build) return item.build;
  const kind: Relic["kind"] =
    item.kind === "demesne" && (item.dp ?? 0) > 0 && !item.charm ? "crystal" : item.kind;
  return blankRelic({
    name: item.name,
    kind,
    weaponType: item.weaponType || (kind === "weapon" ? "Sword" : ""),
    wv: item.wv ?? (kind === "weapon" ? 4 : 0),
    range: item.range ?? "",
    soak: item.soak ?? (kind === "armor" || kind === "shield" ? 4 : 0),
    durability: item.durability ?? (kind === "armor" || kind === "shield" ? 4 : 0),
    extraActions: item.extraActions ?? 0,
    armorWeight: item.armorWeight || item.shieldWeight || "",
    extraDpEssence: kind === "crystal" ? Math.ceil((item.dp ?? 0) / 2) : 0,
    notes: "",
  });
}

export function applyItemBuild(item: GearItem, next: Relic): GearItem {
  const spent = relicSpend(next).spent;
  const gear = relicToGear(next);
  const credit = item.fromPool ? (item.poolCredit ?? 0) : (item.poolCredit ?? item.essence ?? 0);
  return {
    ...item,
    name: gear.name || item.name,
    kind: gear.kind,
    essence: spent,
    wv: gear.wv,
    range: gear.range,
    soak: gear.soak,
    durability: gear.durability,
    currentDurability: next.durability || item.currentDurability,
    weaponType: gear.weaponType,
    armorWeight: gear.armorWeight,
    shieldWeight: gear.shieldWeight,
    extraActions: gear.extraActions,
    grantHealth: gear.grantHealth,
    grantMovement: gear.grantMovement,
    grantTicSteps: gear.grantTicSteps,
    grantResistPhysical: gear.grantResistPhysical,
    grantResistDemesne: gear.grantResistDemesne,
    grantMoveActions: gear.grantMoveActions,
    grantResists: gear.grantResists,
    dp: gear.dp ?? item.dp,
    abilities: gear.abilities || item.abilities,
    fromPool: true,
    poolCredit: credit,
    build: next,
  };
}

export function relicToGear(r: Relic): GearItem {
  return makeItem({
    name: r.name || "Relic",
    kind: r.kind === "crystal" ? "demesne" : r.kind,
    essence: relicSpend(r).spent,
    wv: r.wv || undefined,
    range: r.range || undefined,
    soak: r.soak || undefined,
    durability: r.durability || undefined,
    currentDurability: r.durability || undefined,
    weaponType: r.weaponType || undefined,
    armorWeight: r.kind === "armor" && r.armorWeight ? r.armorWeight : undefined,
    shieldWeight: r.kind === "shield" && r.armorWeight ? r.armorWeight : undefined,
    extraActions: r.extraActions || undefined,
    grantHealth: r.purchasedHealth || undefined,
    grantMovement: r.movementTree || undefined,
    grantTicSteps: r.ticSteps || undefined,
    grantResistPhysical: r.resistPhysical || undefined,
    grantResistDemesne: r.resistDemesneAll || undefined,
    grantMoveActions: r.movementActions || undefined,
    grantResists: r.resistSpecific?.length
      ? r.resistSpecific.map((row) => ({ label: row.label, tier: row.tier }))
      : undefined,
    boundDp: r.boundDp || undefined,
    dp: r.kind === "crystal" ? r.extraDpEssence * 2 || undefined : undefined,
    relicId: r.id,
    abilities: [
      r.bio,
      r.abilities.map((a) => `${a.name}: ${a.text}`).join(" · "),
      r.notes,
    ]
      .filter(Boolean)
      .join("\n"),
    equipped: false,
  });
}
