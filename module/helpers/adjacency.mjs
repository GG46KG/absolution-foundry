/**
 * Are these two tokens on opposite sides? Enemies have the opposite
 * disposition: hostile (or secret) tokens for a friendly token, and friendly
 * tokens for a hostile one. Neutral tokens have no enemies.
 * @param {{disposition: number}} token
 * @param {{disposition: number}} other
 * @returns {boolean}
 */
export function isEnemy(token, other) {
  const side = Math.sign(token.disposition);
  return !!side && Math.sign(other.disposition) === -side;
}

/**
 * Is any enemy token next to this one, measured in pixels? Used on gridless
 * scenes, where there are no grid spaces to compare.
 *
 * Tokens are rectangles of grid squares; two are adjacent when they touch,
 * including diagonally.
 *
 * @param {{x: number, y: number, width: number, height: number, disposition: number}} token
 *   The attacker, with x and y in pixels and width and height in grid squares
 * @param {object[]} others   Other tokens on the scene, in the same form
 * @param {number} gridSize   Pixels per grid square
 * @returns {boolean}
 */
export function hasAdjacentEnemy(token, others, gridSize) {
  const box = (t) => ({
    left: Math.round(t.x / gridSize),
    top: Math.round(t.y / gridSize),
    right: Math.round(t.x / gridSize) + t.width,
    bottom: Math.round(t.y / gridSize) + t.height,
  });
  const a = box(token);
  return others.some((other) => {
    if (other === token || !isEnemy(token, other)) return false;
    const b = box(other);
    const gapX = Math.max(b.left - a.right, a.left - b.right);
    const gapY = Math.max(b.top - a.bottom, a.top - b.bottom);
    return gapX <= 0 && gapY <= 0;
  });
}

/**
 * Is any enemy token in a grid space next to (or shared with) one of this
 * token's spaces? Works on square and hex grids alike, using the grid's own
 * idea of adjacency. Elevation is ignored.
 * @param {{disposition: number, spaces: {i: number, j: number}[]}} token
 *   The attacker, with the grid spaces it occupies
 * @param {object[]} others   Other tokens on the scene, in the same form
 * @param {{testAdjacency: Function}} grid
 * @returns {boolean}
 */
export function hasAdjacentEnemyOnGrid(token, others, grid) {
  const touches = (a, b) => (a.i === b.i && a.j === b.j) || grid.testAdjacency(a, b);
  return others.some(
    (other) =>
      other !== token &&
      isEnemy(token, other) &&
      other.spaces.some((b) => token.spaces.some((a) => touches(a, b)))
  );
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
  const grid = canvas.grid;
  if (grid.isGridless) return hasAdjacentEnemy(token, others, grid.size);
  const withSpaces = (t) => ({
    disposition: t.disposition,
    spaces: t.getOccupiedGridSpaceOffsets().map(({ i, j }) => ({ i, j })),
  });
  return hasAdjacentEnemyOnGrid(withSpaces(token), others.map(withSpaces), grid);
}
