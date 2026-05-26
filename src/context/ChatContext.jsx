import { createContext, useContext, useState, useCallback } from 'react'
import * as chatSocket from '../services/socket/chatSocket'
import {
  acceptConversation,
  declineConversation,
} from '../services/firebase/conversations'
import { useLoginToasts }  from '../hooks/useLoginToasts'
import { useContacts }     from '../hooks/useContacts'
import { useChatWindows }  from '../hooks/useChatWindows'
import { useSocketEvents } from '../hooks/useSocketEvents'

const ChatContext = createContext(null)

/**
 * ChatProvider
 *
 * Composes the domain hooks and exposes a unified context value.
 *
 * Exposes:
 *  - contacts            — active conversations mapped to contact objects
 *  - setContacts         — for drag-to-reorder
 *  - requests            — pending conversations where the current user is the recipient
 *  - openChats           — array of { contactId, zIndex, position, isMinimized }
 *  - messages            — { [conversationId]: Message[] }
 *  - activeContactId     — currently focused window
 *  - contactStatuses     — { [uid]: { status, mood } }  live data from socket
 *  - typingStatus        — { [conversationId]: boolean } clears after 2 s
 *  - buzzSignals         — { [conversationId]: number } increments on each buzz
 *  - newMessageSignals   — { [conversationId]: number } increments on each incoming message
 *  - loginToasts         — [{ id, name, exiting }]
 *  - openChat(contactId)
 *  - closeChat(contactId)
 *  - focusChat(contactId)
 *  - minimizeChat(contactId)
 *  - unminimizeChat(contactId)
 *  - sendMessage(conversationId, text)
 *  - addReaction(conversationId, messageId, emoji)
 *  - addSystemMessage(conversationId, text)
 *  - acceptRequest(convId)
 *  - declineRequest(convId)
 *  - dismissLoginToast(id)
 */
export function ChatProvider({ children }) {
  // ── Messaging state ────────────────────────────────────────
  const [messages, setMessages]                       = useState({})
  const [contactStatuses, setContactStatuses]         = useState({}) // { [uid]: { status, mood } }
  const [typingStatus, setTypingStatus]               = useState({}) // { [conversationId]: boolean }
  const [buzzSignals, setBuzzSignals]                 = useState({}) // { [conversationId]: number }
  const [newMessageSignals, setNewMessageSignals]     = useState({}) // { [conversationId]: number }

  // ── Domain hooks ───────────────────────────────────────────
  const { loginToasts, addLoginToast, dismissLoginToast } = useLoginToasts()
  const { contacts, setContacts, requests }               = useContacts()
  const {
    openChats,
    activeContactId,
    openChat,
    closeChat,
    focusChat,
    minimizeChat,
    unminimizeChat,
    openChatMinimized,
  } = useChatWindows()

  useSocketEvents({
    contacts,
    setMessages,
    setContactStatuses,
    setTypingStatus,
    setBuzzSignals,
    setNewMessageSignals,
    setContacts,
    openChatMinimized,
    addLoginToast,
  })

  // ── Local system messages ──────────────────────────────────
  /**
   * Inject a system message directly into the local messages state
   * without going through the WebSocket.  Used for buzz confirmations,
   * future nudges, etc.
   */
  const addSystemMessage = useCallback((conversationId, text) => {
    setMessages((prev) => ({
      ...prev,
      [conversationId]: [
        ...(prev[conversationId] ?? []),
        {
          id:        `system-${Date.now()}-${Math.random()}`,
          text,
          sender:    'system',
          timestamp: new Date(),
        },
      ],
    }))
  }, [])

  // ── Messaging (delegated to WebSocket) ────────────────────
  /**
   * Send a message via the WebSocket.
   * No local state update — the server echoes the message back,
   * which is picked up by useSocketEvents → 'message'.
   *
   * NOTE: conversationId here is the Firestore conversation document ID,
   * which equals the contact's `id` field.
   */
  const sendMessage = useCallback((conversationId, text) => {
    if (!text.trim()) return
    chatSocket.sendMessage(conversationId, text)
  }, [])

  /**
   * Send a reaction via the WebSocket.
   * State update arrives through the 'reaction' socket event.
   */
  const addReaction = useCallback((conversationId, messageId, emoji) => {
    chatSocket.sendReaction(conversationId, messageId, emoji)
  }, [])

  // ── Request management ─────────────────────────────────────
  /**
   * Accept a pending conversation request.
   * Marks the Firestore document as 'active'; the subscription
   * automatically moves it from requests → contacts.
   */
  const acceptRequest = useCallback(async (convId) => {
    await acceptConversation(convId)
    openChat(convId)
  }, [openChat])

  /**
   * Decline (and delete) a pending conversation request.
   * The subscription automatically removes it from requests.
   */
  const declineRequest = useCallback(async (convId) => {
    await declineConversation(convId)
  }, [])

  const value = {
    contacts,
    setContacts,
    requests,
    openChats,
    messages,
    activeContactId,
    contactStatuses,
    typingStatus,
    buzzSignals,
    newMessageSignals,
    loginToasts,
    addSystemMessage,
    openChat,
    closeChat,
    focusChat,
    minimizeChat,
    unminimizeChat,
    sendMessage,
    addReaction,
    acceptRequest,
    declineRequest,
    dismissLoginToast,
  }

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}

/** Convenience hook */
export function useChat() {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChat must be used inside <ChatProvider>')
  return ctx
}
