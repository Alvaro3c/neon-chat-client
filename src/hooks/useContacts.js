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
 */

import { useState, useEffect } from 'react'
import { auth } from '../services/firebase/auth'
import { getUserById } from '../services/firebase/users'
import { subscribeToConversations } from '../services/firebase/conversations'

export function useContacts() {
  const [contacts, setContacts] = useState([])
  const [requests, setRequests] = useState([])

  useEffect(() => {
    const currentUser = auth.currentUser
    if (!currentUser) return

    const myUid = currentUser.uid

    /**
     * Given a conversation document, fetch the OTHER participant's profile
     * from the /users collection and return a contact-shaped object.
     * The contact's `id` field equals the Firestore conversation document
     * ID — this is what gets passed as `conversationId` when sending messages.
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
      const activeConvs  = conversations.filter((c) => c.status === 'active')
      const pendingConvs = conversations.filter(
        (c) => c.status === 'pending' && c.initiatedBy !== myUid,
      )

      const newContacts = await Promise.all(activeConvs.map(buildContact))

      const newRequests = await Promise.all(
        pendingConvs.map(async (conv) => {
          const otherUid = conv.participants.find((p) => p !== myUid)
          const profile  = await getUserById(otherUid)
          return {
            id:       conv.id,
            uid:      otherUid,
            name:     profile?.name  || profile?.email || 'Unknown',
            email:    profile?.email || '',
            avatar:   '👤',
            photoURL: profile?.photoURL || '',
          }
        }),
      )

      setContacts(newContacts)
      setRequests(newRequests)
    })

    return unsub
  }, [])

  return { contacts, setContacts, requests }
}
