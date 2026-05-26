/**
 * hooks/useSocketEvents.js
 *
 * TODO: extract WebSocket event routing from ChatContext.
 *
 * Will subscribe to chatSocket.onMessage and dispatch incoming events to the
 * appropriate state setters (messages, contactStatuses, typingStatus, etc.).
 *
 * Accepts setters as parameters so it stays decoupled from ChatContext's
 * internal state — making it testable and reusable.
 *
 * Planned signature:
 *   useSocketEvents({ setMessages, setContactStatuses, setTypingStatus,
 *                     setBuzzSignals, setNewMessageSignals, setContacts,
 *                     openChatMinimized, addLoginToast, contactsRef, prevStatusesRef })
 */

export function useSocketEvents() {
  throw new Error('useSocketEvents: not yet implemented — logic still lives in ChatContext')
}
