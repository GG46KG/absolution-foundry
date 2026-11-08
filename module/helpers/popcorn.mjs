/**
 * Replace the combat tracker's initiative column with popcorn initiative
 * controls: a button to pass the turn to each combatant still waiting, and a
 * mark on those who have used all their activations this round. The GM can
 * click the mark to undo the last one. Combatants with more than one
 * activation show how many they've used, e.g. "1/2".
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
  const { targets } = combat.started ? combat.getHandOffTargets() : { targets: [] };
  const canHandOff = combat.canHandOff();

  for (const li of element.querySelectorAll('li.combatant[data-combatant-id]')) {
    const combatant = combat.combatants.get(li.dataset.combatantId);
    const cell = li.querySelector('.token-initiative');
    if (!combatant || !cell) continue;
    cell.replaceChildren();
    const activations = combat.activations(combatant);
    if (activations > 1) {
      const count = document.createElement('span');
      count.className = 'popcorn-activations';
      count.textContent = combat.started ? `${combat.activationsUsed(combatant)}/${activations}` : `\u00d7${activations}`;
      count.ariaLabel = game.i18n.format('ABSOLUTION.Combat.Activations', { count: activations });
      cell.append(count);
    }
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
          combat.undoActivation(combatant);
        });
      } else mark.disabled = true;
      cell.append(mark);
    } else if (canHandOff && targets.includes(combatant)) {
      const button = popcornButton('fa-hand-point-right', 'ABSOLUTION.Combat.HandOff');
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        combat.handOff(combatant);
      });
      cell.append(button);
    }
  }
}

/**
 * Combatant context menu: add or remove an activation each round and undo the
 * last activation (GM only), and no initiative rolling or clearing.
 *
 * @param {CombatTracker} app
 * @param {object[]} options   The menu entries, changed in place
 */
export function popcornContextOptions(app, options) {
  const removed = ['COMBATANT.ACTIONS.Reroll', 'COMBATANT.ACTIONS.Clear', 'COMBAT.InitiativeReroll'];
  for (let i = options.length - 1; i >= 0; i--) {
    if (removed.includes(options[i].label ?? options[i].name)) options.splice(i, 1);
  }
  const combat = () => app.viewed;
  const combatant = (li) => combat()?.combatants.get(li.dataset.combatantId);
  const isPopcorn = () => !!combat()?.activations;
  options.unshift(
    {
      label: 'ABSOLUTION.Combat.AddActivation',
      icon: 'fa-solid fa-plus',
      visible: (li) => game.user.isGM && isPopcorn() && !!combatant(li),
      onClick: (event, li) => combat().changeActivations(combatant(li), 1),
    },
    {
      label: 'ABSOLUTION.Combat.RemoveActivation',
      icon: 'fa-solid fa-minus',
      visible: (li) => game.user.isGM && isPopcorn() && combatant(li) && combat().activations(combatant(li)) > 1,
      onClick: (event, li) => combat().changeActivations(combatant(li), -1),
    },
    {
      label: 'ABSOLUTION.Combat.UndoActivation',
      icon: 'fa-solid fa-rotate-left',
      visible: (li) => game.user.isGM && isPopcorn() && combatant(li) && combat().activationsUsed(combatant(li)) > 0,
      onClick: (event, li) => combat().undoActivation(combatant(li)),
    }
  );
}

/**
 * Combat context menu: no Reset Initiative, since nobody has one.
 *
 * @param {CombatTracker} app
 * @param {object[]} options   The menu entries, changed in place
 */
export function popcornCombatContextOptions(app, options) {
  const index = options.findIndex((o) => (o.label ?? o.name) === 'COMBAT.InitiativeReset');
  if (index >= 0) options.splice(index, 1);
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
