/**
 * Popcorn initiative. Nobody rolls: whoever is acting picks who goes next from
 * the combatants that still have an activation left this round. Once everyone
 * has used theirs, ending the last turn starts a new round with nobody acting
 * and every activation available again. The GM picks who starts each round.
 *
 * Combatants get one activation per round; the GM can give one more (a boss
 * acting twice, say) or take it away, and undo an activation used by mistake.
 * @extends {Combat}
 */
export class AbsolutionCombat extends Combat {
  /**
   * How many times this combatant acts each round.
   * @param {Combatant} combatant
   * @returns {number}
   */
  activations(combatant) {
    return Math.max(1, combatant.getFlag('absolution', 'activations') ?? 1);
  }

  /**
   * How many activations this combatant has used this round. Turns marked
   * before activations were counted read as one.
   * @param {Combatant} combatant
   * @returns {number}
   */
  activationsUsed(combatant) {
    if (combatant.getFlag('absolution', 'actedRound') !== this.round) return 0;
    return combatant.getFlag('absolution', 'actedCount') ?? 1;
  }

  /**
   * Activations this combatant has left this round.
   * @param {Combatant} combatant
   * @returns {number}
   */
  activationsLeft(combatant) {
    return Math.max(0, this.activations(combatant) - this.activationsUsed(combatant));
  }

  /**
   * Has this combatant used all its activations this round?
   * @param {Combatant} combatant
   * @returns {boolean}
   */
  hasActed(combatant) {
    return this.activationsLeft(combatant) === 0;
  }

  /**
   * Give a combatant one more (or one fewer) activation each round. GM only.
   * @param {Combatant} combatant
   * @param {number} change   +1 or -1
   * @returns {Promise<Combatant|undefined>}
   */
  async changeActivations(combatant, change) {
    if (!game.user.isGM) return;
    const activations = Math.max(1, this.activations(combatant) + change);
    return combatant.setFlag('absolution', 'activations', activations);
  }

  /**
   * Take back the last activation this combatant used this round. GM only.
   * @param {Combatant} combatant
   * @returns {Promise<Combatant|undefined>}
   */
  async undoActivation(combatant) {
    if (!game.user.isGM) return;
    const used = this.activationsUsed(combatant);
    if (!used) return;
    if (used === 1) {
      return combatant.update({
        'flags.absolution.-=actedRound': null,
        'flags.absolution.-=actedCount': null,
      });
    }
    return combatant.setFlag('absolution', 'actedCount', used - 1);
  }

  /**
   * The combatants the turn can be passed to. The acting combatant can only
   * take another activation in a row when nobody else has one left. None
   * means the round is over.
   * @returns {{targets: Combatant[]}}
   */
  getHandOffTargets() {
    const current = this.combatant;
    const active = this.turns.filter((c) => !c.isDefeated);
    const waiting = active.filter((c) => c !== current && !this.hasActed(c));
    if (waiting.length || !current) return { targets: waiting };
    // The activation being finished counts as used
    if (this.activationsLeft(current) > 1) return { targets: [current] };
    return { targets: [] };
  }

  /**
   * Can this user pass the turn on? The GM always can, otherwise only the
   * owner of the acting combatant.
   * @param {User} [user]
   * @returns {boolean}
   */
  canHandOff(user = game.user) {
    if (!this.started) return false;
    if (user.isGM) return true;
    return !!this.combatant?.testUserPermission(user, 'OWNER');
  }

  /**
   * End the acting combatant's turn and give the turn to another combatant.
   * @param {Combatant} combatant   The combatant who acts next
   * @returns {Promise<this>}
   */
  async handOff(combatant) {
    const { targets } = this.getHandOffTargets();
    if (!this.canHandOff() || !targets.includes(combatant)) return this;

    const current = this.combatant;
    if (current) {
      await current.update({
        'flags.absolution.actedRound': this.round,
        'flags.absolution.actedCount': this.activationsUsed(current) + 1,
      });
    }

    const turn = this.turns.indexOf(combatant);
    const updateData = { round: this.round, turn };
    const updateOptions = {
      direction: 1,
      worldTime: { delta: this.getTimeDelta(this.round, this.turn, this.round, turn) },
    };
    Hooks.callAll('combatTurn', this, updateData, updateOptions);
    await this.update(updateData, updateOptions);
    return this;
  }

  /**
   * Ask the acting user who goes next.
   * @returns {Promise<Combatant|null>}   The chosen combatant, or null if the dialog was closed
   */
  async promptHandOff() {
    const { targets } = this.getHandOffTargets();
    if (!targets.length) return null;
    const options = targets
      .map((c) => `<option value="${c.id}">${foundry.utils.escapeHTML(c.name)}</option>`)
      .join('');
    const id = await foundry.applications.api.DialogV2.wait({
      window: { title: 'ABSOLUTION.Combat.ChooseTitle' },
      content: `<p>${game.i18n.localize('ABSOLUTION.Combat.ChooseNext')}</p><select name="combatant">${options}</select>`,
      buttons: [
        {
          action: 'choose',
          label: 'ABSOLUTION.Combat.Choose',
          icon: 'fa-solid fa-hand-point-right',
          default: true,
          callback: (event, button) => button.form.elements.combatant.value,
        },
      ],
      rejectClose: false,
    });
    return this.combatants.get(id) ?? null;
  }

  /* -------------------------------------------- */
  /*  Core turn controls                          */
  /* -------------------------------------------- */

  /**
   * The GM picks who starts, so the first round begins with nobody acting.
   * @override
   */
  async startCombat() {
    return this.#withNoActiveTurn('combatStart', () => super.startCombat());
  }

  /**
   * A new round started from the tracker controls also begins with nobody
   * acting, and the GM picks who starts it.
   * @override
   */
  async nextRound() {
    return this.#withNoActiveTurn('combatRound', () => super.nextRound());
  }

  /**
   * The tracker's "next turn" and "end turn" buttons ask who goes next, or
   * start the next round once nobody has an activation left.
   * @override
   */
  async nextTurn() {
    if (!this.started) return this.startCombat();
    if (!this.canHandOff()) return this;
    if (!this.getHandOffTargets().targets.length) return this.nextRound();
    const combatant = await this.promptHandOff();
    if (combatant) await this.handOff(combatant);
    return this;
  }

  /**
   * Keep a stable alphabetical order, since nobody has an initiative score.
   * @override
   */
  _sortCombatants(a, b) {
    return (a.name ?? '').localeCompare(b.name ?? '') || (a.id > b.id ? 1 : -1);
  }

  /**
   * Run a core turn method, clearing the turn it sets through the hook it
   * calls before updating.
   * @param {string} hook       The hook the core method calls with its update data
   * @param {Function} fn       The core method
   * @returns {Promise<this>}
   */
  async #withNoActiveTurn(hook, fn) {
    const id = Hooks.on(hook, (combat, updateData) => {
      if (combat === this) updateData.turn = null;
    });
    try {
      return await fn();
    } finally {
      Hooks.off(hook, id);
    }
  }
}
