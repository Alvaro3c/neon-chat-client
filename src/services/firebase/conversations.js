/**
 * services/firebase/conversations.js
 *
 * Firestore helpers for the /conversations collection.
 *
 * Schema:
 *   /conversations/{id}
 *     participants  : [uid, uid]   — exactly two UIDs
 *     initiatedBy   : uid          — who started the conversation
 *     status        : 'pending' | 'active'
 *     createdAt     : timestamp
 */

import {
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from './app'

// ── Internal helpers ──────────────────────────────────────────────────────────

/**
 * Check if a conversation already exists between two users.
 * Returns the conversation doc (with id) or null.
 */
async function getExistingConversation(uid1, uid2) {
  const q        = query(collection(db, 'conversations'), where('participants', 'array-contains', uid1))
  const snapshot = await getDocs(q)
  const match    = snapshot.docs.find((d) => d.data().participants.includes(uid2))
  return match ? { id: match.id, ...match.data() } : null
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Create a new pending conversation between two users.
 * The recipient will see it in their Requests tab.
 * Prevents duplicates — returns the existing conversation ID if one exists.
 * @returns {string} The conversation document ID.
 */
export async function createConversation(fromUid, toUid) {
  const existing = await getExistingConversation(fromUid, toUid)
  if (existing) return existing.id

  const ref = await addDoc(collection(db, 'conversations'), {
    participants: [fromUid, toUid],
    initiatedBy:  fromUid,
    status:       'pending',
    createdAt:    serverTimestamp(),
  })
  return ref.id
}

/**
 * Accept a conversation request — sets status to 'active'.
 */
export async function acceptConversation(conversationId) {
  const ref = doc(db, 'conversations', conversationId)
  await updateDoc(ref, { status: 'active' })
}

/**
 * Decline (and delete) a conversation request.
 */
export async function declineConversation(conversationId) {
  const ref = doc(db, 'conversations', conversationId)
  await deleteDoc(ref)
}

/**
 * Subscribe to all conversations for a given user in real time.
 * Calls onUpdate(conversations) whenever anything changes.
 * Returns an unsubscribe function.
 *
 * Each conversation object:  { id, participants, initiatedBy, status, createdAt }
 */
export function subscribeToConversations(uid, onUpdate) {
  const q = query(collection(db, 'conversations'), where('participants', 'array-contains', uid))
  return onSnapshot(q, (snapshot) => {
    const conversations = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
    onUpdate(conversations)
  })
}
