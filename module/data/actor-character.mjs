import AbsolutionActorBase from './base-actor.mjs';

export default class AbsolutionCharacter extends AbsolutionActorBase {
  static LOCALIZATION_PREFIXES = [
    ...super.LOCALIZATION_PREFIXES,
    'ABSOLUTION.Actor.Character',
  ];

  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };
    const schema = super.defineSchema();

    schema.level = new fields.NumberField({ ...requiredInteger, initial: 1, min: 1 });
    schema.lineage = new fields.StringField({ required: true, blank: true });
    schema.vow = new fields.StringField({ required: true, blank: true });

    // Characters derive maximum stamina from their vow, so only the current
    // value and any bonus are stored.
    schema.stamina = new fields.SchemaField({
      value: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 }),
      bonus: new fields.NumberField({ ...requiredInteger, initial: 0 }),
    });
    schema.tough = new fields.BooleanField();

    schema.resource = new fields.SchemaField({
      value: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 }),
      max: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 }),
    });
    schema.otherResource = new fields.SchemaField({
      label: new fields.StringField({ required: true, blank: true }),
      value: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 }),
      max: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 }),
    });
    schema.morale = new fields.NumberField({ ...requiredInteger, initial: 0 });

    schema.skills = new fields.SchemaField(
      Object.keys(CONFIG.ABSOLUTION.skills).reduce((obj, skill) => {
        obj[skill] = new fields.SchemaField({
          ranks: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 }),
        });
        return obj;
      }, {})
    );
    schema.wellRead = new fields.BooleanField();
    schema.interests = new fields.SchemaField({
      special: new fields.SchemaField({
        skill: new fields.StringField({ required: true, blank: true }),
      }),
      extra: new fields.SchemaField({
        skill: new fields.StringField({ required: true, blank: true }),
      }),
    });
    schema.ranksFromTraits = new fields.NumberField({ ...requiredInteger, initial: 0 });

    schema.connections = new fields.ArrayField(
      new fields.SchemaField({
        name: new fields.StringField({ required: true, blank: true }),
        relationship: new fields.StringField({ required: true, blank: true }),
        notes: new fields.StringField({ required: true, blank: true }),
      })
    );

    return schema;
  }

  prepareDerivedData() {
    super.prepareDerivedData();
    const config = CONFIG.ABSOLUTION;
    const vow = config.vows[this.vow] ?? config.noVow;

    // Main resource is named by the vow.
    this.resource.label = game.i18n.localize(
      vow.resource ?? 'ABSOLUTION.Actor.Character.FIELDS.resource.label'
    );

    // Stamina. Being Tough upgrades the vow's growth rate by one step.
    const growth = this.tough
      ? config.staminaGrowth[vow.staminaGrowth].tough
      : vow.staminaGrowth;
    const staminaAttribute = this.attributes[vow.staminaAttribute ?? 'fortitude'].value;
    this.stamina.base = vow.baseStamina;
    this.stamina.growth = game.i18n.localize(config.staminaGrowth[growth].label);
    this.stamina.max =
      Math.floor(
        vow.baseStamina +
          this.level * 0.5 * staminaAttribute +
          (this.level - 1) * config.staminaGrowth[growth].perLevel
      ) +
      (this.tough ? 3 : 0) +
      this.stamina.bonus;

    // Skill aptitude: half the attribute, plus ranks (counting half past 4),
    // plus 1 for Well Read.
    const psychokinetic = this.lineage === config.psychokineticLineage;
    for (const [key, skill] of Object.entries(this.skills)) {
      const isPsychokinesis = psychokinetic && key === 'strength';
      skill.attribute = isPsychokinesis ? 'faith' : config.skills[key].attribute;
      skill.label = game.i18n.localize(
        isPsychokinesis ? 'ABSOLUTION.Skill.Psychokinesis' : config.skills[key].label
      );
      skill.attributeLabel = this.attributes[skill.attribute].label;
      skill.aptitude =
        Math.floor(this.attributes[skill.attribute].value / 2) +
        Math.min(4, skill.ranks) +
        Math.max(0, Math.floor((skill.ranks - 4) / 2)) +
        (this.wellRead ? 1 : 0);
    }

    // Interests add 4 to the ranks of the chosen skill.
    for (const interest of Object.values(this.interests)) {
      interest.value = this.skills[interest.skill]
        ? 4 + this.skills[interest.skill].ranks
        : null;
    }

    // Skill ranks still available to assign.
    const spent = Object.values(this.skills).reduce((sum, s) => sum + s.ranks, 0);
    this.ranks = {
      starting: vow.startingRanks,
      perLevel: vow.ranksPerLevel,
      available:
        vow.startingRanks +
        (this.level - 1) * vow.ranksPerLevel +
        (this.wellRead ? 3 : 0) +
        this.ranksFromTraits,
    };
    this.ranks.toAssign = this.ranks.available - spent;
  }

  getRollData() {
    const data = super.getRollData();

    data.skills = {};
    for (const [k, v] of Object.entries(this.skills)) {
      data.skills[k] = { ranks: v.ranks, aptitude: v.aptitude };
    }
    data.lvl = this.level;

    return data;
  }
}
