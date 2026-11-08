/**
 * Replace the combat tracker's initiative column with popcorn initiative
 * controls: a button to pass the turn to each combatant still waiting, and a
 * mark on those who have acted this round. The GM can click the mark to undo it.
 *
 * @param {CombatTracker} app     The rendered combat tracker
 * @param {HTMLElement} element   Its root element
 */
export function renderPopcornControls(app, element) {
  // Nobody rolls initiative
  for (const el of element.querySelectorAll('[data-action="rollAll"], [data-action="rollNPC"]')) {
    el.remove();
  }

  const combat = app.viewed;
  if (!combat?.getHandOffTargets) return;
  const { targets, newRound } = combat.started
    ? combat.getHandOffTargets()
    : { targets: [], newRound: false };
  const canHandOff = combat.canHandOff();

  for (const li of element.querySelectorAll('li.combatant[data-combatant-id]')) {
    const combatant = combat.combatants.get(li.dataset.combatantId);
    const cell = li.querySelector('.token-initiative');
    if (!combatant || !cell) continue;
    cell.replaceChildren();
    if (!combat.started) continue;

    if (combat.hasActed(combatant)) {
      li.classList.add('popcorn-acted');
      const mark = popcornButton(
        'fa-check',
        game.user.isGM ? 'ABSOLUTION.Combat.ActedUndo' : 'ABSOLUTION.Combat.Acted'
      );
      if (game.user.isGM) {
        mark.addEventListener('click', (event) => {
          event.stopPropagation();
          combatant.unsetFlag('absolution', 'actedRound');
        });
      } else mark.disabled = true;
      cell.append(mark);
    } else if (canHandOff && targets.includes(combatant)) {
      const button = newRound
        ? popcornButton('fa-rotate-right', 'ABSOLUTION.Combat.StartRound', { round: combat.round + 1 })
        : popcornButton('fa-hand-point-right', 'ABSOLUTION.Combat.HandOff');
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        combat.handOff(combatant);
      });
      cell.append(button);
    }
  }
}

/**
 * @param {string} icon       Font Awesome icon class
 * @param {string} label      Localization key for the tooltip
 * @param {object} [data]     Data for formatting the label
 * @returns {HTMLButtonElement}
 */
function popcornButton(icon, label, data = {}) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `inline-control combatant-control icon fa-solid ${icon} popcorn-control`;
  button.dataset.tooltip = '';
  button.ariaLabel = game.i18n.format(label, data);
  return button;
}
