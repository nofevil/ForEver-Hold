import { jsPDF } from "jspdf";
import {
  ATHLETICS,
  DEMESNE_ABILITIES,
  DEMESNE_META,
  FORAGING,
  HARVEST,
  MINING,
  MONSTER_HUNTING,
  SMITHING,
  SOCIAL_TRICKS,
  SUBTERFUGE,
  TRICKS,
  TRICK_LABELS,
  armorSkillsForWeights,
  baneAbilityText,
  baneTargetLabel,
  findAbility,
  isBaneAbility,
  shieldSkillsForWeights,
  wpSkillsForTypes,
  type AbilityDef,
} from "@/lib/op20/catalogs";
import {
  derive,
  equippedArmor,
  equippedShield,
  proficientArmorWeights,
  proficientShieldWeights,
  proficientWeaponTypes,
  spend,
} from "@/lib/op20/compute";
import { defenseShields, demesnePlayText } from "@/lib/op20/sustain";
import {
  ARMOR_WEIGHT_LABELS,
  ATTR_KEYS,
  ATTR_LABELS,
  type Character,
  type DemesneElement,
  type GearItem,
} from "@/lib/op20/types";

const INK: [number, number, number] = [42, 28, 20];
const MUTED: [number, number, number] = [90, 70, 52];
const BURG: [number, number, number] = [124, 45, 34];
const RULE: [number, number, number] = [201, 165, 106];
const CREAM: [number, number, number] = [247, 236, 212];
const PAGE_W = 612;
const PAGE_H = 792;
const M = 40;
const W = PAGE_W - M * 2;

/** Standard PDF fonts cannot draw the sheet's punctuation. */
function ascii(value: string): string {
  return value
    .replace(/::([^:\n]+)::/g, "$1 -")
    .replace(/\n\s*\n/g, "\n")
    .replace(/[—–]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[−–]/g, "-")
    .replace(/×/g, "x")
    .replace(/·/g, " | ")
    .replace(/…/g, "...")
    .replace(/[ \t]+/g, " ")
    .trim();
}

class Sheet {
  private doc = new jsPDF({ unit: "pt", format: "letter" });
  private y = 28;

  constructor(private name: string) {
    this.banner();
  }

  save(filename: string) {
    const pages = this.doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      this.doc.setPage(i);
      this.doc.setFont("times", "italic");
      this.doc.setFontSize(9);
      this.doc.setTextColor(...MUTED);
      this.doc.text(ascii(`${this.name}  ·  ${i} / ${pages}`), M, PAGE_H - 22);
    }
    this.doc.save(filename);
  }

  private banner() {
    this.doc.setFillColor(...BURG);
    this.doc.rect(0, 0, PAGE_W, 36, "F");
    this.doc.setFont("times", "bold");
    this.doc.setFontSize(13);
    this.doc.setTextColor(...CREAM);
    this.doc.text("Forever Hold", M, 23);
    this.doc.setFont("times", "italic");
    this.doc.setFontSize(10);
    this.doc.text("OP20 character sheet", PAGE_W - M, 22, { align: "right" });
    this.y = 52;
  }

  private room(height: number) {
    if (this.y + height <= PAGE_H - 36) return;
    this.doc.addPage();
    this.y = M;
  }

  gap(n = 8) {
    this.y += n;
  }

  title(text: string) {
    this.room(28);
    this.doc.setFont("times", "bold");
    this.doc.setFontSize(22);
    this.doc.setTextColor(...INK);
    const lines = this.doc.splitTextToSize(ascii(text), W) as string[];
    this.doc.text(lines, M, this.y + 18);
    this.y += lines.length * 24;
  }

  subtitle(text: string) {
    if (!text.trim()) return;
    this.room(16);
    this.doc.setFont("times", "italic");
    this.doc.setFontSize(11);
    this.doc.setTextColor(...MUTED);
    const lines = this.doc.splitTextToSize(ascii(text), W) as string[];
    this.doc.text(lines, M, this.y + 11);
    this.y += lines.length * 14 + 2;
  }

  section(text: string) {
    this.room(26);
    this.y += 6;
    this.doc.setFont("times", "bold");
    this.doc.setFontSize(13);
    this.doc.setTextColor(...BURG);
    this.doc.text(ascii(text), M, this.y + 12);
    this.y += 16;
    this.doc.setDrawColor(...RULE);
    this.doc.setLineWidth(0.6);
    this.doc.line(M, this.y, M + W, this.y);
    this.y += 8;
  }

  body(text: string, indent = 0) {
    const clean = ascii(text);
    if (!clean) return;
    this.doc.setFont("times", "normal");
    this.doc.setFontSize(10);
    this.doc.setTextColor(...INK);
    const lines = this.doc.splitTextToSize(clean, W - indent) as string[];
    const lineH = 13;
    for (const line of lines) {
      this.room(lineH);
      this.doc.text(line, M + indent, this.y + 10);
      this.y += lineH;
    }
  }

  entry(name: string, text?: string) {
    this.room(16);
    this.doc.setFont("times", "bold");
    this.doc.setFontSize(11);
    this.doc.setTextColor(...INK);
    const lines = this.doc.splitTextToSize(ascii(name), W) as string[];
    this.doc.text(lines, M, this.y + 11);
    this.y += lines.length * 13;
    if (text?.trim()) this.body(text, 10);
    this.gap(4);
  }

  boxes(items: Array<{ label: string; value: string }>, cols: number) {
    const gap = 6;
    const boxW = (W - gap * (cols - 1)) / cols;
    const boxH = 34;
    for (let i = 0; i < items.length; i += cols) {
      const row = items.slice(i, i + cols);
      this.room(boxH + 4);
      row.forEach((item, col) => {
        const x = M + col * (boxW + gap);
        this.doc.setFillColor(...CREAM);
        this.doc.setDrawColor(...RULE);
        this.doc.setLineWidth(0.6);
        this.doc.roundedRect(x, this.y, boxW, boxH, 3, 3, "FD");
        this.doc.setFont("times", "normal");
        this.doc.setFontSize(8);
        this.doc.setTextColor(...MUTED);
        this.doc.text(ascii(item.label).toUpperCase(), x + 6, this.y + 12);
        this.doc.setFont("times", "bold");
        this.doc.setFontSize(12);
        this.doc.setTextColor(...INK);
        this.doc.text(ascii(item.value), x + 6, this.y + 26);
      });
      this.y += boxH + 4;
    }
  }

  pairs(rows: Array<[string, string]>) {
    for (const [label, value] of rows) {
      this.doc.setFont("times", "normal");
      this.doc.setFontSize(10);
      const left = ascii(label);
      const right = this.doc.splitTextToSize(ascii(value), W * 0.62) as string[];
      const h = Math.max(14, right.length * 13);
      this.room(h);
      this.doc.setTextColor(...MUTED);
      this.doc.text(left, M, this.y + 11);
      this.doc.setTextColor(...INK);
      this.doc.text(right, M + W, this.y + 11, { align: "right" });
      this.y += h;
    }
  }
}

function abilityLine(list: AbilityDef[], id: string, tier: number, against?: string) {
  const ability = findAbility(list, id);
  if (!ability) return null;
  const vs = isBaneAbility(id) ? baneTargetLabel(against) : "";
  const text = ability.text
    ? isBaneAbility(id)
      ? baneAbilityText(ability.text, against)
      : ability.text
    : "";
  return { name: `T${tier} ${ability.name}${vs ? ` vs ${vs}` : ""}`, text };
}

function gearBits(item: GearItem): string {
  const bits: string[] = [item.kind];
  if (item.equipped) bits.push("equipped");
  if (item.weaponType) bits.push(item.weaponType);
  if (item.armorWeight) bits.push(ARMOR_WEIGHT_LABELS[item.armorWeight]);
  if (item.shieldWeight) bits.push(ARMOR_WEIGHT_LABELS[item.shieldWeight]);
  if (item.wv) bits.push(`damage ${item.wv}`);
  if (item.range) bits.push(item.range);
  if (item.soak) bits.push(`soak ${item.soak}`);
  if (item.durability != null) {
    bits.push(`dur ${item.currentDurability ?? item.durability}/${item.durability}`);
  }
  if (item.dp) bits.push(`${item.currentDp ?? item.dp}/${item.dp} DP`);
  return bits.join(" | ");
}

/** Download this character as a printable sheet. The company export stays JSON. */
export function downloadCharacterPdf(character: Character) {
  const c = character;
  const d = derive(c);
  const budget = spend(c);
  const sheet = new Sheet(c.name || "Unnamed");
  const t = c.tracker;

  sheet.title(c.name || "Unnamed");
  sheet.subtitle(
    [c.profession || "No profession", c.epoch, c.role === "npc" ? "NPC" : ""]
      .filter(Boolean)
      .join("  ·  "),
  );
  if (c.bio.trim()) sheet.body(c.bio);
  sheet.gap(8);

  sheet.boxes(
    [
      { label: "Health", value: `${t.currentHealth} / ${d.healthMax}` },
      { label: "Demesne", value: `${t.currentDp} / ${d.dpMax}` },
      { label: "Fatigue", value: String(t.fatigue ?? 0) },
      { label: "Movement", value: String(d.movement) },
      { label: "Tic", value: String(d.tic) },
      { label: "Essence left", value: String(budget.remaining) },
    ],
    3,
  );

  sheet.section("Attributes");
  sheet.boxes(
    ATTR_KEYS.map((key) => ({ label: ATTR_LABELS[key], value: String(c.attributes[key]) })),
    4,
  );

  sheet.section("Derived");
  sheet.boxes(
    [
      ["Prowess", d.prowess],
      ["Precision", d.precision],
      ["Discernment", d.discernment],
      ["Force of Will", d.forceOfWill],
      ["Fortitude", d.fortitude],
      ["Reflex", d.reflex],
      ["Aura", d.aura],
      ["Majesty", d.majesty],
      ["Resolve", d.resolve],
      ["Withstanding", d.withstanding],
      ["Ingenuity", d.ingenuity],
      ["Dodge", d.dodge],
    ].map(([label, value]) => ({ label: String(label), value: String(value) })),
    4,
  );

  sheet.section("Defenses");
  const armor = equippedArmor(c);
  const shield = equippedShield(c);
  const defenseRows: Array<[string, string]> = defenseShields(c).map((row) => [row.label, row.detail]);
  defenseRows.push([
    "Shield",
    shield
      ? `${d.shieldSoak} soak / ${d.shieldDur} dur${shield.shieldWeight ? ` | ${ARMOR_WEIGHT_LABELS[shield.shieldWeight]}` : ""}`
      : "None equipped",
  ]);
  defenseRows.push([
    "Armor",
    armor
      ? `${d.armorSoak} soak / ${d.armorDur} dur${armor.armorWeight ? ` | ${ARMOR_WEIGHT_LABELS[armor.armorWeight]}` : ""}`
      : "None equipped",
  ]);
  defenseRows.push(["Resist Physical", String(c.resistPhysical)]);
  defenseRows.push(["Resist Demesne (All)", String(c.resistDemesneAll)]);
  const specific = new Map<string, { label: string; tier: number }>();
  for (const resist of c.resistSpecific) {
    const label = resist.label.trim();
    if (!label) continue;
    const key = label.toLowerCase();
    const prev = specific.get(key);
    if (prev) prev.tier += resist.tier;
    else specific.set(key, { label, tier: resist.tier });
  }
  for (const row of specific.values()) {
    defenseRows.push([`Resist ${row.label}`, String(row.tier)]);
  }
  sheet.pairs(defenseRows);

  if (c.wp.tier > 0) {
    sheet.section(`Weapon Proficiency  T${c.wp.tier}`);
    const types = proficientWeaponTypes(c);
    if (types.length) sheet.body(`+${c.wp.tier} Accuracy with ${types.join(", ")}`);
    const skills = wpSkillsForTypes(types);
    for (const pick of c.wp.picks) {
      if (pick.abilityId.startsWith("type:")) continue;
      const line = abilityLine(skills, pick.abilityId, c.wp.tier, pick.against);
      if (line) sheet.entry(line.name, line.text);
    }
  }
  if (c.armor.tier > 0) {
    sheet.section(`Armor Proficiency  T${c.armor.tier}`);
    const weights = proficientArmorWeights(c);
    sheet.body(
      `${weights.map((w) => ARMOR_WEIGHT_LABELS[w]).join(", ") || "No weight"} | +${d.armorSoakBonus} Soak / +${d.armorDurBonus} Dur`,
    );
    const skills = armorSkillsForWeights(weights);
    for (const pick of c.armor.picks) {
      if (pick.abilityId.startsWith("type:")) continue;
      const line = abilityLine(skills, pick.abilityId, c.armor.tier);
      if (line) sheet.entry(line.name, line.text);
    }
  }
  if (c.shield.tier > 0) {
    sheet.section(`Shield Proficiency  T${c.shield.tier}`);
    const weights = proficientShieldWeights(c);
    sheet.body(
      `${weights.map((w) => ARMOR_WEIGHT_LABELS[w]).join(", ") || "No weight"} | +${d.shieldSoakBonus} Soak / +${d.shieldDurBonus} Dur`,
    );
    const skills = shieldSkillsForWeights(weights);
    for (const pick of c.shield.picks) {
      if (pick.abilityId.startsWith("type:")) continue;
      const line = abilityLine(skills, pick.abilityId, c.shield.tier);
      if (line) sheet.entry(line.name, line.text);
    }
  }

  const trickGroups = new Map<string, string[]>();
  for (const trick of c.tricks) {
    const ability = findAbility(TRICKS[trick.category] ?? [], trick.abilityId);
    const label = TRICK_LABELS[trick.category] ?? trick.category;
    const list = trickGroups.get(label) ?? [];
    list.push(ability ? `${ability.name}. ${ability.text}` : trick.abilityId);
    trickGroups.set(label, list);
  }
  if (trickGroups.size) {
    sheet.section("Tricks");
    for (const [label, lines] of trickGroups) {
      sheet.entry(label, lines.join("\n"));
    }
  }
  if (c.socialTricks.length) {
    sheet.section("Social");
    for (const pick of c.socialTricks) {
      const ability = findAbility(SOCIAL_TRICKS, pick.abilityId);
      if (ability) sheet.entry(ability.name, ability.text);
    }
  }
  if (c.athletics.tier > 0) {
    sheet.section(`Athletics  T${c.athletics.tier}`);
    for (const pick of c.athletics.picks) {
      const line = abilityLine(ATHLETICS, pick.abilityId, c.athletics.tier);
      if (line) sheet.entry(line.name, line.text);
    }
  }
  if (c.subterfuge.tier > 0) {
    sheet.section(`Subterfuge  T${c.subterfuge.tier}`);
    for (const pick of c.subterfuge.picks) {
      const line = abilityLine(SUBTERFUGE, pick.abilityId, c.subterfuge.tier);
      if (line) sheet.entry(line.name, line.text);
    }
  }
  const huntingTier = c.hunting?.tier ?? 0;
  if (huntingTier > 0) {
    sheet.section(`Monster Hunting  T${huntingTier}`);
    for (const pick of c.hunting.picks) {
      const line = abilityLine(MONSTER_HUNTING, pick.abilityId, huntingTier);
      if (line) sheet.entry(line.name, line.text);
    }
  }

  const trees = c.demesnes.filter((tree) => tree.picks.some((pick) => pick.abilityId));
  if (trees.length) {
    sheet.section("Demesnes");
    trees.forEach((tree, index) => {
      const elements = [
        ...new Set(tree.picks.map((pick) => pick.element).filter(Boolean)),
      ] as DemesneElement[];
      const title = elements.map((el) => DEMESNE_META[el]?.name ?? el).join(", ") || `Demesne ${index + 1}`;
      sheet.entry(title);
      for (const pick of tree.picks) {
        if (!pick.abilityId || !pick.element) continue;
        const ability = findAbility(DEMESNE_ABILITIES[pick.element] ?? [], pick.abilityId);
        const name = ability?.name ?? pick.abilityId;
        const text = ability ? demesnePlayText(pick.element, ability, pick.tier) : "";
        sheet.entry(`T${pick.tier} ${DEMESNE_META[pick.element]?.name ?? ""}: ${name}`, text);
      }
    });
  }

  const crafts: Array<[string, number, AbilityDef[], { picks: { abilityId: string; tier: number }[] }]> = [
    ["Smithing", c.smith?.tier ?? 0, SMITHING, c.smith],
    ["Harvest", c.harvest?.tier ?? 0, HARVEST, c.harvest],
    ["Foraging", c.foraging?.tier ?? 0, FORAGING, c.foraging],
    ["Mining", c.mining?.tier ?? 0, MINING, c.mining],
  ];
  for (const [label, tier, list, tree] of crafts) {
    if (tier <= 0) continue;
    sheet.section(`${label}  T${tier}`);
    for (const pick of tree?.picks ?? []) {
      const line = abilityLine(list, pick.abilityId, tier);
      if (line) sheet.entry(line.name, line.text);
    }
  }

  if (c.items.length) {
    sheet.section("Gear");
    for (const item of c.items) {
      sheet.entry(item.name || "Unnamed item", [gearBits(item), item.abilities].filter(Boolean).join("\n"));
    }
  }

  if (c.negativeTraits.length || c.notes.trim() || c.otherAbilities.trim() || t.notes?.trim()) {
    sheet.section("Notes");
    for (const trait of c.negativeTraits) {
      sheet.entry(`${trait.name || "Trait"}  +${trait.essence} Essence`, trait.notes);
    }
    if (c.otherAbilities.trim()) sheet.body(c.otherAbilities);
    if (c.notes.trim()) sheet.body(c.notes);
    if (t.notes?.trim()) sheet.body(t.notes);
  }

  const filename = `${(c.name || "character").replace(/\s+/g, "-").toLowerCase()}.pdf`;
  sheet.save(filename);
}
