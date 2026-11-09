import { promptCheck, rollCheck } from '../helpers/check.mjs';
import { rollKnockout, npcWound } from '../helpers/knockout.mjs';
import { materialForFreeSlot, nestOrnaments } from '../helpers/ornaments.mjs';
import { actorHasAdjacentEnemy } from '../helpers/adjacency.mjs';

const { api, sheets } = foundry.applications;

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheetV2}
 */
export class AbsolutionActorSheet extends api.HandlebarsApplicationMixin(
  sheets.ActorSheetV2
) {
  constructor(options = {}) {
    super(options);
    this.#dragDrop = this.#createDragDropHandlers();
  }

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ['absolution', 'actor'],
    position: {
      width: 860,
      height: 760,
    },
    actions: {
      onEditImage: this._onEditImage,
      viewDoc: this._viewDoc,
      createDoc: this._createDoc,
      deleteDoc: this._deleteDoc,
      toggleEffect: this._toggleEffect,
      roll: this._onRoll,
      knockout: this._onKnockout,
      chatItem: this._onChatItem,
      toggleRearrange: this._onToggleRearrange,
      rollItem: this._onRollItem,
      weaponAttack: this._onWeaponAttack,
      weaponDamage: this._onWeaponDamage,
      addOrnament: this._onAddOrnament,
      addConnection: this._addConnection,
      addDamageReduction: this._addDamageReduction,
      deleteDamageReduction: this._deleteDamageReduction,
      deleteConnection: this._deleteConnection,
    },
    // Custom property that's merged into `this.options`
    dragDrop: [{ dragSelector: '[data-drag]', dropSelector: null }],
    form: {
      submitOnChange: true,
    },
  };

  /** @override */
  static PARTS = {
    header: {
      template: 'systems/absolution/templates/actor/header.hbs',
    },
    tabs: {
      // Foundry-provided generic template
      template: 'templates/generic/tab-navigation.hbs',
    },
    stats: {
      template: 'systems/absolution/templates/actor/stats.hbs',
      templates: ['systems/absolution/templates/actor/parts/damage-reduction.hbs'],
    },
    // The NPC stat block, in place of the Character tab
    npcStats: {
      template: 'systems/absolution/templates/actor/npc-stats.hbs',
      templates: ['systems/absolution/templates/actor/parts/damage-reduction.hbs'],
    },
    skills: {
      template: 'systems/absolution/templates/actor/skills.hbs',
    },
    features: {
      template: 'systems/absolution/templates/actor/features.hbs',
      templates: ['systems/absolution/templates/actor/parts/action-list.hbs'],
    },
    inventory: {
      template: 'systems/absolution/templates/actor/inventory.hbs',
      templates: [
        'systems/absolution/templates/actor/parts/action-list.hbs',
        'systems/absolution/templates/actor/parts/weapon-list.hbs',
        'systems/absolution/templates/actor/parts/armor-list.hbs',
        'systems/absolution/templates/actor/parts/ornament-row.hbs',
        'systems/absolution/templates/actor/parts/item-list.hbs',
      ],
    },
    biography: {
      template: 'systems/absolution/templates/actor/biography.hbs',
    },
  };

  /** @override */
  _configureRenderOptions(options) {
    super._configureRenderOptions(options);
    // Not all parts always render
    options.parts = ['header', 'tabs'];
    // Don't show the other tabs if only limited view
    if (this.document.limited) {
      options.parts.push('biography');
      return;
    }
    // Control which parts show based on document subtype
    switch (this.document.type) {
      case 'character':
        options.parts.push('stats', 'skills', 'features', 'inventory', 'biography');
        break;
      case 'npc':
        // NPCs have features (no source) and no inventory
        options.parts.push('npcStats', 'features', 'biography');
        break;
    }
  }

  /* -------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    // Output initialization
    const context = {
      // Validates both permissions and compendium status
      editable: this.isEditable,
      owner: this.document.isOwner,
      limited: this.document.limited,
      // Add the actor document.
      actor: this.actor,
      // Add the actor's data to context.data for easier access, as well as flags.
      system: this.actor.system,
      flags: this.actor.flags,
      // Adding a pointer to CONFIG.ABSOLUTION
      config: CONFIG.ABSOLUTION,
      tabs: this._getTabs(options.parts),
      // Necessary for formInput and formFields helpers
      fields: this.document.schema.fields,
      systemFields: this.document.system.schema.fields,
      isCharacter: this.document.type === 'character',
      // Which lists have their Rearrange toggle on
      rearranging: {
        features: this.#rearranging.has('features'),
        equipment: this.#rearranging.has('equipment'),
        weapons: this.#rearranging.has('weapons'),
        armor: this.#rearranging.has('armor'),
      },
    };

    // Dropdown choices, as {value: label}
    context.choices = {
      lineages: CONFIG.ABSOLUTION.lineages,
      vows: Object.fromEntries(
        Object.entries(CONFIG.ABSOLUTION.vows).map(([k, v]) => [k, v.label])
      ),
      statuses: CONFIG.ABSOLUTION.statuses,
      actionTypes: CONFIG.ABSOLUTION.actionTypes,
      weaponCategories: CONFIG.ABSOLUTION.weaponCategories,
    };
    // Suggestions for the Damage Reduction table's Type column
    context.damageTypes = Object.values(CONFIG.ABSOLUTION.damageTypes).map((key) => game.i18n.localize(key));
    if (this.actor.type === 'npc') {
      const config = CONFIG.ABSOLUTION;
      const system = this.actor.system;
      context.choices.npcThreats = Object.fromEntries(
        Object.entries(config.npcThreats).map(([k, v]) => [k, v.label])
      );
      context.creatureTypes = config.creatureTypes.map((key) => game.i18n.localize(key));
      // The stat block: each statistic's TR expression and its value
      const labels = {
        ...config.attributes,
        stamina: 'ABSOLUTION.Actor.StaminaMax',
        armor: 'ABSOLUTION.Actor.base.FIELDS.armor.label',
        resistance: 'ABSOLUTION.Actor.Resistance',
        speed: 'ABSOLUTION.Actor.base.FIELDS.speed.label',
      };
      context.statRows = Object.keys(system.statBlock).map((key) => ({
        key,
        label: labels[key],
        expression: system.statBlock[key],
        value: system.statValues[key],
        error: system.statErrors[key],
        roll: key in config.attributes,
      }));
    }
    if (context.isCharacter) {
      // Uses the derived labels, so Leszhoth see Psychokinesis
      context.choices.skills = Object.fromEntries(
        Object.entries(this.actor.system.skills).map(([k, v]) => [k, v.label])
      );
    }

    // Offloading context prep to a helper function
    this._prepareItems(context);

    return context;
  }

  /** @override */
  async _preparePartContext(partId, context) {
    switch (partId) {
      case 'stats':
      case 'npcStats':
      case 'skills':
      case 'features':
      case 'inventory':
        context.tab = context.tabs[partId];
        break;
      case 'biography':
        context.tab = context.tabs[partId];
        // Enrich biography info for display
        // Enrichment turns text like `[[/r 1d20]]` into buttons
        context.enrichedBiography = await TextEditor.enrichHTML(
          this.actor.system.biography,
          {
            // Whether to show secret blocks in the finished html
            secrets: this.document.isOwner,
            // Data to fill in for inline rolls
            rollData: this.actor.getRollData(),
            // Relative UUID resolution
            relativeTo: this.actor,
          }
        );
        break;
    }
    return context;
  }

  /**
   * Generates the data for the generic tab navigation template
   * @param {string[]} parts An array of named template parts to render
   * @returns {Record<string, Partial<ApplicationTab>>}
   * @protected
   */
  _getTabs(parts) {
    // If you have sub-tabs this is necessary to change
    const tabGroup = 'primary';
    // Default tab for first time it's rendered this session
    if (!this.tabGroups[tabGroup])
      this.tabGroups[tabGroup] = parts.includes('stats') || parts.includes('npcStats') ? 'stats' : 'biography';
    return parts.reduce((tabs, partId) => {
      const tab = {
        cssClass: '',
        group: tabGroup,
        // Matches tab property to
        id: '',
        // FontAwesome Icon, if you so choose
        icon: '',
        // Run through localization
        label: 'ABSOLUTION.Actor.Tabs.',
      };
      switch (partId) {
        case 'header':
        case 'tabs':
          return tabs;
        case 'stats':
          tab.id = 'stats';
          tab.label += 'Character';
          break;
        case 'npcStats':
          tab.id = 'stats';
          tab.label += 'StatBlock';
          break;
        case 'skills':
          tab.id = 'skills';
          tab.label += 'Skills';
          break;
        case 'features':
          tab.id = 'features';
          tab.label += 'Features';
          break;
        case 'inventory':
          tab.id = 'inventory';
          tab.label += 'Inventory';
          break;
        case 'biography':
          tab.id = 'biography';
          tab.label += 'Backstory';
          break;
      }
      if (this.tabGroups[tabGroup] === tab.id) tab.cssClass = 'active';
      tabs[partId] = tab;
      return tabs;
    }, {});
  }

  /**
   * Organize and classify Items for Actor sheets.
   *
   * @param {object} context The context object to mutate
   */
  _prepareItems(context) {
    // Plain-text descriptions for the list rows, which show them as a summary
    const summary = document.createElement('div');
    const byType = this.document.itemTypes;
    for (const type of ['feature', 'trait', 'equipment', 'weapon', 'armor', 'belonging']) {
      context[type] = (byType[type] ?? [])
        .sort((a, b) => (a.sort || 0) - (b.sort || 0))
        .map((item) => {
          summary.innerHTML = item.system.description ?? '';
          return {
            item,
            summary: summary.textContent.trim(),
            // Features show their source and action type as text
            sourceLabel: item.system.source
              ? game.i18n.localize(CONFIG.ABSOLUTION.featureSources[item.system.source] ?? '')
              : '',
            actionLabel: item.system.actionType
              ? game.i18n.localize(CONFIG.ABSOLUTION.actionTypes[item.system.actionType] ?? '')
              : '',
          };
        });
    }
    // Vow features and traits share one list on the Features tab
    context.features = [...context.feature, ...context.trait].sort(
      (a, b) => (a.item.sort || 0) - (b.item.sort || 0)
    );

    // Ornaments list under the weapon they're attached to
    const config = CONFIG.ABSOLUTION;
    const localize = (key) => (key ? game.i18n.localize(key) : '');
    const { rows, armorRows, attuned } = nestOrnaments(context.weapon, context.armor);
    // A weapon's damage with Attack Attribute Damage, e.g. "1d8+1 +2", or for
    // Defender weapons, whose total is halved, "½ (1d6 +2)"
    const damageLabel = (item) => {
      const damage = item.system.damage;
      if (item.type !== 'weapon' || !damage) return '';
      const total = item.attributeDamage ? `${damage.formula} +${item.attributeDamage}` : damage.formula;
      return damage.halved ? `½ (${total})` : total;
    };
    // Labels shared by weapon, armor and ornament rows
    const label = (row) => {
      const s = row.item.system;
      const kind = config.ornamentKinds[s.kind];
      return {
        ...row,
        weightLabel: localize(
          row.item.type === 'armor'
            ? config.armorWeights[s.weight]?.label
            : s.weightOverride
              ? 'ABSOLUTION.WeaponWeight.Override'
              : config.weaponWeights[s.weight]?.label
        ),
        categoryLabel: localize(config.weaponCategories[s.category]),
        damageLabel: damageLabel(row.item),
        slotLabel: localize(row.slot === 'innate' ? config.weaponCategories.innate : config.slotTypes[row.slot]?.label),
        problemLabel: row.problem ? localize(`ABSOLUTION.Ornament.Problem.${row.problem}`) : '',
        slotIcons: (row.slots ?? []).map((sl) => ({
          type: sl.type,
          // Clockwork slots are gears; the rest are gems
          icon: sl.type === 'clockwork' ? 'fa-gear' : 'fa-gem',
          filled: !!sl.ornament,
          title: `${localize(config.slotTypes[sl.type].label)}${sl.ornament ? `: ${sl.ornament.name}` : ''}`,
        })),
        // Ornaments: what kind, and whether it tracks charges or a spent state
        kindLabel: s.kind && s.kind !== 'standard' ? localize(kind?.label) : '',
        tracksCharges: kind?.tracks === 'charges',
        tracksSpent: kind?.tracks === 'spent',
        spentLabel: localize(kind?.spentLabel),
        rarityLabel: localize(config.ornamentRarities[s.rarity]),
        // Armor: the modifications that count, e.g. "Banded, Banded, Engraved"
        modificationLabel: [
          ...(s.modificationList ?? []).map((m) => localize(config.armorModifications[m.modification])),
          s.mediumMastery ? localize('ABSOLUTION.Armor.MediumMastery') : '',
        ]
          .filter(Boolean)
          .join(', '),
      };
    };
    context.weapon = rows.map(label);
    context.armor = armorRows.map(label);
    context.attunement = {
      count: attuned,
      limit: config.attunementLimit,
      over: attuned > config.attunementLimit,
    };
  }

  /**
   * Actions performed after any render of the Application.
   * Post-render steps are not awaited by the render process.
   * @param {ApplicationRenderContext} context      Prepared context data
   * @param {RenderOptions} options                 Provided render options
   * @protected
   * @override
   */
  _onRender(context, options) {
    this.#dragDrop.forEach((d) => d.bind(this.element));
    this.#disableOverrides();
    // Item fields edited from the list rows update the item, not the actor
    for (const input of this.element.querySelectorAll('[data-item-field]')) {
      input.addEventListener('change', this.#onItemFieldChange.bind(this));
    }
    // Header indicators that mirror a field shown elsewhere on the sheet
    for (const input of this.element.querySelectorAll('[data-field]')) {
      input.addEventListener('change', this.#onFieldChange.bind(this));
    }
    // You may want to add other special handling here
    // Foundry comes with a large number of utility classes, e.g. SearchFilter
    // That you may want to implement yourself.
  }

  /**************
   *
   *   ACTIONS
   *
   **************/

  /**
   * Handle changing a Document's image.
   *
   * @this AbsolutionActorSheet
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @returns {Promise}
   * @protected
   */
  static async _onEditImage(event, target) {
    const attr = target.dataset.edit;
    const current = foundry.utils.getProperty(this.document, attr);
    const { img } =
      this.document.constructor.getDefaultArtwork?.(this.document.toObject()) ??
      {};
    const fp = new FilePicker({
      current,
      type: 'image',
      redirectToRoot: img ? [img] : [],
      callback: (path) => {
        this.document.update({ [attr]: path });
      },
      top: this.position.top + 40,
      left: this.position.left + 10,
    });
    return fp.browse();
  }

  /**
   * Renders an embedded document's sheet
   *
   * @this AbsolutionActorSheet
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @protected
   */
  static async _viewDoc(event, target) {
    const doc = this._getEmbeddedDocument(target);
    doc.sheet.render(true);
  }

  /**
   * Handles item deletion
   *
   * @this AbsolutionActorSheet
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @protected
   */
  static async _deleteDoc(event, target) {
    const doc = this._getEmbeddedDocument(target);
    await doc.delete();
  }

  /**
   * Handle creating a new Owned Item or ActiveEffect for the actor using initial data defined in the HTML dataset
   *
   * @this AbsolutionActorSheet
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @private
   */
  static async _createDoc(event, target) {
    // Retrieve the configured document class for Item or ActiveEffect
    const docCls = getDocumentClass(target.dataset.documentClass);
    // Prepare the document creation data by initializing it a default name.
    const docData = {
      name: docCls.defaultName({
        // defaultName handles an undefined type gracefully
        type: target.dataset.type,
        parent: this.actor,
      }),
    };
    // Loop through the dataset and add it to our docData
    for (const [dataKey, value] of Object.entries(target.dataset)) {
      // These data attributes are reserved for the action handling
      if (['action', 'documentClass'].includes(dataKey)) continue;
      // Nested properties require dot notation in the HTML, e.g. anything with `system`
      // An example exists in spells.hbs, with `data-system.spell-level`
      // which turns into the dataKey 'system.spellLevel'
      foundry.utils.setProperty(docData, dataKey, value);
    }

    // Finally, create the embedded document!
    await docCls.create(docData, { parent: this.actor });
  }

  /**
   * Determines effect parent to pass to helper
   *
   * @this AbsolutionActorSheet
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @private
   */
  static async _toggleEffect(event, target) {
    const effect = this._getEmbeddedDocument(target);
    await effect.update({ disabled: !effect.disabled });
  }

  /**
   * Handle clickable rolls.
   *
   * @this AbsolutionActorSheet
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @protected
   */
  static async _onRoll(event, target) {
    event.preventDefault();
    const dataset = target.dataset;

    // Handle item rolls and checks.
    const system = this.actor.system;
    switch (dataset.rollType) {
      case 'item': {
        const item = this._getEmbeddedDocument(target);
        if (item) return item.roll();
        return;
      }
      case 'attribute':
      case 'skill': {
        const stat =
          dataset.rollType === 'attribute'
            ? system.attributes[dataset.key]
            : system.skills[dataset.key];
        if (!stat) return;
        // Checks roll at least one die before Edge
        const check = {
          actor: this.actor,
          label: stat.label,
          subtitle: game.i18n.localize(
            dataset.rollType === 'attribute' ? 'ABSOLUTION.Check.AttributeCheck' : 'ABSOLUTION.Check.SkillCheck'
          ),
          dice: Math.max(1, dataset.rollType === 'attribute' ? stat.value : stat.aptitude),
        };
        // Shift-click rolls with no modifiers
        return event.shiftKey ? rollCheck(check) : promptCheck(check);
      }
    }

    // Handle rolls that supply the formula directly.
    if (dataset.roll) {
      let label = dataset.label ? `[ability] ${dataset.label}` : '';
      let roll = new Roll(dataset.roll, this.actor.getRollData());
      await roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: label,
      });
      return roll;
    }
  }

  /**
   * Post a feature's card to chat, without rolling.
   *
   * @this AbsolutionActorSheet
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @protected
   */
  static async _onChatItem(event, target) {
    return this._getEmbeddedDocument(target)?.toChat();
  }

  /**
   * Attack with a weapon: a check with the weapon's attack attribute (Power,
   * or Faith if Consecrated) and its Edge filled in. A Bulky weapon starts on
   * Disadvantage when an enemy token is next to the attacker's. The chat
   * message gets a Roll Damage button. Shift-click rolls without asking.
   *
   * @this AbsolutionActorSheet
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @protected
   */
  static async _onWeaponAttack(event, target) {
    const weapon = this._getEmbeddedDocument(target);
    if (!weapon) return;
    const { attackAttribute, attackEdge, effectiveAutoHits: autoHits } = weapon.system;
    const check = {
      actor: this.actor,
      label: weapon.name,
      subtitle: game.i18n.localize('ABSOLUTION.Check.Attack'),
      description: await weapon.enrichedDescription(),
      dice: Math.max(1, this.actor.system.attributes[attackAttribute]?.value ?? 1),
      edge: attackEdge,
      autoHits,
      weapon,
      notes: [],
    };
    if (weapon.system.effectiveProperties.bulky) {
      const adjacent = actorHasAdjacentEnemy(this.actor);
      if (adjacent) {
        check.mode = 'disadvantage';
        check.notes.push(game.i18n.localize('ABSOLUTION.Weapon.Notes.BulkyAdjacent'));
      } else if (adjacent === null) {
        check.notes.push(game.i18n.localize('ABSOLUTION.Weapon.Notes.BulkyUnknown'));
      }
    }
    return event.shiftKey ? rollCheck(check) : promptCheck(check);
  }

  /**
   * Add an ornament attached to a weapon, in a material that fits its first
   * free slot, and open its sheet to name it.
   *
   * @this AbsolutionActorSheet
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @protected
   */
  static async _onAddOrnament(event, target) {
    const weapon = this._getEmbeddedDocument(target);
    if (!weapon) return;
    const attached = this.actor.itemTypes.weapon.filter(
      (i) => i.system.isOrnament && i.system.attachedTo === weapon.id
    );
    const [ornament] = await this.actor.createEmbeddedDocuments('Item', [
      {
        name: game.i18n.localize('ABSOLUTION.Weapon.NewOrnament'),
        type: 'weapon',
        system: { category: materialForFreeSlot(weapon, attached), attachedTo: weapon.id },
      },
    ]);
    ornament?.sheet.render(true);
  }

  /**
   * Roll a weapon's damage for a normal attack.
   *
   * @this AbsolutionActorSheet
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @protected
   */
  static async _onWeaponDamage(event, target) {
    return this._getEmbeddedDocument(target)?.rollDamage();
  }

  /**
   * Turn dragging to reorder a list (Features or Equipment) on or off.
   *
   * @this AbsolutionActorSheet
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @protected
   */
  static async _onToggleRearrange(event, target) {
    const list = target.dataset.list;
    if (this.#rearranging.has(list)) this.#rearranging.delete(list);
    else this.#rearranging.add(list);
    return this.render();
  }

  /**
   * Roll a feature's check. Shift-click rolls with no modifiers.
   *
   * @this AbsolutionActorSheet
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @protected
   */
  static async _onRollItem(event, target) {
    return this._getEmbeddedDocument(target)?.rollFeature({ quick: event.shiftKey });
  }

  /**
   * Make a Knockout roll from the Wounds shown in the header. Reads the inputs
   * rather than the actor, so a value typed but not yet saved still counts.
   *
   * @this AbsolutionActorSheet
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @protected
   */
  static async _onKnockout(event, target) {
    event.preventDefault();
    // Chaff and Mortal Threats don't make Knockout Rolls
    if (this.actor.type === 'npc' && this.actor.system.threat !== 'threat') return npcWound(this.actor);
    const shown = (field) => {
      const input = this.element.querySelector(`[data-field="${field}"]`);
      const value = input ? input.valueAsNumber : foundry.utils.getProperty(this.actor, field);
      return Math.max(0, value || 0);
    };
    return rollKnockout({
      actor: this.actor,
      wounds: shown('system.wounds.normal'),
      grievous: shown('system.wounds.grievous'),
    });
  }

  /**
   * Add an empty row to the Connections table.
   *
   * @this AbsolutionActorSheet
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @protected
   */
  static async _addConnection(event, target) {
    const connections = foundry.utils.deepClone(
      this.actor.system._source.connections
    );
    connections.push({});
    await this.actor.update({ 'system.connections': connections });
  }

  /**
   * Add an empty row to the Damage Reduction table.
   *
   * @this AbsolutionActorSheet
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @protected
   */
  static async _addDamageReduction(event, target) {
    const rows = foundry.utils.deepClone(this.actor.system._source.damageReductions);
    rows.push({});
    await this.actor.update({ 'system.damageReductions': rows });
  }

  /**
   * Remove a row from the Damage Reduction table.
   *
   * @this AbsolutionActorSheet
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @protected
   */
  static async _deleteDamageReduction(event, target) {
    const rows = foundry.utils.deepClone(this.actor.system._source.damageReductions);
    rows.splice(Number(target.dataset.index), 1);
    await this.actor.update({ 'system.damageReductions': rows });
  }

  /**
   * Remove a row from the Connections table.
   *
   * @this AbsolutionActorSheet
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @protected
   */
  static async _deleteConnection(event, target) {
    const connections = foundry.utils.deepClone(
      this.actor.system._source.connections
    );
    connections.splice(Number(target.dataset.index), 1);
    await this.actor.update({ 'system.connections': connections });
  }

  /**
   * Save a field edited directly in an item's list row.
   *
   * @param {Event} event   The originating change event
   */
  async #onItemFieldChange(event) {
    // Keep the change out of the actor's own form submission
    event.stopPropagation();
    const input = event.currentTarget;
    const item = this._getEmbeddedDocument(input);
    let value = input.value;
    if (input.type === 'number') value = input.valueAsNumber || 0;
    else if (input.type === 'checkbox') value = input.checked;
    await item?.update({ [input.dataset.itemField]: value });
  }

  /**
   * Save a header indicator. A form can't hold two inputs with the same name,
   * so indicators name their field in data-field and update the actor directly;
   * the re-render then refreshes the matching input on the Character tab.
   *
   * @param {Event} event   The originating change event
   */
  async #onFieldChange(event) {
    // Keep the change out of the actor's own form submission
    event.stopPropagation();
    const input = event.currentTarget;
    const value =
      input.type === 'number' ? input.valueAsNumber || 0 : input.value;
    await this.actor.update({ [input.dataset.field]: value });
  }

  /** Helper Functions */

  /**
   * Fetches the embedded document representing the containing HTML element
   *
   * @param {HTMLElement} target    The element subject to search
   * @returns {Item | ActiveEffect} The embedded Item or ActiveEffect
   */
  _getEmbeddedDocument(target) {
    const docRow = target.closest('li[data-document-class]');
    if (docRow.dataset.documentClass === 'Item') {
      return this.actor.items.get(docRow.dataset.itemId);
    } else if (docRow.dataset.documentClass === 'ActiveEffect') {
      const parent =
        docRow.dataset.parentId === this.actor.id
          ? this.actor
          : this.actor.items.get(docRow?.dataset.parentId);
      return parent.effects.get(docRow?.dataset.effectId);
    } else return console.warn('Could not find document class');
  }

  /***************
   *
   * Drag and Drop
   *
   ***************/

  /**
   * Define whether a user is able to begin a dragstart workflow for a given drag selector
   * @param {string} selector       The candidate HTML selector for dragging
   * @returns {boolean}             Can the current user drag this selector?
   * @protected
   */
  _canDragStart(selector) {
    // game.user fetches the current user
    return this.isEditable;
  }

  /**
   * Define whether a user is able to conclude a drag-and-drop workflow for a given drop selector
   * @param {string} selector       The candidate HTML selector for the drop target
   * @returns {boolean}             Can the current user drop on this selector?
   * @protected
   */
  _canDragDrop(selector) {
    // game.user fetches the current user
    return this.isEditable;
  }

  /**
   * Callback actions which occur at the beginning of a drag start workflow.
   * @param {DragEvent} event       The originating DragEvent
   * @protected
   */
  _onDragStart(event) {
    const docRow = event.currentTarget.closest('li');
    if ('link' in event.target.dataset) return;

    // Chained operation
    let dragData = this._getEmbeddedDocument(docRow)?.toDragData();

    if (!dragData) return;

    // Set data transfer
    event.dataTransfer.setData('text/plain', JSON.stringify(dragData));
  }

  /**
   * Callback actions which occur when a dragged element is over a drop target.
   * @param {DragEvent} event       The originating DragEvent
   * @protected
   */
  _onDragOver(event) {}

  /**
   * Callback actions which occur when a dragged element is dropped on a target.
   * @param {DragEvent} event       The originating DragEvent
   * @protected
   */
  async _onDrop(event) {
    const data = TextEditor.getDragEventData(event);
    const actor = this.actor;
    const allowed = Hooks.call('dropActorSheetData', actor, this, data);
    if (allowed === false) return;

    // Handle different data types
    switch (data.type) {
      case 'ActiveEffect':
        return this._onDropActiveEffect(event, data);
      case 'Actor':
        return this._onDropActor(event, data);
      case 'Item':
        return this._onDropItem(event, data);
      case 'Folder':
        return this._onDropFolder(event, data);
    }
  }

  /**
   * Handle the dropping of ActiveEffect data onto an Actor Sheet
   * @param {DragEvent} event                  The concluding DragEvent which contains drop data
   * @param {object} data                      The data transfer extracted from the event
   * @returns {Promise<ActiveEffect|boolean>}  The created ActiveEffect object or false if it couldn't be created.
   * @protected
   */
  async _onDropActiveEffect(event, data) {
    const aeCls = getDocumentClass('ActiveEffect');
    const effect = await aeCls.fromDropData(data);
    if (!this.actor.isOwner || !effect) return false;
    if (effect.target === this.actor)
      return this._onSortActiveEffect(event, effect);
    return aeCls.create(effect, { parent: this.actor });
  }

  /**
   * Handle a drop event for an existing embedded Active Effect to sort that Active Effect relative to its siblings
   *
   * @param {DragEvent} event
   * @param {ActiveEffect} effect
   */
  async _onSortActiveEffect(event, effect) {
    /** @type {HTMLElement} */
    const dropTarget = event.target.closest('[data-effect-id]');
    if (!dropTarget) return;
    const target = this._getEmbeddedDocument(dropTarget);

    // Don't sort on yourself
    if (effect.uuid === target.uuid) return;

    // Identify sibling items based on adjacent HTML elements
    const siblings = [];
    for (const el of dropTarget.parentElement.children) {
      const siblingId = el.dataset.effectId;
      const parentId = el.dataset.parentId;
      if (
        siblingId &&
        parentId &&
        (siblingId !== effect.id || parentId !== effect.parent.id)
      )
        siblings.push(this._getEmbeddedDocument(el));
    }

    // Perform the sort
    const sortUpdates = SortingHelpers.performIntegerSort(effect, {
      target,
      siblings,
    });

    // Split the updates up by parent document
    const directUpdates = [];

    const grandchildUpdateData = sortUpdates.reduce((items, u) => {
      const parentId = u.target.parent.id;
      const update = { _id: u.target.id, ...u.update };
      if (parentId === this.actor.id) {
        directUpdates.push(update);
        return items;
      }
      if (items[parentId]) items[parentId].push(update);
      else items[parentId] = [update];
      return items;
    }, {});

    // Effects-on-items updates
    for (const [itemId, updates] of Object.entries(grandchildUpdateData)) {
      await this.actor.items
        .get(itemId)
        .updateEmbeddedDocuments('ActiveEffect', updates);
    }

    // Update on the main actor
    return this.actor.updateEmbeddedDocuments('ActiveEffect', directUpdates);
  }

  /**
   * Handle dropping of an Actor data onto another Actor sheet
   * @param {DragEvent} event            The concluding DragEvent which contains drop data
   * @param {object} data                The data transfer extracted from the event
   * @returns {Promise<object|boolean>}  A data object which describes the result of the drop, or false if the drop was
   *                                     not permitted.
   * @protected
   */
  async _onDropActor(event, data) {
    if (!this.actor.isOwner) return false;
  }

  /* -------------------------------------------- */

  /**
   * Handle dropping of an item reference or item data onto an Actor Sheet
   * @param {DragEvent} event            The concluding DragEvent which contains drop data
   * @param {object} data                The data transfer extracted from the event
   * @returns {Promise<Item[]|boolean>}  The created or updated Item instances, or false if the drop was not permitted.
   * @protected
   */
  async _onDropItem(event, data) {
    if (!this.actor.isOwner) return false;
    const item = await Item.implementation.fromDropData(data);

    // Handle item sorting within the same Actor. Features and equipment only
    // reorder while their list's Rearrange toggle is on.
    if (this.actor.uuid === item.parent?.uuid) {
      const list = item.isFeature
        ? 'features'
        : { equipment: 'equipment', weapon: 'weapons', armor: 'armor' }[item.type] ?? null;
      if (list && !this.#rearranging.has(list)) return false;
      return this._onSortItem(event, item);
    }

    // Create the owned item
    return this._onDropItemCreate(item, event);
  }

  /**
   * Handle dropping of a Folder on an Actor Sheet.
   * The core sheet currently supports dropping a Folder of Items to create all items as owned items.
   * @param {DragEvent} event     The concluding DragEvent which contains drop data
   * @param {object} data         The data transfer extracted from the event
   * @returns {Promise<Item[]>}
   * @protected
   */
  async _onDropFolder(event, data) {
    if (!this.actor.isOwner) return [];
    const folder = await Folder.implementation.fromDropData(data);
    if (folder.type !== 'Item') return [];
    const droppedItemData = await Promise.all(
      folder.contents.map(async (item) => {
        if (!(document instanceof Item)) item = await fromUuid(item.uuid);
        return item;
      })
    );
    return this._onDropItemCreate(droppedItemData, event);
  }

  /**
   * Handle the final creation of dropped Item data on the Actor.
   * This method is factored out to allow downstream classes the opportunity to override item creation behavior.
   * @param {object[]|object} itemData      The item data requested for creation
   * @param {DragEvent} event               The concluding DragEvent which provided the drop data
   * @returns {Promise<Item[]>}
   * @private
   */
  async _onDropItemCreate(itemData, event) {
    itemData = itemData instanceof Array ? itemData : [itemData];
    // NPCs only have features
    if (this.actor.type === 'npc') {
      const kept = itemData.filter((item) => ['feature', 'trait'].includes(item.type));
      if (kept.length < itemData.length) ui.notifications.warn('ABSOLUTION.Actor.NpcFeaturesOnly', { localize: true });
      itemData = kept;
    }
    return this.actor.createEmbeddedDocuments('Item', itemData);
  }

  /**
   * Handle a drop event for an existing embedded Item to sort that Item relative to its siblings
   * @param {Event} event
   * @param {Item} item
   * @private
   */
  _onSortItem(event, item) {
    // Get the drag source and drop target
    const items = this.actor.items;
    const dropTarget = event.target.closest('[data-item-id]');
    if (!dropTarget) return;
    const target = items.get(dropTarget.dataset.itemId);

    // Don't sort on yourself
    if (item.id === target.id) return;

    // Identify sibling items based on adjacent HTML elements
    const siblings = [];
    for (let el of dropTarget.parentElement.children) {
      const siblingId = el.dataset.itemId;
      if (siblingId && siblingId !== item.id)
        siblings.push(items.get(el.dataset.itemId));
    }

    // Perform the sort
    const sortUpdates = SortingHelpers.performIntegerSort(item, {
      target,
      siblings,
    });
    const updateData = sortUpdates.map((u) => {
      const update = u.update;
      update._id = u.target._id;
      return update;
    });

    // Perform the update
    return this.actor.updateEmbeddedDocuments('Item', updateData);
  }

  /** The following pieces set up drag handling and are unlikely to need modification  */

  /**
   * Returns an array of DragDrop instances
   * @type {DragDrop[]}
   */
  get dragDrop() {
    return this.#dragDrop;
  }

  // This is marked as private because there's no real need
  // for subclasses or external hooks to mess with it directly
  #dragDrop;

  /**
   * The lists ('features', 'equipment', 'weapons', 'armor') whose Rearrange toggle is on. Kept for
   * the life of this sheet window.
   * @type {Set<string>}
   */
  #rearranging = new Set();

  /**
   * Create drag-and-drop workflow handlers for this Application
   * @returns {DragDrop[]}     An array of DragDrop handlers
   * @private
   */
  #createDragDropHandlers() {
    return this.options.dragDrop.map((d) => {
      d.permissions = {
        dragstart: this._canDragStart.bind(this),
        drop: this._canDragDrop.bind(this),
      };
      d.callbacks = {
        dragstart: this._onDragStart.bind(this),
        dragover: this._onDragOver.bind(this),
        drop: this._onDrop.bind(this),
      };
      return new DragDrop(d);
    });
  }

  /********************
   *
   * Actor Override Handling
   *
   ********************/

  /**
   * Submit a document update based on the processed form data.
   * @param {SubmitEvent} event                   The originating form submission event
   * @param {HTMLFormElement} form                The form element that was submitted
   * @param {object} submitData                   Processed and validated form data to be used for a document update
   * @returns {Promise<void>}
   * @protected
   * @override
   */
  async _processSubmitData(event, form, submitData) {
    const overrides = foundry.utils.flattenObject(this.actor.overrides);
    for (let k of Object.keys(overrides)) delete submitData[k];
    await this.document.update(submitData);
  }

  /**
   * Disables inputs subject to active effects
   */
  #disableOverrides() {
    const flatOverrides = foundry.utils.flattenObject(this.actor.overrides);
    for (const override of Object.keys(flatOverrides)) {
      const inputs = this.element.querySelectorAll(
        `[name="${override}"], [data-field="${override}"]`
      );
      for (const input of inputs) input.disabled = true;
    }
  }
}
