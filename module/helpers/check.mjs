/**
 * Absolution checks: roll a pool of d6s and count Hits.
 *
 * - A die is a Hit on 4+, on 3+ with Advantage, or on 5+ with Disadvantage.
 * - Edge adds a die per point; negative Edge removes dice. A check made with
 *   zero or fewer dice fails automatically.
 * - Automatic Hits add Hits without dice, so they never count as 6s.
 * - With a Difficulty, the check succeeds when Hits meet it, and is a Critical
 *   Success when the 6s alone meet it.
 */

import { createChatMessage } from './chat.mjs';

/**
 * The Hit threshold for each roll mode.
 * @type {Record<string, number>}
 */
export const HIT_ON = { normal: 4, advantage: 3, disadvantage: 5 };

/**
 * Work out a check's result from its dice.
 * @param {object} check
 * @param {number[]} check.faces        The faces rolled
 * @param {number} check.threshold      The lowest face that counts as a Hit
 * @param {number} [check.autoHits]     Automatic Hits
 * @param {number|null} [check.difficulty]  Hits needed to succeed, or null for none
 * @returns {{hits: number, sixes: number, success: boolean|null, critical: boolean}}
 */
export function evaluateCheck({ faces, threshold, autoHits = 0, difficulty = null }) {
  const hits = faces.filter((f) => f >= threshold).length + autoHits;
  const sixes = faces.filter((f) => f === 6).length;
  const hasDifficulty = Number.isInteger(difficulty) && difficulty > 0;
  return {
    hits,
    sixes,
    success: hasDifficulty ? hits >= difficulty : null,
    critical: hasDifficulty && sixes >= difficulty,
  };
}

/**
 * Roll a check and post it to chat.
 * @param {object} options
 * @param {Actor} options.actor           The actor making the check
 * @param {string} options.label          What is being checked, e.g. "Medicine"
 * @param {string} [options.subtitle]     The line under it on the chat card,
 *                                        e.g. "Skill Check"; defaults to "Check"
 * @param {number} options.dice           Dice before Edge
 * @param {number} [options.edge]         Edge gained (or lost, if negative)
 * @param {number} [options.morale]       Morale spent: 1 more Edge each. The
 *                                        caller takes it off the actor.
 * @param {string} [options.mode]         "normal", "advantage" or "disadvantage"
 * @param {number} [options.autoHits]     Automatic Hits
 * @param {number|null} [options.difficulty]  Hits needed to succeed
 * @param {Item} [options.weapon]         For weapon attacks: adds a Roll Damage button
 *                                        that knows whether the attack was critical
 * @returns {Promise<ChatMessage>}
 */
export async function rollCheck({ actor, label, subtitle, dice, edge = 0, morale = 0, mode = 'normal', autoHits = 0, difficulty = null, weapon = null }) {
  const totalEdge = edge + morale;
  const pool = dice + totalEdge;
  const threshold = HIT_ON[mode] ?? HIT_ON.normal;
  const speaker = ChatMessage.getSpeaker({ actor });
  const details = { label, subtitle, pool, edge: totalEdge, morale, mode, autoHits, difficulty };

  // Zero or fewer dice: automatic failure, nothing to roll.
  if (pool <= 0) {
    return createChatMessage({
      speaker,
      flavor: checkFlavor(details),
      content: `<p class="absolution-check-outcome failure">${game.i18n.localize('ABSOLUTION.Check.NoDice')}</p>`,
    });
  }

  const roll = new Roll(`${pool}d6cs>=${threshold}${autoHits ? ` + ${autoHits}` : ''}`);
  await roll.evaluate();
  const faces = roll.dice[0].results.filter((r) => r.active).map((r) => r.result);
  const result = evaluateCheck({ faces, threshold, autoHits, difficulty });
  const damageButton = weapon
    ? `<button type="button" class="absolution-damage-button" data-absolution-damage="${weapon.uuid}" data-critical="${result.critical}">
        <i class="fa-solid fa-burst"></i> ${game.i18n.localize('ABSOLUTION.Weapon.RollDamage')}
      </button>`
    : '';
  return roll.toMessage({ speaker, flavor: checkFlavor(details, result) + damageButton });
}

/**
 * A number input between + and − buttons, for the check dialog.
 * @param {string} name          The input's name
 * @param {number} value         Starting value
 * @param {object} [limits]
 * @param {number} [limits.min]
 * @param {number} [limits.max]
 * @returns {string}
 */
function stepper(name, value, { min, max } = {}) {
  const attr = (key, v) => (Number.isFinite(v) ? ` ${key}="${v}"` : '');
  return `<div class="stepper">
    <button type="button" class="step" data-step="1" data-target="${name}" aria-label="+">+</button>
    <input type="number" name="${name}" value="${value}"${attr('min', min)}${attr('max', max)}>
    <button type="button" class="step" data-step="-1" data-target="${name}" aria-label="−">&minus;</button>
  </div>`;
}

/**
 * Ask for Difficulty, Edge, Morale to spend, Advantage and Automatic Hits,
 * then roll. Each point of Morale spent adds 1 Edge and comes off the actor.
 * @param {object} options          As for {@link rollCheck}; edge, autoHits and mode fill in the dialog
 * @param {string[]} [options.notes]   Lines shown at the top of the dialog, e.g. why Disadvantage is set
 * @returns {Promise<ChatMessage|null>}   null if the dialog was closed
 */
export async function promptCheck({ actor, label, subtitle, dice, edge = 0, autoHits = 0, mode: startMode = 'normal', notes = [], weapon = null }) {
  const i18n = (k) => game.i18n.localize(`ABSOLUTION.Check.${k}`);
  // Only characters have Morale, and only the actor's owners can spend it
  const morale = actor?.isOwner && Number.isInteger(actor.system?.morale) ? Math.max(0, actor.system.morale) : null;
  const modeToggle = ['advantage', 'normal', 'disadvantage']
    .map(
      (mode) => `<label class="mode-option">
        <input type="radio" name="mode" value="${mode}" ${mode === startMode ? 'checked' : ''}>
        <span>${i18n(mode.capitalize())}</span>
      </label>`
    )
    .join('');
  const moraleGroup =
    morale === null
      ? ''
      : `<div class="stepper-group"><label>${i18n('Morale')}</label>
          ${stepper('morale', 0, { min: 0, max: morale })}
          <span class="stepper-hint">${game.i18n.format('ABSOLUTION.Check.MoraleAvailable', { morale })}</span></div>`;
  const content = `
    ${notes.map((n) => `<p class="check-note">${n}</p>`).join('')}
    <div class="form-group"><label>${i18n('Difficulty')}</label>
      <input type="number" name="difficulty" min="0" placeholder="${i18n('NoDifficulty')}"></div>
    <div class="check-steppers">
      <div class="stepper-group"><label>${i18n('Edge')}</label>${stepper('edge', edge)}</div>
      ${moraleGroup}
    </div>
    <div class="mode-toggle">${modeToggle}</div>
    <div class="form-group"><label>${i18n('AutoHits')}</label>${stepper('autoHits', autoHits, { min: 0 })}</div>`;
  const options = await foundry.applications.api.DialogV2.wait({
    window: { title: game.i18n.format('ABSOLUTION.Check.Title', { label }) },
    classes: ['absolution-check-dialog'],
    // Wide enough for the Edge and Morale steppers side by side
    position: { width: 440 },
    content,
    // + and − buttons step their input, kept within its min and max
    render: (event, dialog) => {
      const root = dialog?.element ?? dialog;
      for (const button of root.querySelectorAll('button.step')) {
        button.addEventListener('click', () => {
          const input = root.querySelector(`input[name="${button.dataset.target}"]`);
          let value = (Number(input.value) || 0) + Number(button.dataset.step);
          if (input.min !== '') value = Math.max(Number(input.min), value);
          if (input.max !== '') value = Math.min(Number(input.max), value);
          input.value = value;
        });
      }
    },
    buttons: [
      {
        action: 'roll',
        label: 'ABSOLUTION.Check.Roll',
        icon: 'fa-solid fa-dice-d6',
        default: true,
        callback: (event, button) => {
          const f = button.form.elements;
          return {
            difficulty: f.difficulty.value === '' ? null : Number(f.difficulty.value),
            edge: Number(f.edge.value) || 0,
            morale: f.morale ? Math.min(morale, Math.max(0, Number(f.morale.value) || 0)) : 0,
            mode: f.mode.value,
            autoHits: Math.max(0, Number(f.autoHits.value) || 0),
          };
        },
      },
    ],
    rejectClose: false,
  });
  if (!options) return null;
  if (options.morale) await actor.update({ 'system.morale': morale - options.morale });
  return rollCheck({ actor, label, subtitle, dice, weapon, ...options });
}

/**
 * The chat flavor for a check: what was rolled, with what, and the outcome.
 * @param {object} details
 * @param {object} [result]     From {@link evaluateCheck}; omitted for an automatic failure
 * @returns {string}
 */
function checkFlavor({ label, subtitle, pool, edge, morale = 0, mode, autoHits, difficulty }, result) {
  const i18n = (k, data) => game.i18n.format(`ABSOLUTION.Check.${k}`, data);
  const parts = [i18n('Dice', { dice: Math.max(pool, 0) })];
  if (edge) parts.push(i18n('EdgeValue', { edge: edge > 0 ? `+${edge}` : edge }));
  if (morale) parts.push(i18n('MoraleSpent', { morale }));
  if (mode !== 'normal') parts.push(i18n(mode === 'advantage' ? 'Advantage' : 'Disadvantage'));
  if (autoHits) parts.push(i18n('AutoHitsValue', { hits: autoHits }));
  if (difficulty) parts.push(i18n('DifficultyValue', { difficulty }));

  let outcome = '';
  if (result) {
    const hits = i18n('Hits', { hits: result.hits });
    if (result.success === null) outcome = hits;
    else if (result.critical) outcome = `${hits}: ${i18n('Critical')}`;
    else outcome = `${hits}: ${i18n(result.success ? 'Success' : 'Failure')}`;
  }
  const outcomeClass = result?.critical ? 'critical' : result?.success ? 'success' : result?.success === false ? 'failure' : '';

  // Laid out like the other chat cards: "- Agility -" over "Skill Check"
  const escape = foundry.utils.escapeHTML;
  return `<div class="absolution-card absolution-check">
    <h2>- ${escape(label)} -</h2>
    <div class="card-subtitle">${escape(subtitle ?? game.i18n.localize('ABSOLUTION.Check.Check'))}</div>
    <p class="absolution-check-details">${parts.join(' &middot; ')}</p>
    ${outcome ? `<p class="absolution-check-outcome ${outcomeClass}">${outcome}</p>` : ''}
  </div>`;
}
