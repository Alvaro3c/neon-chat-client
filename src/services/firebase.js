/**
 * services/firebase.js
 *
 * Firebase Auth + Firestore wiring.
 *
 * Firestore collections used by this app:
 *
 *   /users/{uid}
 *     name        : string   — display name from Google
 *     email       : string   — Google account email
 *     photoURL    : string   — Google profile picture URL
 *     createdAt   : timestamp
 *
 *   /conversations/{id}
 *     participants  : [uid, uid]   — exactly two UIDs
 *     initiatedBy   : uid          — who started the conversation
 *     status        : 'pending' | 'active'
 *     createdAt     : timestamp
 */

import { initializeApp } from 'firebase/app'
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
} from 'firebase/auth'
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
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

// ── Config (values come from .env — never hardcoded) ──────────
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
}

const app            = initializeApp(firebaseConfig)
export const auth    = getAuth(app)
const db             = getFirestore(app)
const provider       = new GoogleAuthProvider()

// ── AUTH ──────────────────────────────────────────────────────

/**
 * Listen to the auth state.
 * When a user logs in for the first time their profile is saved to Firestore.
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

/** Open the Google sign-in popup. */
export async function signInWithGoogle() {
  await signInWithPopup(auth, provider)
}

/** Sign the current user out. */
export async function signOut() {
  await firebaseSignOut(auth)
}

// ── USERS ─────────────────────────────────────────────────────

/**
 * Save (or refresh) a user's profile in Firestore.
 * Uses setDoc with merge:true so it won't overwrite existing fields.
 */
async function saveUserProfile(user) {
  const ref = doc(db, 'users', user.uid)
  await setDoc(ref, {
    name:     user.displayName,
    email:    user.email,
    photoURL: user.photoURL,
    createdAt: serverTimestamp(),
  }, { merge: true })
}

/**
 * Look up a user by their Firebase UID.
 * Returns { uid, name, email, photoURL } or null if not found.
 */
export async function getUserById(uid) {
  const ref = doc(db, 'users', uid)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return { uid: snap.id, ...snap.data() }
}

/**
 * Look up a user by their email address.
 * Returns the user object { uid, name, email, photoURL } or null if not found.
 */
export async function getUserByEmail(email) {
  const q = query(collection(db, 'users'), where('email', '==', email.trim().toLowerCase()))
  const snapshot = await getDocs(q)
  if (snapshot.empty) return null
  const docSnap = snapshot.docs[0]
  return { uid: docSnap.id, ...docSnap.data() }
}

// ── CONVERSATIONS ─────────────────────────────────────────────

/**
 * Create a new pending conversation between two users.
 * The recipient will see it in their Requests tab.
 * Returns the new conversation's ID.
 */
export async function createConversation(fromUid, toUid) {
  // Prevent duplicate conversations between the same two users
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
 * Check if a conversation already exists between two users.
 * Returns the conversation doc (with id) or null.
 */
async function getExistingConversation(uid1, uid2) {
  const q = query(
    collection(db, 'conversations'),
    where('participants', 'array-contains', uid1)
  )
  const snapshot = await getDocs(q)
  const match = snapshot.docs.find((d) => d.data().participants.includes(uid2))
  return match ? { id: match.id, ...match.data() } : null
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
 * Each conversation object has the shape:
 *   { id, participants, initiatedBy, status, createdAt }
 */
export function subscribeToConversations(uid, onUpdate) {
  const q = query(
    collection(db, 'conversations'),
    where('participants', 'array-contains', uid)
  )
  return onSnapshot(q, (snapshot) => {
    const conversations = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
    onUpdate(conversations)
  })
}
