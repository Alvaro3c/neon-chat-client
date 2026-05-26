/**
 * services/firebase/auth.js
 *
 * Firebase Authentication helpers: sign-in, sign-out, auth state listener.
 *
 * Also re-exports the `auth` singleton so that other modules (e.g. chatSocket)
 * can access the current user without importing from the low-level app.js.
 */

import {
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
} from 'firebase/auth'
import { auth, provider } from './app'
import { saveUserProfile } from './users'

// Re-export so consumers only need to import from 'firebase/auth'
export { auth }

// ── Auth state ────────────────────────────────────────────────────────────────

/**
 * Listen to the auth state.
 * When a user signs in for the first time their profile is saved to Firestore.
 * Returns an unsubscribe function.
 */
export function onAuthStateChanged(callback) {
  return firebaseOnAuthStateChanged(auth, async (user) => {
    if (user) {
      await saveUserProfile(user)
    }
    callback(user)
  })
}

/**
 * Return a (possibly cached) Firebase ID token for the current user.
 * Throws if there is no signed-in user.
 */
export async function getIdToken() {
  return auth.currentUser.getIdToken(false)
}

// ── Sign-in / Sign-out ────────────────────────────────────────────────────────

/** Open the Google sign-in popup. */
export async function signInWithGoogle() {
  await signInWithPopup(auth, provider)
}

/** Sign the current user out. */
export async function signOut() {
  await firebaseSignOut(auth)
}
