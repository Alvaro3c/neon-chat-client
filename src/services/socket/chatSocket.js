/**
 * services/socket/chatSocket.js
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

import { auth } from '../firebase/app'

const WS_URL      = import.meta.env.VITE_WS_URL
const MAX_RETRIES = 5
const BASE_DELAY  = 1_000   // ms — doubles with every failed attempt

// ── Module-level state ────────────────────────────────────────────────────────

/** @type {WebSocket|null} */
let socket           = null
let retryCount       = 0
let retryTimer       = null
let intentionalClose    = false
let tokenRefreshTimer   = null
const TOKEN_REFRESH_INTERVAL = 50 * 60 * 1_000   // 50 min — 10 min margin before the 1 h expiry

/**
 * Last known presence and profile values.
 * Stored before every send so they can be re-broadcast automatically after
 * a reconnect — the server forgets them when the connection drops.
 * Start as null so we never broadcast if the UI hasn't set them yet.
 *
 * @type {string|null}
 */
let lastStatus      = null
let lastMood        = null
let lastDisplayName = null

/** @type {Set<Function>} */
const listeners = new Set()

/** @type {Array<object>} Messages queued while the socket is reconnecting */
const pendingQueue = []

// ── Internal helpers ──────────────────────────────────────────────────────────

function send(data) {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    // typing is ephemeral — "was typing 30 s ago" would be pure noise after reconnect
    if (data.type === 'typing') return
    pendingQueue.push(data)
    console.warn('[chatSocket] Socket not open — queued:', data.type)
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

    // Proactively refresh the Firebase token every 50 min so the server never
    // ends up with an expired token on a long-lived stable connection.
    if (tokenRefreshTimer) clearInterval(tokenRefreshTimer)
    tokenRefreshTimer = setInterval(async () => {
      if (!auth.currentUser) return
      try {
        const freshToken = await auth.currentUser.getIdToken(true)
        refreshToken(freshToken)
      } catch (err) {
        console.error('[chatSocket] Proactive token refresh failed:', err)
      }
    }, TOKEN_REFRESH_INTERVAL)

    // Re-broadcast the last known presence and profile so friends see the
    // correct state after the initial connect or any reconnect.
    if (lastStatus      !== null) send({ type: 'status_update',  status:      lastStatus      })
    if (lastMood        !== null) send({ type: 'mood_update',    mood:         lastMood        })
    if (lastDisplayName !== null) send({ type: 'profile_update', displayName: lastDisplayName })
    console.info('[chatSocket] Connected and authenticated')

    // Flush any messages queued while the socket was reconnecting.
    // Runs after auth + presence so the server has full context first.
    if (pendingQueue.length > 0) {
      console.info(`[chatSocket] Flushing ${pendingQueue.length} queued message(s)`)
      pendingQueue.splice(0).forEach((data) => socket.send(JSON.stringify(data)))
    }
  })

  socket.addEventListener('message', (e) => {
    try {
      notify(JSON.parse(e.data))
    } catch (err) {
      console.error('[chatSocket] Failed to parse message:', err)
    }
  })

  socket.addEventListener('close', (e) => {
    if (tokenRefreshTimer) {
      clearInterval(tokenRefreshTimer)
      tokenRefreshTimer = null
    }
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
    if (pendingQueue.length > 0) {
      notify({ type: 'send_failed', count: pendingQueue.length })
      pendingQueue.length = 0
    }
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
  pendingQueue.length = 0   // queued messages make no sense after logout
  if (tokenRefreshTimer) {
    clearInterval(tokenRefreshTimer)
    tokenRefreshTimer = null
  }
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

/** Send a buzz (nudge) to the other participant of a conversation. */
export function sendBuzz(conversationId) {
  send({ type: 'buzz', conversationId })
}

/** Broadcast the current user's presence status. */
export function updateStatus(status) {
  lastStatus = status   // persist so it survives reconnects
  send({ type: 'status_update', status })
}

/** Broadcast the current user's mood string. */
export function updateMood(mood) {
  lastMood = mood       // persist so it survives reconnects
  send({ type: 'mood_update', mood })
}

/**
 * Broadcast the current user's custom display name (nickname).
 * Stored so it is re-sent automatically after a reconnect.
 * @param {string} displayName
 */
export function updateDisplayName(displayName) {
  lastDisplayName = displayName   // persist so it survives reconnects
  send({ type: 'profile_update', displayName })
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
