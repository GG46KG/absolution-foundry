export default class AbsolutionActorBase extends foundry.abstract
  .TypeDataModel {
  static LOCALIZATION_PREFIXES = ["ABSOLUTION.Actor.base"];

  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };
    const schema = {};

    // Iterate over attribute names and create a new SchemaField for each.
    schema.attributes = new fields.SchemaField(
      Object.keys(CONFIG.ABSOLUTION.attributes).reduce((obj, attribute) => {
        obj[attribute] = new fields.SchemaField({
          value: new fields.NumberField({ ...requiredInteger, initial: 1, min: 0 }),
        });
        return obj;
      }, {})
    );

    schema.speed = new fields.NumberField({ ...requiredInteger, initial: 6, min: 0 });
    schema.armor = new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 });
    schema.evasion = new fields.NumberField({ ...requiredInteger, initial: 0 });

    schema.stamina = new fields.SchemaField({
      value: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 }),
      max: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 }),
    });
    schema.barrier = new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 });

    schema.wounds = new fields.SchemaField({
      normal: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 }),
      grievous: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 }),
      mortal: new fields.BooleanField(),
      status: new fields.StringField({
        required: true,
        initial: 'healthy',
        choices: () => CONFIG.ABSOLUTION.statuses,
      }),
    });

    // Damage Reduction from Traits, Vow features, ornaments, meals and so on,
    // e.g. 2 (Fire) or 1 (Physical/Nature). Armor Rating's is worked out.
    schema.damageReductions = new fields.ArrayField(
      new fields.SchemaField({
        value: new fields.NumberField({ ...requiredInteger, initial: 1, min: 0 }),
        type: new fields.StringField({ required: true, blank: true }),
        source: new fields.StringField({ required: true, blank: true }),
      })
    );

    schema.biography = new fields.HTMLField();

    return schema;
  }

  prepareDerivedData() {
    for (const key in this.attributes) {
      this.attributes[key].label =
        game.i18n.localize(CONFIG.ABSOLUTION.attributes[key]) ?? key;
    }
    // Worn armor and wielded Defender weapons (Equipment rules). Broken items
    // give no benefit. Items are prepared before this runs.
    let defender = 0;
    const worn = [];
    for (const item of this.parent?.items ?? []) {
      const s = item.system;
      if (s.broken) continue;
      if (item.type === 'weapon' && !s.isOrnament && s.wielding) defender += (s.effectiveProperties ?? s.properties).defender;
      if (item.type === 'armor' && s.worn) worn.push(item);
    }
    // Only one set of armor counts; wearing more is flagged on the sheet
    const armor = worn[0]?.system;
    this.wornArmor = { name: worn[0]?.name ?? null, count: worn.length };
    this.armorBonus = { defender, armor: armor?.armorRating ?? 0 };
    this.armorTotal = this.armor + defender + this.armorBonus.armor;
    this.speedTotal = Math.max(0, this.speed - (armor?.speedPenalty ?? 0));
    // Medium armor halves Evasion, Heavy removes it; Articulated undoes that
    const evasionMode = armor?.evasion ?? 'full';
    if (evasionMode === 'none') this.evasionTotal = 0;
    else if (evasionMode === 'half') this.evasionTotal = Math.floor(this.evasion / 2);
    else this.evasionTotal = this.evasion + (armor?.evasionBonus ?? 0);
    this.resistance =
      1 + Math.floor(this.attributes.fortitude.value / 2) + this.evasionTotal;

    // Damage Reduction from Armor Rating: half the total Armor Rating against
    // all damage except Psychic, Holy and Unholy. Plated armor raises the
    // Physical part to the full Armor Rating. In Ironheart Stance it is the
    // full Armor Rating against all damage instead.
    const localize = (key) => game.i18n.localize(key);
    const ironheart = this.parent?.statuses?.has('ironheart') ?? false;
    const half = Math.floor(this.armorTotal / 2);
    const source = localize('ABSOLUTION.DamageReduction.FromArmorRating');
    this.armorReductions = [];
    if (ironheart && this.armorTotal > 0) {
      this.armorReductions.push({ value: this.armorTotal, type: localize('ABSOLUTION.DamageReduction.Ironheart'), source });
    } else if (armor?.plated && this.armorTotal > 0) {
      this.armorReductions.push(
        { value: this.armorTotal, type: localize('ABSOLUTION.DamageType.Physical'), source },
        { value: half, type: localize('ABSOLUTION.DamageReduction.AllButPhysical'), source }
      );
    } else if (half > 0) {
      this.armorReductions.push({ value: half, type: localize('ABSOLUTION.DamageReduction.All'), source });
    }
  }

  getRollData() {
    const data = {};

    // Copy the attributes to the top level, so that rolls can use
    // formulas like `@power + 2`.
    for (const [k, v] of Object.entries(this.attributes)) data[k] = v.value;
    data.speed = this.speedTotal ?? this.speed;
    data.armor = this.armorTotal ?? this.armor;
    data.evasion = this.evasionTotal ?? this.evasion;
    data.resistance = this.resistance;

    return data;
  }
}
