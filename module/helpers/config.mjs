export const ABSOLUTION = {};

/**
 * The four core attributes.
 * @type {Object}
 */
ABSOLUTION.attributes = {
  power: 'ABSOLUTION.Attribute.Power',
  fortitude: 'ABSOLUTION.Attribute.Fortitude',
  knowledge: 'ABSOLUTION.Attribute.Knowledge',
  faith: 'ABSOLUTION.Attribute.Faith',
};

/**
 * Skills and the attribute that drives each one's aptitude.
 * Leszhoth characters use Psychokinesis (Faith) in place of Strength (Power),
 * see AbsolutionCharacter#prepareDerivedData.
 * @type {Object}
 */
ABSOLUTION.skills = {
  agility: { label: 'ABSOLUTION.Skill.Agility', attribute: 'power' },
  alchemy: { label: 'ABSOLUTION.Skill.Alchemy', attribute: 'knowledge' },
  charisma: { label: 'ABSOLUTION.Skill.Charisma', attribute: 'faith' },
  craft: { label: 'ABSOLUTION.Skill.Craft', attribute: 'knowledge' },
  dexterity: { label: 'ABSOLUTION.Skill.Dexterity', attribute: 'power' },
  divination: { label: 'ABSOLUTION.Skill.Divination', attribute: 'faith' },
  engineering: { label: 'ABSOLUTION.Skill.Engineering', attribute: 'knowledge' },
  hunterLore: { label: 'ABSOLUTION.Skill.HunterLore', attribute: 'knowledge' },
  intuition: { label: 'ABSOLUTION.Skill.Intuition', attribute: 'faith' },
  medicine: { label: 'ABSOLUTION.Skill.Medicine', attribute: 'knowledge' },
  nature: { label: 'ABSOLUTION.Skill.Nature', attribute: 'knowledge' },
  pathfinding: { label: 'ABSOLUTION.Skill.Pathfinding', attribute: 'knowledge' },
  perception: { label: 'ABSOLUTION.Skill.Perception', attribute: 'knowledge' },
  records: { label: 'ABSOLUTION.Skill.Records', attribute: 'knowledge' },
  strength: { label: 'ABSOLUTION.Skill.Strength', attribute: 'power' },
  theurgy: { label: 'ABSOLUTION.Skill.Theurgy', attribute: 'faith' },
};

/**
 * Lineage that swaps the Strength skill for Psychokinesis, driven by Faith.
 * @type {string}
 */
ABSOLUTION.psychokineticLineage = 'leszhoth';

ABSOLUTION.lineages = {
  yager: 'ABSOLUTION.Lineage.Yager',
  garoux: 'ABSOLUTION.Lineage.Garoux',
  vikhane: 'ABSOLUTION.Lineage.Vikhane',
  maigo: 'ABSOLUTION.Lineage.Maigo',
  samee: 'ABSOLUTION.Lineage.Samee',
  bridde: 'ABSOLUTION.Lineage.Bridde',
  shadowkin: 'ABSOLUTION.Lineage.Shadowkin',
  ketari: 'ABSOLUTION.Lineage.Ketari',
  colonial: 'ABSOLUTION.Lineage.Colonial',
  penitentBeast: 'ABSOLUTION.Lineage.PenitentBeast',
  sunfolk: 'ABSOLUTION.Lineage.Sunfolk',
  zeelander: 'ABSOLUTION.Lineage.Zeelander',
  leszhoth: 'ABSOLUTION.Lineage.Leszhoth',
  aposkion: 'ABSOLUTION.Lineage.Aposkion',
  kripdovi: 'ABSOLUTION.Lineage.Kripdovi',
};

/**
 * Stamina gained per level after the first, by growth rate.
 * @type {Object}
 */
ABSOLUTION.staminaGrowth = {
  none: { label: 'ABSOLUTION.StaminaGrowth.None', perLevel: 0, tough: 'slow' },
  slow: { label: 'ABSOLUTION.StaminaGrowth.Slow', perLevel: 1, tough: 'normal' },
  normal: { label: 'ABSOLUTION.StaminaGrowth.Normal', perLevel: 1.5, tough: 'fast' },
  fast: { label: 'ABSOLUTION.StaminaGrowth.Fast', perLevel: 2, tough: 'exceptional' },
  exceptional: { label: 'ABSOLUTION.StaminaGrowth.Exceptional', perLevel: 3, tough: 'exceptional' },
};

/**
 * Vows (classes). `resource` is the label of the vow's main resource, or null
 * when the vow has none.
 * @type {Object}
 */
ABSOLUTION.vows = {
  novice: { label: 'ABSOLUTION.Vow.Novice', startingRanks: 0, ranksPerLevel: 0, staminaGrowth: 'normal', baseStamina: 10, resource: null },
  evangelist: { label: 'ABSOLUTION.Vow.Evangelist', startingRanks: 6, ranksPerLevel: 3, staminaGrowth: 'slow', baseStamina: 8, resource: 'ABSOLUTION.Resource.Leadership' },
  confessor: { label: 'ABSOLUTION.Vow.Confessor', startingRanks: 4, ranksPerLevel: 2, staminaGrowth: 'slow', baseStamina: 8, resource: 'ABSOLUTION.Resource.Bellflowers' },
  judge: { label: 'ABSOLUTION.Vow.Judge', startingRanks: 4, ranksPerLevel: 2, staminaGrowth: 'normal', baseStamina: 14, resource: 'ABSOLUTION.Resource.Order' },
  reliquarian: { label: 'ABSOLUTION.Vow.Reliquarian', startingRanks: 4, ranksPerLevel: 2, staminaGrowth: 'normal', baseStamina: 14, resource: 'ABSOLUTION.Resource.Spirit' },
  archivist: { label: 'ABSOLUTION.Vow.Archivist', startingRanks: 6, ranksPerLevel: 3, staminaGrowth: 'slow', baseStamina: 10, resource: 'ABSOLUTION.Resource.PotentialEnergy' },
  plagueDoctor: { label: 'ABSOLUTION.Vow.PlagueDoctor', startingRanks: 6, ranksPerLevel: 3, staminaGrowth: 'slow', baseStamina: 10, resource: 'ABSOLUTION.Resource.Focus' },
  paladin: { label: 'ABSOLUTION.Vow.Paladin', startingRanks: 4, ranksPerLevel: 2, staminaGrowth: 'fast', baseStamina: 12, resource: 'ABSOLUTION.Resource.Vigilance' },
  magos: { label: 'ABSOLUTION.Vow.Magos', startingRanks: 6, ranksPerLevel: 3, staminaGrowth: 'slow', baseStamina: 8, resource: null },
  hellstalker: { label: 'ABSOLUTION.Vow.Hellstalker', startingRanks: 4, ranksPerLevel: 2, staminaGrowth: 'normal', baseStamina: 12, resource: 'ABSOLUTION.Resource.Spite' },
  helion: { label: 'ABSOLUTION.Vow.Helion', startingRanks: 4, ranksPerLevel: 2, staminaGrowth: 'fast', baseStamina: 14, resource: 'ABSOLUTION.Resource.Zeal', staminaAttribute: 'faith' },
  ashReaper: { label: 'ABSOLUTION.Vow.AshReaper', startingRanks: 4, ranksPerLevel: 2, staminaGrowth: 'normal', baseStamina: 12, resource: null },
  knightTemplar: { label: 'ABSOLUTION.Vow.KnightTemplar', startingRanks: 6, ranksPerLevel: 3, staminaGrowth: 'normal', baseStamina: 12, resource: 'ABSOLUTION.Resource.Grit' },
  penitentBeast: { label: 'ABSOLUTION.Vow.PenitentBeast', startingRanks: 4, ranksPerLevel: 2, staminaGrowth: 'fast', baseStamina: 18, resource: 'ABSOLUTION.Resource.Frenzy' },
  ranger: { label: 'ABSOLUTION.Vow.Ranger', startingRanks: 6, ranksPerLevel: 3, staminaGrowth: 'normal', baseStamina: 10, resource: 'ABSOLUTION.Resource.Flow' },
  mechanist: { label: 'ABSOLUTION.Vow.Mechanist', startingRanks: 6, ranksPerLevel: 3, staminaGrowth: 'none', baseStamina: 4, resource: 'ABSOLUTION.Resource.MachinaStamina' },
  strategist: { label: 'ABSOLUTION.Vow.Strategist', startingRanks: 6, ranksPerLevel: 3, staminaGrowth: 'normal', baseStamina: 10, resource: 'ABSOLUTION.Resource.Opportunities' },
  phantom: { label: 'ABSOLUTION.Vow.Phantom', startingRanks: 4, ranksPerLevel: 2, staminaGrowth: 'slow', baseStamina: 4, resource: 'ABSOLUTION.Resource.MirrorStamina' },
  hedgePriest: { label: 'ABSOLUTION.Vow.HedgePriest', startingRanks: 4, ranksPerLevel: 2, staminaGrowth: 'slow', baseStamina: 6, resource: 'ABSOLUTION.Resource.Natura' },
  inkmage: { label: 'ABSOLUTION.Vow.Inkmage', startingRanks: 4, ranksPerLevel: 2, staminaGrowth: 'normal', baseStamina: 8, resource: 'ABSOLUTION.Resource.Inspiration' },
  martialist: { label: 'ABSOLUTION.Vow.Martialist', startingRanks: 6, ranksPerLevel: 3, staminaGrowth: 'slow', baseStamina: 8, resource: 'ABSOLUTION.Resource.Soul' },
  blackblade: { label: 'ABSOLUTION.Vow.Blackblade', startingRanks: 4, ranksPerLevel: 2, staminaGrowth: 'slow', baseStamina: 8, resource: 'ABSOLUTION.Resource.Curse' },
  rudie: { label: 'ABSOLUTION.Vow.Rudie', startingRanks: 4, ranksPerLevel: 2, staminaGrowth: 'slow', baseStamina: 8, resource: null },
  psyknight: { label: 'ABSOLUTION.Vow.Psyknight', startingRanks: 4, ranksPerLevel: 2, staminaGrowth: 'slow', baseStamina: 8, resource: null },
};

/**
 * Stats used while no vow is selected.
 * @type {Object}
 */
ABSOLUTION.noVow = { startingRanks: 0, ranksPerLevel: 0, staminaGrowth: 'none', baseStamina: 0, resource: null };

ABSOLUTION.statuses = {
  healthy: 'ABSOLUTION.Status.Healthy',
  freshWounds: 'ABSOLUTION.Status.FreshWounds',
  mended: 'ABSOLUTION.Status.Mended',
  triaged: 'ABSOLUTION.Status.Triaged',
};

/**
 * Action types for vow features and traits.
 * @type {Object}
 */
ABSOLUTION.actionTypes = {
  interrupt: 'ABSOLUTION.ActionType.Interrupt',
  stance: 'ABSOLUTION.ActionType.Stance',
  freeAction: 'ABSOLUTION.ActionType.FreeAction',
  halfAction: 'ABSOLUTION.ActionType.HalfAction',
  fullAction: 'ABSOLUTION.ActionType.FullAction',
  passive: 'ABSOLUTION.ActionType.Passive',
  camp: 'ABSOLUTION.ActionType.Camp',
  downtime: 'ABSOLUTION.ActionType.Downtime',
};

/**
 * Where a vow feature or trait comes from.
 * @type {Object}
 */
ABSOLUTION.featureSources = {
  vowFeature: 'ABSOLUTION.FeatureSource.VowFeature',
  trait: 'ABSOLUTION.FeatureSource.Trait',
  lineage: 'ABSOLUTION.FeatureSource.Lineage',
  other: 'ABSOLUTION.FeatureSource.Other',
};

/**
 * Categories for the Weapons and Ornaments list.
 * @type {Object}
 */
ABSOLUTION.weaponCategories = {
  weapon: 'ABSOLUTION.WeaponCategory.Weapon',
  spinel: 'ABSOLUTION.WeaponCategory.Spinel',
  turquoise: 'ABSOLUTION.WeaponCategory.Turquoise',
  jade: 'ABSOLUTION.WeaponCategory.Jade',
  gold: 'ABSOLUTION.WeaponCategory.Gold',
  clockwork: 'ABSOLUTION.WeaponCategory.Clockwork',
  innate: 'ABSOLUTION.WeaponCategory.Innate',
};

/**
 * Weapon categories that are ornaments. Ornaments attach to a weapon and list
 * under it. Innate ornaments are part of the weapon and take no slot.
 * @type {string[]}
 */
ABSOLUTION.ornamentCategories = ['spinel', 'turquoise', 'jade', 'gold', 'clockwork', 'innate'];

/**
 * Weapon weights and their base damage, as a step on the damage ladder.
 * @type {Object}
 */
ABSOLUTION.weaponWeights = {
  offHand: { label: 'ABSOLUTION.WeaponWeight.OffHand', damageStep: 2 },
  mainHand: { label: 'ABSOLUTION.WeaponWeight.MainHand', damageStep: 3 },
  twoHand: { label: 'ABSOLUTION.WeaponWeight.TwoHand', damageStep: 4 },
};

/**
 * The damage ladder that Weakened steps down: 1d6+3 > 1d6 > 1d3 > 1 > 0.
 * @type {{dice: string|null, bonus: number}[]}
 */
ABSOLUTION.damageLadder = [
  { dice: null, bonus: 0 },
  { dice: null, bonus: 1 },
  { dice: '1d3', bonus: 0 },
  { dice: '1d6', bonus: 0 },
  { dice: '1d6', bonus: 3 },
];

/**
 * Weapon properties. Rated properties ("Defender X") store their total
 * rating; the rest are on or off.
 * @type {Object}
 */
ABSOLUTION.weaponProperties = {
  archaeotech: { label: 'ABSOLUTION.WeaponProperty.Archaeotech', rated: false },
  bulky: { label: 'ABSOLUTION.WeaponProperty.Bulky', rated: false },
  consecrated: { label: 'ABSOLUTION.WeaponProperty.Consecrated', rated: false },
  defender: { label: 'ABSOLUTION.WeaponProperty.Defender', rated: true },
  focus: { label: 'ABSOLUTION.WeaponProperty.Focus', rated: false },
  heavy: { label: 'ABSOLUTION.WeaponProperty.Heavy', rated: true },
  honed: { label: 'ABSOLUTION.WeaponProperty.Honed', rated: true },
  piercing: { label: 'ABSOLUTION.WeaponProperty.Piercing', rated: false },
  precise: { label: 'ABSOLUTION.WeaponProperty.Precise', rated: false },
  quality: { label: 'ABSOLUTION.WeaponProperty.Quality', rated: true },
  ranged: { label: 'ABSOLUTION.WeaponProperty.Ranged', rated: true },
  reach: { label: 'ABSOLUTION.WeaponProperty.Reach', rated: false },
  slowLoad: { label: 'ABSOLUTION.WeaponProperty.SlowLoad', rated: false },
  weakened: { label: 'ABSOLUTION.WeaponProperty.Weakened', rated: true },
};

/**
 * Ornament slots and the ornament types each accepts.
 * @type {Object}
 */
ABSOLUTION.slotTypes = {
  prismatic: { label: 'ABSOLUTION.SlotType.Prismatic', accepts: ['spinel', 'turquoise', 'jade'] },
  spinel: { label: 'ABSOLUTION.SlotType.Spinel', accepts: ['spinel'] },
  turquoise: { label: 'ABSOLUTION.SlotType.Turquoise', accepts: ['turquoise'] },
  jade: { label: 'ABSOLUTION.SlotType.Jade', accepts: ['jade'] },
  gold: { label: 'ABSOLUTION.SlotType.Gold', accepts: ['gold'] },
  clockwork: { label: 'ABSOLUTION.SlotType.Clockwork', accepts: ['clockwork'] },
  pearl: { label: 'ABSOLUTION.SlotType.Pearl', accepts: ['spinel', 'turquoise', 'jade', 'gold'] },
};

/**
 * Armor weights (Equipment rules, "Armor"). Evasion: 'full', 'half' or 'none'.
 * @type {Object}
 */
ABSOLUTION.armorWeights = {
  light: { label: 'ABSOLUTION.ArmorWeight.Light', armorRating: 0, speedPenalty: 0, evasion: 'full' },
  medium: { label: 'ABSOLUTION.ArmorWeight.Medium', armorRating: 2, speedPenalty: 1, evasion: 'half' },
  heavy: { label: 'ABSOLUTION.ArmorWeight.Heavy', armorRating: 4, speedPenalty: 2, evasion: 'none' },
};

/**
 * Armor modifications. A set of armor has one; the basic armor given to new
 * Hunters has none.
 * @type {Object}
 */
ABSOLUTION.armorModifications = {
  banded: 'ABSOLUTION.ArmorModification.Banded',
  trimmed: 'ABSOLUTION.ArmorModification.Trimmed',
  spiked: 'ABSOLUTION.ArmorModification.Spiked',
  belted: 'ABSOLUTION.ArmorModification.Belted',
  plated: 'ABSOLUTION.ArmorModification.Plated',
  articulated: 'ABSOLUTION.ArmorModification.Articulated',
  engraved: 'ABSOLUTION.ArmorModification.Engraved',
};

/**
 * The slot an Engraved armor modification adds.
 * @type {Object}
 */
ABSOLUTION.engravedSlots = {
  spinel: 'ABSOLUTION.SlotType.Spinel',
  jade: 'ABSOLUTION.SlotType.Jade',
};

/**
 * Traits armor can be made for, ticked on the armor's sheet. A trait with a
 * weight only applies to armor of that weight.
 * @type {Object}
 */
ABSOLUTION.armorTraits = {
  lightArmorMastery: { label: 'ABSOLUTION.Armor.Trait.LightArmorMastery', weight: 'light' },
  mediumArmorMastery: { label: 'ABSOLUTION.Armor.Trait.MediumArmorMastery', weight: 'medium' },
  bespokeEquipment: { label: 'ABSOLUTION.Armor.Trait.BespokeEquipment' },
};

/**
 * Extra modifications armor can be crafted with, each allowed by an armor
 * trait (see ABSOLUTION.armorTraits).
 * @type {Object}
 */
ABSOLUTION.extraArmorModifications = {
  mastery: { trait: 'lightArmorMastery', label: 'ABSOLUTION.Armor.Extra.Mastery' },
  bespoke: { trait: 'bespokeEquipment', label: 'ABSOLUTION.Armor.Extra.Bespoke' },
};

/**
 * Ornament kinds (Equipment rules, "Special Ornament Types" and "Clockwork
 * Ornaments"). Discharge ornaments track charges; the rest that get used up
 * track whether they're spent, under their own name for it.
 * @type {Object}
 */
ABSOLUTION.ornamentKinds = {
  standard: { label: 'ABSOLUTION.OrnamentKind.Standard', tracks: null },
  discharge: { label: 'ABSOLUTION.OrnamentKind.Discharge', tracks: 'charges' },
  evocation: { label: 'ABSOLUTION.OrnamentKind.Evocation', tracks: 'spent', spentLabel: 'ABSOLUTION.OrnamentKind.Spent.Evocation' },
  shatter: { label: 'ABSOLUTION.OrnamentKind.Shatter', tracks: 'spent', spentLabel: 'ABSOLUTION.OrnamentKind.Spent.Shatter' },
  ritual: { label: 'ABSOLUTION.OrnamentKind.Ritual', tracks: null },
  pneumatic: { label: 'ABSOLUTION.OrnamentKind.Pneumatic', tracks: 'spent', spentLabel: 'ABSOLUTION.OrnamentKind.Spent.Pneumatic' },
  latch: { label: 'ABSOLUTION.OrnamentKind.Latch', tracks: 'spent', spentLabel: 'ABSOLUTION.OrnamentKind.Spent.Latch' },
  engine: { label: 'ABSOLUTION.OrnamentKind.Engine', tracks: 'spent', spentLabel: 'ABSOLUTION.OrnamentKind.Spent.Engine' },
};

/**
 * Ornament rarities, most to least common.
 * @type {Object}
 */
ABSOLUTION.ornamentRarities = {
  common: 'ABSOLUTION.Rarity.Common',
  uncommon: 'ABSOLUTION.Rarity.Uncommon',
  rare: 'ABSOLUTION.Rarity.Rare',
  exotic: 'ABSOLUTION.Rarity.Exotic',
  legendary: 'ABSOLUTION.Rarity.Legendary',
};

/**
 * Catalyst ornaments that change the Discharge ornaments slotted beside them:
 * Shaping adds 1 Charge; Multifaceted raises maximum Charges by half.
 * Elemental changes other ornaments' effects, which stay in their text.
 * @type {Object}
 */
ABSOLUTION.catalysts = {
  elemental: 'ABSOLUTION.Catalyst.Elemental',
  shaping: 'ABSOLUTION.Catalyst.Shaping',
  multifaceted: 'ABSOLUTION.Catalyst.Multifaceted',
};

/**
 * How many weapons a character can be Attuned to.
 * @type {number}
 */
ABSOLUTION.attunementLimit = 2;

/**
 * Token status effects: the Conditions and Status Effects from the core
 * rules, plus Incapacitated and Dead from Knockout Rolls, Ironheart Stance,
 * and markers for vow features and hostile (monster) effects. Conditions can be
 * cleared by effects that clear Conditions; Status Effects can't. Names and
 * descriptions are localization keys.
 * @type {Object[]}
 */
ABSOLUTION.statusEffects = [
  ['sunder', 'condition', 'explosion'],
  ['exhaustion', 'condition', 'sleep'],
  ['stagger', 'condition', 'daze'],
  ['blind', 'condition', 'blind'],
  ['immobilized', 'condition', 'trap'],
  ['impairment', 'condition', 'downgrade'],
  ['hemorrhage', 'condition', 'blood'],
  ['invisible', 'condition', 'invisible'],
  ['burn', 'condition', 'fire'],
  ['electrocution', 'condition', 'lightning'],
  ['toxic', 'condition', 'biohazard'],
  ['agony', 'condition', 'ice-aura'],
  ['stun', 'condition', 'stoned'],
  ['haste', 'condition', 'wingfoot'],
  ['berserk', 'condition', 'sword'],
  ['slow', 'condition', 'frozen'],
  ['terror', 'condition', 'terror'],
  ['mangle', 'condition', 'degen'],
  ['concussion', 'status', 'sun'],
  ['exposed', 'status', 'paralysis'],
  ['grappled', 'status', 'anchor'],
  ['prone', 'status', 'falling'],
  // Trackers for effects with no rules of their own here: Ironheart Stance,
  // a vow feature's lingering effect, and up to four monster effects
  ['ironheart', 'stance', 'holy-shield'],
  ['vowFeature', 'other', 'angel'],
  ['hostileEffect1', 'status', 'hazard'],
  ['hostileEffect2', 'status', 'eye'],
  ['hostileEffect3', 'status', 'target'],
  ['hostileEffect4', 'status', 'acid'],
  ['incapacitated', 'status', 'unconscious'],
  ['dead', 'status', 'skull'],
].map(([id, kind, icon], order) => {
  const key = id.charAt(0).toUpperCase() + id.slice(1);
  return {
    id,
    order,
    name: `ABSOLUTION.StatusEffect.${key}.Name`,
    description: `ABSOLUTION.StatusEffect.${key}.Description`,
    img: `icons/svg/${icon}.svg`,
    flags: { absolution: { kind } },
  };
});

/**
 * Damage types (core rules, "Damage Types").
 * @type {Object}
 */
ABSOLUTION.damageTypes = {
  physical: 'ABSOLUTION.DamageType.Physical',
  fire: 'ABSOLUTION.DamageType.Fire',
  frost: 'ABSOLUTION.DamageType.Frost',
  nature: 'ABSOLUTION.DamageType.Nature',
  shock: 'ABSOLUTION.DamageType.Shock',
  psychic: 'ABSOLUTION.DamageType.Psychic',
  holy: 'ABSOLUTION.DamageType.Holy',
  unholy: 'ABSOLUTION.DamageType.Unholy',
};
