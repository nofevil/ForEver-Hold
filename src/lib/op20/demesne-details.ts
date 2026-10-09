/** Full demesne write-ups. Charm notes use these, resolved at tier 1. Keys are element:id. */
export const DEMESNE_DETAILS: Record<string, string> = {
  "air:twines":
    "All 3 Twines. Toss at Tier 1, Bowl Over at Tier 3, and Choke at Tier 5. Only a twine that matches your tier activates.\n\n::Toss:: On +5, toss a small object within 5'/Tier up to 10'/Tier. Can be used as an improvised weapon for 1 Damage/Tier.\n\n::Bowl Over:: On +10, push the target 5'/Tier, knock them prone, and deal 2 Damage/Tier.\n\n::Choke:: On +15, deal 15 Damage to a target that breathes, and the target gains Panic (−4 on all rolls next round).",
  "air:attunement":
    "Gain 1 Demesne (Air) Resist/Tier. Gain 1 Soak per damage resisted. +1 Poise/Tier to Zephirin-aligned creatures. At Tier 5 the creature can ignore penalties acting within an Air Demesne.",
  "air:bolt":
    "Discernment vs Dodge. Range 10'/Demesne Tier. Damage 3/Demesne Tier. 1 DP per Damage.",
  "air:deflect":
    "Reflex vs Ranged Accuracy. Roll once and apply to all projectiles. Next Minor Action. 3 DP/target, paid when a projectile activates it. Until the start of your next turn, deflect up to Demesne Tier physical ranged projectiles passing within 5'/Demesne Tier. On +10, reroute a projectile and attack an enemy with it (Discernment vs Dodge).",
  "air:disarm":
    "3 DP/Strength. Reflex vs Resolve. Disarm an opponent and their weapon scatters 5'/Tier. On +10, attack an enemy within 5'/Tier with the disarmed weapon (Discernment vs Dodge).",
  "air:ground":
    "Reflex vs Resolve. Channel 3 DP/Tier. Force a flying creature of size Demesne Tier or below within 15'/Tier to land. On +10, deal 2 × Demesne Tier to grounded targets and they are prone. As long as the channel is maintained the creature remains grounded.",
  "air:levitate":
    "Reflex vs Tier. Channel 2 DP/round. Gain Flight, movement = 2 × Tier. On +10, double movement for 1 round. An Airmane of Demesne Tier 2 or higher may automatically cast this at Demesne Tier 1. At Tier 5 the channel is automatic and does not limit you to only this channel.",
  "air:light-of-foot":
    "Reflex vs Tier. Channel 1 DP/Tier. When walking or running, gain +1 Move/Tier. On +10, +1 Accuracy/Tier for 1 round.",
  "air:melee-bolt":
    "Declare before attacking. DP = 3 × Tier. Add 3 × Tier Air Damage to a melee weapon’s successful attack.",
  "air:push":
    "Reflex vs Resolve. 3 DP/Tier. Push a Medium creature (Large at Tier 5) up to 5'/Tier. On +10 the creature takes 2 Damage/Tier and ends prone. This can also lift any item up to 10 lb/Tier 5' off the ground. On +10 the item can be levitated at 5'/Tier/round.",
  "air:shield":
    "Shield of the Zephryn. Reflex vs Tier. Channel 1 DP/round/Tier plus damage soaked. Soak 3 All/Tier. Does not shield against Fire. On +10 you may make a Bolt attack against a creature within 10'/Demesne Tier.",
  "air:steal-breath":
    "Multi-mode.\n\n::Extinguish:: Reflex vs Endurance + Willpower. A Fire-aligned creature cannot use any Fire abilities, including Demesne abilities, until the end of your next turn, and any ongoing Fire abilities are extinguished, including Binds. On +10, extend an additional round.\n\n::Choke:: Reflex vs Endurance + Willpower. Channel up to Tier rounds, rolling each round. 1 DP/Tier/round. Each additional round requires a contested roll but not an action. Chokes a breathing creature for 1 Damage/Tier and Panic (−4 Accuracy next round). Each additional successful round doubles the damage. The target may spend additional actions to roll against this effect again for the round.",
  "air:wall-of-wind":
    "Reflex vs Tier. Channel 2 DP/round/Tier. Create a 5' wide, 10' tall, 10' long/Tier wall of air. Projectiles passing through the wall (except Fire attacks), and attacks made from within the wall except by the Airmane, get −1 Accuracy/Tier and −1 Damage/Tier. On +10, gain Soak 10.",
  "air:whirlwind":
    "Reflex vs Resolve. Up to 1 target/Tier within a 5'/Tier radius. 5 DP/Tier/target. Tosses a Medium creature or smaller, and any object under 5 lb/Tier, within 5' + 1'/Tic/Tier up in the air. The target takes falling damage of 2ST/10'. On +10 the target is stunned (−4 next action, immobile next round). At Tier 5 this can target Large creatures.",
  "air:astrologic-geology":
    "You may modify your bolt (DP × 3) using heartstones of a different elemental demesne. Unfinished heartstones are consumed on any failure. On +10 the heartstone’s tier increases by 1. On −5 an unfinished heartstone explodes for 3 Damage/Tier. On −10 a finished heartstone is inert for 2 days/Tier, and make a Notice check for both demesnes. On −15 a finished heartstone is destroyed and deals 5 Damage/Tier to the holder. The maximum tier of the ability is the user’s Demesne Tier and the tier of the heartstone. The same Astrologic Geology ability can’t be used on consecutive rounds or actions. For 1 day/Tier afterward, reaction rolls against either demesne’s aligned creatures are at −1/Tier.\n\n::Heartstone (Fire) — Ring of Fire:: For a full round, a zone of fire in a radius of 5'/Tier. Movement in the ring is halved. It blocks all ranged attacks and deals 4 Damage/Tier to anyone inside except the astrologer.\n\n::Heartstone (Earth) — Scour:: A fan of 5'/Tier of air and fine earth. Unarmored targets take 4/Tier and are blinded (−4 Accuracy) until your next turn. Armor and shields lose 1 Durability/Tier and all demesne abilities until repaired. Armored creatures become Exposed for 1 round: all damage applies directly to Health.\n\n::Heartstone (Water) — Devil Shark:: The air in a 10' radius/Tier fills with 1/Tier mist elementals. The first round each attacks at Tier × 2 Accuracy for 3 Mist Damage/Tier. On +10 the target is dragged to the Air or Water demesne for 1 round (another 3 Damage/Tier, then it reappears and scatters 5'/Tier after the astrologer’s next turn). Each turn, 1 mist elemental disappears until they are gone.",

  "fire:twines":
    "All 3 Twines. Distract at Tier 1, Burn at Tier 3, and Agonize at Tier 5. Only a twine that matches your tier activates.\n\n::Distract:: On +5 on any Fire attack, the target is Distracted and takes −2 on their next action.\n\n::Burn:: On +10 on any Fire attack, Burn Tier. Burning deals Demesne Tier Fire Damage at the start of each round. Spend an action or minor action, Agility vs Demesne Tier, to put it out.\n\n::Agonize:: On +15, the target is engulfed and takes −2 to all attributes on their next action. A Firemane may spend their next action to cause 25 Piercing damage.",
  "fire:attunement":
    "Gain 1 Fire Resist/Tier. Regain 2 DP/Tier per damage resisted. +1 Poise/Tier to Fire-aligned creatures. At Tier 5 the creature can ignore penalties acting within a Fire Demesne. At Tier 5, gain the crafting recipe Fire Attunement Tonic: 1 Shift, 5 Alchemical Supplies, and 1 Fire component of at least Rare. One creature gains Attunement (Fire) 5 for 1 day per tier of that component.",
  "fire:bolt":
    "Base cost 1 DP per Damage. Range 10'/Demesne Tier. Max 4 Damage/Tier. A Demesne Tier 3 bolt is 12 Damage, range 30', and costs 12 DP.",
  "fire:fire-shield":
    "Force of Will vs Tier. Channel 1 DP/Tier/round plus damage dealt. A target that hits the Firemane with a melee attack takes 2 Damage/Tier. On +10 the Firemane may instead Spike a target within 5'/Tier each round for 2 Damage/Tier. A Spike is automatic damage.",
  "fire:ensheathe":
    "Force of Will vs Tier. Give a melee weapon the Firemane is wielding +1 Fire Damage/Tier. Channel 1 DP/Tier/round. If Demesne Tier is greater than the weapon’s quality, on each attack the weapon rolls Quality Tier × 2 vs the ability tier or loses 1 Damage. A weapon with 0 Damage is destroyed. On +10 the channel is automatic until the end of combat, costs no DP, and does not count against the channel limit. Using both Breath of Fire and Ensheathe combines their Fire tiers when rolling against the weapon.",
  "fire:breath-of-fire":
    "Force of Will vs Tier. Bind 3ST DP/Tier to give a melee weapon up to +1 Fire Damage/Tier until released. If you bind a greater tier than the weapon’s quality, on each attack the weapon rolls Quality Tier × 2 vs Breath of Fire tier or loses 1 Damage. A weapon with 0 Damage is destroyed. A Tier 2 finished heartstone can replace the Bind. Using both Breath of Fire and Ensheathe combines their Fire tiers when rolling against the weapon.",
  "fire:combust":
    "Force of Will vs the material’s quality. Ignite flammable objects within 10'/Tier. You may attempt items that are flammable but not readily so, such as leather-bound books, wooden furniture, or items on a person. If this is done to a person, they begin to Burn Tier.",
  "fire:heat-metal":
    "Channel. Heat a single piece of metal on a target. Force of Will vs Fortitude. Gain +2 Accuracy per round and deal +2 Damage per round until the target is taking 2 Damage per Tier. All of the target’s actions are at −2 Accuracy. Costs 1 DP per Damage. If the channel is successful, on round 2 or later, Demesne Tier vs Endurance or the target is disarmed 5'.",
  "fire:melee-bolt":
    "Declare before attacking. DP = 4 × Demesne Tier. Add 4 × Demesne Tier Fire Damage to a melee weapon’s successful attack. The weapon rolls Demesne Tier vs Quality Tier or loses 1 Damage. A weapon that reaches 0 Damage is destroyed.",
  "fire:create-elemental":
    "Force of Will vs Tier. Requires 2 actions. Channel 2 DP/Tier/round. Create a small elemental with Strength, Agility, Endurance, and Perception equal to the ability tier, Move 4, and Fire Slam 2/Tier Demesne Damage. On +10, Burn the ability tier. It must remain within 20'/Tier of the Firemane. It can be maintained permanently at no channel cost with a finished heartstone equal to its tier. It may take an action on the turn it is summoned.",
  "fire:animate-fire":
    "Range 10'/Tier. Force of Will vs Tier. Create 1 small animated fire creature per ability tier (non-combat). Channel 1 DP/Tier/round. At Tier 3, Medium creatures. At Tier 5, Large creatures. It ignites any flammable object it touches, and deals 1 Damage/Tier to creatures who cannot move out of range.",
  "fire:blacksmith-searing":
    "DP per tier of the item being created. Adds +1/Tier to a blacksmith’s crafting roll.",
  "fire:channel":
    "A Firemane regains additional DP when resting near a fire. Fire abilities cost no DP when within 10'/Tier of a large blaze, such as a house fire, forest fire, or lava flow.\n\n::Normal fire:: 2 DP/Tier/shift.\n\n::Bonfire:: 4 DP/Tier/shift. The bonfire requires 3 Fuel/shift.\n\n::Open Fire portal:: 30 DP/shift.",
  "fire:astrologic-geology":
    "You may modify your bolt using heartstones of a different elemental demesne. Unfinished heartstones are consumed on any failure. On +10 you may increase the heartstone’s tier by 1. On −5 an unfinished heartstone explodes for 5 Damage/Tier in a 10' radius. On −10 a finished heartstone is inert for 2 days/Tier, and make a Notice check for both Fire and Earth. On −15 a finished heartstone is destroyed and deals 5 Damage/Tier to the holder and creatures within 5'/Tier. The maximum tier of the ability is the tier of the heartstone. The same Astrologic Geology ability can’t be used on consecutive rounds or actions. For 1 day/Tier afterward, reaction rolls against either demesne’s aligned creatures are at −1/Tier.\n\n::Heartstone (Air) — Firenado:: A fiery tornado engulfs one target for 4 Fire Damage/Tier and tosses them 10' + 10'/Tic (2ST falling damage per 10'). Agility vs distance/10' or they end prone and take another 1ST per 10'.\n\n::Heartstone (Earth) — Lava Hammer:: A melee attack (Prowess + Demesne Tier) for 6 Damage/Tier. On a failure, gain Carapace 3/Tier.\n\n::Heartstone (Water) — Scald:: A fan of 5'/Tier for 5 Damage/Tier plus Blister. Tier vs Endurance or −2 Accuracy for Tier rounds and −2 Poise until healed.",

  "earth:twines":
    "All 3 Twines. Strength at Tier 1, Defend at Tier 3, and Petrify at Tier 5. Only a twine that matches your tier activates.\n\n::Strength:: On +5, gain +1 Strength/Tier for one round.\n\n::Defend:: On +10, gain a 3/Tier Carapace.\n\n::Petrify:: On +15, the target is Petrified and gains a 20 point Carapace until the end of your next turn.",
  "earth:attunement":
    "Endurance + Strength. Gain 1 Earth Resist/Tier. Gain 1 Carapace per damage resisted. +1 Presence/Tier to Tellur-aligned creatures. At Tier 5 the creature can ignore penalties while acting within an Earth Demesne.",
  "earth:earth-shield":
    "Fortitude vs Tier. Bind 2ST DP. Gain a 4/Tier Shield that Soaks All. Damage prevented costs 1 DP per damage. At Tier 3, the Earthmane may use this shield on both themself and an ally within 5'. At Tier 5, themself and allies within 10'. On +10, gain a 3/Tier Carapace.",
  "earth:earth-sense":
    "Fortitude vs Tier. Channel, 50' radius/Tier. 3 DP/Tier/round. Sense creatures and movement within the radius, and detect hollow spaces. +1/Tier on Improvised Battlefield checks, or +2 Assist to a creature using Improvised Battlefield. On +10 you receive more specific information, such as creatures sneaking, talking, or working.",
  "earth:ensheathe":
    "Fortitude vs Tier. Channel 1 DP/Tier. Add +1 Earth Damage/Tier to a creature’s blunt or unarmed weapon.",
  "earth:locate-mineral":
    "Endurance + Intellect. Channel 5 DP/hour. Range 100'/Tier. Points the Earthmane toward a chosen mineral. Rarer metals may take several shifts, and gemstones may take weeks. The Story Master may require a mining settlement or a downtime action to extract it.\n\n::Tier 1:: Stone, marble, bedrock.\n\n::Tier 2:: Iron, lead.\n\n::Tier 3:: Copper, tin, powder, and other semi-precious metals.\n\n::Tier 4:: Gold, silver, and other precious metals.\n\n::Tier 5:: Gemstones and platinum.",
  "earth:melee-bolt":
    "An Earthmane can’t shield the turn they use a Melee Bolt. −2 Accuracy. Spend up to 1 DP per Damage to add up to 4 Damage/Tier to a melee attack. Declare before the roll.",
  "earth:summon-gargoyle":
    "Dominion vs Tier. Bind 5 DP/Tier. Summon an elemental. Stats are 1/Tier Strength, Agility, Endurance, Perception, and Damage. Move 4 Flying. On +10, Carapace 3/Tier. A Gargoyle may be given a command as an action. It performs that action until commanded to stop. Gargoyles become inactive after 24 hours. As an action, repair one by channeling 2 DP per 1 Health, up to Tier Health per round.",
  "earth:summon-wall":
    "Fortitude. 10 DP/Tier. Summon a wall of earth or stone, whichever is nearby. Up to 10' long/Tier, 10' high + 1'/Tier, and 5' wide + 1'/Tier. As long as there are endpoints to anchor on, this can be an arched bridge or a crenellated wall. On +10, the wall can be created with carvings, runes, or other adornment.",
  "earth:tellurs-grasp":
    "Trap an enemy in a fist of stone. Range 10'/Tier. 5 DP per target. Fortitude vs Prowess. Immobilize up to Tier targets for Tier rounds. A trapped target can’t move or attack, has full cover (+4 Defensive), and −2 Accuracy. Flying or levitating creatures are grounded. An opponent may spend an action to roll against this again.",
  "earth:travel-through-earth":
    "Fortitude vs Tier. Move up to 10'/Tier through earth or stone. 2 DP per 10'. On +10, double the distance. If you are still in the earth at the end of the round, you must use Travel Through Earth on the next round or die.\n\n::Tunnel:: Upgrade, 15 Essence. For 10 DP per 10', create finished tunnels instead.",
  "earth:tremors":
    "Apex Channel. Demesne Tier per round. 25' range/Tier. 20 DP/round. Each round, roll Fortitude vs Tier × 2. Each failure gives a point of Exhaustion after the ability expires. Used in a populated area, creatures may be Awed, Intimidated, Feared, or Worshipful.\n\n::1:: Endurance + Demesne Tier vs Endurance + Agility, or creatures are knocked prone. Prone creatures have half movement and can only stand.\n\n::2:: As 1, and structures shake and take 3/Tier damage. Each 10' of structure typically has 10 Health per quality tier. Glass shatters.\n\n::3:: As 2, and Fortitude vs Resolve or creatures are knocked into the air, take 3/Tier damage, and end prone.\n\n::4:: As 3, and the Earthmane may use Tellur’s Grasp on 4 visible targets.\n\n::5:: As 4, and the Earthmane may summon a Tier 5 Gargoyle.",
  "earth:work-stone":
    "Downtime action. Endurance + Intellect. 10 DP/Shift/Tier. Work up to 10' × Tier cubic of stone per shift, to quality tier per tier, or up to 20' cubic of loose earth per hour. On +10, increase quality or double the output.",
  "earth:astrologic-geology":
    "You may modify Earth Shield using heartstones of a different elemental demesne. Unfinished heartstones are consumed on any failure. On +10 you may increase the heartstone’s tier by 1. On −5 an unfinished heartstone explodes for 5 Damage/Tier. On −10 a finished heartstone is inert for 2 days/Tier, and make a Notice check for both demesnes. On −15 a finished heartstone is destroyed and deals 5 Damage/Tier to the holder. The maximum tier of the ability is the tier of the heartstone. The same Astrologic Geology ability can’t be used on consecutive rounds or actions.\n\n::Heartstone (Fire) — Magma Shield:: Carapace 5/Tier, −1 Move, and −1 Accuracy. A wooden weapon of Uncommon quality or below is destroyed on a hit. A metal weapon is heated, dealing 3 Fire Damage/Tier to the wielder, and Demesne Tier vs Endurance or Disarm 5'.\n\n::Heartstone (Water) — Quicksand:: Fortitude vs Prowess. A 5'/Tier radius field of quicksand on earth or stone. Creatures who fail are Immobilized (can’t move, −2 Accuracy) until the start of your next turn. They may spend extra actions to try to escape. At the start of your next turn, immobilized creatures roll Fortitude vs Prowess again. On a failure they drown, or are discarded to a Water, Earth, Quicksand, or Arena demesne.\n\n::Heartstone (Air) — Pumice:: Fortitude vs Tier. Weaken a 100' cubic/Tier area of stone or earth. Significant pressure collapses it. Used on a stone or earth creature of tier no higher than the Demesne and heartstone tiers, Demesne Tier + Fortitude vs Fortitude or it becomes a mob with the same stats and 1 Health.",

  "water:twines":
    "All 3 Twines. Drench at Tier 1, Cleanse at Tier 3, and Drown at Tier 5. Only a twine that matches your tier activates.\n\n::Drench:: On +5, a target within range gains Soaked. Half movement, −1 Damage/Tier from Fire, and +1 Damage/Tier from Ice and Storm.\n\n::Cleanse:: On +10, remove a buff or debuff from a creature within 10'/Tier.\n\n::Drown:: On +15, create a water bubble around a target.",
  "water:attunement":
    "Poise + Endurance. Gain 1 Water Resist/Tier. Gain 1 Carapace per Water damage resisted. +1 Poise/Tier to Endless Blue-aligned creatures. At Tier 5 the creature can ignore penalties acting within a Water Demesne.",
  "water:bolt":
    "Base cost 1 DP per Damage. Range 10'/Demesne Tier. Max 3 Damage/Tier. A Demesne Tier 3 bolt is 9 Damage, range 30', and costs 9 DP.",
  "water:hose-bolt":
    "Bolt upgrade. Range is halved and −1 Damage/Tier. On a hit, the target is pushed 5'/Tier and prone.",
  "water:encase":
    "Channel — Aura vs Tier for Cushion. Aura vs Fortitude for Drown. (Enemy creatures roll each round to end the effect) — 2 DP/Tier/round.\n\n::Cushion:: Surround a friendly creature with a bubble of Water. It gains a Water Shield, Soak 3/Tier/round. 1 DP per damage taken. On +10, remove a debuff or restore 1 Health/Tier to the Cushioned target.\n\n::Drown:: Create a Water Bubble around a target. Each round, an enemy creature makes a drown check, Aura vs Fortitude. If it fails it takes 3 Damage/Demesne Tier and −2 Accuracy next round. 1 DP per damage dealt. On +10 the target automatically fails next round.",
  "water:free-action":
    "Channel 3 DP/round. Act freely when fully submersed, plus one more ability per tier. All of them are available at Tier 5.\n\n::1. Water Talker:: Converse with Water-aligned creatures.\n\n::2. Bubbly Water:: Up to Tier allies gain Water Breathing for 1 extra DP/round/ally.\n\n::3. Hard Water:: Gain 1 Soak/Tier when at least half submersed.\n\n::4. Strong Water:: Gain +1 Damage/Tier when at least half submersed.\n\n::5. Saving Water:: The creature may Bolt from submersion. Once per campaign, if you die and are then fully immersed, you gain a water-themed Stasis Field.",
  "water:fog-cloud":
    "Channel 1 DP/Tier/round. Create a dense fog in up to a 10' radius/Tier. Creatures inside gain partial cover from attacks coming from outside (+2 Defensive).\n\n::Dense Water:: Fog Cloud upgrade. When creating the fog, spend 3 DP/Tier. Allies inside gain Carapace 2/Tier and −1 Movement.\n\n::Astrologic upgrades:: Each upgrade costs one action. Those actions can all be paid on the first rounds.\n\n::Boiling Fog:: Fog Cloud upgrade. Aura vs Fortitude. Requires a Fire heartstone of the tier. Each creature in the fog takes 3 Damage/Tier/round.\n\n::Caustic Fog:: Fog Cloud upgrade. Requires a Nature heartstone. Spend 15 DP for each enemy. That enemy’s armor rolls Aura vs Quality × 2, or its durability becomes 0.\n\n::Disorienting Fog:: Fog Cloud upgrade. Requires a Dark heartstone. Spend 10 DP for each enemy. An enemy leaving the fog rolls Aura vs Discernment or is turned 180° and keeps moving. Partial cover then applies only to allies.\n\n::Phantoms:: Fog Cloud upgrade. Requires a Shadow heartstone. Spend 10 DP each to create up to Tier phantoms. On an even Test Result against an ally in the fog, a phantom takes the hit and dissipates.",
  "water:wall-of-water":
    "Channel 4 DP/Tier/round. Create a wall 10' long/Tier, 10' tall, and 5' wide. It blocks standard ranged weapons. Entering a square of the wall costs 3 movement.\n\n::Wall of Ice:: Requires an Ice heartstone. Spend 5 DP/Tier. The wall becomes ice, gains +2/Tier Defensive against physical attacks, and each 5' square has 5 Health/Tier.\n\n::Wall Shark:: Requires a Nature heartstone. Spend 10 DP/Tier to summon a 100 Essence/Tier shark that attacks anyone entering or adjacent, up to Tier times a round and once per creature. On +10 after the wall ends, the shark fights for 3 more rounds, then reenters its demesne.",
  "water:water-breathing":
    "Channel 1 DP/round. The DP cost is removed at Tier 3.",
  "water:shield":
    "Channel 2 DP/Tier/round. Create a shield of water, 5' × Tier squares and 10' tall, starting directly in front of you. Soak 3/Tier/round. 1 DP per damage soaked.",
  "water:portal":
    "Open a portal of size Tier. Costs 5 DP/Tier. Open it as a 1 hour channel, or tear it open in 3 rounds. Tearing it risks attracting a creature of 15% per tier of party Essence on a failed roll. Intellect + Demesne Tier vs 2 × Tier.",
  "water:astrologic-geology":
    "You may modify Bolt, Fog Cloud, and Wall of Water using heartstones of a different elemental demesne. Unfinished heartstones are consumed on any failure. On +10 the heartstone’s tier increases by 1. On −5 an unfinished heartstone explodes for 5 Damage/Tier in a 10' radius. On −10 a finished heartstone is inert for 2 days/Tier, and make a Notice check for both Fire and Earth. On −15 a finished heartstone is destroyed and deals 5 Damage/Tier to the holder and creatures within 5'/Tier. The maximum tier of the ability is the tier of the heartstone. The same Astrologic Geology ability can’t be used on consecutive rounds or actions. For 1 day/Tier afterward, reaction rolls against either demesne’s aligned creatures are at −1/Tier.\n\n::Heartstone (Fire) — Scalding Bolt:: Range is doubled and the bolt has +1 Damage/Tier. Demesne Tic is reduced by 1. On +10, Blister: −2 Accuracy and −2 Poise until healed.",

  "shared:astrologic-aura":
    "On failing an elemental ability, once per combat: Air fires a Bolt of 3/Tier at no DP; Earth gains 3 Carapace/Tier; Fire gains a 3 Spike/Tier; Water cleanses a condition or takes a 1 Shift rest.",
  "shared:body-and-mind":
    "Requires Attunement. Spend an action. Pay 3 Health/Tier to gain 6 DP/Tier, or pay 6 DP/Tier to regain 2 Health/Tier. You may also take 1 attribute damage/Tier, chosen at random, to restore 10 DP/Tier or 4 Health/Tier.",
  "shared:bolt-master": "Add +1 Damage per Tier to Bolt abilities.",
  "shared:demesne-bonded":
    "You regain DP on any rest, equal to your primary attribute. A rest spent only on DP regains 3× that attribute instead of 2×.",
  "shared:elemental-control":
    "Channel 2 DP per 100 Essence of the creature. Target a non-sentient elemental aligned with your demesne. Control 100 Essence/Tier of it for Demesne Tier rounds. Presence + Tier vs Willpower + Presence, −1 per extra 25 Essence beyond the limit. On +10 you may attempt to tame it. Taming requires a tier heartstone per 100 Essence. Presence + Attunement Tier vs the creature’s tier × 2.",
  "shared:shield-mastery": "Add +1 Soak per Tier to shield abilities, or +1 Spike per Tier where the shield spikes.",
  "shared:high-astrology":
    "Spend reserve DP. 3 DP/Tier doubles an ability’s range. 4 DP/Tier adds +2 Damage/Tier, and on a −5 the ability still hits. 5 DP/Tier grants +1 Accuracy/Tier to hit, or +1 Accuracy/Tier on a secondary roll. At Tier 5 you may spend all current DP, at least 50, and use your demesne’s capstone once per campaign.",
  "shared:imbue":
    "1 Shift. Move up to 5 DP/Tier from yourself, or from a portal, remnant, or leak, into an item that can hold Imbue. While imbuing you do not regain Health or DP.",
  "shared:restore":
    "1 Shift. Pull up to 5 DP/Tier, plus 1 DP/Tier of Attunement, from a portal, remnant, leak, imbued item, or heartstone.",
  "shared:internal-heartstone": "On a +5, the ability doesn’t cost DP.",
  "shared:piercing": "Bolts deal a minimum of 2 Damage/Tier directly to Health.",
  "shared:shaping-twines":
    "Bind 3ST DP/Tier. Shape a demesne ability into a Line, Fan, or Burst. Creatures in the shape take half damage even if the attack misses.",
};
