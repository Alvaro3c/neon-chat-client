import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import * as chatSocket from '../services/chatSocket'
import {
  auth,
  subscribeToConversations,
  getUserById,
  acceptConversation,
  declineConversation,
} from '../services/firebase'

// ── Login-sound singleton ─────────────────────────────────────
// Reuse a single Audio instance to avoid overlapping sounds.
const loginAudio = new Audio('/assets/sounds/inicio-sesion.mp3')
loginAudio.volume = 0.7

function playLoginSound() {
  // Rewind and play; silently ignore autoplay policy rejections.
  loginAudio.currentTime = 0
  loginAudio.play().catch(() => {})
}

const ChatContext = createContext(null)

/**
 * ChatProvider
 *
 * Exposes:
 *  - contacts            — active conversations mapped to contact objects
 *  - setContacts         — for drag-to-reorder
 *  - requests            — pending conversations where the current user is the recipient
 *  - openChats           — array of { contactId, zIndex, position }
 *  - messages            — { [conversationId]: Message[] }
 *  - activeContactId     — currently focused window
 *  - contactStatuses     — { [uid]: { status, mood } }  live data from socket
 *  - typingStatus        — { [conversationId]: boolean } clears after 2 s
 *  - openChat(contactId)
 *  - closeChat(contactId)
 *  - focusChat(contactId)
 *  - sendMessage(conversationId, text)
 *  - addReaction(conversationId, messageId, emoji)
 *  - acceptRequest(convId)
 *  - declineRequest(convId)
 */
export function ChatProvider({ children }) {
  const [contacts, setContacts]               = useState([])
  const [requests, setRequests]               = useState([])
  const [openChats, setOpenChats]             = useState([])
  const [maxZ, setMaxZ]                       = useState(100)
  const [messages, setMessages]               = useState({})
  const [activeContactId, setActiveContactId] = useState(null)

  // Live data from the WebSocket
  const [contactStatuses, setContactStatuses] = useState({}) // { [uid]: { status, mood } }
  const [typingStatus, setTypingStatus]       = useState({}) // { [conversationId]: boolean }
  const [buzzSignals, setBuzzSignals]         = useState({}) // { [conversationId]: number } — increments on each incoming buzz
  const typingTimers = useRef({})

  // ── Login toast notifications ──────────────────────────────
  const [loginToasts, setLoginToasts] = useState([]) // [{ id, name, exiting }]

  /**
   * Ref that mirrors contactStatuses so the socket handler always has
   * fresh values without introducing stale-closure issues.
   */
  const prevStatusesRef = useRef({}) // { [uid]: { status, mood } }

  /**
   * Ref that mirrors the contacts array for the same reason —
   * we need to look up a contact's display name inside the socket handler.
   */
  const contactsRef = useRef([])
  useEffect(() => { contactsRef.current = contacts }, [contacts])

  /** Show a login toast and play the sign-in sound. */
  const addLoginToast = useCallback((name) => {
    const id = `login-toast-${Date.now()}-${Math.random()}`
    setLoginToasts((prev) => [...prev, { id, name, exiting: false }])
    playLoginSound()

    // Begin exit animation after 7 s, then remove from DOM at 7.35 s
    setTimeout(() => {
      setLoginToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
      )
      setTimeout(() => {
        setLoginToasts((prev) => prev.filter((t) => t.id !== id))
      }, 350)
    }, 7_000)
  }, [])

  /** Dismiss a toast immediately (called on click). */
  const dismissLoginToast = useCallback((id) => {
    setLoginToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
    )
    setTimeout(() => {
      setLoginToasts((prev) => prev.filter((t) => t.id !== id))
    }, 350)
  }, [])

  // ── Firestore subscription ────────────────────────────────────
  // Subscribe to all conversations for the current user; build the
  // contacts and requests lists from the returned documents.
  useEffect(() => {
    const currentUser = auth.currentUser
    if (!currentUser) return

    const myUid = currentUser.uid

    /**
     * Given a conversation document, fetch the OTHER participant's profile
     * from the /users collection and return a contact-shaped object.
     * The contact's `id` field equals the Firestore conversation document
     * ID — this is what gets passed as `conversationId` when sending messages.
     */
    async function buildContact(conv) {
      const otherUid = conv.participants.find((p) => p !== myUid)
      const profile  = await getUserById(otherUid)
      return {
        id:        conv.id,           // ← Firestore conversation doc ID (= conversationId)
        uid:       otherUid,          // ← other user's Firebase UID (for presence events)
        name:      profile?.name  || profile?.email || 'Unknown',
        email:     profile?.email || '',
        photoURL:  profile?.photoURL || '',
        avatar:    '👤',              // fallback emoji (Avatar prefers photoURL when set)
        status:    'offline',
        mood:      '',
      }
    }

    const unsub = subscribeToConversations(myUid, async (conversations) => {
      const activeConvs  = conversations.filter((c) => c.status === 'active')
      const pendingConvs = conversations.filter(
        (c) => c.status === 'pending' && c.initiatedBy !== myUid,
      )

      const newContacts = await Promise.all(activeConvs.map(buildContact))

      const newRequests = await Promise.all(
        pendingConvs.map(async (conv) => {
          const otherUid = conv.participants.find((p) => p !== myUid)
          const profile  = await getUserById(otherUid)
          return {
            id:     conv.id,
            uid:    otherUid,
            name:   profile?.name  || profile?.email || 'Unknown',
            email:  profile?.email || '',
            avatar: '👤',
            photoURL: profile?.photoURL || '',
          }
        }),
      )

      setContacts(newContacts)
      setRequests(newRequests)
    })

    return unsub
  }, [])

  // ── Socket event handler ──────────────────────────────────
  const handleSocketEvent = useCallback((event) => {
    switch (event.type) {

      case 'message': {
        // Determine direction from the server's senderUid field
        const sender = event.senderUid === auth.currentUser?.uid ? 'me' : 'them'
        setMessages((prev) => ({
          ...prev,
          [event.conversationId]: [
            ...(prev[event.conversationId] ?? []),
            {
              id:        event.messageId ?? `${Date.now()}-${Math.random()}`,
              text:      event.text,
              sender,
              timestamp: event.timestamp ? new Date(event.timestamp) : new Date(),
            },
          ],
        }))
        break
      }

      case 'reaction': {
        setMessages((prev) => ({
          ...prev,
          [event.conversationId]: (prev[event.conversationId] ?? []).map((m) =>
            m.id === event.messageId ? { ...m, reaction: event.emoji } : m
          ),
        }))
        break
      }

      case 'typing': {
        setTypingStatus((prev) => ({ ...prev, [event.conversationId]: true }))
        // Auto-clear after 2 s if no further typing event arrives
        clearTimeout(typingTimers.current[event.conversationId])
        typingTimers.current[event.conversationId] = setTimeout(() => {
          setTypingStatus((prev) => ({ ...prev, [event.conversationId]: false }))
        }, 2_000)
        break
      }

      case 'buzz': {
        // Increment signal so ChatWindow's useEffect fires even on repeated buzzes
        setBuzzSignals((prev) => ({
          ...prev,
          [event.conversationId]: (prev[event.conversationId] ?? 0) + 1,
        }))
        // Add a system message so the buzz is visible in the chat history
        setMessages((prev) => ({
          ...prev,
          [event.conversationId]: [
            ...(prev[event.conversationId] ?? []),
            {
              id:        `buzz-${Date.now()}-${Math.random()}`,
              text:      `${event.senderName || 'Your friend'} sent you a buzz! 〰️`,
              sender:    'system',
              timestamp: new Date(),
            },
          ],
        }))
        break
      }

      case 'contact_status': {
        const prev = prevStatusesRef.current[event.uid]

        // Only toast when we already knew this contact's status (skip the
        // initial presence flood right after connection) AND the contact
        // is transitioning from any non-online state to online.
        if (
          prev !== undefined &&
          prev.status !== 'online' &&
          event.status === 'online'
        ) {
          const contact = contactsRef.current.find((c) => c.uid === event.uid)
          const name    = contact?.name || 'Alguien'
          addLoginToast(name)
        }

        // Keep the ref in sync before the state update so the next event
        // sees the correct "previous" value.
        prevStatusesRef.current[event.uid] = { status: event.status, mood: event.mood }

        setContactStatuses((prev) => ({
          ...prev,
          [event.uid]: { status: event.status, mood: event.mood },
        }))
        break
      }

      case 'contact_profile': {
        // A contact changed their nickname or photo — update the buddy list
        // in real-time so friends see the new name without reloading.
        setContacts((prev) =>
          prev.map((c) =>
            c.uid === event.uid
              ? {
                  ...c,
                  name:     event.displayName || c.name,
                  photoURL: event.photoURL    || c.photoURL,
                }
              : c
          )
        )
        break
      }

      default:
        break
    }
  }, []) // all deps (setters, auth) are stable module-level references

  // Register / unregister the handler for the lifetime of this provider
  useEffect(() => {
    chatSocket.onMessage(handleSocketEvent)
    return () => {
      chatSocket.offMessage(handleSocketEvent)
      // Also clean up any lingering typing timers
      Object.values(typingTimers.current).forEach(clearTimeout)
    }
  }, [handleSocketEvent])

  // ── Window management ──────────────────────────────────────
  const openChat = useCallback((contactId) => {
    setOpenChats((prev) => {
      const exists = prev.find((c) => c.contactId === contactId)
      if (exists) {
        setMaxZ((z) => z + 1)
        // Also unminimize if the chat was minimized when the user clicks it again
        return prev.map((c) =>
          c.contactId === contactId ? { ...c, zIndex: maxZ + 1, isMinimized: false } : c
        )
      }
      const offset = prev.length * 30
      const cx = Math.round(window.innerWidth  / 2 - 190)
      const cy = Math.round(window.innerHeight / 2 - 250)
      const position = {
        x: Math.max(8, Math.min(cx + offset, window.innerWidth  - 396)),
        y: Math.max(8, Math.min(cy + offset, window.innerHeight - 520)),
      }
      setMaxZ((z) => z + 1)
      return [...prev, { contactId, zIndex: maxZ + 1, position, isMinimized: false }]
    })
    setActiveContactId(contactId)
  }, [maxZ])

  const closeChat = useCallback((contactId) => {
    setOpenChats((prev) => prev.filter((c) => c.contactId !== contactId))
    setActiveContactId((id) => (id === contactId ? null : id))
  }, [])

  const focusChat = useCallback((contactId) => {
    setMaxZ((z) => {
      const next = z + 1
      setOpenChats((prev) =>
        prev.map((c) =>
          c.contactId === contactId ? { ...c, zIndex: next } : c
        )
      )
      return next
    })
    setActiveContactId(contactId)
  }, [])

  /** Minimize a chat window — moves it to the bottom pill bar. */
  const minimizeChat = useCallback((contactId) => {
    setOpenChats((prev) =>
      prev.map((c) => c.contactId === contactId ? { ...c, isMinimized: true } : c)
    )
  }, [])

  /** Restore a minimized chat — brings it back to the floating window. */
  const unminimizeChat = useCallback((contactId) => {
    setMaxZ((z) => {
      const next = z + 1
      setOpenChats((prev) =>
        prev.map((c) =>
          c.contactId === contactId ? { ...c, isMinimized: false, zIndex: next } : c
        )
      )
      return next
    })
    setActiveContactId(contactId)
  }, [])

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
   * which is picked up by handleSocketEvent → 'message'.
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
