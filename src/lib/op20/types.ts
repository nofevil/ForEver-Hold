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
  "Throwing Axe",
  "Dagger",
  "Gauntlet",
  "Maul",
  "Claws",
  "Flail",
] as const;
export type WeaponType = (typeof WEAPON_TYPES)[number];

export const MELEE_WEAPON_TYPES: WeaponType[] = [
  "Sword",
  "Axe",
  "Throwing Axe",
  "Dagger",
  "Gauntlet",
  "Maul",
  "Claws",
  "Flail",
];

export const RANGED_WEAPON_TYPES: WeaponType[] = ["Bow"];

/** Melee weapons that can also be thrown. */
export const THROWN_WEAPON_TYPES: WeaponType[] = ["Throwing Axe", "Dagger"];

/** Core demesnes in the creator. Lava stays in catalogs for older records. */
export const CORE_DEMESNE_ELEMENTS = ["air", "fire", "earth", "water"] as const;
export const DEMESNE_ELEMENTS = ["air", "fire", "earth", "water", "lava"] as const;
export type DemesneElement = (typeof DEMESNE_ELEMENTS)[number];
export type CoreDemesneElement = (typeof CORE_DEMESNE_ELEMENTS)[number];

export const ARMOR_WEIGHTS = ["light", "medium", "heavy"] as const;
export type ArmorWeight = (typeof ARMOR_WEIGHTS)[number];

export const ARMOR_WEIGHT_LABELS: Record<ArmorWeight, string> = {
  light: "Light",
  medium: "Medium",
  heavy: "Heavy",
};

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
  /** First type. Extra types are purchased as pick abilityId `type:medium`. */
  weight: ArmorWeight | "";
  tier: number;
  /** One entry per Armor Proficiency tier. abilityId may be a skill or `type:light`. */
  picks: TreePick[];
  bonuses: Array<"soak" | "durability">;
}

export interface ShieldTree {
  /** First type. Extra types are purchased as pick abilityId `type:medium`. */
  weight: ArmorWeight | "";
  tier: number;
  /** One entry per Shield Proficiency tier. abilityId may be a skill or `type:light`. */
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
  extraActions?: number;
  boundDp?: number;
  plus10?: string;
  fatigue?: string;
  abilities: string;
  equipped: boolean;
  relicId?: string;
  earnedEssence?: number;
  /** Stored Demesne Points on a bracer, charm, or other DP item. */
  dp?: number;
  /** Tier 1 Demesne Charm: one demesne ability, resolved at tier 1 only. */
  charm?: boolean;
  charmElement?: DemesneElement;
  charmAbilityId?: string;
}

export type SustainTarget = "self" | "melee-weapon" | "blunt-weapon" | "weapon" | "metal";

export interface BoundEffect {
  id: string;
  abilityId: string;
  element: DemesneElement;
  treeId: string;
  pickTier: number;
  dp: number;
  itemId: string | null;
  effect: string;
}

export interface ChannelState {
  abilityId: string;
  element: DemesneElement;
  treeId: string;
  pickTier: number;
  itemId: string | null;
  effect: string;
  dpPerRound: number;
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
  /** Character id this sheet is aiming at. Empty if none. */
  targetId?: string;
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
  smith: SimpleTree;
  harvest: number;
  hunting: SimpleTree;
  foraging: number;
  mining: number;
  items: GearItem[];
  negativeTraits: NegativeTrait[];
  notes: string;
  otherAbilities: string;
  /** DP currently bound into shields, charms, or channelled abilities. */
  boundDp: number;
  /** Ability binds that keep an effect active until released. */
  boundEffects: BoundEffect[];
  /** At most one Channel ability may be on. */
  channel: ChannelState | null;
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
  /** floor((Strength + Intellect) / 2). Smith adds its tier on top. */
  ingenuity: number;
  healthBase: number;
  healthMax: number;
  healthCap: number;
  movement: number;
  tic: number;
  attackActions: number;
  moveActions: number;
  dpMax: number;
  dpPool: number;
  boundDp: number;
  combatPool: number;
  socialPool: number;
  armorSoakBonus: number;
  armorDurBonus: number;
  shieldSoakBonus: number;
  shieldDurBonus: number;
  armorSoak: number;
  armorDur: number;
  shieldSoak: number;
  shieldDur: number;
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
  /** Weapon the proficiency is for. Abilities stay hidden until this is set. */
  wpType: WeaponType | "";
  wpPicks: TreePick[];
  armorWeight: ArmorWeight | "";
  attributes: Record<AttrKey, number>;
  demesnes: RelicDemesne[];
  extraDpEssence: number;
  boundDp: number;
  abilities: RelicAbility[];
  notes: string;
  listed: boolean;
  /** Epoch this relic was made for. Set from the table when an SM creates it. */
  epoch: string;
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

export interface EncounterCreature {
  id: string;
  /** Stable number so the table can tell this body from the others. */
  mark: number;
  currentHits: number;
}

export interface EncounterEntry {
  id: string;
  mobId: string;
  /** Legacy single tracker. New encounters keep this as the hostile’s full hits. */
  currentHits: number;
  packSize: number;
  notes: string;
  /** Live table stats. Missing values fall back to the hostile’s sheet. */
  accuracy?: number;
  damage?: number;
  movement?: number;
  /** Standing creatures. Endless trickle keeps one; a finite pack starts at pack size. */
  creatures?: EncounterCreature[];
  /** Fallen creatures, so the table can see who has been defeated. */
  defeated?: EncounterCreature[];
}

export interface TableInvite {
  id: string;
  name: string;
  sentAt: string;
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
  /** Shared with players so they can sit a character from their own account. */
  joinCode: string;
  invites: TableInvite[];
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
