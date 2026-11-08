/**
 * Apply the user's current chat visibility (public, GM only, blind, self) to
 * a chat message's data. Foundry 14 replaced the "rollMode" setting with
 * "messageMode" and ChatMessage.applyRollMode with ChatMessage.applyMode, so
 * use whichever this version of Foundry has.
 * @param {object} chatData   ChatMessage data, changed in place
 * @returns {object}          The same data
 */
export function applyChatMode(chatData) {
  const cls = foundry.utils.getDocumentClass('ChatMessage');
  if (game.settings.settings.has('core.messageMode') && typeof cls.applyMode === 'function') {
    cls.applyMode(chatData, game.settings.get('core', 'messageMode'));
  } else {
    cls.applyRollMode(chatData, game.settings.get('core', 'rollMode'));
  }
  return chatData;
}

/**
 * Create a chat message with the user's current chat visibility applied.
 * @param {object} chatData   ChatMessage data
 * @returns {Promise<ChatMessage>}
 */
export function createChatMessage(chatData) {
  return foundry.utils.getDocumentClass('ChatMessage').create(applyChatMode(chatData));
}
