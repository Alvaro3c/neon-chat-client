/**
 * hooks/useContacts.js
 *
 * Subscribes to all conversations for the current user and builds the
 * contacts (active) and requests (pending) lists by fetching each
 * participant's profile from /users.
 *
 * Exposes:
 *  - contacts    — active conversations mapped to contact objects
 *  - setContacts — for drag-to-reorder and real-time profile updates
 *  - requests    — pending conversations where the current user is the recipient
 *
 * Race-condition safety: Firestore can emit multiple snapshots in quick
 * succession. A call counter (callCounterRef) ensures that only the result
 * of the LATEST snapshot callback is committed to state — slower, older
 * Promise.all resolutions are silently discarded.
 */

import { useState, useEffect, useRef } from 'react'
import useAuth from './useAuth'
import { getUserById } from '../services/firebase/users'
import { subscribeToConversations } from '../services/firebase/conversations'

export function useContacts() {
  const { user } = useAuth()
  const [contacts, setContacts] = useState([])
  const [requests, setRequests] = useState([])

  /** Tracks the invocation count of the snapshot callback. */
  const callCounterRef = useRef(0)

  useEffect(() => {
    if (!user) return

    const myUid = user.uid

    /**
     * Given a conversation document, fetch the OTHER participant's profile
     * from the /users collection and return a contact-shaped object.
     * The contact's `id` field equals the Firestore conversation document
     * ID — this is what gets passed as `conversationId` when sending messages.
     * Used for both active contacts and pending requests.
     */
    async function buildContact(conv) {
      const otherUid = conv.participants.find((p) => p !== myUid)
      const profile  = await getUserById(otherUid)
      return {
        id:       conv.id,          // ← Firestore conversation doc ID (= conversationId)
        uid:      otherUid,         // ← other user's Firebase UID (for presence events)
        name:     profile?.name  || profile?.email || 'Unknown',
        email:    profile?.email || '',
        photoURL: profile?.photoURL || '',
        avatar:   '👤',             // fallback emoji (Avatar prefers photoURL when set)
        status:   'offline',
        mood:     '',
      }
    }

    const unsub = subscribeToConversations(myUid, async (conversations) => {
      // Stamp this invocation; if a newer snapshot arrives while we await,
      // thisCall will no longer match callCounterRef.current and we bail out.
      callCounterRef.current += 1
      const thisCall = callCounterRef.current

      const activeConvs  = conversations.filter((c) => c.status === 'active')
      const pendingConvs = conversations.filter(
        (c) => c.status === 'pending' && c.initiatedBy !== myUid,
      )

      // Resolve both lists in parallel — single await, single render
      const [newContacts, newRequests] = await Promise.all([
        Promise.all(activeConvs.map(buildContact)),
        Promise.all(pendingConvs.map(buildContact)),
      ])

      // Discard stale results if a newer snapshot has already started
      if (thisCall !== callCounterRef.current) return

      setContacts(newContacts)
      setRequests(newRequests)
    })

    return () => {
      // Invalidate any in-flight Promise.all before tearing down the listener
      callCounterRef.current = 0
      unsub()
    }
  }, [user])

  return { contacts, setContacts, requests }
}
