/**
 * hooks/useChatWindows.js
 *
 * Manages the lifecycle of floating chat windows.
 *
 * Owns:
 *  - openChats      — [{ contactId, zIndex, position, isMinimized }]
 *  - maxZ           — monotonically increasing z-index for focus management
 *  - activeContactId — currently focused window
 *
 * Exposes:
 *  - openChats
 *  - activeContactId
 *  - openChat(contactId)
 *  - closeChat(contactId)
 *  - focusChat(contactId)
 *  - minimizeChat(contactId)
 *  - unminimizeChat(contactId)
 *  - openChatMinimized(contactId) — auto-opens as a pill (used by socket handler)
 */

import { useState, useCallback } from 'react'

export function useChatWindows() {
  const [openChats, setOpenChats]             = useState([])
  const [maxZ, setMaxZ]                       = useState(100)
  const [activeContactId, setActiveContactId] = useState(null)

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

  /**
   * Auto-open a chat as a minimized pill without stealing focus.
   * Used by the socket event handler when an incoming message arrives
   * and the window isn't open yet — keeps the pill blink visible.
   */
  const openChatMinimized = useCallback((contactId) => {
    setMaxZ((z) => {
      const nextZ = z + 1
      setOpenChats((prev) => {
        if (prev.some((c) => c.contactId === contactId)) return prev // already open → leave as-is
        const offset = prev.length * 30
        const cx = Math.round(window.innerWidth  / 2 - 190)
        const cy = Math.round(window.innerHeight / 2 - 250)
        const position = {
          x: Math.max(8, Math.min(cx + offset, window.innerWidth  - 396)),
          y: Math.max(8, Math.min(cy + offset, window.innerHeight - 520)),
        }
        return [...prev, { contactId, zIndex: nextZ, position, isMinimized: true }]
      })
      return nextZ
    })
  }, [])

  return {
    openChats,
    activeContactId,
    openChat,
    closeChat,
    focusChat,
    minimizeChat,
    unminimizeChat,
    openChatMinimized,
  }
}
