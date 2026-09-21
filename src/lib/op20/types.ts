export const ATTR_KEYS = [
  "str",
  "agi",
  "end",
  "per",
  "intel",
  "wp",
  "poise",
  "pres",
] as const;

export type AttrKey = (typeof ATTR_KEYS)[number];

export const ATTR_LABELS: Record<AttrKey, string> = {
  str: "Strength",
  agi: "Agility",
  end: "Endurance",
  per: "Perception",
  intel: "Intellect",
  wp: "Willpower",
  poise: "Poise",
  pres: "Presence",
};

export const ATTR_ABBR: Record<AttrKey, string> = {
  str: "Str",
  agi: "Agi",
  end: "End",
  per: "Per",
  intel: "Int",
  wp: "WP",
  poise: "Poi",
  pres: "Pre",
};

export const WEAPON_TYPES = [
  "Sword",
  "Axe",
  "Bow",
  "Thrown",
  "Gauntlet",
  "Maul",
  "Claws",
  "Flail",
] as const;
export type WeaponType = (typeof WEAPON_TYPES)[number];

export const MELEE_WEAPON_TYPES: WeaponType[] = [
  "Sword",
  "Axe",
  "Thrown",
  "Gauntlet",
  "Maul",
  "Claws",
  "Flail",
];

export const RANGED_WEAPON_TYPES: WeaponType[] = ["Bow", "Thrown"];

/** Core courts shown in the creator. Lava stays in catalogs for older records. */
export const CORE_DEMESNE_ELEMENTS = ["air", "fire", "earth", "water"] as const;
export const DEMESNE_ELEMENTS = ["air", "fire", "earth", "water", "lava"] as const;
export type DemesneElement = (typeof DEMESNE_ELEMENTS)[number];
export type CoreDemesneElement = (typeof CORE_DEMESNE_ELEMENTS)[number];

export const ARMOR_WEIGHTS = ["light", "medium", "heavy"] as const;
export type ArmorWeight = (typeof ARMOR_WEIGHTS)[number];

export type GearKind = "weapon" | "armor" | "shield" | "demesne" | "other";

export type TrickCategory =
  | "axemaster"
  | "swordmaster"
  | "rangemaster"
  | "skirmish"
  | "movement"
  | "combat"
  | "defensive";

export type Desk = "company" | "relics" | "hostiles" | "keels" | "story";

export type CharacterRole = "player" | "npc";

export interface TreePick {
  tier: number;
  abilityId: string;
}

export interface WeaponProficiency {
  tier: number;
  types: WeaponType[];
  /** One entry per WP tier. abilityId may be a skill id or `type:Bow`. */
  picks: TreePick[];
}

export interface ArmorTree {
  weight: ArmorWeight | "";
  tier: number;
  picks: TreePick[];
  bonuses: Array<"soak" | "durability">;
}

export interface ShieldTree {
  weight: ArmorWeight | "";
  tier: number;
  picks: TreePick[];
  bonuses: Array<"soak" | "durability">;
}

export interface DemesnePick {
  tier: number;
  element: DemesneElement;
  abilityId: string;
}

export interface DemesneTree {
  id: string;
  /** Overall tree tier = number of picks. */
  tier: number;
  picks: DemesnePick[];
  /** @deprecated old records stored a single element on the tree. */
  element?: DemesneElement;
}

export interface SimpleTree {
  tier: number;
  picks: TreePick[];
}

export interface TrickPick {
  id: string;
  category: TrickCategory;
  abilityId: string;
}

export interface SocialPick {
  id: string;
  abilityId: string;
}

export interface GearItem {
  id: string;
  name: string;
  kind: GearKind;
  essence: number;
  wv?: number;
  range?: string;
  soak?: number;
  durability?: number;
  currentDurability?: number;
  weaponType?: WeaponType;
  armorWeight?: ArmorWeight;
  shieldWeight?: ArmorWeight;
  armorPattern?: string;
  shieldPattern?: string;
  plus10?: string;
  fatigue?: string;
  abilities: string;
  equipped: boolean;
  relicId?: string;
  earnedEssence?: number;
}

export interface NegativeTrait {
  id: string;
  name: string;
  essence: number;
  notes: string;
}

export interface ResistSpecific {
  id: string;
  label: string;
  tier: number;
}

export interface TrackerState {
  currentHealth: number;
  currentDp: number;
  currentCp: number;
  currentSp: number;
  fatigue: number;
  statuses: string[];
  initiative: number | null;
  equippedWeaponId: string | null;
  notes: string;
}

export interface Character {
  id: string;
  name: string;
  profession: string;
  bio: string;
  epoch: string;
  startingEssence: number;
  /** Unassigned general Essence (sessions, quests, SM grants). */
  earnedEssence: number;
  /** Essence that can only buy the matching spend key. */
  earnedByKey: Record<string, number>;
  gildar: number;
  airshipId: string | null;
  role: CharacterRole;
  attributes: Record<AttrKey, number>;
  purchasedHealth: number;
  purchasedDpEssence: number;
  movementTree: number;
  resistPhysical: number;
  resistDemesneAll: number;
  resistSpecific: ResistSpecific[];
  movementActions: number;
  extraAttackActions: number;
  ticSteps: number;
  wp: WeaponProficiency;
  armor: ArmorTree;
  shield: ShieldTree;
  demesnes: DemesneTree[];
  tricks: TrickPick[];
  socialTricks: SocialPick[];
  athletics: SimpleTree;
  subterfuge: SimpleTree;
  subterfugeAddons: string[];
  smith: number;
  harvest: number;
  hunting: number;
  foraging: number;
  mining: number;
  items: GearItem[];
  negativeTraits: NegativeTrait[];
  notes: string;
  otherAbilities: string;
  tracker: TrackerState;
  /** False until the player clicks Open sheet after creation. Missing = already opened. */
  sheetOpened?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DerivedStats {
  prowess: number;
  precision: number;
  dodge: number;
  dodgeWithAthletics: number;
  discernment: number;
  forceOfWill: number;
  fortitude: number;
  reflex: number;
  aura: number;
  majesty: number;
  resolve: number;
  withstanding: number;
  healthBase: number;
  healthMax: number;
  healthCap: number;
  movement: number;
  tic: number;
  attackActions: number;
  moveActions: number;
  dpMax: number;
  furyLabel: boolean;
  combatPool: number;
  socialPool: number;
  armorSoakBonus: number;
  armorDurBonus: number;
  shieldSoakBonus: number;
  shieldDurBonus: number;
  edgeOfDeath: number;
  demesneAccuracy: number;
  meleeAccuracy: number;
  rangedAccuracy: number;
  untrainedMelee: boolean;
  untrainedRanged: boolean;
  attrMatchMelee: boolean;
  attrMatchRanged: boolean;
  showDodge: boolean;
}

export interface SpendLine {
  key: string;
  label: string;
  essence: number;
}

export interface SpendBreakdown {
  lines: SpendLine[];
  spent: number;
  granted: number;
  budget: number;
  remaining: number;
  overspent: boolean;
  generalBudget: number;
  dedicatedRemaining: Record<string, number>;
}

export interface RelicAbility {
  id: string;
  name: string;
  text: string;
  essence: number;
}

export interface RelicDemesne {
  element: DemesneElement;
  tier: number;
}

export interface Relic {
  id: string;
  name: string;
  kind: GearKind;
  bio: string;
  weaponType: WeaponType | "";
  wv: number;
  range: string;
  soak: number;
  durability: number;
  extraActions: number;
  wpTier: number;
  attributes: Record<AttrKey, number>;
  demesnes: RelicDemesne[];
  extraDpEssence: number;
  boundDp: number;
  abilities: RelicAbility[];
  notes: string;
  listed: boolean;
  createdAt: string;
  updatedAt: string;
}

export type MobKind = "mob" | "named";

export interface Mob {
  id: string;
  name: string;
  kind: MobKind;
  bio: string;
  accuracy: number;
  hits: number;
  damage: number;
  damageType: string;
  movement: number;
  special: string;
  packSize: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export const AIRSHIP_POD_TYPES = [
  "ballista",
  "burst",
  "cargo",
  "drop",
  "rudder",
  "dock",
] as const;
export type AirshipPodType = (typeof AIRSHIP_POD_TYPES)[number];

export interface AirshipPod {
  id: string;
  type: AirshipPodType;
}

export interface Airship {
  id: string;
  name: string;
  bio: string;
  size: number;
  crew: number;
  hull: number;
  carapace: number;
  armor: number;
  demesneResist: number;
  hardpoints: number;
  thrust: number;
  maneuver: number;
  pods: AirshipPod[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface EncounterEntry {
  id: string;
  mobId: string;
  currentHits: number;
  packSize: number;
  notes: string;
}

export interface TableLoot {
  id: string;
  relicId: string;
  name: string;
  kind: GearKind;
  notes: string;
  awardedToId?: string;
}

export interface GameTable {
  id: string;
  name: string;
  notes: string;
  epoch: string;
  playerIds: string[];
  npcIds: string[];
  encounter: EncounterEntry[];
  loot: TableLoot[];
  createdAt: string;
  updatedAt: string;
}

export interface CampaignExport {
  characters: Character[];
  relics: Relic[];
  mobs: Mob[];
  airships: Airship[];
  tables: GameTable[];
}
