import { createContext, useState, useEffect, useCallback } from 'react'
import {
  onAuthStateChanged,
  signInWithGoogle,
  signOut,
  getIdToken,
} from '../services/firebase'
import * as chatSocket from '../services/chatSocket'

export const AuthContext = createContext(null)

/**
 * AuthProvider
 *
 * Wraps the app and exposes { user, loading, signInWithGoogle, signOut }.
 *
 * Socket lifecycle:
 *  - On sign-in  → fetches a Firebase ID token → chatSocket.connect(token)
 *  - On sign-out → chatSocket.disconnect() then firebaseSignOut()
 */
export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(async (firebaseUser) => {
      setUser(firebaseUser)
      setLoading(false)

      if (firebaseUser) {
        // Fetch a (possibly cached) token and open the WebSocket
        try {
          const token = await getIdToken()
          chatSocket.connect(token)
        } catch (err) {
          console.error('[AuthContext] Failed to connect chatSocket:', err)
        }
      }
    })

    return unsubscribe
  }, [])

  /** Sign out: close socket first, then Firebase sign-out. */
  const handleSignOut = useCallback(async () => {
    chatSocket.disconnect()
    await signOut()
  }, [])

  const value = {
    user,
    loading,
    signInWithGoogle,
    signOut: handleSignOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
