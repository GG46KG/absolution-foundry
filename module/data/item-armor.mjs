import AbsolutionItemBase from './base-item.mjs';

/**
 * A set of armor (Equipment rules, "Armor"). Its weight sets Armor Rating,
 * Speed penalty and Evasion penalty; its modifications adjust them. Worn,
 * unbroken armor applies to the character, see AbsolutionActorBase.
 *
 * Armor crafted for a wearer with Light Armor Mastery (Light armor only) or
 * Bespoke Equipment has an extra modification each, and the same
 * modification can be taken more than once. Armor marked for Medium Armor
 * Mastery (Medium armor only) gets +1 Armor Rating and no Speed penalty.
 */
export default class AbsolutionArmor extends AbsolutionItemBase {
  static LOCALIZATION_PREFIXES = [
    'ABSOLUTION.Item.base',
    'ABSOLUTION.Item.Armor',
  ];

  static defineSchema() {
    const fields = foundry.data.fields;
    const config = CONFIG.ABSOLUTION;
    const schema = super.defineSchema();
    const slot = () =>
      new fields.StringField({ required: true, initial: 'spinel', choices: () => config.engravedSlots });

    schema.weight = new fields.StringField({
      required: true,
      initial: 'light',
      choices: () => config.armorWeights,
    });
    // Blank for basic armor, which has no modification
    schema.modification = new fields.StringField({ required: true, blank: true });
    schema.engravedSlot = slot();
    // Armor traits it was made for, see ABSOLUTION.armorTraits
    schema.lightArmorMastery = new fields.BooleanField();
    schema.mediumArmorMastery = new fields.BooleanField();
    schema.bespokeEquipment = new fields.BooleanField();
    // Extra modifications, see ABSOLUTION.extraArmorModifications
    schema.masteryModification = new fields.StringField({ required: true, blank: true });
    schema.masteryEngravedSlot = slot();
    schema.bespokeModification = new fields.StringField({ required: true, blank: true });
    schema.bespokeEngravedSlot = slot();
    schema.worn = new fields.BooleanField();
    schema.broken = new fields.BooleanField();

    return schema;
  }

  prepareDerivedData() {
    const config = CONFIG.ABSOLUTION;
    const weight = config.armorWeights[this.weight] ?? config.armorWeights.light;
    // An armor trait counts when ticked and the armor is the weight it's for
    const applies = (key) => !!this[key] && (!config.armorTraits[key].weight || config.armorTraits[key].weight === this.weight);

    // The modifications that count: its own, plus any extras its traits allow
    this.modificationList = [
      { key: 'base', modification: this.modification, engravedSlot: this.engravedSlot },
      ...Object.entries(config.extraArmorModifications)
        .filter(([, extra]) => applies(extra.trait))
        .map(([key]) => ({
          key,
          modification: this[`${key}Modification`],
          engravedSlot: this[`${key}EngravedSlot`],
        })),
    ].filter((m) => m.modification);
    const count = (mod) => this.modificationList.filter((m) => m.modification === mod).length;

    // Medium Armor Mastery: +1 Armor Rating and no Speed penalty
    this.mediumMastery = applies('mediumArmorMastery');

    this.armorRating = weight.armorRating + count('banded') + (this.mediumMastery ? 1 : 0);
    this.speedPenalty = this.mediumMastery ? 0 : Math.max(0, weight.speedPenalty - count('trimmed'));
    // Articulated removes the Evasion penalty, or gives +1 Evasion if there is
    // none, so a second Articulated gives +1 on top of the first
    this.evasion = weight.evasion;
    this.evasionBonus = 0;
    for (let i = 0; i < count('articulated'); i++) {
      if (this.evasion === 'full') this.evasionBonus += 1;
      else this.evasion = 'full';
    }
    // Plated: the Damage Reduction (Physical) from Armor Rating is the full
    // Armor Rating instead of half
    this.plated = count('plated') > 0;
    this.slotList = this.modificationList
      .filter((m) => m.modification === 'engraved')
      .map((m) => m.engravedSlot);
  }
}
