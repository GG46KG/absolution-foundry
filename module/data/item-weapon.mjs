import AbsolutionItemBase from './base-item.mjs';

/**
 * A weapon or ornament (Equipment rules, "Weapons" and "Ornaments"). The
 * category decides which: Weapon and Innate are weapons, the five ornament
 * materials are ornaments. Ornaments attach to a weapon on the same actor.
 */
export default class AbsolutionWeapon extends AbsolutionItemBase {
  static LOCALIZATION_PREFIXES = [
    'ABSOLUTION.Item.base',
    'ABSOLUTION.Item.Weapon',
  ];

  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };
    const config = CONFIG.ABSOLUTION;
    const schema = super.defineSchema();

    schema.category = new fields.StringField({ required: true, initial: 'weapon' });

    // Weapons
    schema.weight = new fields.StringField({
      required: true,
      initial: 'mainHand',
      choices: () => config.weaponWeights,
    });
    // Copies of a rated property add together, so each stores its total
    schema.properties = new fields.SchemaField(
      Object.entries(config.weaponProperties).reduce((obj, [key, property]) => {
        obj[key] = property.rated
          ? new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 })
          : new fields.BooleanField();
        return obj;
      }, {})
    );
    // Engraved slots by type. Focus adds its own Spinel slots on top.
    schema.slots = new fields.SchemaField(
      Object.keys(config.slotTypes).reduce((obj, key) => {
        obj[key] = new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 });
        return obj;
      }, {})
    );
    schema.attuned = new fields.BooleanField();
    // In hand: Defender X adds to Armor Rating only while wielded
    schema.wielding = new fields.BooleanField();
    schema.broken = new fields.BooleanField();

    // Ornaments
    // The weapon or armor on the same actor it's slotted into
    schema.attachedTo = new fields.StringField({ required: true, blank: true });
    schema.kind = new fields.StringField({
      required: true,
      initial: 'standard',
      choices: () => config.ornamentKinds,
    });
    // Discharge ornaments: charges left and the base maximum (before catalysts)
    schema.charges = new fields.SchemaField({
      value: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 }),
      max: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 }),
    });
    // Evocation, Shatter and Clockwork ornaments: used up until recharged
    schema.spent = new fields.BooleanField();
    schema.rarity = new fields.StringField({ required: true, initial: 'common', choices: () => config.ornamentRarities });
    schema.catalyst = new fields.StringField({ required: true, blank: true });
    // The ornament's roll, read the same way as a vow feature's Roll field
    schema.dice = new fields.StringField({ required: true, blank: true });
    // Older free-text uses, kept so existing notes aren't lost
    schema.weightUses = new fields.StringField({ required: true, blank: true });

    return schema;
  }

  /**
   * Is this an ornament rather than a weapon?
   * @type {boolean}
   */
  get isOrnament() {
    return CONFIG.ABSOLUTION.ornamentCategories.includes(this.category);
  }

  prepareDerivedData() {
    if (this.isOrnament) return;
    const config = CONFIG.ABSOLUTION;
    const p = this.properties;

    // Damage: Weakened steps the weight's base damage down the ladder, then
    // Honed adds to it (half, rounded down, for Off-Hand weapons).
    const baseStep = config.weaponWeights[this.weight]?.damageStep ?? 3;
    const step = Math.max(0, baseStep - p.weakened);
    const { dice, bonus } = config.damageLadder[step];
    const honed = this.weight === 'offHand' ? Math.floor(p.honed / 2) : p.honed;
    const total = step > 0 ? bonus + honed : 0;
    const base = dice ? (total ? `${dice}+${total}` : dice) : String(total);
    // Normal attacks: Focus weapons deal 1. Defender weapons halve the
    // attack's total damage (minimum 1), so the halving is applied when
    // damage is rolled, after Attack Attribute Damage and the rest are added.
    const formula = p.focus ? '1' : base;
    const halved = p.defender > 0;
    this.damage = { base, formula, halved, label: halved ? `½ (${formula})` : formula };

    // Attacks use Faith if Consecrated, otherwise Power. Focus weapons make
    // Improvised Attacks, which always use Power.
    this.attackAttribute = p.consecrated && !p.focus ? 'faith' : 'power';
    this.attackEdge = p.quality - p.heavy - (p.archaeotech ? 1 : 0);

    // Slots, including Focus's innate Spinel slots (two on Two-Hand weapons)
    const focusSlots = p.focus ? (this.weight === 'twoHand' ? 2 : 1) : 0;
    this.slotList = Object.entries(this.slots).flatMap(([type, n]) =>
      Array(n + (type === 'spinel' ? focusSlots : 0)).fill(type)
    );

    // Readable property list, e.g. ["Ranged 5", "Quality 2", "Consecrated"]
    this.propertyLabels = Object.entries(config.weaponProperties)
      .filter(([key]) => p[key])
      .map(([key, property]) => {
        const label = game.i18n.localize(property.label);
        return property.rated ? `${label} ${p[key]}` : label;
      });
  }
}
