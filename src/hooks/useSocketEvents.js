/**
 * hooks/useSocketEvents.js
 *
 * Subscribes to chatSocket.onMessage and routes each incoming event
 * to the appropriate state setter.
 *
 * Accepts setters as parameters so it stays decoupled from ChatContext's
 * internal state — making it testable in isolation.
 *
 * @param {object} params
 * @param {array}    params.contacts            — current contacts list (for name lookup)
 * @param {function} params.setMessages
 * @param {function} params.setContactStatuses
 * @param {function} params.setTypingStatus
 * @param {function} params.setBuzzSignals
 * @param {function} params.setNewMessageSignals
 * @param {function} params.setContacts          — for real-time profile updates
 * @param {function} params.openChatMinimized    — auto-open pill on incoming message
 * @param {function} params.addLoginToast        — show toast when a contact comes online
 */

import { useCallback, useEffect, useRef } from 'react'
import * as chatSocket from '../services/socket/chatSocket'
import useAuth from './useAuth'

export function useSocketEvents({
  contacts,
  setMessages,
  setContactStatuses,
  setTypingStatus,
  setBuzzSignals,
  setNewMessageSignals,
  setContacts,
  openChatMinimized,
  addLoginToast,
}) {
  const { user } = useAuth()
  const typingTimers    = useRef({})
  const prevStatusesRef = useRef({}) // { [uid]: { status, mood } }

  /**
   * Ref that mirrors the contacts array so the socket handler always has
   * fresh values without introducing stale-closure issues.
   */
  const contactsRef = useRef([])
  useEffect(() => { contactsRef.current = contacts }, [contacts])

  /** Ref that mirrors the current user's uid — same pattern as contactsRef. */
  const currentUserUidRef = useRef(user?.uid)
  useEffect(() => { currentUserUidRef.current = user?.uid }, [user])

  const handleSocketEvent = useCallback((event) => {
    switch (event.type) {

      case 'message': {
        // Determine direction from the server's senderUid field
        const sender = event.senderUid === currentUserUidRef.current ? 'me' : 'them'
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
        // Notify for incoming messages from the other participant
        if (sender === 'them') {
          // Increment the signal so ChatWindow knows to blink the pill
          setNewMessageSignals((prev) => ({
            ...prev,
            [event.conversationId]: (prev[event.conversationId] ?? 0) + 1,
          }))

          // If the chat window isn't open yet, auto-open it as a minimized pill
          // so the blink is visible.
          openChatMinimized(event.conversationId)
        }
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
        // Ignore the server echo when the current user is the one who sent the buzz
        if (event.senderUid === currentUserUidRef.current) break

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
  }, [addLoginToast, openChatMinimized, setContacts, setMessages,
      setContactStatuses, setTypingStatus, setBuzzSignals, setNewMessageSignals])

  // Register / unregister the handler for the lifetime of this provider
  useEffect(() => {
    chatSocket.onMessage(handleSocketEvent)
    return () => {
      chatSocket.offMessage(handleSocketEvent)
      // Also clean up any lingering typing timers
      Object.values(typingTimers.current).forEach(clearTimeout)
    }
  }, [handleSocketEvent])
}
