/**
 * Knockout rolls, ported from the prototype Knockout macro (prototype/ko.js).
 *
 * Roll a d6 per Normal Wound; each die under 4 counts, and every Grievous
 * Wound adds 1. The total decides the result:
 * - 0: Flesh Wound
 * - 1: Impairing Wound, with a d6 for its nature (1-2 Deep Wound,
 *   3-4 Vital Blow, 5-6 Daze)
 * - more, with 3 or fewer Wounds in all: Concussion
 * - otherwise: Knockout
 */

/**
 * Decide a knockout result.
 * @param {object} knockout
 * @param {number} knockout.total       The knockout roll's total
 * @param {number} knockout.wounds      Normal Wounds rolled
 * @param {number} knockout.grievous    Grievous Wounds added
 * @param {number} [knockout.impairment]  The d6 for an Impairing Wound
 * @returns {{result: string, impairment: string|null}}
 */
export function knockoutResult({ total, wounds, grievous, impairment }) {
  if (total === 0) return { result: 'fleshWound', impairment: null };
  if (total === 1) {
    const kind = impairment <= 2 ? 'deepWound' : impairment <= 4 ? 'vitalBlow' : 'daze';
    return { result: 'impairingWound', impairment: kind };
  }
  if (wounds + grievous <= 3) return { result: 'concussion', impairment: null };
  return { result: 'knockout', impairment: null };
}

/**
 * Make a knockout roll and post it to chat.
 * @param {object} options
 * @param {Actor} options.actor
 * @param {number} options.wounds      Normal Wounds to roll
 * @param {number} options.grievous    Grievous Wounds to add
 * @returns {Promise<ChatMessage>}
 */
export async function rollKnockout({ actor, wounds, grievous }) {
  const terms = [];
  if (wounds > 0) terms.push(`${wounds}d6cs<4`);
  if (grievous > 0 || !terms.length) terms.push(String(grievous));
  const roll = new Roll(terms.join(' + '));
  await roll.evaluate();

  let impairment;
  if (roll.total === 1) {
    const sub = new Roll('1d6');
    await sub.evaluate();
    impairment = sub.total;
  }
  const outcome = knockoutResult({ total: roll.total, wounds, grievous, impairment });

  const format = (key) =>
    game.i18n.format(`ABSOLUTION.Knockout.${key}`, {
      name: foundry.utils.escapeHTML(actor.name),
      wounds: wounds + grievous,
      roll: impairment,
    });
  const result = outcome.result.capitalize();
  const impairmentBox = outcome.impairment
    ? `<div class="card-box">
        <div class="card-box-title">${impairment} - ${format(`${outcome.impairment.capitalize()}.Title`)}</div>
        ${format(`${outcome.impairment.capitalize()}.Text`)}
      </div>`
    : '';
  const flavor = `<div class="absolution-card">
    <h2>- ${format(`${result}.Title`)} -</h2>
    <div class="card-subtitle">${format('Title')}</div>
    ${format(`${result}.Text`)}
    ${impairmentBox}
    <hr/>
    <div class="card-quote">${format(`${result}.Quote`)}</div>
  </div>`;

  return roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor }), flavor });
}
