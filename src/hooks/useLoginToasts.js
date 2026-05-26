/**
 * hooks/useLoginToasts.js
 *
 * TODO: extract login-toast lifecycle from ChatContext.
 *
 * Will manage the loginToasts array and expose:
 *  - loginToasts         — [{ id, name, exiting }]
 *  - addLoginToast(name) — shows a toast + plays the sign-in sound
 *  - dismissLoginToast(id)
 *
 * Auto-dismiss: 7 s display → 350 ms exit animation → removed from DOM.
 */

export function useLoginToasts() {
  throw new Error('useLoginToasts: not yet implemented — logic still lives in ChatContext')
}
