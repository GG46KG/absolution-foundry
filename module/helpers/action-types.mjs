/**
 * Action types a feature can pick: NPCs' features can't be Camp or Downtime,
 * and characters' can't be the NPC-only types (Attack, Full Attack, Apex
 * Action). Unowned features can be any. The current type always stays in
 * the list, so changing owners never hides it.
 * @param {string|undefined} ownerType   The owning actor's type, if any
 * @param {string} [current]             The feature's action type
 * @returns {Object}                     {key: label} choices
 */
export function actionTypeChoices(ownerType, current) {
  const { actionTypes, actorOnlyActionTypes } = CONFIG.ABSOLUTION;
  const excluded = Object.entries(actorOnlyActionTypes)
    .filter(([type]) => ownerType && type !== ownerType)
    .flatMap(([, keys]) => keys);
  return Object.fromEntries(
    Object.entries(actionTypes).filter(([key]) => !excluded.includes(key) || key === current)
  );
}
