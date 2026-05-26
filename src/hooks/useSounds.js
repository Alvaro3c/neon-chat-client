/**
 * hooks/useSounds.js
 *
 * Audio singletons for the app's sound effects.
 * Module-level instances are created once and reused across the app
 * to avoid overlapping or re-allocating Audio nodes.
 */

// ── Login-sound singleton ─────────────────────────────────────
// Reuse a single Audio instance to avoid overlapping sounds.
const loginAudio = new Audio('/assets/sounds/inicio-sesion.mp3')
loginAudio.volume = 0.7

export function playLoginSound() {
  // Rewind and play; silently ignore autoplay policy rejections.
  loginAudio.currentTime = 0
  loginAudio.play().catch(() => {})
}

// ── New-message sound singleton ───────────────────────────────
// preload='auto' tells the browser to fetch & buffer the file at
// module-load time, so the first play() call is instant (no network
// round-trip on each incoming message).
const newMessageAudio = new Audio('/assets/sounds/new-message-1.mp3')
newMessageAudio.preload = 'auto'
newMessageAudio.volume  = 0.7

export function playNewMessageSound() {
  newMessageAudio.currentTime = 0
  newMessageAudio.play().catch(() => {})
}
