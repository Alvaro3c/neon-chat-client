import { useState, useRef, useEffect } from 'react'
import Avatar from '../../shared/Avatar'
import useAuth from '../../../hooks/useAuth'
import { updateUserDisplayName } from '../../../services/firebase/users'
import * as chatSocket from '../../../services/socket/chatSocket'
import { USER_STATUSES, getStatusDot } from '../../../constants/statuses'
import './ProfileFooter.css'

/**
 * ProfileFooter
 *
 * Bottom bar showing the current user's avatar, editable nickname,
 * editable mood line, and a status picker (Online/Away/Busy/Offline).
 * Fully self-contained — owns all profile state and broadcasts
 * changes via WebSocket and Firestore.
 */
function ProfileFooter() {
  const { user } = useAuth()

  // ── Name ─────────────────────────────────────────────────
  const [userName, setUserName] = useState(user?.displayName || 'xX_You_Xx')
  const [editingName, setEditingName] = useState(false)
  const [tempName, setTempName] = useState(userName)

  // ── Mood ─────────────────────────────────────────────────
  const [userMood, setUserMood] = useState('This is my status')
  const [editingMood, setEditingMood] = useState(false)
  const [tempMood, setTempMood] = useState(userMood)

  // ── Status ───────────────────────────────────────────────
  const [userStatus, setUserStatus] = useState('online')
  const [statusMenuOpen, setStatusMenuOpen] = useState(false)
  const statusRef = useRef(null)

  // ── Broadcast initial presence on mount ──────────────────
  // chatSocket queues these values and re-sends on reconnect.
  useEffect(() => {
    chatSocket.updateStatus(userStatus)
    chatSocket.updateMood(userMood)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // intentionally runs once — seeds the initial values

  // ── Click-outside: status menu ────────────────────────────
  useEffect(() => {
    if (!statusMenuOpen) return
    function handleClickOutside(e) {
      if (statusRef.current && !statusRef.current.contains(e.target)) {
        setStatusMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [statusMenuOpen])

  // ── Name editing ──────────────────────────────────────────
  function commitName() {
    const next = tempName.trim() || userName
    setEditingName(false)
    if (next === userName) return
    setUserName(next)
    const uid = user?.uid
    if (uid) {
      updateUserDisplayName(uid, next).catch((err) =>
        console.error('[ProfileFooter] Failed to save display name:', err)
      )
    }
    chatSocket.updateDisplayName(next)
  }
  function handleNameKey(e) {
    if (e.key === 'Enter') commitName()
    if (e.key === 'Escape') { setTempName(userName); setEditingName(false) }
  }

  // ── Mood editing ──────────────────────────────────────────
  function commitMood() {
    const next = tempMood.trim() || userMood
    setUserMood(next)
    setEditingMood(false)
    chatSocket.updateMood(next)
  }
  function handleMoodKey(e) {
    if (e.key === 'Enter') commitMood()
    if (e.key === 'Escape') { setTempMood(userMood); setEditingMood(false) }
  }

  const currentStatus = USER_STATUSES.find((s) => s.value === userStatus)

  return (
    <div className="sidebar__footer">
      {/* Avatar with live status dot */}
      <Avatar
        src={user?.photoURL || undefined}
        emoji="🎧"
        status={getStatusDot(userStatus)}
        size="md"
      />

      <div className="sidebar__footer-info">
        {/* Editable nickname */}
        {editingName ? (
          <input
            className="sidebar__editable-input"
            value={tempName}
            onChange={(e) => setTempName(e.target.value)}
            onBlur={commitName}
            onKeyDown={handleNameKey}
            autoFocus
          />
        ) : (
          <button
            className="sidebar__editable"
            onClick={() => { setTempName(userName); setEditingName(true) }}
            title="Click to edit nickname"
          >
            {userName}
          </button>
        )}

        {/* Editable mood */}
        {editingMood ? (
          <input
            className="sidebar__status-input"
            value={tempMood}
            onChange={(e) => setTempMood(e.target.value)}
            onBlur={commitMood}
            onKeyDown={handleMoodKey}
            autoFocus
          />
        ) : (
          <button
            className="sidebar__status-text"
            onClick={() => { setTempMood(userMood); setEditingMood(true) }}
            title="Click to edit status"
          >
            {userMood}
          </button>
        )}
      </div>

      {/* Online status picker */}
      <div style={{ position: 'relative' }} ref={statusRef}>
        {statusMenuOpen && (
          <div className="sidebar__status-dropdown">
            {USER_STATUSES.map((s) => (
              <button
                key={s.value}
                className={`sidebar__status-option ${userStatus === s.value ? 'sidebar__status-option--active' : ''}`}
                style={{ color: s.color }}
                onClick={() => {
                  setUserStatus(s.value)
                  setStatusMenuOpen(false)
                  chatSocket.updateStatus(s.value)
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
        <button
          className="sidebar__online-status-btn"
          style={{ color: currentStatus?.color }}
          onClick={() => setStatusMenuOpen((o) => !o)}
          title="Change your status"
        >
          {currentStatus?.label}
        </button>
      </div>
    </div>
  )
}

export default ProfileFooter
