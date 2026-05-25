import { useState, useRef, useEffect, useCallback } from 'react'
import MessageList from '../MessageList'
import Input from '../../shared/Input'
import { useChat } from '../../../context/ChatContext'
import './ChatWindow.css'

// Simple SVG icon helpers — no external icon library
const IconMinus = () => <span title="Minimise">─</span>
const IconMaximize = () => <span title="Maximise">□</span>
const IconRestore = () => <span title="Restore">❐</span>
const IconClose = () => <span title="Close">✕</span>
const IconSend = () => <span>➤</span>

// How many minimized pills fit per row before wrapping to the next line
const PILLS_PER_ROW = 5
// Horizontal slot width per pill (px) — should fit the pill + a small gap
const PILL_SLOT_W = 175
// Vertical slot height per pill row (px) — pill height (~44 px) + gap
const PILL_SLOT_H = 52
// Distance from the left/bottom viewport edge for the first pill
const PILL_OFFSET_X = 16
const PILL_OFFSET_Y = 16

/**
 * ChatWindow
 *
 * A floating, draggable chat window.
 * Reads contact data and messages from ChatContext.
 *
 * @param {string}   contactId
 * @param {number}   zIndex
 * @param {{x,y}}    initialPosition
 * @param {boolean}  isMinimized      — controlled by ChatContext via App.jsx
 * @param {number}   minimizedIndex   — sequential slot index among minimized pills (-1 if not minimized)
 * @param {Function} onMinimize       — called when the user clicks the minimise button
 * @param {Function} onUnminimize     — called when the user restores the pill
 */
function ChatWindow({ contactId, zIndex, initialPosition, isMinimized, minimizedIndex, onMinimize, onUnminimize }) {
  const { contacts, messages, closeChat, focusChat, sendMessage, addReaction } = useChat()
  const contact = contacts.find((c) => c.id === contactId)

  const [inputValue, setInputValue] = useState('')
  const [isMaximized, setIsMaximized] = useState(false)
  const [position, setPosition] = useState(initialPosition)
  const [isDragging, setIsDragging] = useState(false)
  const dragOffset = useRef({ x: 0, y: 0 })
  const windowRef = useRef(null)

  // ── Drag logic ──────────────────────────────────────────────
  const handleTitleBarMouseDown = useCallback((e) => {
    if (isMaximized) return
    focusChat(contactId)
    const rect = windowRef.current?.getBoundingClientRect()
    if (rect) {
      dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
      setIsDragging(true)
    }
  }, [isMaximized, contactId, focusChat])

  useEffect(() => {
    if (!isDragging) return

    function onMove(e) {
      setPosition({
        x: Math.max(0, Math.min(e.clientX - dragOffset.current.x, window.innerWidth - 380)),
        y: Math.max(0, Math.min(e.clientY - dragOffset.current.y, window.innerHeight - 80)),
      })
    }
    function onUp() { setIsDragging(false) }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
  }, [isDragging])

  // ── Messaging ───────────────────────────────────────────────
  function handleSend() {
    sendMessage(contactId, inputValue)
    setInputValue('')
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleSend()
  }

  if (!contact) return null

  const contactMessages = messages[contactId] ?? []

  // ── Minimized pill ──────────────────────────────────────────
  if (isMinimized) {
    // Calculate the pill's column and row from its sequential index so pills
    // line up horizontally and wrap to a new row after PILLS_PER_ROW items.
    const col = minimizedIndex % PILLS_PER_ROW
    const row = Math.floor(minimizedIndex / PILLS_PER_ROW)
    const pillLeft   = PILL_OFFSET_X + col * PILL_SLOT_W
    const pillBottom = PILL_OFFSET_Y + row * PILL_SLOT_H

    return (
      <div
        className="chat-window chat-window--minimized animate-fade-in"
        style={{ zIndex, left: pillLeft, bottom: pillBottom }}
        onClick={onUnminimize}
      >
        <div className="chat-window__minimized-bar">
          <span style={{ fontSize: 18 }}>{contact.avatar}</span>
          <span className="chat-window__minimized-name">{contact.name}</span>
          <button
            className="chat-window__ctrl-btn"
            onClick={(e) => { e.stopPropagation(); onUnminimize() }}
          >
            <IconMaximize />
          </button>
          <button
            className="chat-window__ctrl-btn chat-window__ctrl-btn--close"
            onClick={(e) => { e.stopPropagation(); closeChat(contactId) }}
          >
            <IconClose />
          </button>
        </div>
      </div>
    )
  }

  // ── Full window ─────────────────────────────────────────────
  return (
    <div
      ref={windowRef}
      className={[
        'chat-window',
        'animate-fade-in',
        isDragging ? 'chat-window--dragging' : '',
        isMaximized ? 'chat-window--maximized' : '',
      ].filter(Boolean).join(' ')}
      style={{
        zIndex,
        left: isMaximized ? 0 : position.x,
        top: isMaximized ? 0 : position.y,
      }}
      onClick={() => focusChat(contactId)}
    >
      {/* Title bar */}
      <div
        className={`chat-window__titlebar ${isMaximized ? 'chat-window__titlebar--no-drag' : ''}`}
        onMouseDown={handleTitleBarMouseDown}
      >
        <div className="chat-window__contact">
          <span style={{ fontSize: 22 }}>{contact.avatar}</span>
          <div>
            <p className="chat-window__contact-name">{contact.name}</p>
            <p className="chat-window__contact-mood">{contact.mood}</p>
          </div>
        </div>

        <div className="chat-window__controls">
          <button
            className="chat-window__ctrl-btn"
            onClick={(e) => { e.stopPropagation(); onMinimize() }}
          >
            <IconMinus />
          </button>
          <button
            className="chat-window__ctrl-btn"
            onClick={(e) => { e.stopPropagation(); setIsMaximized((m) => !m) }}
          >
            {isMaximized ? <IconRestore /> : <IconMaximize />}
          </button>
          <button
            className="chat-window__ctrl-btn chat-window__ctrl-btn--close"
            onClick={(e) => { e.stopPropagation(); closeChat(contactId) }}
          >
            <IconClose />
          </button>
        </div>
      </div>

      {/* Message area */}
      <MessageList
        messages={contactMessages}
        contactName={contact.name}
        onReact={(msgId, emoji) => addReaction(contactId, msgId, emoji)}
      />

      {/* Input area */}
      <div className="chat-window__input-area">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="type ur msg..."
        />
        <button
          className="chat-window__send-btn"
          onClick={(e) => { e.stopPropagation(); handleSend() }}
          disabled={!inputValue.trim()}
        >
          <IconSend />
        </button>
      </div>
    </div>
  )
}

export default ChatWindow
