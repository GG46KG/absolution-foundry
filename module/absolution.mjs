// Import document classes.
import { AbsolutionActor } from './documents/actor.mjs';
import { AbsolutionItem } from './documents/item.mjs';
import { AbsolutionCombat } from './documents/combat.mjs';
// Import sheet classes.
import { AbsolutionActorSheet } from './sheets/actor-sheet.mjs';
import { AbsolutionItemSheet } from './sheets/item-sheet.mjs';
// Import helper/utility classes and constants.
import { ABSOLUTION } from './helpers/config.mjs';
import { renderPopcornControls } from './helpers/popcorn.mjs';
// Import DataModel classes
import * as models from './data/_module.mjs';

/* -------------------------------------------- */
/*  Init Hook                                   */
/* -------------------------------------------- */

// Add key classes to the global scope so they can be more easily used
// by downstream developers
globalThis.absolution = {
  documents: {
    AbsolutionActor,
    AbsolutionItem,
  },
  applications: {
    AbsolutionActorSheet,
    AbsolutionItemSheet,
  },
  utils: {
    rollItemMacro,
  },
  models,
};

Hooks.once('init', function () {
  // Add custom constants for configuration.
  CONFIG.ABSOLUTION = ABSOLUTION;

  // Popcorn initiative: the acting combatant picks who goes next, so nobody
  // rolls. See AbsolutionCombat.
  CONFIG.Combat.documentClass = AbsolutionCombat;

  // Replace the core status effects with the Absolution Conditions and
  // Status Effects. CONFIG.statusEffects is a proxy that also indexes by id,
  // so empty it and push rather than reassigning it.
  CONFIG.statusEffects.length = 0;
  for (const status of ABSOLUTION.statusEffects) CONFIG.statusEffects.push({ ...status });
  CONFIG.specialStatusEffects.DEFEATED = 'dead';

  // Define custom Document and DataModel classes
  CONFIG.Actor.documentClass = AbsolutionActor;

  // Note that you don't need to declare a DataModel
  // for the base actor/item classes - they are included
  // with the Character/NPC as part of super.defineSchema()
  CONFIG.Actor.dataModels = {
    character: models.AbsolutionCharacter,
    npc: models.AbsolutionNPC,
  };
  CONFIG.Item.documentClass = AbsolutionItem;
  CONFIG.Item.dataModels = {
    feature: models.AbsolutionFeature,
    trait: models.AbsolutionTrait,
    equipment: models.AbsolutionEquipment,
    weapon: models.AbsolutionWeapon,
    armor: models.AbsolutionArmor,
    belonging: models.AbsolutionBelonging,
  };

  // Active Effects are never copied to the Actor,
  // but will still apply to the Actor from within the Item
  // if the transfer property on the Active Effect is true.
  CONFIG.ActiveEffect.legacyTransferral = false;

  // Register sheet application classes
  Actors.unregisterSheet('core', ActorSheet);
  Actors.registerSheet('absolution', AbsolutionActorSheet, {
    makeDefault: true,
    label: 'ABSOLUTION.SheetLabels.Actor',
  });
  Items.unregisterSheet('core', ItemSheet);
  Items.registerSheet('absolution', AbsolutionItemSheet, {
    makeDefault: true,
    label: 'ABSOLUTION.SheetLabels.Item',
  });
});

/* -------------------------------------------- */
/*  Handlebars Helpers                          */
/* -------------------------------------------- */

// If you need to add Handlebars helpers, here is a useful example:
Handlebars.registerHelper('toLowerCase', function (str) {
  return str.toLowerCase();
});

/* -------------------------------------------- */
/*  Ready Hook                                  */
/* -------------------------------------------- */

// Status effect names are localized by core when applied; descriptions aren't.
Hooks.once('i18nInit', () => {
  for (const status of CONFIG.statusEffects) {
    if (status.description) status.description = game.i18n.localize(status.description);
  }
});

Hooks.on('renderCombatTracker', renderPopcornControls);

// Roll Damage buttons on weapon attack messages. The button records whether
// the attack was critical, so Precise can add its extra 1d6.
Hooks.on('renderChatMessageHTML', (message, html) => {
  for (const button of html.querySelectorAll('[data-absolution-damage]')) {
    button.addEventListener('click', async (event) => {
      event.preventDefault();
      const weapon = await foundry.utils.fromUuid(button.dataset.absolutionDamage);
      if (!weapon?.isOwner) {
        return ui.notifications.warn('ABSOLUTION.Weapon.CannotRollDamage', { localize: true });
      }
      weapon.rollDamage({ critical: button.dataset.critical === 'true' });
    });
  }
});

Hooks.once('ready', function () {
  // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
  Hooks.on('hotbarDrop', (bar, data, slot) => createDocMacro(data, slot));
});

/* -------------------------------------------- */
/*  Hotbar Macros                               */
/* -------------------------------------------- */

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {Object} data     The dropped data
 * @param {number} slot     The hotbar slot to use
 * @returns {Promise}
 */
async function createDocMacro(data, slot) {
  // First, determine if this is a valid owned item.
  if (data.type !== 'Item') return;
  if (!data.uuid.includes('Actor.') && !data.uuid.includes('Token.')) {
    return ui.notifications.warn(
      'You can only create macro buttons for owned Items'
    );
  }
  // If it is, retrieve it based on the uuid.
  const item = await Item.fromDropData(data);

  // Create the macro command using the uuid.
  const command = `game.absolution.rollItemMacro("${data.uuid}");`;
  let macro = game.macros.find(
    (m) => m.name === item.name && m.command === command
  );
  if (!macro) {
    macro = await Macro.create({
      name: item.name,
      type: 'script',
      img: item.img,
      command: command,
      flags: { 'absolution.itemMacro': true },
    });
  }
  game.user.assignHotbarMacro(macro, slot);
  return false;
}

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {string} itemUuid
 */
function rollItemMacro(itemUuid) {
  // Reconstruct the drop data so that we can load the item.
  const dropData = {
    type: 'Item',
    uuid: itemUuid,
  };
  // Load the item from the uuid.
  Item.fromDropData(dropData).then((item) => {
    // Determine if the item loaded and if it's an owned item.
    if (!item || !item.parent) {
      const itemName = item?.name ?? itemUuid;
      return ui.notifications.warn(
        `Could not find item ${itemName}. You may need to delete and recreate this macro.`
      );
    }

    // Trigger the item roll
    item.roll();
  });
}
