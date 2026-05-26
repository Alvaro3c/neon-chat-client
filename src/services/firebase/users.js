/**
 * services/firebase/users.js
 *
 * Firestore helpers for the /users collection.
 *
 * Schema:
 *   /users/{uid}
 *     name        : string   — display name (Google default, may be customised)
 *     email       : string   — Google account email
 *     photoURL    : string   — Google profile picture URL
 *     createdAt   : timestamp
 */

import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  collection,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from './app'

// ── Internal helpers ──────────────────────────────────────────────────────────

/**
 * Save (or refresh) a user's profile in Firestore.
 * Called automatically by onAuthStateChanged on every sign-in.
 *
 * First login  → creates the full document including `name` (Google display name).
 * Re-login     → only updates `email` and `photoURL` so a custom nickname the
 *                user may have set via the sidebar is never overwritten.
 */
export async function saveUserProfile(user) {
  const ref  = doc(db, 'users', user.uid)
  const snap = await getDoc(ref)

  if (!snap.exists()) {
    await setDoc(ref, {
      name:      user.displayName,
      email:     user.email,
      photoURL:  user.photoURL,
      createdAt: serverTimestamp(),
    })
  } else {
    await updateDoc(ref, {
      email:    user.email,
      photoURL: user.photoURL,
    })
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Update the display name (custom nickname) for a user in Firestore.
 * Called when the user edits their name in the sidebar footer.
 * @param {string} uid
 * @param {string} name
 */
export async function updateUserDisplayName(uid, name) {
  const ref = doc(db, 'users', uid)
  await updateDoc(ref, { name })
}

/**
 * Look up a user by their Firebase UID.
 * Returns { uid, name, email, photoURL } or null if not found.
 */
export async function getUserById(uid) {
  const ref  = doc(db, 'users', uid)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return { uid: snap.id, ...snap.data() }
}

/**
 * Look up a user by their email address.
 * Returns the user object { uid, name, email, photoURL } or null if not found.
 */
export async function getUserByEmail(email) {
  const q        = query(collection(db, 'users'), where('email', '==', email.trim().toLowerCase()))
  const snapshot = await getDocs(q)
  if (snapshot.empty) return null
  const docSnap = snapshot.docs[0]
  return { uid: docSnap.id, ...docSnap.data() }
}
