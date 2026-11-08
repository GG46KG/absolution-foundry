# Changelog

## Unreleased

- Character sheet rebuilt from the Absolution Character Sheet spreadsheet: attributes, defenses, resources, stamina, wounds, skills, interests and skill ranks, with vow and lineage data in `CONFIG.ABSOLUTION`.
- New item types: Vow Feature, Trait, Equipment, Weapon or Ornament, Belonging or Material. Replaces the boilerplate Gear, Feature and Spell types.
- Connections table on the Backstory tab.
- Checks: click an attribute or skill to roll d6s and count Hits, with Difficulty, Edge, Advantage/Disadvantage, Automatic Hits and Critical Successes.
- Vow features and traits post to chat as cards (name, action type, effect, flavor text), with a new Flavor Text field.
- Equipment works like vow features (action type, roll, flavor text, chat card, Rearrange toggle), without a Source, and keeps its Uses.
- Weapons follow the Equipment rules: weight, properties, slots, Attuned and Broken, with damage, attack attribute and Edge worked out from them; attack and damage rolls from the Inventory tab; ornaments fill matching slots, with problems flagged.
- Weapon rules applied: Defender adds to Armor Rating while Wielding; Bulky attacks start on Disadvantage with an adjacent enemy token; attack messages have a Roll Damage button that adds Precise's 1d6 on a critical.
- Armor: new item type and Inventory table (weight, modification, Worn, Broken). Worn armor adjusts Armor Rating, Speed, Evasion and Resistance.
- Ornaments: kind (Discharge charges; Evocation, Shatter and Clockwork spent states), rarity and catalyst; Shaping and Multifaceted catalysts raise Discharge charges; ornaments can go in armor's Engraved slot. Ornaments have a Roll field and send-to-chat and roll buttons, like vow features.
- Ornaments attach to a weapon ("Attached to" on the ornament's sheet) and list under it in Weapons and Ornaments.
- Token status effects replaced with the core rules' Conditions and Status Effects, plus Incapacitated and Dead; each carries its rules text as its description.
- Knockout rolls from the wounds box in the sheet header, ported from the prototype Knockout macro.
- Popcorn initiative: the acting combatant picks who goes next, and the last to act in a round picks who starts the next one.

## 0.1.0

- Initial scaffold from the Boilerplate system (v12 branch, DataModel variant).
