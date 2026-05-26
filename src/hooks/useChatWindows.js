/**
 * hooks/useChatWindows.js
 *
 * TODO: extract window lifecycle logic from ChatContext.
 *
 * Will manage:
 *  - openChats array  { contactId, zIndex, position, isMinimized }
 *  - maxZ counter     — monotonically increasing z-index for focus management
 *
 * Will expose:
 *  - openChats
 *  - activeContactId
 *  - openChat(contactId)
 *  - closeChat(contactId)
 *  - focusChat(contactId)
 *  - minimizeChat(contactId)
 *  - unminimizeChat(contactId)
 */

export function useChatWindows() {
  throw new Error('useChatWindows: not yet implemented — logic still lives in ChatContext')
}
