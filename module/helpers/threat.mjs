/**
 * Threat Rating (Codex of Arms, "Threat Rating"). Enemy statistics and
 * abilities are written as small expressions in tr, the enemy's Threat
 * Rating, such as [ 4 + 4tr ]:
 * - "4tr" is 4 times TR, and "tr" is TR.
 * - Fractions round down: "½tr" is half TR, rounded down.
 * - A "^" rounds up instead: "^½tr" is half TR, rounded up.
 */

const FRACTIONS = { '½': 0.5, '⅓': 1 / 3, '¼': 0.25, '⅔': 2 / 3, '¾': 0.75 };

/**
 * Work out a TR expression, such as "20 + 4tr" or "1 + ^½tr".
 * @param {string|number} expression
 * @param {number} tr   The Threat Rating
 * @returns {number|null}   The value, or null if it isn't a TR expression
 */
export function evaluateTr(expression, tr) {
  if (typeof expression === 'number') return expression;
  let text = String(expression ?? '').trim().toLowerCase();
  if (!text) return null;
  // Each "[^][coefficient]tr" term becomes a number, rounded down (or up)
  text = text.replace(/(\^)?\s*(\d+(?:\.\d+)?|[½⅓¼⅔¾])?\s*tr\b/g, (match, up, coefficient) => {
    const c = coefficient ? FRACTIONS[coefficient] ?? Number(coefficient) : 1;
    return String(up ? Math.ceil(c * tr) : Math.floor(c * tr));
  });
  // What's left must be plain arithmetic
  if (!/^[\d\s+\-*/().]+$/.test(text)) return null;
  try {
    const value = Function(`"use strict"; return (${text});`)();
    return Number.isFinite(value) ? Math.floor(value) : null;
  } catch {
    return null;
  }
}

/**
 * Replace each bracketed TR expression in a text, such as "[ 3 + 2tr ]
 * Physical", with its value: "7 Physical". Brackets that aren't TR
 * expressions are left alone.
 * @param {string} text
 * @param {number} tr
 * @returns {string}
 */
export function replaceTrExpressions(text, tr) {
  if (!text) return text ?? '';
  return text.replace(/\[([^\[\]]*tr[^\[\]]*)\]/gi, (match, inner) => {
    const value = evaluateTr(inner, tr);
    return value === null ? match : String(value);
  });
}
