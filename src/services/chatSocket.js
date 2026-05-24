/**
 * services/chatSocket.js
 *
 * Singleton WebSocket client for the Neon-Chat backend.
 *
 * Usage:
 *   import * as chatSocket from './chatSocket'
 *   chatSocket.connect(idToken)        // call once after sign-in
 *   chatSocket.onMessage(handler)      // register a listener
 *   chatSocket.sendMessage(convId, text)
 *   chatSocket.disconnect()            // call on sign-out
 *
 * Auto-reconnect: exponential backoff, up to MAX_RETRIES attempts.
 * Before each reconnect a fresh Firebase ID token is fetched.
 */

import { auth } from './firebase'

const WS_URL      = import.meta.env.VITE_WS_URL
const MAX_RETRIES = 5
const BASE_DELAY  = 1_000   // ms — doubles with every failed attempt

// ── Module-level state ────────────────────────────────────────────────────────

/** @type {WebSocket|null} */
let socket           = null
let retryCount       = 0
let retryTimer       = null
let intentionalClose = false

/** @type {Set<Function>} */
const listeners = new Set()

// ── Internal helpers ──────────────────────────────────────────────────────────

function send(data) {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    console.warn('[chatSocket] Cannot send — socket not open:', data.type)
    return
  }
  socket.send(JSON.stringify(data))
}

function notify(event) {
  listeners.forEach((fn) => fn(event))
}

// ── Internal open/reconnect ───────────────────────────────────────────────────

function openSocket(idToken) {
  socket = new WebSocket(WS_URL)

  socket.addEventListener('open', () => {
    retryCount = 0
    // First message must be the auth handshake
    socket.send(JSON.stringify({ type: 'auth', token: idToken }))
    console.info('[chatSocket] Connected and authenticated')
  })

  socket.addEventListener('message', (e) => {
    try {
      notify(JSON.parse(e.data))
    } catch (err) {
      console.error('[chatSocket] Failed to parse message:', err)
    }
  })

  socket.addEventListener('close', (e) => {
    if (intentionalClose) {
      intentionalClose = false
      return
    }
    console.warn(`[chatSocket] Connection closed (code ${e.code}) — scheduling reconnect`)
    scheduleReconnect()
  })

  socket.addEventListener('error', (err) => {
    // The 'close' event always fires after 'error', so reconnect is handled there
    console.error('[chatSocket] WebSocket error:', err)
  })
}

function scheduleReconnect() {
  if (retryCount >= MAX_RETRIES) {
    console.error('[chatSocket] Max reconnect attempts reached — giving up')
    return
  }

  const delay = BASE_DELAY * 2 ** retryCount
  retryCount++

  console.info(`[chatSocket] Reconnect attempt ${retryCount}/${MAX_RETRIES} in ${delay}ms`)

  retryTimer = setTimeout(async () => {
    retryTimer = null
    try {
      if (!auth.currentUser) {
        console.warn('[chatSocket] No current user — aborting reconnect')
        return
      }
      // Force-refresh the token so it is never expired when we reconnect
      const freshToken = await auth.currentUser.getIdToken(true)
      openSocket(freshToken)
    } catch (err) {
      console.error('[chatSocket] Reconnect failed:', err)
      scheduleReconnect()  // try again
    }
  }, delay)
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Open the WebSocket and authenticate.
 * Closes any existing connection first.
 * @param {string} idToken  Firebase ID token
 */
export function connect(idToken) {
  if (socket) disconnect()
  intentionalClose = false
  retryCount = 0
  openSocket(idToken)
}

/**
 * Close the connection and cancel any pending reconnect timer.
 */
export function disconnect() {
  intentionalClose = true
  if (retryTimer) {
    clearTimeout(retryTimer)
    retryTimer = null
  }
  if (socket) {
    socket.close()
    socket = null
  }
  console.info('[chatSocket] Disconnected')
}

/** Send a chat message. */
export function sendMessage(conversationId, text) {
  send({ type: 'message', conversationId, text })
}

/** Send a reaction to a message. */
export function sendReaction(conversationId, messageId, emoji) {
  send({ type: 'reaction', conversationId, messageId, emoji })
}

/** Broadcast that the current user is typing. */
export function sendTyping(conversationId) {
  send({ type: 'typing', conversationId })
}

/** Broadcast the current user's presence status. */
export function updateStatus(status) {
  send({ type: 'status_update', status })
}

/** Broadcast the current user's mood string. */
export function updateMood(mood) {
  send({ type: 'mood_update', mood })
}

/**
 * Re-authenticate with a fresh token (e.g. after token expiry).
 * @param {string} newIdToken
 */
export function refreshToken(newIdToken) {
  send({ type: 'refresh_token', token: newIdToken })
}

/**
 * Register a callback that receives every parsed incoming event object.
 * @param {(event: object) => void} handler
 */
export function onMessage(handler) {
  listeners.add(handler)
}

/**
 * Unregister a previously registered callback.
 * @param {(event: object) => void} handler
 */
export function offMessage(handler) {
  listeners.delete(handler)
}
