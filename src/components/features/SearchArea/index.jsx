import { useState } from 'react'
import Input from '../../shared/Input'
import useAuth from '../../../hooks/useAuth'
import { getUserByEmail } from '../../../services/firebase/users'
import { createConversation } from '../../../services/firebase/conversations'
import './SearchArea.css'

/**
 * SearchArea
 *
 * Search input, add-buddy form, and All/Online/Requests filter tabs.
 * Owns the new-conversation form state internally; search and filter
 * are controlled from the parent (ContactsPanel) because the list
 * needs them to compute its filtered output.
 */
function SearchArea({
  search,
  onSearchChange,
  filter,
  onFilterChange,
  contactCount,
  onlineCount,
  requestCount,
  onConvCreated,
}) {
  const { user } = useAuth()
  const [addingConv, setAddingConv] = useState(false)
  const [newConvEmail, setNewConvEmail] = useState('')
  const [convError, setConvError] = useState('')
  const [convLoading, setConvLoading] = useState(false)

  // ── New conversation ──────────────────────────────────────
  async function handleNewConvSubmit() {
    const email = newConvEmail.trim()
    if (!email) return

    const currentUser = user
    if (!currentUser) return

    setConvLoading(true)
    setConvError('')

    try {
      // 1. Look up the target user by email in Firestore
      const targetUser = await getUserByEmail(email)
      if (!targetUser) {
        setConvError('No user found with that email.')
        setConvLoading(false)
        return
      }

      // 2. Can't start a conversation with yourself
      if (targetUser.uid === currentUser.uid) {
        setConvError("That's your own email, genius.")
        setConvLoading(false)
        return
      }

      // 3. Create (or retrieve an existing) conversation in Firestore
      const convId = await createConversation(currentUser.uid, targetUser.uid)

      // 4. Notify parent to open the chat window
      onConvCreated(convId)
      setNewConvEmail('')
      setAddingConv(false)
    } catch (err) {
      console.error('[SearchArea] handleNewConvSubmit error:', err)
      setConvError('Something went wrong. Try again.')
    } finally {
      setConvLoading(false)
    }
  }

  function handleNewConvKey(e) {
    if (e.key === 'Enter' && newConvEmail.trim()) handleNewConvSubmit()
    if (e.key === 'Escape') cancelNewConv()
  }

  function cancelNewConv() {
    setNewConvEmail('')
    setConvError('')
    setAddingConv(false)
  }

  return (
    <div className="sidebar__search-area">
      <Input
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="search ur buddies..."
        size="sm"
      />

      {/* ── New Conversation ──────────────────────────────── */}
      {addingConv ? (
        <div className="sidebar__new-conv-row">
          <input
            className="sidebar__new-conv-input"
            type="email"
            value={newConvEmail}
            onChange={(e) => { setNewConvEmail(e.target.value); setConvError('') }}
            onKeyDown={handleNewConvKey}
            placeholder="type their email to start chatting..."
            autoFocus
            disabled={convLoading}
          />
          <button
            className="sidebar__new-conv-cancel"
            onClick={cancelNewConv}
            title="Cancel"
            disabled={convLoading}
          >
            ✕
          </button>
          {convError && (
            <p className="sidebar__new-conv-error">{convError}</p>
          )}
        </div>
      ) : (
        <button
          className="sidebar__new-conv-btn"
          onClick={() => setAddingConv(true)}
        >
          + Add a new buddy
        </button>
      )}

      {/* ── Filter tabs ──────────────────────────────────── */}
      <div className="sidebar__filter-row">
        <button
          className={`sidebar__filter-btn ${filter === 'all' ? 'sidebar__filter-btn--active-all' : ''}`}
          onClick={() => onFilterChange('all')}
        >
          All ({contactCount})
        </button>
        <button
          className={`sidebar__filter-btn ${filter === 'online' ? 'sidebar__filter-btn--active-online' : ''}`}
          onClick={() => onFilterChange('online')}
        >
          Online ({onlineCount})
        </button>
        <button
          className={`sidebar__filter-btn ${filter === 'requests' ? 'sidebar__filter-btn--active-requests' : ''}`}
          onClick={() => onFilterChange('requests')}
        >
          Requests
          {requestCount > 0 && (
            <span className="sidebar__filter-badge">{requestCount}</span>
          )}
        </button>
      </div>
    </div>
  )
}

export default SearchArea
