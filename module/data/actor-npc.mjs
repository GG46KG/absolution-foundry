import AbsolutionActorBase from './base-actor.mjs';
import { evaluateTr } from '../helpers/threat.mjs';

/**
 * An NPC, built like the Bestiary's stat blocks: a Threat Rating (TR), a
 * threat trait (Chaff, Threat or Mortal Threat), creature type and size, and
 * statistics written as TR expressions such as "20 + 4tr". NPCs have
 * features and no inventory.
 */
export default class AbsolutionNPC extends AbsolutionActorBase {
  static LOCALIZATION_PREFIXES = [
    ...super.LOCALIZATION_PREFIXES,
    'ABSOLUTION.Actor.NPC',
  ];

  /**
   * The stat block's statistics, in Bestiary order, and their starting
   * expressions.
   * @type {Object}
   */
  static STATS = {
    power: '1',
    fortitude: '1',
    knowledge: '0',
    faith: '0',
    stamina: '10',
    armor: '0',
    resistance: '1',
    speed: '6',
  };

  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };
    const schema = super.defineSchema();

    schema.tr = new fields.NumberField({ ...requiredInteger, initial: 1, min: 1 });
    schema.threat = new fields.StringField({
      required: true,
      initial: 'chaff',
      choices: () => CONFIG.ABSOLUTION.npcThreats,
    });
    schema.creatureType = new fields.StringField({ required: true, blank: true });
    schema.size = new fields.StringField({ required: true, initial: '1' });
    // Each statistic as a TR expression, e.g. "20 + 4tr" or a plain number
    schema.statBlock = new fields.SchemaField(
      Object.fromEntries(
        Object.entries(this.STATS).map(([key, initial]) => [
          key,
          new fields.StringField({ required: true, initial }),
        ])
      )
    );

    return schema;
  }

  /**
   * NPCs made before stat blocks keep their numbers as plain expressions.
   * @override
   */
  static migrateData(source) {
    const old = ['attributes', 'stamina', 'armor', 'speed'].some((key) => source[key] !== undefined);
    if (source.statBlock === undefined && old) {
      const a = source.attributes ?? {};
      source.statBlock = {
        power: String(a.power?.value ?? 1),
        fortitude: String(a.fortitude?.value ?? 1),
        knowledge: String(a.knowledge?.value ?? 0),
        faith: String(a.faith?.value ?? 0),
        stamina: String(source.stamina?.max ?? 10),
        armor: String(source.armor ?? 0),
        resistance: '1',
        speed: String(source.speed ?? 6),
      };
    }
    return super.migrateData(source);
  }

  prepareDerivedData() {
    // Work out the stat block at this TR. An expression that can't be read
    // keeps the stored value and is flagged on the sheet.
    this.statValues = {};
    this.statErrors = {};
    for (const key of Object.keys(AbsolutionNPC.STATS)) {
      const value = evaluateTr(this.statBlock[key], this.tr);
      this.statErrors[key] = value === null;
      this.statValues[key] = value;
    }
    const stat = (key, fallback) => Math.max(0, this.statValues[key] ?? fallback);
    for (const key of Object.keys(this.attributes)) {
      this.attributes[key].value = stat(key, this.attributes[key].value);
    }
    this.stamina.max = stat('stamina', this.stamina.max);
    this.armor = stat('armor', this.armor);
    this.speed = stat('speed', this.speed);
    // NPCs have no Evasion; their Resistance is given in the stat block
    this.evasion = 0;

    super.prepareDerivedData();

    this.resistance = stat('resistance', this.resistance);
    this.threatTrait = CONFIG.ABSOLUTION.npcThreats[this.threat] ?? CONFIG.ABSOLUTION.npcThreats.chaff;
  }

  /** @override */
  getRollData() {
    const data = super.getRollData();
    // Rolls can use the Threat Rating, e.g. "@tr" or "3 + 2 * @tr"
    data.tr = this.tr;
    return data;
  }
}
