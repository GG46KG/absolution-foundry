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
 * @param {number} options.dice           Dice before Edge
 * @param {number} [options.edge]         Edge gained (or lost, if negative)
 * @param {string} [options.mode]         "normal", "advantage" or "disadvantage"
 * @param {number} [options.autoHits]     Automatic Hits
 * @param {number|null} [options.difficulty]  Hits needed to succeed
 * @param {Item} [options.weapon]         For weapon attacks: adds a Roll Damage button
 *                                        that knows whether the attack was critical
 * @returns {Promise<ChatMessage>}
 */
export async function rollCheck({ actor, label, dice, edge = 0, mode = 'normal', autoHits = 0, difficulty = null, weapon = null }) {
  const pool = dice + edge;
  const threshold = HIT_ON[mode] ?? HIT_ON.normal;
  const speaker = ChatMessage.getSpeaker({ actor });
  const details = { label, pool, edge, mode, autoHits, difficulty };

  // Zero or fewer dice: automatic failure, nothing to roll.
  if (pool <= 0) {
    const cls = foundry.utils.getDocumentClass('ChatMessage');
    const msg = new cls({
      speaker,
      flavor: checkFlavor(details),
      content: `<p class="absolution-check-outcome failure">${game.i18n.localize('ABSOLUTION.Check.NoDice')}</p>`,
    });
    msg.applyMode(game.settings.get('core', 'messageMode'));
    return cls.create(msg);
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
 * Ask for Difficulty, Edge, Advantage and Automatic Hits, then roll.
 * @param {object} options          As for {@link rollCheck}; edge and mode fill in the dialog
 * @param {string[]} [options.notes]   Lines shown at the top of the dialog, e.g. why Disadvantage is set
 * @returns {Promise<ChatMessage|null>}   null if the dialog was closed
 */
export async function promptCheck({ actor, label, dice, edge = 0, mode: startMode = 'normal', notes = [], weapon = null }) {
  const i18n = (k) => game.i18n.localize(`ABSOLUTION.Check.${k}`);
  const modeToggle = ['disadvantage', 'normal', 'advantage']
    .map(
      (mode) => `<label class="mode-option">
        <input type="radio" name="mode" value="${mode}" ${mode === startMode ? 'checked' : ''}>
        <span>${i18n(mode.capitalize())}</span>
      </label>`
    )
    .join('');
  const content = `
    ${notes.map((n) => `<p class="check-note">${n}</p>`).join('')}
    <div class="form-group"><label>${i18n('Difficulty')}</label>
      <input type="number" name="difficulty" min="0" placeholder="${i18n('NoDifficulty')}"></div>
    <div class="form-group"><label>${i18n('Edge')}</label>
      <input type="number" name="edge" value="${edge}"></div>
    <div class="form-group"><label>${i18n('Mode')}</label>
      <div class="mode-toggle">${modeToggle}</div></div>
    <div class="form-group"><label>${i18n('AutoHits')}</label>
      <input type="number" name="autoHits" value="0" min="0"></div>`;
  const options = await foundry.applications.api.DialogV2.wait({
    window: { title: game.i18n.format('ABSOLUTION.Check.Title', { label }) },
    classes: ['absolution-check-dialog'],
    // Wide enough for the label column and the three toggle buttons on one line
    position: { width: 440 },
    content,
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
            mode: f.mode.value,
            autoHits: Math.max(0, Number(f.autoHits.value) || 0),
          };
        },
      },
    ],
    rejectClose: false,
  });
  if (!options) return null;
  return rollCheck({ actor, label, dice, weapon, ...options });
}

/**
 * The chat flavor for a check: what was rolled, with what, and the outcome.
 * @param {object} details
 * @param {object} [result]     From {@link evaluateCheck}; omitted for an automatic failure
 * @returns {string}
 */
function checkFlavor({ label, pool, edge, mode, autoHits, difficulty }, result) {
  const i18n = (k, data) => game.i18n.format(`ABSOLUTION.Check.${k}`, data);
  const parts = [i18n('Dice', { dice: Math.max(pool, 0) })];
  if (edge) parts.push(i18n('EdgeValue', { edge: edge > 0 ? `+${edge}` : edge }));
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

  return `<div class="absolution-check">
    <h3>${foundry.utils.escapeHTML(i18n('Heading', { label }))}</h3>
    <p class="absolution-check-details">${parts.join(' &middot; ')}</p>
    ${outcome ? `<p class="absolution-check-outcome ${outcomeClass}">${outcome}</p>` : ''}
  </div>`;
}
