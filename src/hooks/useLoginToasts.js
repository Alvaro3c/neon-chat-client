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
 *
 * Timer safety: every setTimeout ID is stored in timersRef (keyed by toastId).
 * The useEffect cleanup cancels all pending timers on unmount, preventing
 * state updates on an unmounted component and memory leaks in StrictMode.
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { playLoginSound } from './useSounds'

const EXIT_ANIMATION_MS = 350

// ---------------------------------------------------------------------------
// Helpers (module-level, pure — no hook rules apply here)
// ---------------------------------------------------------------------------

/**
 * Cancel every pending timer for a given toastId and remove the entry.
 * Safe to call even if the id has no registered timers.
 */
function clearToastTimers(id, timersRef) {
  timersRef.current[id]?.forEach(clearTimeout)
  delete timersRef.current[id]
}

/**
 * Mark a toast as exiting (triggers CSS animation), then remove it after
 * EXIT_ANIMATION_MS. Stores the exit timer in timersRef so it can be
 * cancelled if the component unmounts during the animation window.
 */
function startToastExit(id, setLoginToasts, timersRef) {
  setLoginToasts((prev) =>
    prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
  )

  const exitTimer = setTimeout(() => {
    setLoginToasts((prev) => prev.filter((t) => t.id !== id))
    // Tidy up the ref entry once the toast is fully gone
    if (timersRef) delete timersRef.current[id]
  }, EXIT_ANIMATION_MS)

  if (timersRef) {
    timersRef.current[id] = [...(timersRef.current[id] ?? []), exitTimer]
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useLoginToasts() {
  const [loginToasts, setLoginToasts] = useState([]) // [{ id, name, exiting }]

  /** Map of toastId → [timerId, ...] for every active setTimeout. */
  const timersRef = useRef({})

  /** Cancel all pending timers when the component tree unmounts. */
  useEffect(() => {
    return () => {
      Object.values(timersRef.current).flat().forEach(clearTimeout)
      timersRef.current = {}
    }
  }, [])

  /** Show a login toast and play the sign-in sound. */
  const addLoginToast = useCallback((name) => {
    const id = `login-toast-${Date.now()}-${Math.random()}`
    setLoginToasts((prev) => [...prev, { id, name, exiting: false }])
    playLoginSound()

    // Begin exit animation after 7 s, then remove from DOM at 7.35 s
    const displayTimer = setTimeout(() => {
      startToastExit(id, setLoginToasts, timersRef)
    }, 7_000)

    timersRef.current[id] = [displayTimer]
  }, [])

  /** Dismiss a toast immediately (called on click). */
  const dismissLoginToast = useCallback((id) => {
    // Cancel the 7 s display timer if it hasn't fired yet, then start exit
    clearToastTimers(id, timersRef)
    startToastExit(id, setLoginToasts, timersRef)
  }, [])

  return { loginToasts, addLoginToast, dismissLoginToast }
}
