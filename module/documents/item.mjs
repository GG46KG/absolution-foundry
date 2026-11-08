import { promptCheck, rollCheck } from '../helpers/check.mjs';

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
    const rollMode = game.settings.get('core', 'rollMode');
    const label = `[${item.type}] ${item.name}`;

    // If there's no roll data, send a chat message.
    if (!this.system.formula) {
      ChatMessage.create({
        speaker: speaker,
        rollMode: rollMode,
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
        rollMode: rollMode,
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
    const { description, flavor } = this.system;
    const subtitle = this.#subtitle();
    const effect = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
      description ?? '',
      { rollData: this.getRollData(), relativeTo: this }
    );
    const escape = foundry.utils.escapeHTML;
    const content = `<div class="absolution-card">
      <h2>- ${escape(this.name)} -</h2>
      <div class="card-subtitle">${escape(subtitle)}</div>
      ${effect}
      ${flavor ? `<hr/><div class="card-quote">${escape(flavor)}</div>` : ''}
    </div>`;

    const cls = foundry.utils.getDocumentClass('ChatMessage');
    const msg = new cls({ speaker: ChatMessage.getSpeaker({ actor: this.actor }), content });
    msg.applyMode(game.settings.get('core', 'messageMode'));
    return cls.create(msg);
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
        const check = { actor: this.actor, label: this.name, dice };
        return quick ? rollCheck(check) : promptCheck(check);
      }
      await roll.evaluate();
      return roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: this.#cardHeading(),
      });
    } catch (err) {
      ui.notifications.warn(
        game.i18n.format('ABSOLUTION.Item.Feature.BadDice', { name: this.name, formula })
      );
      return null;
    }
  }

  /**
   * Roll this weapon's damage for a normal attack, noting the properties that
   * change how it lands. On a critical attack, Precise adds 1d6.
   * @param {object} [options]
   * @param {boolean} [options.critical]   Was the attack a Critical Success?
   * @returns {Promise<ChatMessage|null>}
   */
  async rollDamage({ critical = false } = {}) {
    let formula = this.system.damage?.formula;
    if (!formula) return null;
    const p = this.system.properties;
    const precise = critical && p.precise;
    if (precise) formula = `${formula} + 1d6`;
    const roll = new Roll(formula, this.actor?.getRollData() ?? {});
    await roll.evaluate();
    const notes = [
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
   * The name and action type at the top of this feature's chat cards.
   * @returns {string}
   */
  #cardHeading() {
    const subtitle = this.#subtitle();
    const escape = foundry.utils.escapeHTML;
    return `<div class="absolution-card">
      <h2>- ${escape(this.name)} -</h2>
      <div class="card-subtitle">${escape(subtitle)}</div>
    </div>`;
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
    return game.i18n.localize(config.actionTypes[actionType] ?? `TYPES.Item.${this.type}`);
  }
}
