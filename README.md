# Forever Hold

A companion for **OP20**: character creation, sheet tracking, relics, hostiles, keels, and a Story Master table.

Forever Hold is a play on the world of Everhold. Essence is the budget. Opposed d20 is the only die.

## What it does

- **Company** — build a character (D&D Beyond-style creation, then Open sheet). Tabs: Stats, Combat, Demesne, Inventory.
- **Spend Essence** — plus buttons stay hidden on the live sheet. Click Spend Essence to buy tiers; Lock in purchases to freeze them.
- **Relics / Keels** — craft items and airships, then assign matching gear onto a sheet.
- **Story Master** — seat players, track hostiles, list loot, set the Epoch for invited characters.
- **d20** — roll from the sheet. Weapon Attack adds accuracy (Prowess/Precision + WP, untrained and Attribute Match already applied).

Starting Essence is 0, 50, or 100. Step costs follow the OP20 chart (`S × T × (T+1) / 2`).

## Run locally

```bash
npm install
npm run dev
```

The app stores the campaign in the browser (`localStorage`). Export / Import JSON from the Hold header.

## OP20 notes baked in

- Attributes 3ST. Weapon Proficiency 5ST (capped by Strength/Agility or Agility/Perception).
- Armor 5ST, Shield 3ST, Demesne 10ST, Tricks 3ST. Combat Pool = 3 × combined Combat Trick tier.
- Derived stats always round down. Dodge only appears if Athletics Dodge is taken.
- Gildar is the currency. Epoch is blank unless the SM sets one on a table.
