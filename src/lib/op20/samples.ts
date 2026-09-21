import { derive } from "./compute";
import { blankAirship, blankCharacter, blankMob, blankRelic, makeItem } from "./defaults";
import type { Airship, Character, Mob, Relic } from "./types";
import { uid } from "@/lib/utils";

function withTracker(c: Character): Character {
  const d = derive(c);
  return {
    ...c,
    tracker: {
      ...c.tracker,
      currentHealth: d.healthMax,
      currentDp: d.dpMax,
      currentCp: d.combatPool,
      currentSp: d.socialPool,
      equippedWeaponId: c.items.find((i) => i.kind === "weapon")?.id ?? null,
    },
  };
}

export function sampleMira(): Character {
  const sword = makeItem({
    name: "Ashen Shortsword",
    kind: "weapon",
    essence: 20,
    wv: 4,
    weaponType: "Sword",
    equipped: true,
    abilities: "Starter melee. WV 4.",
  });
  return withTracker(
    blankCharacter({
      name: "Mira Ashen",
      profession: "Firemane Duelist",
      bio: "A survivor who learned Aile the hard way. Fights close, burns closer.",
      epoch: "A Past Forgotten",
      startingEssence: 100,
      sheetOpened: true,
      attributes: { str: 2, agi: 2, end: 2, per: 1, intel: 0, wp: 0, poise: 0, pres: 2 },
      purchasedHealth: 6,
      purchasedDpEssence: 5,
      wp: {
        tier: 2,
        types: ["Sword"],
        picks: [
          { tier: 1, abilityId: "skilled" },
          { tier: 2, abilityId: "flurry" },
        ],
      },
      demesnes: [
        {
          id: "mira-fire",
          tier: 2,
          picks: [
            { tier: 1, element: "fire", abilityId: "bolt" },
            { tier: 2, element: "fire", abilityId: "fire-shield" },
          ],
        },
      ],
      tricks: [{ id: "t1", category: "swordmaster", abilityId: "riposte" }],
      items: [sword],
      notes: "Sample 100 Essence Firemane.",
    }),
  );
}

export function sampleKael(): Character {
  const bow = makeItem({
    name: "Drift Bow",
    kind: "weapon",
    essence: 20,
    wv: 3,
    range: "30'",
    weaponType: "Bow",
    equipped: true,
    abilities: "Starter ranged. WV 3, Range 30'.",
  });
  return withTracker(
    blankCharacter({
      name: "Kael Drift",
      profession: "Zephirin Scout",
      bio: "Reads wind the way other people read faces. Prefers not to be seen.",
      epoch: "A Past Forgotten",
      startingEssence: 50,
      sheetOpened: true,
      attributes: { str: 0, agi: 2, end: 1, per: 2, intel: 2, wp: 0, poise: 0, pres: 0 },
      purchasedHealth: 2,
      wp: {
        tier: 1,
        types: ["Bow"],
        picks: [{ tier: 1, abilityId: "focused" }],
      },
      demesnes: [
        {
          id: "kael-air",
          tier: 1,
          picks: [{ tier: 1, element: "air", abilityId: "bolt" }],
        },
      ],
      athletics: { tier: 1, picks: [{ tier: 1, abilityId: "dodge" }] },
      items: [bow],
      notes: "Sample 50 Essence Air scout. Athletics Dodge feeds the Dodge derived stat.",
    }),
  );
}

export function sampleVess(): Character {
  const gauntlets = makeItem({
    name: "Cinder Gauntlets",
    kind: "weapon",
    essence: 20,
    wv: 4,
    weaponType: "Gauntlet",
    equipped: true,
    abilities: "Starter gauntlets. WV 4.",
  });
  return withTracker(
    blankCharacter({
      name: "Vess Cinderwell",
      profession: "Lavakin",
      bio: "Earth and fire, because the Swarm left no other way. Neither court will have her. Rhyolite is enough.",
      epoch: "A Past Forgotten",
      startingEssence: 100,
      sheetOpened: true,
      attributes: { str: 1, agi: 1, end: 2, per: 1, intel: 0, wp: 0, poise: 0, pres: 2 },
      purchasedHealth: 5,
      purchasedDpEssence: 4,
      wp: {
        tier: 1,
        types: ["Gauntlet"],
        picks: [{ tier: 1, abilityId: "powerful" }],
      },
      demesnes: [
        {
          id: "vess-mix",
          tier: 2,
          picks: [
            { tier: 1, element: "earth", abilityId: "earth-shield" },
            { tier: 2, element: "fire", abilityId: "melee-bolt" },
          ],
        },
      ],
      tricks: [{ id: "t1", category: "combat", abilityId: "critical-strike" }],
      items: [gauntlets],
      notes: "Sample 100 Essence Earth + Fire mix. DP from Endurance, Presence, and overall Demesne tier.",
    }),
  );
}

export function sampleRoster(): Character[] {
  return [sampleMira(), sampleKael(), sampleVess()];
}

export function sampleRelics(): Relic[] {
  return [
    blankRelic({
      name: "Cauterizing Edge",
      kind: "weapon",
      bio: "A Past Forgotten starter sword. Binding wakes a small fire elemental.",
      weaponType: "Sword",
      wv: 6,
      extraActions: 0,
      wpTier: 1,
      attributes: { str: 4, agi: 4, end: 0, per: 0, intel: 0, wp: 0, poise: 0, pres: 3 },
      demesnes: [{ element: "fire", tier: 4 }],
      extraDpEssence: 0,
      boundDp: 10,
      abilities: [
        { id: uid(), name: "Breath of Fire", text: "+4 Fire Damage.", essence: 0 },
        {
          id: uid(),
          name: "Fire Shield",
          text: "1 Action. Channel DP = 4/round + damage dealt. Melee hitter takes 2 × Ability Tier.",
          essence: 0,
        },
        {
          id: uid(),
          name: "Elemental (Fire)",
          text: "A small fire elemental appears on bind. Stay within 60'. Stats = Ability Tier. Fire Slam 2×DT. On +10 Burn.",
          essence: 0,
        },
        {
          id: uid(),
          name: "Combust",
          text: "Ignite flammables within 20'. On a person: Burn Tier.",
          essence: 0,
        },
      ],
      notes: "Holding this sword burns an unattuned wielder.",
    }),
    blankRelic({
      name: "Pummeling Eruption",
      kind: "weapon",
      bio: "Smash the gauntlets together to bind. Obsidian Skin erupts over the wearer.",
      weaponType: "Gauntlet",
      wv: 6,
      extraActions: 1,
      wpTier: 2,
      attributes: { str: 2, agi: 2, end: 3, per: 0, intel: 0, wp: 0, poise: 0, pres: 3 },
      demesnes: [{ element: "fire", tier: 4 }],
      extraDpEssence: 0,
      boundDp: 0,
      abilities: [
        { id: uid(), name: "Bane, Night", text: "+2 Damage/Tier and +1 Accuracy/Tier vs Night.", essence: 0 },
        {
          id: uid(),
          name: "Obsidian Skin",
          text: "20 Carapace that absorbs damage until gone. 20 DP.",
          essence: 18,
        },
        {
          id: uid(),
          name: "Lava Strike",
          text: "End+Pre. +12 Fire + WV. Clinging lava: +1 Fire/Tier/round and +4 Carapace until scraped off. 12 DP.",
          essence: 18,
        },
        {
          id: uid(),
          name: "Suffocating Eruption",
          text: "Ash 25' radius. −4 on rolls inside, −2 accuracy into the cloud. Range 40'. 5 DP.",
          essence: 18,
        },
      ],
      notes: "From A Past Forgotten. Binding event is smashing the gauntlets together — once.",
    }),
    blankRelic({
      name: "Hammer of Smithing",
      kind: "other",
      bio: "A traveling smith’s fire. Heat Metal stands in for a forge.",
      weaponType: "",
      wv: 0,
      extraActions: 0,
      wpTier: 0,
      attributes: { str: 0, agi: 0, end: 0, per: 0, intel: 0, wp: 0, poise: 0, pres: 0 },
      demesnes: [{ element: "fire", tier: 3 }],
      extraDpEssence: 0,
      boundDp: 0,
      abilities: [
        { id: uid(), name: "Blacksmith’s Searing", text: "+3 to a blacksmith’s Crafting roll. 6 DP.", essence: 18 },
        { id: uid(), name: "Heat Metal", text: "Channel. Heat a single piece of metal for crafting.", essence: 18 },
      ],
      notes: "Rare smithing hammer. Quality band Rare (100).",
    }),
    blankRelic({
      name: "Earth’s Defense",
      kind: "armor",
      bio: "Medium armor bound to Tellur.",
      weaponType: "",
      wv: 0,
      soak: 5,
      durability: 25,
      extraActions: 0,
      wpTier: 0,
      attributes: { str: 0, agi: 0, end: 0, per: 0, intel: 0, wp: 0, poise: 0, pres: 0 },
      demesnes: [{ element: "earth", tier: 2 }],
      extraDpEssence: 0,
      boundDp: 3,
      abilities: [
        {
          id: uid(),
          name: "Earth Shield",
          text: "End+Str. Bind 3 Essence. Gain 8 Soak. 1 DP per damage soaked.",
          essence: 9,
        },
      ],
      notes: "Rare medium armor.",
    }),
  ];
}

export function sampleMobs(): Mob[] {
  return [
    blankMob({
      name: "Conscripted Militia",
      kind: "mob",
      bio: "Average guards, goblins, or pressed townsfolk.",
      accuracy: 2,
      hits: 1,
      damage: 3,
      damageType: "Physical",
      movement: 4,
      special: "Any successful attack kills one hit. Flank and rear still apply.",
      packSize: 12,
      notes: "The base mob. Upgrade accuracy and damage for elites; extra Hits only if the group is small.",
    }),
    blankMob({
      name: "Swarm of Spiders",
      kind: "mob",
      bio: "A square of Swarm. The Witch brings four.",
      accuracy: 3,
      hits: 2,
      damage: 3,
      damageType: "Venom",
      movement: 4,
      special:
        "Covers one square. Destroyed only by Elemental or Light. Pass-over: Tier vs Strength or Webbed; Tier vs Endurance or Poison Tier.",
      packSize: 4,
      notes: "A Past Forgotten.",
    }),
    blankMob({
      name: "Swarm Witch",
      kind: "named",
      bio: "A pawn of the Spider Queen. Mutations have eaten her Poise.",
      accuracy: 5,
      hits: 3,
      damage: 6,
      damageType: "Venom",
      movement: 5,
      special:
        "Carapace 25. Physical Resist 10. Demesne Resist 5. Venom 15. Extra Actions 2. Terror: Poise vs WP+End each round. Swarm 3 Venom.",
      packSize: 1,
      notes: "Use as a named enemy, not a mob. Mutations listed in A Past Forgotten.",
    }),
  ];
}

export function sampleAirships(): Airship[] {
  return [
    blankAirship({
      name: "The Barcelona",
      bio: "Size 3 working example from the Alpha airship notes.",
      size: 3,
      crew: 5,
      hull: 30,
      carapace: 30,
      armor: 10,
      demesneResist: 10,
      hardpoints: 6,
      thrust: 4,
      maneuver: 5,
      pods: [
        { id: uid(), type: "ballista" },
        { id: uid(), type: "burst" },
        { id: uid(), type: "cargo" },
        { id: uid(), type: "cargo" },
        { id: uid(), type: "rudder" },
      ],
      notes: "Older example priced Thrust at 20ST (not 20ST × Size). The ledger uses the corrected 20ST × Size rule from The Random Few.",
    }),
    blankAirship({
      name: "The Random Few",
      bio: "Size 3 with the corrected Thrust and Maneuver step.",
      size: 3,
      crew: 11,
      hull: 30,
      carapace: 30,
      armor: 10,
      demesneResist: 10,
      hardpoints: 6,
      thrust: 5,
      maneuver: 5,
      pods: [
        { id: uid(), type: "ballista" },
        { id: uid(), type: "ballista" },
        { id: uid(), type: "cargo" },
        { id: uid(), type: "cargo" },
        { id: uid(), type: "rudder" },
        { id: uid(), type: "burst" },
      ],
      notes: "Thrust step is 20 × Size. Maneuver step is 10 × Size. Coast speed is 2 × Thrust. Size 3 band is 5000; this yard total sits a little over.",
    }),
  ];
}
