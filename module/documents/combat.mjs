/**
 * Popcorn initiative. Nobody rolls: whoever is acting picks who goes next from
 * the combatants that haven't acted this round. Once everyone has acted, the
 * last to act picks who starts the next round, themselves included. The GM
 * picks who starts the first round.
 * @extends {Combat}
 */
export class AbsolutionCombat extends Combat {
  /**
   * Has this combatant taken its turn this round?
   * @param {Combatant} combatant
   * @returns {boolean}
   */
  hasActed(combatant) {
    return combatant.getFlag('absolution', 'actedRound') === this.round;
  }

  /**
   * The combatants the turn can be passed to, and whether passing it starts a
   * new round.
   * @returns {{targets: Combatant[], newRound: boolean}}
   */
  getHandOffTargets() {
    const current = this.combatant;
    const active = this.turns.filter((c) => !c.isDefeated);
    const waiting = active.filter((c) => c !== current && !this.hasActed(c));
    if (waiting.length || !current) return { targets: waiting, newRound: false };
    return { targets: active, newRound: true };
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
    const { targets, newRound } = this.getHandOffTargets();
    if (!this.canHandOff() || !targets.includes(combatant)) return this;

    const current = this.combatant;
    if (current && !newRound) {
      await current.setFlag('absolution', 'actedRound', this.round);
    }

    const round = newRound ? this.round + 1 : this.round;
    const turn = this.turns.indexOf(combatant);
    const updateData = { round, turn };
    const updateOptions = {
      direction: 1,
      worldTime: { delta: this.getTimeDelta(this.round, this.turn, round, turn) },
    };
    Hooks.callAll(newRound ? 'combatRound' : 'combatTurn', this, updateData, updateOptions);
    await this.update(updateData, updateOptions);
    return this;
  }

  /**
   * Ask the acting user who goes next.
   * @returns {Promise<Combatant|null>}   The chosen combatant, or null if the dialog was closed
   */
  async promptHandOff() {
    const { targets, newRound } = this.getHandOffTargets();
    if (!targets.length) return null;
    const options = targets
      .map((c) => `<option value="${c.id}">${foundry.utils.escapeHTML(c.name)}</option>`)
      .join('');
    const id = await foundry.applications.api.DialogV2.wait({
      window: { title: 'ABSOLUTION.Combat.ChooseTitle' },
      content: `<p>${game.i18n.format(
        newRound ? 'ABSOLUTION.Combat.ChooseFirst' : 'ABSOLUTION.Combat.ChooseNext',
        { round: this.round + 1 }
      )}</p><select name="combatant">${options}</select>`,
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
   * The tracker's "next turn" and "end turn" buttons ask who goes next.
   * @override
   */
  async nextTurn() {
    if (!this.started) return this.startCombat();
    if (!this.canHandOff()) return this;
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
