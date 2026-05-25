import { useState, useRef, useEffect } from 'react'
import Avatar from '../../shared/Avatar'
import Input from '../../shared/Input'
import { useChat } from '../../../context/ChatContext'
import useDragAndDrop from '../../../hooks/useDragAndDrop'
import { auth, getUserByEmail, createConversation } from '../../../services/firebase'
import * as chatSocket from '../../../services/chatSocket'
import './ConversationSidebar.css'

// ── Theme config ─────────────────────────────────────────────
const THEMES = [
  { value: 'cyan', label: 'Cyan', dot: 'oklch(0.85 0.20 190)' },
  { value: 'orange', label: 'Orange', dot: 'oklch(0.80 0.20 55)' },
  { value: 'purple', label: 'Purple', dot: 'oklch(0.60 0.22 290)' },
  { value: 'green', label: 'Green', dot: 'oklch(0.55 0.20 145)' },
]

// ── User status config ────────────────────────────────────────
//
// `dot`   — which canonical Avatar dot to show (online | away | busy | offline).
//           Lets us use unusual status values while keeping the Avatar component
//           simple (it only needs CSS for the 4 canonical dot states).
// `color` — colour used for the status label text in the sidebar.
const USER_STATUSES = [
  { value: 'online',   label: 'Online',                    color: 'var(--color-status-online)', dot: 'online'  },
  { value: 'away',     label: 'Away',                      color: 'var(--color-status-away)',   dot: 'away'    },
  { value: 'busy',     label: 'Busy',                      color: 'var(--color-status-busy)',   dot: 'busy'    },
  { value: 'sober',    label: 'sober JK unless',           color: 'var(--color-neon-cyan)',     dot: 'online'  },
  { value: 'breaking', label: 'Breaking stuff',            color: 'var(--color-status-busy)',   dot: 'busy'    },
  { value: 'noregret', label: 'I got no regret right now', color: 'var(--color-neon-cyan)',     dot: 'online'  },
  { value: 'train',    label: 'There is a train',          color: 'var(--color-status-away)',   dot: 'away'    },
  { value: 'misrep',   label: 'Misrepresented',            color: 'var(--color-text-muted)',    dot: 'offline' },
  { value: 'scotty',   label: "Scotty doesn't know",       color: 'var(--color-status-online)', dot: 'online'  },
]

/** Resolve a status value to its human-readable label, falling back to the raw value. */
const getStatusLabel = (value) => USER_STATUSES.find((s) => s.value === value)?.label ?? value

/** Resolve a status value to its canonical Avatar dot state (online|away|busy|offline). */
const getStatusDot = (value) => USER_STATUSES.find((s) => s.value === value)?.dot ?? 'offline'

/**
 * ConversationSidebar
 *
 * Buddy-list panel. Includes:
 *  - Header with title + theme switcher
 *  - Search + All/Online filter
 *  - Drag-to-reorder contact list
 *  - User profile footer with editable name/mood + status selector
 */
function ConversationSidebar() {
  const {
    contacts, setContacts, openChats, openChat, contactStatuses,
    requests, acceptRequest, declineRequest,
  } = useChat()

  /**
   * Return the real-time status for a contact if the server has sent one,
   * otherwise fall back to the static value stored in the contact object.
   */
  const getLiveStatus = (contact) =>
    contactStatuses[contact.uid]?.status ?? contact.status

  /**
   * Same fall-back pattern for mood.
   */
  const getLiveMood = (contact) =>
    contactStatuses[contact.uid]?.mood ?? contact.mood

  const { getDragProps, getDropProps } = useDragAndDrop(contacts, setContacts)

  // Search & filter
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all') // 'all' | 'online' | 'requests'

  // New conversation
  const [addingConv, setAddingConv] = useState(false)
  const [newConvEmail, setNewConvEmail] = useState('')
  const [convError, setConvError] = useState('')
  const [convLoading, setConvLoading] = useState(false)

  // Theme
  const [theme, setTheme] = useState('cyan')
  const [themeMenuOpen, setThemeMenuOpen] = useState(false)
  const themeRef = useRef(null)

  // User profile
  const [userName, setUserName] = useState(() => auth.currentUser?.displayName || 'xX_You_Xx')
  const [editingName, setEditingName] = useState(false)
  const [tempName, setTempName] = useState(userName)

  const [userMood, setUserMood] = useState('~*feeling emo today*~')
  const [editingMood, setEditingMood] = useState(false)
  const [tempMood, setTempMood] = useState(userMood)

  const [userStatus, setUserStatus] = useState('online')
  const [statusMenuOpen, setStatusMenuOpen] = useState(false)
  const statusRef = useRef(null)

  // ── Broadcast initial presence on mount ───────────────────
  // The socket may not be open yet when this runs, but chatSocket stores
  // these values and re-sends them automatically once the connection is
  // established (or re-established after a network drop).
  useEffect(() => {
    chatSocket.updateStatus(userStatus)
    chatSocket.updateMood(userMood)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // intentionally runs once — we only need to seed the initial values

  // ── Theme switch ──────────────────────────────────────────
  function handleThemeChange(value) {
    setTheme(value)
    setThemeMenuOpen(false)
    const root = document.documentElement
    THEMES.forEach((t) => root.classList.remove(`theme-${t.value}`))
    root.classList.add(`theme-${value}`)
  }

  // ── Name editing ──────────────────────────────────────────
  function commitName() {
    setUserName(tempName.trim() || userName)
    setEditingName(false)
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

  // ── New conversation ─────────────────────────────────────
  async function handleNewConvSubmit() {
    const email = newConvEmail.trim()
    if (!email) return

    const currentUser = auth.currentUser
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

      // 3. Create (or retrieve an existing) conversation in Firestore.
      //    createConversation returns the conversation ID.
      const convId = await createConversation(currentUser.uid, targetUser.uid)

      // 4. Open the chat window immediately (works even if still pending)
      openChat(convId)
      setNewConvEmail('')
      setAddingConv(false)
    } catch (err) {
      console.error('[ConversationSidebar] handleNewConvSubmit error:', err)
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

  // ── Request actions ───────────────────────────────────────
  async function handleAcceptRequest(reqId) {
    await acceptRequest(reqId)
    setFilter('all')
  }

  async function handleDeclineRequest(reqId) {
    await declineRequest(reqId)
  }

  // ── Filtered contacts ─────────────────────────────────────
  const filtered = contacts.filter((c) => {
    const matchName = c.name.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' || getStatusDot(getLiveStatus(c)) === 'online'
    return matchName && matchFilter
  })

  const onlineCount = contacts.filter((c) => getStatusDot(getLiveStatus(c)) === 'online').length
  const openIds = openChats.map((oc) => oc.contactId)

  const currentStatus = USER_STATUSES.find((s) => s.value === userStatus)

  return (
    <aside className="sidebar">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="sidebar__header">
        <div className="sidebar__header-center">
          <h1 className="sidebar__title">Sidekicks</h1>
          <p className="sidebar__online-count">
            {onlineCount === 0
              ? 'no friends online'
              : onlineCount === 1
                ? '1 friend online'
                : `${onlineCount} friends online`}
          </p>
        </div>

        {/* Theme switcher */}
        <div style={{ position: 'relative' }} ref={themeRef}>
          <button
            className="sidebar__theme-btn"
            onClick={() => setThemeMenuOpen((o) => !o)}
            title="Change theme"
          >
            🎨
          </button>
          {themeMenuOpen && (
            <div className="sidebar__theme-menu">
              {THEMES.map((t) => (
                <button
                  key={t.value}
                  className={`sidebar__theme-option ${theme === t.value ? 'sidebar__theme-option--active' : ''}`}
                  onClick={() => handleThemeChange(t.value)}
                >
                  <span
                    className="sidebar__theme-dot"
                    style={{ background: t.dot }}
                  />
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Search & filter ────────────────────────────────── */}
      <div className="sidebar__search-area">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="search ur buddies..."
          size="sm"
        />

        {/* ── New Conversation ─────────────────────────────── */}
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
            onClick={() => setFilter('all')}
          >
            All ({contacts.length})
          </button>
          <button
            className={`sidebar__filter-btn ${filter === 'online' ? 'sidebar__filter-btn--active-online' : ''}`}
            onClick={() => setFilter('online')}
          >
            Online ({onlineCount})
          </button>
          <button
            className={`sidebar__filter-btn ${filter === 'requests' ? 'sidebar__filter-btn--active-requests' : ''}`}
            onClick={() => setFilter('requests')}
          >
            Requests
            {requests.length > 0 && (
              <span className="sidebar__filter-badge">{requests.length}</span>
            )}
          </button>
        </div>
      </div>

      {/* ── Contact list ───────────────────────────────────── */}
      {filter === 'requests' ? (
        <ul className="sidebar__list">
          {requests.length === 0 ? (
            <li className="sidebar__empty-state">no pending requests ✨</li>
          ) : (
            requests.map((req) => (
              <li key={req.id} className="request-item">
                <Avatar src={req.photoURL || undefined} emoji={req.avatar} size="md" />
                <div className="request-item__info">
                  <p className="request-item__name">{req.name}</p>
                  <p className="request-item__email">{req.email}</p>
                </div>
                <div className="request-item__actions">
                  <button
                    className="request-item__accept"
                    onClick={() => handleAcceptRequest(req.id)}
                    title="Accept"
                  >
                    ✓
                  </button>
                  <button
                    className="request-item__decline"
                    onClick={() => handleDeclineRequest(req.id)}
                    title="Decline"
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))
          )}
        </ul>
      ) : (
        <ul className="sidebar__list">
          {filtered.length === 0 ? (
            <li className="sidebar__empty-state">
              {contacts.length === 0
                ? 'no conversations yet — start one above!'
                : 'no contacts match ur search'}
            </li>
          ) : (
            filtered.map((contact, index) => {
              const isOpen = openIds.includes(contact.id)
              const liveStatus = getLiveStatus(contact)
              const liveMood = getLiveMood(contact)
              return (
                <li
                  key={contact.id}
                  className={[
                    'contact-item',
                    isOpen ? 'contact-item--open' : '',
                  ].filter(Boolean).join(' ')}
                  onClick={() => openChat(contact.id)}
                  {...getDragProps(index)}
                  {...getDropProps(index)}
                >
                  <span className="contact-item__drag-handle">⠿</span>
                  <Avatar
                    src={contact.photoURL || undefined}
                    emoji={contact.avatar}
                    status={getStatusDot(liveStatus)}
                    size="md"
                  />
                  <div className="contact-item__info">
                    <p className="contact-item__name">{contact.name}</p>
                    <p className="contact-item__mood">{liveMood}</p>
                    <p className={`contact-item__status-label contact-item__status-label--${getStatusDot(liveStatus)}`}>
                      {getStatusLabel(liveStatus)}
                    </p>
                  </div>
                  {isOpen && <span className="contact-item__open-dot" title="Chat open" />}
                </li>
              )
            })
          )}
        </ul>
      )}

      {/* ── User profile footer ─────────────────────────────── */}
      <div className="sidebar__footer">
        {/* Avatar with live status dot */}
        <Avatar
          src={auth.currentUser?.photoURL || undefined}
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
                  onClick={() => { setUserStatus(s.value); setStatusMenuOpen(false); chatSocket.updateStatus(s.value) }}
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
    </aside>
  )
}

export default ConversationSidebar
