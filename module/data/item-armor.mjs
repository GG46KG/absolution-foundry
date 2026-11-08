import AbsolutionItemBase from './base-item.mjs';

/**
 * A set of armor (Equipment rules, "Armor"). Its weight sets Armor Rating,
 * Speed penalty and Evasion penalty; its modification adjusts them. Worn,
 * unbroken armor applies to the character, see AbsolutionActorBase.
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

    schema.weight = new fields.StringField({
      required: true,
      initial: 'light',
      choices: () => config.armorWeights,
    });
    // Blank for basic armor, which has no modification
    schema.modification = new fields.StringField({ required: true, blank: true });
    schema.engravedSlot = new fields.StringField({
      required: true,
      initial: 'spinel',
      choices: () => config.engravedSlots,
    });
    schema.worn = new fields.BooleanField();
    schema.broken = new fields.BooleanField();

    return schema;
  }

  prepareDerivedData() {
    const weight = CONFIG.ABSOLUTION.armorWeights[this.weight] ?? CONFIG.ABSOLUTION.armorWeights.light;
    const mod = this.modification;

    this.armorRating = weight.armorRating + (mod === 'banded' ? 1 : 0);
    this.speedPenalty = Math.max(0, weight.speedPenalty - (mod === 'trimmed' ? 1 : 0));
    // Articulated removes the Evasion penalty, or gives +1 Evasion if there was none
    this.evasion = weight.evasion;
    this.evasionBonus = 0;
    if (mod === 'articulated') {
      if (weight.evasion === 'full') this.evasionBonus = 1;
      this.evasion = 'full';
    }
    this.slotList = mod === 'engraved' ? [this.engravedSlot] : [];
  }
}
