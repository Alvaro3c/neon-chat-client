import { useContext } from 'react'
import { AuthContext } from '../context/AuthContext'

/**
 * useAuth
 *
 * Convenience hook that reads from AuthContext.
 * Throws if used outside an <AuthProvider>.
 *
 * @returns {{ user: object|null, loading: boolean, signInWithGoogle: Function, signOut: Function }}
 */
function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>')
  }
  return ctx
}

export default useAuth
