/**
 * hooks/useContacts.js
 *
 * TODO: extract Firestore contacts subscription from ChatContext.
 *
 * Will subscribe to /conversations for the current user and build the
 * contacts (active) and requests (pending) lists by fetching each
 * participant's profile from /users.
 *
 * Will expose:
 *  - contacts   — active conversations mapped to contact objects
 *  - requests   — pending conversations where the current user is the recipient
 *  - contactsRef — mutable ref that always mirrors contacts (for socket handlers)
 */

export function useContacts() {
  throw new Error('useContacts: not yet implemented — logic still lives in ChatContext')
}
