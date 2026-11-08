import AbsolutionItemBase from './base-item.mjs';

/** A belonging or material. */
export default class AbsolutionBelonging extends AbsolutionItemBase {
  static LOCALIZATION_PREFIXES = [
    'ABSOLUTION.Item.base',
    'ABSOLUTION.Item.Belonging',
  ];

  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };
    const schema = super.defineSchema();

    schema.quantity = new fields.NumberField({ ...requiredInteger, initial: 1, min: 0 });

    return schema;
  }
}
