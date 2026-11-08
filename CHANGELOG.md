# Changelog

## Unreleased

- Character sheet rebuilt from the Absolution Character Sheet spreadsheet: attributes, defenses, resources, stamina, wounds, skills, interests and skill ranks, with vow and lineage data in `CONFIG.ABSOLUTION`.
- New item types: Vow Feature, Trait, Equipment, Weapon or Ornament, Belonging or Material. Replaces the boilerplate Gear, Feature and Spell types.
- Connections table on the Backstory tab.
- Checks: click an attribute or skill to roll d6s and count Hits, with Difficulty, Edge, Advantage/Disadvantage, Automatic Hits and Critical Successes. Edge and Automatic Hits have + and − buttons, and characters can spend Morale for 1 Edge each, taken off their sheet.
- Vow features and traits post to chat as cards (name, action type, effect, flavor text), with a new Flavor Text field.
- Equipment works like vow features (action type, roll, flavor text, chat card, Rearrange toggle), without a Source, and keeps its Uses.
- Weapons follow the Equipment rules: weight, properties, slots, Attuned and Broken, with damage, attack attribute and Edge worked out from them; attack and damage rolls from the Inventory tab; ornaments fill matching slots, with problems flagged.
- Weapon rules applied: Defender adds to Armor Rating while Wielding; Bulky attacks start on Disadvantage with an adjacent enemy token; attack messages have a Roll Damage button that adds Precise's 1d6 on a critical. Damage rolls add Attack Attribute Damage (half the attack attribute), also shown in the Weapons table; Defender halves the attack's total damage (minimum 1); Focus weapons attack with Power, as Improvised Attacks.
- Armor: new item type and Inventory table (weight, modification, Worn, Broken). Worn armor adjusts Armor Rating, Speed, Evasion and Resistance. Armor can be marked as made for Light Armor Mastery (Light), Medium Armor Mastery (Medium: +1 Armor Rating, no Speed penalty) or Bespoke Equipment; the first and last each allow an extra modification, and repeated modifications stack.
- Damage Reduction table under Defenses: rows from Armor Rating are worked out (half Armor Rating against all but Psychic, Holy and Unholy; Plated: full Armor Rating against Physical), and characters can add their own rows (amount, type, source).
- Ornaments: kind (Discharge charges; Evocation, Shatter and Clockwork spent states), rarity and catalyst; Shaping and Multifaceted catalysts raise Discharge charges; ornaments can go in armor's Engraved slot. Ornaments have a Roll field and send-to-chat and roll buttons, like vow features.
- Ornaments attach to a weapon ("Attached to" on the ornament's sheet) and list under it in Weapons and Ornaments.
- Token status effects replaced with the core rules' Conditions and Status Effects, plus Incapacitated and Dead; each carries its rules text as its description. Also Ironheart (Damage Reduction (All) equal to the full Armor Rating), Vow Feature, and Hostile Effect 1–4 markers.
- New scenes default to a hexagonal grid (rows, odd) measured in spaces (1 sp per hex). Bulky's adjacent-enemy check uses the scene's grid, so it works on hex and square grids.
- Chat messages pick up the user's chat visibility through `core.messageMode` on Foundry 14 and `core.rollMode` on older versions.
- Knockout rolls from the wounds box in the sheet header, ported from the prototype Knockout macro.
- Popcorn initiative: the acting combatant picks who goes next. When nobody has an activation left, ending the turn starts a new round with nobody acting and everyone fresh, and the GM picks who starts. The GM can give a combatant extra activations per round (shown as used/total), take them away, and undo an activation, from the combatant's right-click menu. Initiative rolling, rerolling, clearing and resetting are gone.

## 0.1.0

- Initial scaffold from the Boilerplate system (v12 branch, DataModel variant).
