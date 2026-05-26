/**
 * hooks/useLoginToasts.js
 *
 * Manages the login-toast notification lifecycle.
 *
 * Exposes:
 *  - loginToasts          — [{ id, name, exiting }]
 *  - addLoginToast(name)  — shows a toast + plays the sign-in sound
 *  - dismissLoginToast(id) — dismisses a toast immediately (on click)
 *
 * Auto-dismiss: 7 s display → 350 ms exit animation → removed from DOM.
 */

import { useState, useCallback } from 'react'
import { playLoginSound } from './useSounds'

const EXIT_ANIMATION_MS = 350

function startToastExit(id, setLoginToasts) {
  setLoginToasts((prev) =>
    prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
  )
  setTimeout(() => {
    setLoginToasts((prev) => prev.filter((t) => t.id !== id))
  }, EXIT_ANIMATION_MS)
}

export function useLoginToasts() {
  const [loginToasts, setLoginToasts] = useState([]) // [{ id, name, exiting }]

  /** Show a login toast and play the sign-in sound. */
  const addLoginToast = useCallback((name) => {
    const id = `login-toast-${Date.now()}-${Math.random()}`
    setLoginToasts((prev) => [...prev, { id, name, exiting: false }])
    playLoginSound()

    // Begin exit animation after 7 s, then remove from DOM at 7.35 s
    setTimeout(() => {
      startToastExit(id, setLoginToasts)
    }, 7_000)
  }, [])

  /** Dismiss a toast immediately (called on click). */
  const dismissLoginToast = useCallback((id) => {
    startToastExit(id, setLoginToasts)
  }, [])

  return { loginToasts, addLoginToast, dismissLoginToast }
}
