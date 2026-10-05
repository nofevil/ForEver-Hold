import type {
  ArmorWeight,
  AttrKey,
  Character,
  DemesneElement,
  SustainTarget,
  TrickCategory,
  WeaponType,
} from "./types";
import { MELEE_WEAPON_TYPES, RANGED_WEAPON_TYPES, THROWN_WEAPON_TYPES } from "./types";

export interface AbilitySustain {
  mode: "bind" | "channel";
  target: SustainTarget;
  /** "st" uses the step chart. "dp" is raw Demesne Points. */
  cost: { kind: "st"; step: number } | { kind: "dp"; amount: number; perTier?: boolean };
  /** `{tier}` and `{4t}` (4 × tier) are filled at play time. */
  effect: string;
  freeAtTier?: number;
}

export interface AbilityDef {
  id: string;
  name: string;
  text: string;
  group?: string;
  sustain?: AbilitySustain;
}

export const EPOCHS = [
  "Age of Thunder",
  "Dark Valley",
  "A Past Forgotten",
  "Custom",
] as const;

export const STARTING_ESSENCE = [
  { value: 0, label: "0 — Zero start", hint: "Grows in play. One Common item." },
  { value: 50, label: "50 — Gritty", hint: "OSR feel. Pair with Negative Traits." },
  { value: 100, label: "100 — Standard", hint: "Room for attributes, WP or Demesne 2–3." },
] as const;

export const CORE_DEMESNE_ELEMENTS = ["air", "fire", "earth", "water"] as const;

export const DEMESNE_META: Record<
  DemesneElement,
  {
    name: string;
    court: string;
    primary: AttrKey;
    dpAttr: AttrKey;
    dpAttr2?: AttrKey;
    ratio: string;
    resource: string;
    roll: string;
    twines: AbilityDef;
    note?: string;
  }
> = {
  air: {
    name: "Air",
    court: "Zephirin",
    primary: "intel",
    dpAttr: "intel",
    ratio: "3 / 3",
    resource: "DP",
    roll: "Reflex (bolts: Discernment)",
    twines: {
      id: "twines",
      name: "Twines (Toss / Bowl Over / Choke)",
      text: "One pick grants all three. T1 Toss +5: toss a small object 10'/Tier as improvised, 1 Dmg/Tier. T3 Bowl Over +10: push 5'/Tier, prone, 2 Dmg/Tier. T5 Choke +15: 15 Damage if target breathes, Panic.",
    },
  },
  fire: {
    name: "Fire",
    court: "Aile",
    primary: "pres",
    dpAttr: "pres",
    ratio: "4 / 2 spike",
    resource: "DP",
    roll: "Force of Will",
    twines: {
      id: "twines",
      name: "Twines (Distract / Burn / Agonize)",
      text: "One pick grants all three. T1 Distract +5: −2 next action. T3 Burn +10: Burn Tier. T5 Agonize +15: −2 all attributes next action.",
    },
  },
  earth: {
    name: "Earth",
    court: "Tellur",
    primary: "end",
    dpAttr: "end",
    ratio: "2 / 4",
    resource: "DP",
    roll: "Fortitude",
    twines: {
      id: "twines",
      name: "Twines (Strength / Defend / Petrify)",
      text: "One pick grants all three. T1 Strength +5: +1 Strength/Tier for one round. T3 Defend +10: 3/Tier Carapace. T5 Petrify +15: Petrified + large Carapace.",
    },
  },
  water: {
    name: "Water",
    court: "Endless Blue",
    primary: "poise",
    dpAttr: "str",
    ratio: "3 / 3",
    resource: "DP",
    roll: "Aura",
    twines: {
      id: "twines",
      name: "Twines (Drench / Cleanse / Drown)",
      text: "One pick grants all three. T1 Drench +5: Soaked. T3 Cleanse +10: remove a buff/debuff within 10'/Tier. T5 Drown +15: Drown twine.",
    },
  },
  lava: {
    name: "Lava",
    court: "Rhyolite",
    primary: "end",
    dpAttr: "end",
    dpAttr2: "pres",
    ratio: "4 / 4",
    resource: "DP",
    roll: "Force of Will (bolts) · Fortitude (earth)",
    note: "Lavakin are not a true court. Prioritize Earth or Fire attunement each day to use that court’s abilities with Magma. Both courts dislike Magmatists.",
    twines: {
      id: "twines",
      name: "Twines (Lava Splash / Eruption / Lava Well)",
      text: "One pick grants all three. +5 Lava Splash: 5' around you, −2 next action. +10 Eruption: 4/Tier Lava Carapace; melee attackers take 4 Fire/Tier per round until an action puts it out. +15 Lava Well: a well opens under each creature within 5'/DT, 4/DT damage, action to crawl out.",
    },
  },
};

export const SHARED_ELEMENTAL: AbilityDef[] = [
  {
    id: "astrologic-aura",
    name: "Astrologic Aura",
    text: "On failing an elemental ability, once per combat: Air Bolt 3/Tier no DP; Earth 3 Carapace/Tier; Fire 3 Spike/Tier; Water cleanse or 1 Shift Rest.",
  },
  {
    id: "body-and-mind",
    name: "Body and Mind",
    text: "Requires Attunement. Convert 3 Health/Tier → 6 DP/Tier, or 6 DP/Tier → 2 Health/Tier, or 1 Attribute dmg/Tier → 10 DP or 4 Health.",
  },
  { id: "bolt-master", name: "Bolt Master", text: "+1 Damage/Tier to Bolt abilities." },
  { id: "channel-master", name: "Channel Master", text: "Listed in Alpha; details sparse." },
  {
    id: "demesne-bonded",
    name: "Demesne Bonded",
    text: "Regain DP on any rest equal to Primary Attribute. Pure DP rest: 3× Primary instead of 2×.",
  },
  {
    id: "elemental-control",
    name: "Elemental Control",
    text: "Channel 3 DP / 100 Essence. Control 100 Essence/Tier of matching non-sentient elemental for DT rounds.",
    sustain: {
      mode: "channel",
      target: "self",
      cost: { kind: "dp", amount: 3 },
      effect: "Controlling a matching elemental (100 Essence/{tier}).",
    },
  },
  {
    id: "shield-mastery",
    name: "Elemental Shield Mastery",
    text: "+1 Soak (or Spike)/Tier to Shield abilities.",
  },
  {
    id: "high-astrology",
    name: "High Astrology",
    text: "Spend reserve DP by tier: Snap, double range, all 3 Twines on +5, +2 Dmg/Tier, +1 Acc/Tier. T5 capstone once per campaign.",
  },
  {
    id: "imbue",
    name: "Imbue",
    text: "1 Shift. Move up to 5 DP/Tier into an item with Imbue.",
  },
  {
    id: "restore",
    name: "Restore",
    text: "1 Shift. Pull up to 5 DP/Tier from portal, remnant, leak, imbued item, or heartstone.",
  },
  {
    id: "internal-heartstone",
    name: "Internal Heartstone",
    text: "Abilities cost 1 fewer DP/DT.",
  },
  {
    id: "piercing",
    name: "Piercing",
    text: "Bolts deal a minimum of 2 Damage/Tier directly to Health.",
  },
  {
    id: "shaping-twines",
    name: "Shaping Twines",
    text: "Bind 3ST DP/Tier. Line / Fan / Burst. Missed creatures take 50%.",
    sustain: {
      mode: "bind",
      target: "self",
      cost: { kind: "st", step: 3 },
      effect: "Shaping Twines: Line / Fan / Burst. Missed creatures take 50%.",
    },
  },
];

export const DEMESNE_ABILITIES: Record<DemesneElement, AbilityDef[]> = {
  air: [
    DEMESNE_META.air.twines,
    {
      id: "attunement",
      name: "Attunement: Air",
      text: "1 Air Resist/Tier. 1 Soak per damage resisted. +1 Poise/Tier to Zephirin-aligned. T5 ignore Air Demesne penalties.",
    },
    {
      id: "bolt",
      name: "Bolt",
      text: "Discernment vs Dodge. Range 10'/DT. 3 Damage/DT. 1 DP/Damage.",
    },
    {
      id: "deflect",
      name: "Deflect",
      text: "Reflex vs ranged Acc. Deflect up to DT physical projectiles within 5'/DT. 3 DP/target. On +10 reroute as Bolt.",
    },
    {
      id: "disarm",
      name: "Disarm",
      text: "3 DP/Str. Reflex vs Resolve. Weapon scatters 5'/Tier. On +10 attack with it.",
    },
    {
      id: "ground",
      name: "Ground",
      text: "Channel 3 DP/Tier. Land flying creature size ≤ DT within 15'/Tier. On +10 deal 2×DT and prone.",
      sustain: {
        mode: "channel",
        target: "self",
        cost: { kind: "dp", amount: 3, perTier: true },
        effect: "Ground: land flying creatures size ≤ {tier} within 15'/{tier}.",
      },
    },
    {
      id: "levitate",
      name: "Levitate",
      text: "Channel 2 DP/round. Flight Move = 2×Tier. T5 channel automatic.",
      sustain: {
        mode: "channel",
        target: "self",
        cost: { kind: "dp", amount: 2 },
        effect: "Levitating. Flight Move {2t}.",
        freeAtTier: 5,
      },
    },
    {
      id: "light-of-foot",
      name: "Light of Foot",
      text: "Channel 1 DP/Tier. +1 Move/Tier. On +10 +1 Acc/Tier for 1 round.",
      sustain: {
        mode: "channel",
        target: "self",
        cost: { kind: "dp", amount: 1, perTier: true },
        effect: "+{tier} Movement.",
      },
    },
    {
      id: "melee-bolt",
      name: "Melee Bolt",
      text: "Declare first. DP = 3×Tier. Add 3×Tier Air damage to a successful melee hit.",
    },
    {
      id: "push",
      name: "Push",
      text: "3 DP/Tier. Push Medium (Large at T5) 5'/Tier. On +10 2 Dmg/Tier and prone.",
    },
    {
      id: "shield",
      name: "Shield of the Zephyrn",
      text: "Channel 1 DP/round/Tier + damage soaked. Soak 3 All/Tier. Does not shield Fire. On +10 free Bolt.",
      sustain: {
        mode: "channel",
        target: "self",
        cost: { kind: "dp", amount: 1, perTier: true },
        effect: "Air Shield: Soak {3t} All (not Fire). 1 DP per damage soaked.",
      },
    },
    {
      id: "steal-breath",
      name: "Steal Breath",
      text: "Extinguish Fire abilities, or channel Choke: 1 Dmg/Tier doubling each extra round, Panic.",
      sustain: {
        mode: "channel",
        target: "self",
        cost: { kind: "dp", amount: 1, perTier: true },
        effect: "Choke: {tier} damage, doubling each extra round. Panic.",
      },
    },
    {
      id: "wall-of-wind",
      name: "Wall of Wind",
      text: "Channel 2 DP/rd/Tier. 5'×10'×10'/Tier wall. Projectiles −1 Acc/Tier and −1 Dmg/Tier.",
      sustain: {
        mode: "channel",
        target: "self",
        cost: { kind: "dp", amount: 2, perTier: true },
        effect: "Wall of Wind {tier} wide. Projectiles −{tier} Acc and −{tier} damage.",
      },
    },
    {
      id: "whirlwind",
      name: "Whirlwind",
      text: "1 target/Tier in 5'/Tier radius. 5 DP/Tier/target. Toss Medium. On +10 stunned.",
    },
    {
      id: "astrologic-geology",
      name: "Astrologic Geology",
      text: "Modify bolt with other-element heartstones (DP × 3). Not consecutive rounds.",
    },
    ...SHARED_ELEMENTAL,
  ],
  fire: [
    DEMESNE_META.fire.twines,
    {
      id: "attunement",
      name: "Attunement: Fire",
      text: "1 Fire Resist/Tier. Regain 2 DP/Tier per damage resisted. T5 ignore Fire Demesne penalties.",
    },
    {
      id: "bolt",
      name: "Bolt",
      text: "1 DP per WV. Range 10'/DT. Max 4 WV/Tier.",
    },
    {
      id: "fire-shield",
      name: "Fire Shield",
      text: "Channel 1 DP/Tier/rd + damage dealt. Melee hitter takes 2 Dmg/Tier. On +10 Spike 2/Tier within 5'/Tier.",
      sustain: {
        mode: "channel",
        target: "self",
        cost: { kind: "dp", amount: 1, perTier: true },
        effect: "Fire Shield: melee hitters take {2t} damage. 1 DP per damage dealt.",
      },
    },
    {
      id: "ensheathe",
      name: "Ensheathe",
      text: "Channel 1 DP/Tier/rd. +1 Fire Dmg/Tier on wielded melee weapon.",
      sustain: {
        mode: "channel",
        target: "melee-weapon",
        cost: { kind: "dp", amount: 1, perTier: true },
        effect: "+{tier} Fire damage",
      },
    },
    {
      id: "breath-of-fire",
      name: "Breath of Fire",
      text: "Bind 3ST DP/Tier for +1 Fire Dmg/Tier on a melee weapon until released.",
      sustain: {
        mode: "bind",
        target: "melee-weapon",
        cost: { kind: "st", step: 3 },
        effect: "+{tier} Fire damage",
      },
    },
    {
      id: "combust",
      name: "Combust",
      text: "Ignite flammables within 10'/Tier. On a person: Burn Tier.",
    },
    {
      id: "heat-metal",
      name: "Heat Metal",
      text: "Channel. +2 Acc/round and +2 Dmg/round until 2 Dmg/Tier. 1 DP/Damage.",
      sustain: {
        mode: "channel",
        target: "metal",
        cost: { kind: "dp", amount: 1 },
        effect: "+2 Accuracy and +2 damage, ramping to {2t} damage. 1 DP per damage.",
      },
    },
    {
      id: "melee-bolt",
      name: "Melee Bolt",
      text: "Declare first. DP = 4×DT. Add 4×DT Fire to a successful melee hit.",
    },
    {
      id: "create-elemental",
      name: "Create Elemental (Fire)",
      text: "2 Actions. Channel 2 DP/Tier/rd. Small elemental stats = Ability Tier. On +10 Burn.",
      sustain: {
        mode: "channel",
        target: "self",
        cost: { kind: "dp", amount: 2, perTier: true },
        effect: "Fire elemental (stats {tier}). On +10 Burn.",
      },
    },
    {
      id: "animate-fire",
      name: "Animate Fire",
      text: "1 small animated fire/Ability Tier (non-combat). Channel 1 DP/Tier/rd.",
      sustain: {
        mode: "channel",
        target: "self",
        cost: { kind: "dp", amount: 1, perTier: true },
        effect: "{tier} small animated fire (non-combat).",
      },
    },
    {
      id: "blacksmith-searing",
      name: "Blacksmith’s Searing",
      text: "DP/Tier of item. +1/Tier to smith Crafting.",
    },
    {
      id: "channel",
      name: "Channel",
      text: "Extra DP when resting near fire. Fire abilities cost 0 DP within 10'/Tier of a large blaze.",
    },
    {
      id: "astrologic-geology",
      name: "Astrologic Geology",
      text: "Modify bolt with other-element heartstones. Not consecutive rounds.",
    },
    ...SHARED_ELEMENTAL,
  ],
  earth: [
    DEMESNE_META.earth.twines,
    {
      id: "attunement",
      name: "Attunement, Earth",
      text: "1 Earth Resist/Tier. 1 Carapace per damage resisted. T5 ignore Earth Demesne penalties.",
    },
    {
      id: "earth-shield",
      name: "Earth Shield",
      text: "Bind 2ST DP. 4/Tier Shield that Soaks All. 1 DP per damage prevented. T3 self + ally 5'. T5 self + allies 10'.",
      sustain: {
        mode: "bind",
        target: "self",
        cost: { kind: "st", step: 2 },
        effect: "{4t} Shield that Soaks All. 1 DP per damage prevented.",
      },
    },
    {
      id: "earth-sense",
      name: "Earth Sense",
      text: "Channel 3 DP/Tier/rd, 50' R/Tier. Sense movement and hollows.",
      sustain: {
        mode: "channel",
        target: "self",
        cost: { kind: "dp", amount: 3, perTier: true },
        effect: "Earth Sense 50'/{tier}. Movement and hollows.",
      },
    },
    {
      id: "ensheathe",
      name: "Ensheathe, Earth",
      text: "Channel 1 DP/Tier. +1 Earth Dmg/Tier on blunt or unarmed.",
      sustain: {
        mode: "channel",
        target: "blunt-weapon",
        cost: { kind: "dp", amount: 1, perTier: true },
        effect: "+{tier} Earth damage",
      },
    },
    {
      id: "locate-mineral",
      name: "Locate Mineral",
      text: "Channel 5 DP/hour. Range 100'/Tier. T1 stone → T5 gemstones/platinum.",
      sustain: {
        mode: "channel",
        target: "self",
        cost: { kind: "dp", amount: 5 },
        effect: "Locate Mineral 100'/{tier}.",
      },
    },
    {
      id: "melee-bolt",
      name: "Melee Bolt",
      text: "Cannot Earth Shield the same turn. Spend up to 1 DP/Damage to add up to 4 Dmg/Tier.",
    },
    {
      id: "summon-gargoyle",
      name: "Summon Gargoyle",
      text: "Bind 5 DP/Tier. Stats 1/Tier. Move 4 Flying. On +10 Carapace 3/Tier.",
      sustain: {
        mode: "bind",
        target: "self",
        cost: { kind: "dp", amount: 5, perTier: true },
        effect: "Gargoyle stats {tier}. Move 4 Flying. On +10 Carapace {3t}.",
      },
    },
    {
      id: "summon-wall",
      name: "Summon Wall",
      text: "10 DP/Tier. Up to 10' Long/Tier, 10' high, 5' wide.",
    },
    {
      id: "tellurs-grasp",
      name: "Tellur’s Grasp",
      text: "Range 10'/Tier. 5 DP/target. Immobilize up to Tier targets for Tier rounds.",
    },
    {
      id: "travel-through-earth",
      name: "Travel Through Earth",
      text: "10'/Tier through earth/stone. 2 DP/10'. On +10 double.",
    },
    {
      id: "tremors",
      name: "Tremors",
      text: "Apex Channel. 25' R/Tier. 20 DP/round. Escalating battlefield control.",
      sustain: {
        mode: "channel",
        target: "self",
        cost: { kind: "dp", amount: 20 },
        effect: "Tremors 25'/{tier}. Escalating battlefield control.",
      },
    },
    {
      id: "work-stone",
      name: "Work Stone",
      text: "Downtime. 10 DP/Tier per Shift. Work 10'×Tier cubic stone.",
    },
    {
      id: "astrologic-geology",
      name: "Astrologic Geology",
      text: "Modify Earth Shield with other-element heartstones. Not consecutive rounds.",
    },
    ...SHARED_ELEMENTAL,
  ],
  water: [
    DEMESNE_META.water.twines,
    {
      id: "attunement",
      name: "Attunement, Water",
      text: "1 Water Resist/Tier. 1 Carapace per Water damage resisted. T5 ignore Water Demesne penalties.",
    },
    {
      id: "bolt",
      name: "Bolt",
      text: "1 DP per damage. Range 10'/DT. Max 3 WV/Tier.",
    },
    {
      id: "hose-bolt",
      name: "Hose Bolt",
      text: "Bolt range halved and −1 Dmg/Tier. On hit push 5'/Tier and prone.",
    },
    {
      id: "encase",
      name: "Encase",
      text: "Channel 2 DP/Tier/rd. Cushion or Drown.",
      sustain: {
        mode: "channel",
        target: "self",
        cost: { kind: "dp", amount: 2, perTier: true },
        effect: "Encase: Cushion or Drown.",
      },
    },
    {
      id: "free-action",
      name: "Free Action",
      text: "Channel 3 DP/round. Act freely underwater, plus one extra mode per Tier.",
      sustain: {
        mode: "channel",
        target: "self",
        cost: { kind: "dp", amount: 3 },
        effect: "Free action underwater, plus {tier} extra mode(s).",
      },
    },
    {
      id: "fog-cloud",
      name: "Fog Cloud",
      text: "Channel 1 DP/Tier/rd. 10' R/Tier. Partial Cover +2 Defensive from outside.",
      sustain: {
        mode: "channel",
        target: "self",
        cost: { kind: "dp", amount: 1, perTier: true },
        effect: "Fog Cloud 10'/{tier}. Partial cover +2 Defensive from outside.",
      },
    },
    {
      id: "wall-of-water",
      name: "Wall of Water",
      text: "Channel 4 DP/Tier/rd. 10' long/Tier × 10' tall × 5' wide.",
      sustain: {
        mode: "channel",
        target: "self",
        cost: { kind: "dp", amount: 4, perTier: true },
        effect: "Wall of Water {tier}×10' long.",
      },
    },
    {
      id: "water-breathing",
      name: "Water Breathing",
      text: "Channel 1 DP/round. Free at Tier 3.",
      sustain: {
        mode: "channel",
        target: "self",
        cost: { kind: "dp", amount: 1 },
        effect: "Water breathing.",
        freeAtTier: 3,
      },
    },
    {
      id: "shield",
      name: "Shield, Water",
      text: "Channel 2 DP/Tier/rd. Soak 3/Tier/rd. 1 DP/damage soaked.",
      sustain: {
        mode: "channel",
        target: "self",
        cost: { kind: "dp", amount: 2, perTier: true },
        effect: "Water Shield: Soak {3t}/rd. 1 DP per damage soaked.",
      },
    },
    {
      id: "portal",
      name: "Portal, Endless Blue",
      text: "Size Tier. 5 DP/Tier. 1 Hour Channel or Tear in 3 rounds.",
      sustain: {
        mode: "channel",
        target: "self",
        cost: { kind: "dp", amount: 5, perTier: true },
        effect: "Portal, Endless Blue (size {tier}).",
      },
    },
    {
      id: "astrologic-geology",
      name: "Astrologic Geology",
      text: "Modify Bolt, Fog Cloud, and Wall of Water with other-element heartstones.",
    },
    ...SHARED_ELEMENTAL,
  ],
  lava: [
    DEMESNE_META.lava.twines,
    {
      id: "fire-bolt",
      name: "Fire Bolt",
      text: "Pre+Per. 1 DP per WV. Range 10'/DT. Max 4 WV/Tier.",
    },
    {
      id: "earth-shield",
      name: "Earth Shield",
      text: "End+Str. Bind 1ST. 4/Tier Shield that Soaks All. 1 DP per damage prevented. T3 self + ally 5'. T5 self + allies 10'.",
      sustain: {
        mode: "bind",
        target: "self",
        cost: { kind: "st", step: 1 },
        effect: "{4t} Shield that Soaks All. 1 DP per damage prevented.",
      },
    },
    {
      id: "obsidian-skin",
      name: "Obsidian Skin",
      text: "Body covered in cooling lava. 5 Carapace/Tier that absorbs damage until gone. 4 DP/Tier.",
    },
    {
      id: "lava-strike",
      name: "Lava Strike",
      text: "Fists deal +4 Fire/Tier + WV. On hit, lava clings: +1 Fire/Tier/round and +1 Carapace/Tier until destroyed (action to scrape off). 1 DP per Fire damage.",
    },
    {
      id: "suffocating-eruption",
      name: "Suffocating Eruption",
      text: "End+Pre. Volcanic ash in 5'/Tier radius. Creatures inside: impaired vision/breathing, −4 on rolls. Attacks into the ash −2 Accuracy. 5 DP/Tier/round. Range 10'/Tier.",
      sustain: {
        mode: "channel",
        target: "self",
        cost: { kind: "dp", amount: 5, perTier: true },
        effect: "Suffocating Eruption 5'/{tier}. −4 inside, −2 Accuracy into the ash.",
      },
    },
    ...SHARED_ELEMENTAL,
  ],
};

export const WP_SKILLS_MELEE: AbilityDef[] = [
  { id: "defensive-fighter", name: "Defensive Fighter", text: "Lose 1 Accuracy/Tier to gain +2 Defensive/Tier." },
  { id: "disarm", name: "Disarm", text: "On +10 Disarm. Weapon scatters 5'/Strength." },
  { id: "mobile", name: "Mobile", text: "Reaction: when an enemy passes within 5'/Tier, move and attack at −4 Acc." },
  { id: "outclass", name: "Outclass", text: "If WP Tier > opponent’s, +2 Accuracy and +1 Damage/Tier." },
  { id: "powerful", name: "Powerful", text: "Gain 1 CP. Spend 1 CP to deal +1 Damage/Str with a Strength weapon." },
  { id: "rend", name: "Rend", text: "Pre-roll, attack the weapon. On hit −1 WV. On +10 −2 WV." },
  { id: "skilled", name: "Skilled", text: "Gain 1 CP. Spend 1 CP for +1 Accuracy/Tier with an Agility weapon." },
];

export const WP_SKILLS_RANGED: AbilityDef[] = [
  { id: "angles", name: "Angles", text: "Gain 1 CP. Spend 1 CP to eliminate 2 points of cover penalty." },
  { id: "fletching", name: "Fletching", text: "Gain 1 CP. Craft and use Tuned Arrows (1 per Ranged Combat skill)." },
  { id: "focused", name: "Focused", text: "No penalty to shoot into melee." },
  { id: "high-ground", name: "High Ground", text: "+1 Damage/Tier when 15' or higher above a creature." },
  { id: "manyshot", name: "Manyshot", text: "Gain 2 CP. Extra shots per WP Tier at stacking −1 Acc." },
  { id: "ranged-accuracy", name: "Ranged Accuracy", text: "+5' Range/WP Tier." },
  { id: "twinshot", name: "Twinshot", text: "Additional attack per Attack Action that deals only Weapon Damage." },
];

export const WP_SKILLS_SHARED: AbilityDef[] = [
  { id: "bane-damage", name: "Bane, Damage", text: "+2 Damage/Tier vs chosen non-human type or Demesne alignment." },
  { id: "bane-accuracy", name: "Bane, Accuracy", text: "+1 Accuracy/Tier vs chosen non-human type or Demesne alignment." },
  { id: "bleed", name: "Bleed", text: "On +10, 1 Bleed/Tier." },
  { id: "careful", name: "Careful", text: "Trade all damage but 1 for +1 Accuracy/Tier." },
  { id: "delayed-strike", name: "Delayed Strike", text: "Spend an Attack Action: next Attack +4 Accuracy, +1 Damage/Tier." },
  { id: "flurry", name: "Flurry", text: "On +10, attack the same creature again." },
  { id: "inside-your-guard", name: "Inside Your Guard", text: "Decrease Damage 1/Tier and deal 1 Damage/Tier directly to Health vs armor/shields." },
  { id: "lucky", name: "Lucky", text: "+10 abilities also trigger on exactly +5. May spend 1 CP for an additional +10." },
  { id: "penetrating-strike-wp", name: "Penetrating Strike", text: "Gain 2 CP. Spend 2 CP to bypass Armor and Shields (not Physical Resist)." },
  { id: "ridiculously-skilled", name: "Ridiculously Skilled", text: "Use an additional Combat Trick per Attack Action." },
  { id: "vicious", name: "Vicious", text: "Ignore 1/Tier Physical Defense." },
];

/** Who a Bane bonus is against. Demesnes first, then non-human creature types. */
export const BANE_TARGETS: { id: string; label: string; group: "Demesne" | "Non-human" }[] = [
  ...CORE_DEMESNE_ELEMENTS.map((id) => ({
    id: `demesne:${id}`,
    label: DEMESNE_META[id].name,
    group: "Demesne" as const,
  })),
  { id: "creature:beast", label: "Beast", group: "Non-human" },
  { id: "creature:construct", label: "Construct", group: "Non-human" },
  { id: "creature:giant", label: "Giant", group: "Non-human" },
  { id: "creature:goblin", label: "Goblin", group: "Non-human" },
  { id: "creature:night", label: "Night", group: "Non-human" },
  { id: "creature:spider", label: "Spider", group: "Non-human" },
  { id: "creature:undead", label: "Undead", group: "Non-human" },
];

export function isBaneAbility(id: string): boolean {
  return id === "bane-damage" || id === "bane-accuracy";
}

export function baneTargetLabel(id?: string): string {
  if (!id) return "";
  if (id.startsWith("custom:")) return id.slice("custom:".length).trim();
  return BANE_TARGETS.find((t) => t.id === id)?.label ?? "";
}

export function baneAbilityText(text: string, against?: string): string {
  const label = baneTargetLabel(against);
  if (!label) return text;
  return text.replace("chosen non-human type or Demesne alignment", label);
}

export function wpSkillsForTypes(types: WeaponType[]): AbilityDef[] {
  const melee = types.some((t) => (MELEE_WEAPON_TYPES as readonly string[]).includes(t));
  const ranged =
    types.some((t) => (RANGED_WEAPON_TYPES as readonly string[]).includes(t)) ||
    types.some((t) => (THROWN_WEAPON_TYPES as readonly string[]).includes(t));
  const list = [...WP_SKILLS_SHARED];
  if (melee) list.unshift(...WP_SKILLS_MELEE);
  if (ranged) list.push(...WP_SKILLS_RANGED);
  const seen = new Set<string>();
  return list.filter((a) => (seen.has(a.id) ? false : (seen.add(a.id), true)));
}

export const ARMOR_SKILLS: Record<ArmorWeight, AbilityDef[]> = {
  light: [
    { id: "proficiency", name: "Proficiency, Light", text: "Use Light armor abilities up to your Tier. Requires Agility ≥ Proficiency Tier." },
    { id: "outmaneuver", name: "Outmaneuver", text: "Soak +2 vs enemies with lower Movement." },
    { id: "quickness", name: "Quickness", text: "Reaction. Spend 1 CP so the next Melee attack deals only Weapon Damage." },
    { id: "repair", name: "Repair", text: "1 Shift. Restore 1 Durability / Armor Proficiency Tier." },
    { id: "hard-to-pin", name: "Hard to Pin", text: "If you move more than 10 spaces, spend 1 CP to Soak 2/Quality Tier." },
    { id: "kip-up", name: "Kip-Up", text: "No movement loss when prone." },
  ],
  medium: [
    { id: "proficiency", name: "Proficiency, Medium", text: "Use Medium armor abilities up to your Tier. Requires Strength ≥ Proficiency Tier." },
    { id: "angle", name: "Angle", text: "Gain 2 CP. On enemy hit with WV ≤ Proficiency Tier, spend 2 CP to reduce WV to 0." },
    { id: "curvy", name: "Curvy", text: "Gain 1 CP. On enemy hit and Test Result of Tier or lower, spend 1 CP for no Durability loss." },
    { id: "leverage", name: "Leverage", text: "Soak +2 vs melee enemies with lower Strength." },
    { id: "repair", name: "Repair", text: "1 Shift. Restore 1 Durability / Armor Proficiency Tier." },
    { id: "shove", name: "Shove", text: "On +5, spend 1 CP to push a Medium or smaller target 5' and prone." },
    { id: "steady", name: "Steady", text: "+2 vs rolls that would make you prone." },
  ],
  heavy: [
    { id: "proficiency", name: "Proficiency, Heavy", text: "Use Heavy armor abilities up to your Tier. Requires Str+End ≥ Proficiency Tier." },
    { id: "additional-soak", name: "Additional Soak", text: "Soak +1." },
    { id: "armadillo", name: "Armadillo’s Shell", text: "Attackers do not get +2 Accuracy from the rear." },
    { id: "bowl-over", name: "Bowl Over", text: "On +5 push Medium or smaller 5' and prone, deal 1 Damage/Tier, move 10'." },
    { id: "glancing", name: "Glancing Blows", text: "Glancing blows cause no damage, or enemy +1 is a glancing blow. May take twice." },
    { id: "repair", name: "Repair", text: "1 Shift. Restore 1 Durability / Armor Proficiency Tier." },
    { id: "turtle-block", name: "Turtle Block", text: "On enemy hit of Tier or lower, Soak the armor’s Soak (extra Durability loss)." },
  ],
};

export const SHIELD_GENERAL: AbilityDef[] = [
  { id: "aligned-defense", name: "Aligned Defense", text: "+1 Soak/Tier vs a chosen Demesne or creature type." },
  { id: "defensive-fighter", name: "Defensive Fighter", text: "Trade up to 1 Accuracy/Tier for +2 Defensive/Tier. Does not stack with WP version." },
  { id: "projectile-magnet", name: "Projectile Magnet", text: "On Odd Test Result, spend 1 CP to cause a projectile to hit your shield." },
  { id: "extra-soak", name: "Extra Soak (no ability)", text: "Take +1 Soak instead of an ability this tier." },
  { id: "extra-durability", name: "Extra Durability (no ability)", text: "Take +1 Durability instead of an ability this tier." },
];

export const SHIELD_SKILLS: Record<ArmorWeight, AbilityDef[]> = {
  light: [
    { id: "proficiency", name: "Shield Proficiency, Light", text: "Negate the −1 Accuracy penalty. Use Light shield abilities up to your Tier." },
    { id: "backpedal", name: "Backpedal", text: "Gain 1 CP. Spend 1 CP for +2 Soak and move backward 5'." },
    { id: "buckler-punch", name: "Buckler Punch", text: "On +10 on a weapon attack, deal Strength damage to the same target." },
    { id: "captains-protect", name: "Captain’s Protect", text: "Deflect a ranged hit against an ally within 5'/Tier if Test Result ≤ your Tier." },
    { id: "disarm", name: "Disarm", text: "Gain 2 CP. On soak, spend 2 CP to attempt Disarm 5'." },
    { id: "proper-form", name: "Proper Form", text: "If WP ≥ opponent, +1 Accuracy with your melee weapon." },
    { id: "surprising-throw", name: "Surprising Throw", text: "Thrown shield Damage = Soak, Range 5'/Tier." },
    ...SHIELD_GENERAL,
  ],
  medium: [
    { id: "proficiency", name: "Shield Proficiency, Medium", text: "Negate penalties. Use Medium shield abilities up to your Tier." },
    { id: "aiding-shield", name: "Aiding Shield", text: "Adjacent ally Aid grants +4 Accuracy and +2 Defensive." },
    { id: "protect-ally", name: "Protect Ally", text: "Minor Action: spend 2 CP to Soak a hit against an adjacent ally." },
    { id: "shield-bash", name: "Shield Bash", text: "On +10, deal Shield Soak to the same target." },
    { id: "skilled-soak", name: "Skilled Soak", text: "If enemy Test Result is +1/Tier or less, no Durability loss when Soaking." },
    { id: "swap-positions", name: "Swap Positions", text: "Spend 1 CP to swap with an ally disengaging. You take the AOO." },
    ...SHIELD_GENERAL,
  ],
  heavy: [
    { id: "proficiency", name: "Shield Proficiency, Heavy", text: "Negate −2 Accuracy and −1 Move. Use Heavy shield abilities up to your Tier." },
    { id: "fearsome", name: "Fearsome", text: "+2 Presence or Social rolls to defuse a fight (+4 if also in Heavy Armor)." },
    { id: "full-cover", name: "Full Cover", text: "Shield automatically soaks regular arrows, bolts, and sling stones." },
    { id: "mobile-cover", name: "Mobile Cover", text: "1/2 Movement. You and/or an ally use the shield for partial cover (+2 Defensive)." },
    { id: "shield-rush", name: "Shield Rush", text: "After moving 4+ straight, Attack with the shield (Damage = Soak + Strength)." },
    { id: "skilled-soak", name: "Skilled Soak", text: "If enemy Test Result is +1/Tier or less, no Durability loss when Soaking." },
    ...SHIELD_GENERAL,
  ],
};

export function armorSkillsForWeights(weights: ArmorWeight[]): AbilityDef[] {
  const seen = new Set<string>();
  const list: AbilityDef[] = [];
  for (const w of weights) {
    for (const a of ARMOR_SKILLS[w] ?? []) {
      if (a.id === "proficiency" || seen.has(a.id)) continue;
      seen.add(a.id);
      list.push(a);
    }
  }
  return list;
}

export function shieldSkillsForWeights(weights: ArmorWeight[]): AbilityDef[] {
  const seen = new Set<string>();
  const list: AbilityDef[] = [];
  for (const w of weights) {
    for (const a of SHIELD_SKILLS[w] ?? []) {
      if (a.id === "proficiency" || seen.has(a.id)) continue;
      seen.add(a.id);
      list.push(a);
    }
  }
  return list;
}

export const TRICKS: Record<TrickCategory, AbilityDef[]> = {
  axemaster: [
    { id: "arm-break", name: "Arm Break", text: "Spend 2 CP. On hit disarm a shield and deal 2 Strength ability damage." },
    { id: "behead", name: "Behead", text: "On +10 spend 3 CP; Op20+Prowess vs End+WP to kill instantly." },
    { id: "chop", name: "Chop", text: "On hit spend 1 CP to bypass 1 Physical Resist/Tier." },
    { id: "cleave", name: "Cleave", text: "On killing a creature, spend 1 CP to make an additional attack." },
    { id: "destroy-armor", name: "Destroy Armor", text: "Spend 2 CP. On hit remove Durability or 1 Physical Resist." },
    { id: "frenzy", name: "Frenzy", text: "Fatigue. Spend 1 CP, gain an additional Attack Action and −4 Defensive." },
    { id: "whirlwind", name: "Whirlwind", text: "Fatigue. Spend 3 CP to attack at −2 vs all enemies within 5'/Tier." },
    { id: "wild-swing", name: "Wild Swing", text: "Spend 1 CP, subtract up to Tier Accuracy to add +3 Damage/Tier." },
  ],
  swordmaster: [
    { id: "disarm", name: "Disarm", text: "On +10 spend 1 CP to Disarm; weapon scatters 5'/Strength." },
    { id: "footwork", name: "Footwork", text: "On hit spend 1 CP to force the target to face you." },
    { id: "last-ditch", name: "Last Ditch", text: "Spend 2 CP pre-roll to make your Tic 1." },
    { id: "riposte", name: "Riposte", text: "When a creature misses you and you have no attack, spend 1 CP to deal WV + Strength." },
    { id: "rush", name: "Rush", text: "First round: 2 CP for 1 Movement/Tier and +1 Accuracy/Tier on first Attack." },
  ],
  rangemaster: [
    { id: "aimed-shot", name: "Aimed Shot", text: "Spend 2 CP. Head/arm/leg called shots with extra effects." },
    { id: "distracting-shot", name: "Distracting Shot", text: "On hit spend 1 CP; target’s next action has −2." },
    { id: "match-grade", name: "Match Grade", text: "Carry an additional Specialized Arrow of each type. +2 Acc with them." },
    { id: "surprise-shot", name: "Surprise Shot", text: "Spend 1 CP. +1 Damage/Agility vs a target unaware of you." },
    { id: "taunting-shot", name: "Taunting Shot", text: "Spend 2 CP. On hit target must dash toward you next round." },
    { id: "vicious-shot", name: "Vicious Shot", text: "Spend 1 CP. On hit reduce Physical Defense by 1." },
    { id: "weak-spot", name: "Weak Spot", text: "Spend 3 CP. Bypass Armor, Shields, and Physical DR. On +10 refund." },
  ],
  skirmish: [
    { id: "foul-shield", name: "Foul Shield", text: "Spend 1 CP. Lodged thrown weapon fouls a shield and halves movement." },
    { id: "full-volley", name: "Full Volley", text: "If you don’t move, spend 3 CP to throw Knife, Axe, and Javelin at one target." },
    { id: "harass", name: "Harass", text: "Spend 1 CP for +1 Accuracy. If it attacks anyone else, it has −2 Acc." },
    { id: "hit-and-run", name: "Hit and Run", text: "Spend 2 CP. Minor Action: attack with a thrown weapon and draw another." },
    { id: "kite", name: "Kite", text: "Reaction. Spend 1 CP to move up to half Movement before they arrive." },
    { id: "mighty-throw", name: "Mighty Throw", text: "Spend 1 CP to bypass Soak. Quality vs +4 or weapon is destroyed." },
    { id: "momentum", name: "Momentum", text: "+1 Weapon Damage per space moved toward an enemy, up to Skirmish Tier." },
    { id: "ranged-flank", name: "Ranged Flank", text: "Spend 1 CP for +2 Flank Accuracy and +1 Damage/Tier." },
    { id: "snap", name: "Snap", text: "Spend 1 CP to take your turn before another creature acts." },
  ],
  movement: [
    { id: "astonishing-leap", name: "Astonishing Leap", text: "Spend 3 CP. Jump up to 5'/Strength ± 5'/Tic." },
    { id: "charge", name: "Charge", text: "3 CP. Moving more than 4 toward an enemy: +2 Acc and +1 Dmg per 2 squares." },
    { id: "leaf-on-the-wind", name: "Leaf on the Wind", text: "Spend 1 CP/10' to eliminate Fall Damage up to 10/Tier." },
    { id: "lions-leap", name: "Lion’s Leap", text: "After moving 4, spend 3 CP to leap 5'/Tier and attack adjacent at +2 Acc." },
    { id: "parkour", name: "Parkour", text: "Spend 1 CP/round to ignore difficult terrain. +4 on Chase rolls." },
    { id: "snap", name: "Snap", text: "Spend 1 CP to choose when you act during a round." },
    { id: "spider-climb", name: "Spider Climb", text: "Spend 1 AP to climb any surface up to your Movement." },
    { id: "widows-drop", name: "Widow’s Drop", text: "After falling 20', spend 2 CP for a +2 Acc/+4 WV strike." },
    { id: "wind-over-water", name: "Wind Over Water", text: "Spend 1 CP. Double Base Movement this turn and do not provoke AOO." },
  ],
  combat: [
    { id: "critical-strike", name: "Critical Strike", text: "Spend 2 CP to double weapon base WV or add Agi to ranged WV." },
    { id: "flexible-combat", name: "Flexible Combat", text: "Spend 3 CP to change Tic to 1 until end of round." },
    { id: "penetrating-strike", name: "Penetrating Strike", text: "On +10 spend 2 CP to bypass Armor, Resistances, and Shields." },
    { id: "rolling-thunder", name: "Rolling Thunder", text: "Fatigue + 1 Attack Action + 1 CP/Attack. Move and attack up to Tier times." },
    { id: "shred", name: "Shred", text: "On hit spend 3 CP to decrease Armor Durability, Soak, and Physical Resistance." },
    { id: "windmill-throw", name: "Windmill Throw", text: "On +10 spend 3 CP to throw a Medium or smaller creature." },
  ],
  defensive: [
    { id: "body-of-iron", name: "Body of Iron", text: "Requires Armor, Armor Proficiency, and 3 Endurance. Avoid 1 Attack. Once per combat." },
    { id: "clotting-factor", name: "Clotting Factor", text: "End check to remove Burn, Bleed, or Poison when it activates." },
    { id: "come-with-me", name: "Come With Me if You Want to Live", text: "Spend an Action + 3 CP. Move adjacent and take all damage from an attack on an ally." },
    { id: "furious-defense", name: "Furious Defense", text: "Spend 1 CP/Tier to gain Soak All 3 × Tier until end of round." },
    { id: "shrug-off", name: "Shrug Off", text: "Add Endurance Defensive to rolls vs enemy +10s or Twines." },
    { id: "what-have-you-got", name: "What have you got to live for?", text: "Spend CP to stay conscious below 0 Health. Soak All +1/Tier/Rd." },
  ],
};

export const TRICK_LABELS: Record<TrickCategory, string> = {
  axemaster: "Axemaster",
  swordmaster: "Swordmaster",
  rangemaster: "Rangemaster",
  skirmish: "Skirmish",
  movement: "Movement",
  combat: "Fighting",
  defensive: "Defensive",
};

export const MONSTER_HUNTING_TEXT =
  "Discernment + Monster Hunting vs Monster Tier. Use once when an encounter starts, or on sight of a non-humanoid beforehand. On a success, gain your Tier 1 benefit. Spend an action to keep hunting; each further success grants the next benefit, up to your tier.";

export const MONSTER_HUNTING: AbilityDef[] = [
  {
    id: "essence-alignment",
    name: "Determine Essence and Demesne Alignment",
    text: "Gain +1 Defensive. On +10, gain +Tic Defensive vs the creature.",
  },
  {
    id: "motivations",
    name: "Determine Motivations",
    text: "Gain +1 Majesty toward the creature. On +10, gain +Tic Majesty toward the creature.",
  },
  {
    id: "creature-abilities",
    name: "Determine Abilities",
    text: "Reveal 1 ability, plus 1 more per Tic. Gain +1 Accuracy vs the creature. On +10, gain +Tic Accuracy vs the creature.",
  },
  {
    id: "weak-spots",
    name: "Determine Weak-spots",
    text: "Reveal weak spots, if any. +1 to hit weak spots (typically −3 instead of −4). On +10, +1 to hit a weak spot per Tic.",
  },
  {
    id: "hunting-cant",
    name: "Monster Hunting Cant",
    text: "Spend an action to communicate any tier of this information to allies within 50'.",
  },
];

/** Smith stops at tier 5 (5, 10, 15, 20, 25) even though eight abilities exist. */
export const SMITH_MAX = 5;

export const SMITH_TEXT =
  "Roll is Smith Tier + Ingenuity. Each tier grants +1 Accuracy when crafting and one ability. Repair one item per shift, up to your tier in Damage or Durability, no roll, for 1 Smithing Supply. Tier 1 items at Smith Tier 1, Tier 2 items at Tier 3, Tier 3 items at Tier 5. Shifts and supplies equal the item’s tier and are spent after a successful craft. Enchanting or Tuning makes the item a Form, added after it is crafted.";

export const SMITHING: AbilityDef[] = [
  { id: "smith-melee", name: "Melee Weapons", text: "Craft melee weapons." },
  { id: "smith-ranged", name: "Ranged Weapons", text: "Craft ranged weapons." },
  { id: "smith-armor", name: "Armor", text: "Craft various types of armor." },
  { id: "smith-shields", name: "Shields", text: "Craft shields." },
  {
    id: "smith-fletching",
    name: "Fletching",
    text: "Craft single-use ammunition that does extra damage or is specialized (Black Arrow, Disrupting Arrow, Pinning Arrow).",
  },
  {
    id: "smith-enchanting",
    name: "Enchanting",
    text: "Add Demesne abilities to crafted items with available Essence.",
  },
  {
    id: "smith-tuning",
    name: "Tuning",
    text: "Add non-Demesne abilities to crafted items with available Essence (weapon proficiency, combat tricks).",
  },
  {
    id: "smith-repair",
    name: "Repair Specialist",
    text: "Automatic Repair now costs ½ shift and half the smithing supplies.",
  },
];

/** Highest item tier a smith of this tier may craft. */
export function smithCraftItemTier(smithTier: number): number {
  if (smithTier >= 5) return 3;
  if (smithTier >= 3) return 2;
  if (smithTier >= 1) return 1;
  return 0;
}

export const SOCIAL_TRICKS: AbilityDef[] = [
  { id: "distraction", name: "Distraction", text: "1 SP. Target −4 on next social roll within 1 round." },
  { id: "drawing-conclusions", name: "Drawing Conclusions", text: "After a Secret, spend 3 SP to gain an additional Secret one Tier lower." },
  { id: "fight-club", name: "Fight Club", text: "Reaction at 0 Health. 1 SP resist unconsciousness next round." },
  { id: "flashing-eyes", name: "Flashing Eyes", text: "Gain 1 minor piece of information. May also defuse a confrontation." },
  { id: "fortress", name: "Fortress of Iron Will", text: "3 SP + one hour. Spend Fortress Points to Push enemy Social Test Results to 0." },
  { id: "inspiration", name: "Inspiration", text: "3 SP. Hint or investigation fact." },
  { id: "jack-of-all", name: "Jack of All Trades", text: "1 SP/Tier. Up to +1/Tier on any non-combat roll." },
  { id: "jealousy", name: "Jealousy", text: "1 SP. Turn the target’s head. On +10 +4 next roll vs target." },
  { id: "just-in-case", name: "Just in Case", text: "2 SP. Reroll a failed Crafting check." },
  { id: "making-friends", name: "Making Friends", text: "On gaining a contact. Contact starts +1 Loyalty or Authority." },
  { id: "influencing-people", name: "and Influencing People", text: "Downtime 1 Week. Make a Contact of an NPC at +2 Reputation or higher." },
  { id: "mentally-prepare", name: "Mentally Prepare", text: "3 SP. Immune to the first mental ability the next day." },
  { id: "personality-coach", name: "Personality Coach", text: "1 SP. Reroll a failed Social test. Once per failed roll." },
  { id: "push-through", name: "Push Through", text: "1 SP/Fatigue. Remove fatigue penalty for a round." },
  { id: "puppy-dog-eyes", name: "Puppy Dog Eyes", text: "3 SP. Creature attacks a different target." },
  { id: "research", name: "Research", text: "Downtime 1 Week. Crafting Journal, Monster Hunting knowledge, or similar." },
  { id: "self-control", name: "Self Control", text: "1 SP. Reroll a failed addiction check." },
  { id: "wine-and-dine", name: "Wine and Dine", text: "Downtime 1 Week. Spend 500 gildar/Authority to gain 1 Authority or Loyalty." },
];

export const ATHLETICS: AbilityDef[] = [
  { id: "balance", name: "Balance", text: "Agi+Athletics vs Tier." },
  { id: "body-over-mind", name: "Body Over Mind", text: "+1 Defensive/Tier vs Demesne abilities that use a Social attribute." },
  { id: "chase", name: "Chase", text: "Agi+Athletics (if your Endurance > opponent’s, +1)." },
  { id: "climb", name: "Climb", text: "Str+Athletics vs Tier." },
  { id: "dodge", name: "Dodge", text: "+1 Defensive/Tier vs ranged." },
  { id: "endure", name: "Endure", text: "+1/Tier vs Fatigue to avoid Fatigue penalties until next downtime." },
  { id: "jump", name: "Jump", text: "Str+Athletics vs Tier." },
  { id: "swim", name: "Swim", text: "Str+Athletics vs Tier." },
];

export const SUBTERFUGE: AbilityDef[] = [
  { id: "backstab", name: "Backstab", text: "Rear arc: +1 Damage/Tier." },
  { id: "details", name: "Details", text: "1 Shift: list one outer physical defense per Scout Tier." },
  { id: "disguise", name: "Disguise", text: "Pres+Subterfuge vs Perception." },
  { id: "evasion", name: "Evasion", text: "Gain 3 CP. Spend 3 CP for +5 Defensive; if it still hits, Soak All 5." },
  { id: "farsight", name: "Farsight", text: "Extra 1× vision range per tier." },
  { id: "hide", name: "Hide", text: "Agi+Subterfuge Tier vs Perception+modifiers." },
  { id: "attack-from-stealth", name: "Attack from Stealth", text: "Requires Hide. Spend 3 CP: +1 Acc/Tier and +1 Physical Dmg/Tier from Hidden." },
  { id: "locate-traps", name: "Locate and Disarm Traps", text: "Locate 5'/Tier. Per+Subterfuge vs Trap Tier." },
  { id: "lockpick", name: "Lockpick", text: "Agi+Subterfuge Tier vs 2 × Lock Tier." },
  { id: "move-silently", name: "Move Silently", text: "Agi+Subterfuge Tier vs Perception." },
  { id: "quiet-tick", name: "Quiet Tick", text: "A failed infiltrate roll within 5'/Tier does not attract notice." },
  { id: "sleight", name: "Sleight of Hand", text: "Agi+Subterfuge Tier vs Perception." },
  { id: "tricks-of-the-trade", name: "Tricks of the Trade", text: "Allows Scoundrel item crafting." },
];

export const SUBTERFUGE_ADDONS: AbilityDef[] = [
  { id: "forgery", name: "Forgery", text: "10 Essence add-on." },
  { id: "thieves-cant", name: "Thieves Cant", text: "10 Essence add-on." },
  { id: "lip-reading", name: "Lip Reading", text: "10 Essence add-on." },
  { id: "quick-slumber", name: "Quick Slumber", text: "10 Essence. Only ½ Shift rest per day to avoid Fatigue." },
  { id: "ventriloquism", name: "Ventriloquism", text: "10 Essence add-on." },
];

export const STATUS_PRESETS = [
  "Burn",
  "Bleed",
  "Poison",
  "Prone",
  "Immobilized",
  "Webbed",
  "Fatigued",
  "Dazed",
  "Panic",
  "Soaked",
  "Hidden",
  "Unconscious",
] as const;

export const STARTER_ITEMS: Array<{
  name: string;
  kind: "weapon" | "armor" | "shield" | "demesne" | "other";
  essence: number;
  wv?: number;
  range?: string;
  soak?: number;
  durability?: number;
  weaponType?: WeaponType;
  abilities: string;
  charm?: boolean;
  dp?: number;
}> = [
  { name: "Common Melee Weapon", kind: "weapon", essence: 20, wv: 4, range: "5'", weaponType: "Sword", abilities: "Starter melee, Physical Damage 4, Range 5'." },
  { name: "Common Ranged Weapon", kind: "weapon", essence: 20, wv: 3, range: "30'", weaponType: "Bow", abilities: "Starter ranged, Physical Damage 3, Range 30'." },
  { name: "Common Armor", kind: "armor", essence: 20, soak: 4, durability: 4, abilities: "Starter armor, Soak 4 / Durability 4." },
  { name: "Common Shield", kind: "shield", essence: 20, soak: 4, durability: 4, abilities: "Starter shield, Soak 4 / Durability 4." },
  { name: "Crystal Bracer", kind: "demesne", essence: 20, dp: 40, abilities: "DP storage." },
  { name: "Tier 1 Demesne Charm", kind: "demesne", essence: 20, charm: true, dp: 25, abilities: "Choose a Tier 1 ability." },
];

export type WearPattern = {
  id: string;
  name: string;
  weight: ArmorWeight;
  soak: number;
  durability: number;
  need: string;
  traits: string;
  minAgi?: number;
  minStr?: number;
  minStrEnd?: number;
};

export const ARMOR_PATTERNS: WearPattern[] = [
  { id: "padded", name: "Padded", weight: "light", soak: 2, durability: 6, need: "Agility 1", minAgi: 1, traits: "Quiet. Soft. −1 Soak vs piercing." },
  { id: "leather", name: "Leather", weight: "light", soak: 3, durability: 5, need: "Agility 1", minAgi: 1, traits: "Quiet enough to Hide." },
  { id: "studded", name: "Studded Leather", weight: "light", soak: 4, durability: 4, need: "Agility 1", minAgi: 1, traits: "Slight rattle. −1 Hide." },
  { id: "hide", name: "Hide", weight: "medium", soak: 3, durability: 6, need: "Strength 1", minStr: 1, traits: "Warm. Bulky." },
  { id: "mail", name: "Mail", weight: "medium", soak: 4, durability: 5, need: "Strength 1", minStr: 1, traits: "Noisy. −2 Hide." },
  { id: "scale", name: "Scale", weight: "medium", soak: 5, durability: 4, need: "Strength 2", minStr: 2, traits: "−1 Movement." },
  { id: "breastplate", name: "Breastplate", weight: "medium", soak: 5, durability: 5, need: "Strength 2", minStr: 2, traits: "Chest protection. Limbs open." },
  { id: "splint", name: "Splint", weight: "heavy", soak: 6, durability: 6, need: "Str+End 3", minStrEnd: 3, traits: "−1 Movement." },
  { id: "plate", name: "Plate", weight: "heavy", soak: 7, durability: 6, need: "Str+End 4", minStrEnd: 4, traits: "−2 Movement. Full coverage." },
];

export const SHIELD_PATTERNS: WearPattern[] = [
  { id: "buckler", name: "Buckler", weight: "light", soak: 2, durability: 4, need: "Agility 1", minAgi: 1, traits: "Light. Unproficient −1 Accuracy." },
  { id: "targe", name: "Targe", weight: "light", soak: 3, durability: 4, need: "Agility 1", minAgi: 1, traits: "Punching rim. Unproficient −1 Accuracy." },
  { id: "heater", name: "Heater", weight: "medium", soak: 4, durability: 5, need: "Strength 1", minStr: 1, traits: "Even Test Results Soak. Unproficient −1 Accuracy." },
  { id: "kite", name: "Kite", weight: "medium", soak: 5, durability: 5, need: "Strength 2", minStr: 2, traits: "Mounted or foot. Unproficient −1 Accuracy." },
  { id: "tower", name: "Tower", weight: "heavy", soak: 6, durability: 6, need: "Str+End 3", minStrEnd: 3, traits: "−1 Move unproficient. Even hits Soak." },
];

export function canWearPattern(
  attrs: Pick<Character["attributes"], "str" | "agi" | "end">,
  p: WearPattern,
): boolean {
  if (p.minAgi && attrs.agi < p.minAgi) return false;
  if (p.minStr && attrs.str < p.minStr) return false;
  if (p.minStrEnd && attrs.str + attrs.end < p.minStrEnd) return false;
  return true;
}

export function findAbility(list: AbilityDef[], id: string): AbilityDef | undefined {
  return list.find((a) => a.id === id);
}
