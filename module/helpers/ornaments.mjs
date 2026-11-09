/**
 * Ornament rules (Equipment rules, "Ornaments"):
 * - An ornament goes in a slot of its own material. Prismatic slots also take
 *   Spinel, Turquoise and Jade; Pearl slots also take Gold.
 * - Up to one Clockwork ornament can go in a Prismatic slot of an Archaeotech
 *   weapon.
 * - A weapon can't hold two copies of the same ornament.
 * - A character can only have one Gold ornament active across all their slots.
 * - Innate ornaments are built into the weapon: they take no slot.
 */

/**
 * Place a weapon's attached ornaments into its slots, in list order. Each
 * ornament gets the slot it fills, or the problem stopping it.
 * @param {Item} weapon
 * @param {Item[]} ornaments   Ornaments attached to this weapon
 * @returns {{slots: {type: string, ornament: Item|null}[], placed: Map<Item, {slot: string|null, problem: string|null}>}}
 */
export function placeOrnaments(weapon, ornaments) {
  const slots = (weapon.system.slotList ?? []).map((type) => ({ type, ornament: null }));
  const placed = new Map();
  const names = new Set();
  let clockworkInPrismatic = false;

  const take = (type) => {
    const slot = slots.find((s) => s.type === type && !s.ornament);
    return slot ?? null;
  };

  for (const ornament of ornaments) {
    const material = ornament.system.category;
    if (names.has(ornament.name)) {
      placed.set(ornament, { slot: null, problem: 'duplicate' });
      continue;
    }
    // Innate ornaments are part of the weapon and need no slot
    if (material === 'innate') {
      names.add(ornament.name);
      placed.set(ornament, { slot: 'innate', problem: null });
      continue;
    }
    // Its own material first, then the shared slots
    let slot = take(material);
    if (!slot && ['spinel', 'turquoise', 'jade'].includes(material)) slot = take('prismatic');
    if (!slot && material === 'clockwork' && (weapon.system.effectiveProperties ?? weapon.system.properties)?.archaeotech && !clockworkInPrismatic) {
      slot = take('prismatic');
      if (slot) clockworkInPrismatic = true;
    }
    if (!slot && material !== 'clockwork') slot = take('pearl');

    if (slot) {
      slot.ornament = ornament;
      names.add(ornament.name);
      placed.set(ornament, { slot: slot.type, problem: null });
    } else placed.set(ornament, { slot: null, problem: 'noSlot' });
  }
  return { slots, placed };
}

/**
 * A material that fits the weapon's first free slot, for a new ornament.
 * Shared slots (Prismatic, Pearl) suggest Spinel, as does a weapon with no
 * free slot.
 * @param {Item} weapon
 * @param {Item[]} ornaments   Ornaments already attached to the weapon
 * @returns {string}
 */
export function materialForFreeSlot(weapon, ornaments) {
  const free = placeOrnaments(weapon, ornaments).slots.find((s) => !s.ornament);
  if (!free || ['prismatic', 'pearl'].includes(free.type)) return 'spinel';
  return free.type;
}

/**
 * A Discharge ornament's maximum Charges, after the catalysts slotted beside
 * it: Multifaceted raises the base by half (rounded down), Shaping adds 1.
 * @param {Item} ornament
 * @param {Item[]} siblings   Other ornaments slotted in the same item
 * @returns {number}
 */
export function maxCharges(ornament, siblings) {
  const base = ornament.system.charges?.max ?? 0;
  const catalysts = new Set(siblings.map((o) => o.system.catalyst));
  return base + (catalysts.has('multifaceted') ? Math.floor(base / 2) : 0) + (catalysts.has('shaping') ? 1 : 0);
}

/**
 * Order the Weapons and Ornaments and Armor lists: each weapon or set of
 * armor followed by the ornaments attached to it (marked subEntry, with the
 * slot each fills and their effective maximum Charges), then ornaments not
 * attached to anything. Flags a second active Gold ornament across all of a
 * character's slots, and counts Attuned weapons.
 * @param {{item: Item}[]} entries         Weapon item rows (weapons and ornaments), already sorted
 * @param {{item: Item}[]} [armorEntries]  Armor item rows, already sorted
 * @returns {{rows: object[], armorRows: object[], attuned: number}}
 */
export function nestOrnaments(entries, armorEntries = []) {
  const weapons = entries.filter((e) => !e.item.system.isOrnament);
  const ornaments = entries.filter((e) => e.item.system.isOrnament);
  const hostIds = new Set([...weapons, ...armorEntries].map((e) => e.item.id));
  let goldActive = 0;

  const nest = (host) => {
    const attached = ornaments.filter((o) => o.item.system.attachedTo === host.item.id);
    const { slots, placed } = placeOrnaments(host.item, attached.map((o) => o.item));
    const slotted = attached.filter((o) => placed.get(o.item).slot).map((o) => o.item);
    const children = attached.map((o) => {
      const { slot, problem } = placed.get(o.item);
      let issue = problem;
      if (!issue && o.item.system.category === 'gold' && ++goldActive > 1) issue = 'goldLimit';
      const siblings = slotted.filter((i) => i !== o.item);
      return { ...o, subEntry: true, slot, problem: issue, chargesMax: maxCharges(o.item, siblings) };
    });
    const used = slots.filter((sl) => sl.ornament).length;
    return [{ ...host, slots, slotsUsed: used, slotsTotal: slots.length }, ...children];
  };

  const rows = weapons.flatMap(nest);
  const armorRows = armorEntries.flatMap(nest);
  const loose = ornaments
    .filter((o) => !hostIds.has(o.item.system.attachedTo))
    .map((o) => ({ ...o, slot: null, problem: null, chargesMax: maxCharges(o.item, []) }));

  return {
    rows: [...rows, ...loose],
    armorRows,
    attuned: weapons.filter((w) => w.item.system.attuned).length,
  };
}
