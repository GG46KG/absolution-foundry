import AbsolutionActionItem from './action-item.mjs';

/** A vow feature. */
export default class AbsolutionFeature extends AbsolutionActionItem {
  static LOCALIZATION_PREFIXES = [
    'ABSOLUTION.Item.base',
    'ABSOLUTION.Item.Feature',
  ];

  /**
   * The source a new item of this type starts with.
   * @type {string}
   */
  static defaultSource = 'vowFeature';

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();

    schema.source = new fields.StringField({
      required: true,
      initial: this.defaultSource,
      choices: () => CONFIG.ABSOLUTION.featureSources,
    });
    // NPC attacks: the damage they deal, printed on their chat cards
    schema.damage = new fields.StringField({ required: true, blank: true });

    return schema;
  }
}
