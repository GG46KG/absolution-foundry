import { promptCheck, rollCheck } from '../helpers/check.mjs';
import { createChatMessage } from '../helpers/chat.mjs';
import { replaceTrExpressions } from '../helpers/threat.mjs';

/**
 * Extend the basic Item with some very simple modifications.
 * @extends {Item}
 */
export class AbsolutionItem extends Item {
  /**
   * Augment the basic Item data model with additional dynamic data.
   */
  prepareData() {
    // As with the actor class, items are documents that can have their data
    // preparation methods overridden (such as prepareBaseData()).
    super.prepareData();
  }

  /**
   * Prepare a data object which defines the data schema used by dice roll commands against this Item
   * @override
   */
  getRollData() {
    // Starts off by populating the roll data with a shallow copy of `this.system`
    const rollData = { ...this.system };

    // Quit early if there's no parent actor
    if (!this.actor) return rollData;

    // If present, add the actor's roll data
    rollData.actor = this.actor.getRollData();

    return rollData;
  }

  /**
   * Handle clickable rolls.
   * @param {Event} event   The originating click event
   * @private
   */
  async roll(event) {
    const item = this;
    // Features and equipment roll if they have a roll, otherwise post their card
    if (this.isActionItem || this.system.isOrnament) {
      return this.system.dice ? this.rollFeature() : this.toChat();
    }

    // Initialize chat data.
    const speaker = ChatMessage.getSpeaker({ actor: this.actor });
    const label = `[${item.type}] ${item.name}`;

    // If there's no roll data, send a chat message.
    if (!this.system.formula) {
      createChatMessage({
        speaker: speaker,
        flavor: label,
        content: item.system.description ?? '',
      });
    }
    // Otherwise, create a roll and send a chat message from it.
    else {
      // Retrieve roll data.
      const rollData = this.getRollData();

      // Invoke the roll and submit it to chat.
      const roll = new Roll(rollData.formula, rollData.actor);
      // If you need to store the value first, uncomment the next line.
      // const result = await roll.evaluate();
      roll.toMessage({
        speaker: speaker,
        flavor: label,
      });
      return roll;
    }
  }

  /**
   * Is this a vow feature or trait?
   * @type {boolean}
   */
  get isFeature() {
    return ['feature', 'trait'].includes(this.type);
  }

  /**
   * Does this item have an action type, roll, flavor text and chat card? True
   * for vow features, traits and equipment.
   * @type {boolean}
   */
  get isActionItem() {
    return this.isFeature || this.type === 'equipment';
  }

  /**
   * Post a vow feature, trait or equipment to chat as a card: its name, action type,
   * effect and flavor text, in the same layout as Knockout rolls.
   * @returns {Promise<ChatMessage>}
   */
  async toChat() {
    const { flavor } = this.system;
    const subtitle = this.#subtitle();
    const effect = await this.enrichedDescription();
    const escape = foundry.utils.escapeHTML;
    const content = `<div class="absolution-card">
      <h2>- ${escape(this.name)} -</h2>
      <div class="card-subtitle">${escape(subtitle)}</div>
      ${effect}
      ${this.#damageLine()}
      ${flavor ? `<hr/><div class="card-quote">${escape(flavor)}</div>` : ''}
    </div>`;

    return createChatMessage({ speaker: ChatMessage.getSpeaker({ actor: this.actor }), content });
  }

  /**
   * This item's description as HTML for a chat card, with links and inline
   * rolls enriched. Empty when the description has no text.
   * @returns {Promise<string>}
   */
  async enrichedDescription() {
    const description = this.#withTr(this.system.description ?? '');
    if (!description.replace(/<[^>]*>/g, '').trim()) return '';
    return foundry.applications.ux.TextEditor.implementation.enrichHTML(description, {
      rollData: this.getRollData(),
      relativeTo: this,
    });
  }

  /**
   * Roll this feature's or equipment's Roll field. A formula without dice, such as "3" or
   * "@power + 1", is a number of dice for an Absolution check. A formula with
   * dice, such as "4d6" or "3d6 + @power", is rolled as written.
   * @param {object} [options]
   * @param {boolean} [options.quick]   For checks, roll without asking for Difficulty, Edge and the rest
   * @returns {Promise<ChatMessage|null>}
   */
  async rollFeature({ quick = false } = {}) {
    const formula = this.system.dice?.trim();
    if (!formula) return null;
    try {
      const roll = new Roll(formula, this.actor?.getRollData() ?? {});
      if (roll.isDeterministic) {
        const dice = Math.trunc(roll.evaluateSync().total);
        const description = await this.enrichedDescription();
        const check = {
          actor: this.actor,
          label: this.name,
          subtitle: this.#subtitle(),
          description,
          footer: this.#damageLine(),
          dice,
        };
        return quick ? rollCheck(check) : promptCheck(check);
      }
      await roll.evaluate();
      return roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: this.#cardHeading(await this.enrichedDescription()),
      });
    } catch (err) {
      ui.notifications.warn(
        game.i18n.format('ABSOLUTION.Item.Feature.BadDice', { name: this.name, formula })
      );
      return null;
    }
  }

  /**
   * Attack Attribute Damage: half (rounded down) of the owner's attribute used
   * to attack with this weapon. 0 for unowned weapons and ornaments.
   * @type {number}
   */
  get attributeDamage() {
    if (this.type !== 'weapon' || this.system.isOrnament) return 0;
    const value = this.actor?.system?.attributes?.[this.system.attackAttribute]?.value ?? 0;
    return Math.max(0, Math.floor(value / 2));
  }

  /**
   * Roll this weapon's damage for a normal attack, noting the properties that
   * change how it lands: weapon damage + Attack Attribute Damage, plus 1d6
   * from Precise on a critical attack. Defender halves the total (minimum 1).
   * @param {object} [options]
   * @param {boolean} [options.critical]   Was the attack a Critical Success?
   * @returns {Promise<ChatMessage|null>}
   */
  async rollDamage({ critical = false } = {}) {
    const damage = this.system.damage;
    if (!damage?.formula) return null;
    const p = this.system.effectiveProperties ?? this.system.properties;
    const attribute = game.i18n.localize(CONFIG.ABSOLUTION.attributes[this.system.attackAttribute] ?? '');
    const attributeDamage = this.attributeDamage;
    const precise = critical && p.precise;
    // Inside Defender's halving the attribute isn't tagged with its name
    const parts = [damage.formula];
    if (attributeDamage) parts.push(damage.halved ? String(attributeDamage) : `${attributeDamage}[${attribute}]`);
    if (precise) parts.push('1d6');
    let formula = parts.join(' + ');
    if (damage.halved) formula = `max(floor((${formula}) / 2), 1)`;
    const roll = new Roll(formula, this.actor?.getRollData() ?? {});
    await roll.evaluate();
    const notes = [
      attributeDamage && game.i18n.format('ABSOLUTION.Weapon.Notes.AttributeDamage', { attribute, damage: attributeDamage }),
      attributeDamage && this.system.weight === 'offHand' && 'ABSOLUTION.Weapon.Notes.OffHandFastAttack',
      critical && 'ABSOLUTION.Weapon.Notes.Critical',
      p.piercing && 'ABSOLUTION.Weapon.Notes.Piercing',
      precise ? 'ABSOLUTION.Weapon.Notes.PreciseApplied' : p.precise && 'ABSOLUTION.Weapon.Notes.Precise',
      p.defender && 'ABSOLUTION.Weapon.Notes.Defender',
      p.focus && 'ABSOLUTION.Weapon.Notes.Focus',
      this.system.broken && 'ABSOLUTION.Weapon.Notes.Broken',
    ]
      .filter(Boolean)
      .map((key) => `<p>${game.i18n.localize(key)}</p>`)
      .join('');
    const escape = foundry.utils.escapeHTML;
    const flavor = `<div class="absolution-card">
      <h2>- ${escape(this.name)} -</h2>
      <div class="card-subtitle">${game.i18n.localize('ABSOLUTION.Weapon.Damage')}</div>
      ${notes}
    </div>`;
    return roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor: this.actor }), flavor });
  }

  /**
   * The name and action type at the top of this feature's chat cards, and
   * its description if given.
   * @param {string} [description]   Enriched description HTML
   * @returns {string}
   */
  #cardHeading(description = '') {
    const subtitle = this.#subtitle();
    const escape = foundry.utils.escapeHTML;
    return `<div class="absolution-card">
      <h2>- ${escape(this.name)} -</h2>
      <div class="card-subtitle">${escape(subtitle)}</div>
      ${description ? `<div class="card-description">${description}</div>` : ''}
      ${this.#damageLine()}
    </div>`;
  }

  /**
   * For an NPC's items, replace bracketed Threat Rating expressions such as
   * "[ 3 + 2tr ]" with their value at the NPC's TR.
   * @param {string} text
   * @returns {string}
   */
  #withTr(text) {
    return this.actor?.type === 'npc' ? replaceTrExpressions(text, this.actor.system?.tr ?? 1) : text;
  }

  /**
   * An NPC attack's fixed damage, centred in italics at the bottom of its
   * chat cards. Empty for anything else.
   * @returns {string}
   */
  #damageLine() {
    const { actionType, damage } = this.system;
    if (!damage?.trim() || !CONFIG.ABSOLUTION.attackActionTypes.includes(actionType)) return '';
    const text = game.i18n.format('ABSOLUTION.Item.Feature.DamageLine', { damage: this.#withTr(damage.trim()) });
    return `<div class="card-damage">${foundry.utils.escapeHTML(text)}</div>`;
  }

  /**
   * The line under the name on this item's chat cards: the action type, or
   * for an ornament its material and kind ("Spinel · Discharge").
   * @returns {string}
   */
  #subtitle() {
    const config = CONFIG.ABSOLUTION;
    const { actionType, category, kind } = this.system;
    if (this.system.isOrnament) {
      const parts = [config.weaponCategories[category]];
      if (kind && kind !== 'standard') parts.push(config.ornamentKinds[kind]?.label);
      return parts.filter(Boolean).map((key) => game.i18n.localize(key)).join(' · ');
    }
    // NPCs have no vows, so their untyped features are just "Feature"
    const fallback = this.actor?.type === 'npc' ? 'ABSOLUTION.Item.Feature.NpcFeature' : `TYPES.Item.${this.type}`;
    return game.i18n.localize(config.actionTypes[actionType] ?? fallback);
  }
}
