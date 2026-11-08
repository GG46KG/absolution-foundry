/**
 * Is any enemy token next to this one? Used for Bulky weapons, which attack
 * with Disadvantage while an enemy is adjacent.
 *
 * Tokens are rectangles of grid squares; two are adjacent when they touch,
 * including diagonally. Enemies have the opposite disposition: hostile (or
 * secret) tokens for a friendly token, and friendly tokens for a hostile one.
 * Neutral tokens have no enemies.
 *
 * @param {{x: number, y: number, width: number, height: number, disposition: number}} token
 *   The attacker, with x and y in pixels and width and height in grid squares
 * @param {object[]} others   Other tokens on the scene, in the same form
 * @param {number} gridSize   Pixels per grid square
 * @returns {boolean}
 */
export function hasAdjacentEnemy(token, others, gridSize) {
  const side = Math.sign(token.disposition);
  if (!side) return false;
  const box = (t) => ({
    left: Math.round(t.x / gridSize),
    top: Math.round(t.y / gridSize),
    right: Math.round(t.x / gridSize) + t.width,
    bottom: Math.round(t.y / gridSize) + t.height,
  });
  const a = box(token);
  return others.some((other) => {
    if (other === token || Math.sign(other.disposition) !== -side) return false;
    const b = box(other);
    const gapX = Math.max(b.left - a.right, a.left - b.right);
    const gapY = Math.max(b.top - a.bottom, a.top - b.bottom);
    return gapX <= 0 && gapY <= 0;
  });
}

/**
 * Does this actor's token on the current scene have an enemy next to it?
 * Returns null when the actor has no token on the scene, so it can't tell.
 * @param {Actor} actor
 * @returns {boolean|null}
 */
export function actorHasAdjacentEnemy(actor) {
  const token = actor?.getActiveTokens(false, true)?.[0];
  if (!token || !canvas?.scene || canvas.scene.id !== token.parent?.id) return null;
  const others = canvas.scene.tokens.contents.filter((t) => t.id !== token.id && !t.hidden);
  return hasAdjacentEnemy(token, others, canvas.grid.size);
}
