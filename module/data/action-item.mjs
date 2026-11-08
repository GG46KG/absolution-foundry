import AbsolutionItemBase from './base-item.mjs';

/**
 * Fields shared by items that post to chat as a card and can be rolled:
 * vow features, traits and equipment.
 */
export default class AbsolutionActionItem extends AbsolutionItemBase {
  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();

    schema.actionType = new fields.StringField({ required: true, blank: true });
    // Shown in italics at the foot of the item's chat card
    schema.flavor = new fields.StringField({ required: true, blank: true });
    // The item's roll. A formula without dice ("3", "@power + 1") is the
    // number of dice for a check; one with dice ("4d6") is rolled as written.
    // Blank means the item isn't rolled.
    schema.dice = new fields.StringField({ required: true, blank: true });

    return schema;
  }
}
