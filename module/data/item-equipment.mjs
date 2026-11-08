import AbsolutionActionItem from './action-item.mjs';

/**
 * Equipment. Works like a vow feature (action type, roll, flavor text, chat
 * card) without a source, plus its uses. The description holds its effect.
 */
export default class AbsolutionEquipment extends AbsolutionActionItem {
  static LOCALIZATION_PREFIXES = [
    'ABSOLUTION.Item.base',
    'ABSOLUTION.Item.Feature',
    'ABSOLUTION.Item.Equipment',
  ];

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();

    schema.uses = new fields.StringField({ required: true, blank: true });

    return schema;
  }
}
