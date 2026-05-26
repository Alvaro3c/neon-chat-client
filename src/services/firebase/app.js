/**
 * services/firebase/app.js
 *
 * Initialises Firebase once and exports the shared singletons used by the
 * rest of the firebase service modules (auth.js, users.js, conversations.js).
 *
 * Nothing here should be imported directly by UI code — import the
 * domain-specific modules instead (firebase/auth, firebase/users, etc.).
 */

import { initializeApp }    from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore }     from 'firebase/firestore'

// ── Config (values come from .env — never hardcoded) ──────────────────────────
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
}

export const app      = initializeApp(firebaseConfig)
export const auth     = getAuth(app)
export const db       = getFirestore(app)
export const provider = new GoogleAuthProvider()
