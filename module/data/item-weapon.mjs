import AbsolutionItemBase from './base-item.mjs';

/**
 * A weapon or ornament (Equipment rules, "Weapons" and "Ornaments"). The
 * category decides which: Weapon is a weapon; the five ornament materials and
 * Innate are ornaments. Ornaments attach to a weapon on the same actor;
 * Innate ones are built into it and take no slot.
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
    // Override: the weapon's base damage is typed in instead of coming from
    // its weight, for weapons that don't follow the weight table
    schema.weightOverride = new fields.BooleanField();
    schema.baseDamage = new fields.StringField({ required: true, blank: true });
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
    // Automatic Hits added to attacks with this weapon, used when overridden
    // (ornaments that apply properties always add theirs)
    schema.autoHitsOverride = new fields.BooleanField();
    schema.autoHits = new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 });
    // The attribute attacks use, in place of Power or Faith, when overridden
    schema.attackAttributeOverride = new fields.BooleanField();
    schema.attackAttributeChoice = new fields.StringField({
      required: true,
      initial: 'power',
      choices: () => config.attributes,
    });
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
    // The ornament adds its properties and Automatic Hits to its weapon
    schema.appliesProperties = new fields.BooleanField();
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

  /**
   * Weapons saved with Automatic Hits before the Override box existed keep
   * them: the box starts ticked.
   * @override
   */
  static migrateData(source) {
    if (source.autoHitsOverride === undefined && source.autoHits > 0) source.autoHitsOverride = true;
    return super.migrateData(source);
  }

  /**
   * Ornaments attached to this weapon that add their properties to it.
   * @returns {Item[]}
   */
  get propertyOrnaments() {
    const id = this.parent?.id;
    const items = this.parent?.actor?.items;
    if (!id || !items) return [];
    return items.filter(
      (item) =>
        item.type === 'weapon' &&
        item.system.isOrnament &&
        item.system.appliesProperties &&
        item.system.attachedTo === id
    );
  }

  prepareDerivedData() {
    if (this.isOrnament) return;
    const config = CONFIG.ABSOLUTION;

    // The weapon's own properties plus those of ornaments that apply theirs:
    // ratings add together, on/off properties are on if any has them. The
    // stored properties stay the weapon's own; everything below uses these.
    const ornaments = this.propertyOrnaments;
    const p = Object.fromEntries(
      Object.entries(config.weaponProperties).map(([key, property]) => {
        const values = [this.properties[key], ...ornaments.map((o) => o.system.properties[key])];
        return [key, property.rated ? values.reduce((sum, v) => sum + (v || 0), 0) : values.some(Boolean)];
      })
    );
    this.effectiveProperties = p;
    this.effectiveAutoHits =
      (this.autoHitsOverride ? this.autoHits : 0) + ornaments.reduce((sum, o) => sum + (o.system.autoHits || 0), 0);

    // Damage: Weakened steps the weight's base damage down the ladder, then
    // Honed adds to it (half, rounded down, for Off-Hand weapons). With
    // Override, the typed base damage is used instead and Honed adds to it;
    // Weakened, a step down the weight ladder, doesn't apply.
    let base;
    if (this.weightOverride) {
      const typed = this.baseDamage.trim() || '0';
      base = p.honed ? `${typed}+${p.honed}` : typed;
    } else {
      const baseStep = config.weaponWeights[this.weight]?.damageStep ?? 3;
      const step = Math.max(0, baseStep - p.weakened);
      const { dice, bonus } = config.damageLadder[step];
      const honed = this.weight === 'offHand' ? Math.floor(p.honed / 2) : p.honed;
      const total = step > 0 ? bonus + honed : 0;
      base = dice ? (total ? `${dice}+${total}` : dice) : String(total);
    }
    // Normal attacks: Focus weapons deal 1. Defender weapons halve the
    // attack's total damage (minimum 1), so the halving is applied when
    // damage is rolled, after Attack Attribute Damage and the rest are added.
    const formula = p.focus ? '1' : base;
    const halved = p.defender > 0;
    this.damage = { base, formula, halved, label: halved ? `½ (${formula})` : formula };

    // Attacks use Faith if Consecrated, otherwise Power. Focus weapons make
    // Improvised Attacks, which always use Power. Override picks any attribute.
    this.attackAttribute = this.attackAttributeOverride
      ? this.attackAttributeChoice
      : p.consecrated && !p.focus
        ? 'faith'
        : 'power';
    this.attackEdge = p.quality - p.heavy - (p.archaeotech ? 1 : 0);

    // Slots, including Focus's innate Spinel slots (two on Two-Hand weapons)
    const focusSlots = p.focus ? (this.weight === 'twoHand' ? 2 : 1) : 0;
    this.slotList = Object.entries(this.slots).flatMap(([type, n]) =>
      Array(n + (type === 'spinel' ? focusSlots : 0)).fill(type)
    );

    // Readable property list, e.g. ["Ranged 5", "Quality 2", "Consecrated"]
    this.propertyLabels = AbsolutionWeapon.propertyLabels(p);
    // What each ornament adds, for the weapon sheet
    this.ornamentBonuses = ornaments.map((o) => {
      const labels = AbsolutionWeapon.propertyLabels(o.system.properties);
      if (o.system.autoHits) {
        labels.push(`${game.i18n.localize('ABSOLUTION.Check.AutoHits')} ${o.system.autoHits}`);
      }
      return { name: o.name, labels };
    });
  }

  /**
   * A readable list of properties, e.g. ["Ranged 5", "Quality 2", "Consecrated"].
   * @param {object} properties   Property values by key
   * @returns {string[]}
   */
  static propertyLabels(properties) {
    return Object.entries(CONFIG.ABSOLUTION.weaponProperties)
      .filter(([key]) => properties[key])
      .map(([key, property]) => {
        const label = game.i18n.localize(property.label);
        return property.rated ? `${label} ${properties[key]}` : label;
      });
  }
}
