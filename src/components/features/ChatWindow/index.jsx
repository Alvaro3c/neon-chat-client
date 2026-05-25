import { useState, useRef, useEffect, useCallback } from 'react'
import MessageList from '../MessageList'
import Input from '../../shared/Input'
import { useChat } from '../../../context/ChatContext'
import * as chatSocket from '../../../services/chatSocket'
import './ChatWindow.css'

function playBuzzSound() {
  const audio = new Audio('/assets/sounds/zumbido.mp3')
  audio.play().catch(() => {}) // silently ignore autoplay policy blocks
}

// Simple SVG icon helpers — no external icon library
const IconMinus = () => <span title="Minimise">─</span>
const IconMaximize = () => <span title="Maximise">□</span>
const IconRestore = () => <span title="Restore">❐</span>
const IconClose = () => <span title="Close">✕</span>
const IconSend = () => <span>➤</span>

const IconEmoji = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M8 14s1.5 2 4 2 4-2 4-2" />
    <line x1="9" y1="9" x2="9.01" y2="9" />
    <line x1="15" y1="9" x2="15.01" y2="9" />
  </svg>
)

const IconBuzz = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12c0-1 .5-2 1.5-2.5M6 7.5C7.5 5.5 9.5 4 12 4s4.5 1.5 6 3.5" />
    <path d="M4.5 16.5C3.5 15 3 13.5 3 12M22 12c0 1-.5 2-1.5 2.5" />
    <path d="M18 16.5c-1.5 2-3.5 3.5-6 3.5s-4.5-1.5-6-3.5" />
    <circle cx="12" cy="12" r="2" fill="currentColor" />
  </svg>
)

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
  const { contacts, messages, closeChat, focusChat, sendMessage, addReaction, typingStatus, buzzSignals, addSystemMessage } = useChat()
  const contact = contacts.find((c) => c.id === contactId)

  const [inputValue, setInputValue] = useState('')
  const [isMaximized, setIsMaximized] = useState(false)
  const [position, setPosition] = useState(initialPosition)
  const [isDragging, setIsDragging] = useState(false)
  const [isBuzzing, setIsBuzzing] = useState(false) // button animation (sent)
  const dragOffset = useRef({ x: 0, y: 0 })
  const windowRef = useRef(null)

  // Captures the buzz count at mount time so we never replay a buzz that
  // arrived while this window was closed or hadn't been opened yet.
  const lastSeenBuzzRef = useRef(buzzSignals[contactId] ?? 0)

  // ── React to incoming buzz ────────────────────────────────
  useEffect(() => {
    const current = buzzSignals[contactId] ?? 0
    // Ignore signals that were already "seen" before this window mounted
    if (current <= lastSeenBuzzRef.current) return
    lastSeenBuzzRef.current = current

    // Shake the window via the DOM ref — bypasses the React render cycle
    // so the CSS animation always restarts cleanly.
    const el = windowRef.current
    if (el) {
      el.classList.remove('chat-window--buzzed')
      void el.offsetWidth                    // force reflow → animation restarts
      el.classList.add('chat-window--buzzed')
      setTimeout(() => el.classList.remove('chat-window--buzzed'), 820)
    }

    // Only the receiver plays the sound
    playBuzzSound()
  }, [buzzSignals[contactId]]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Toolbar handlers ──────────────────────────────────────
  function handleBuzz() {
    // Animate the button only — the receiver plays the sound, not the sender
    setIsBuzzing(true)
    setTimeout(() => setIsBuzzing(false), 600)
    // Send over the socket
    chatSocket.sendBuzz(contactId)
    // Local confirmation message (server only notifies the other side)
    addSystemMessage(contactId, `You sent ${contact?.name ?? 'them'} a buzz! 〰️`)
  }

  function handleOpenEmoji() {
    // Step 4: open emoji modal logic will go here
  }

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
        isDragging  ? 'chat-window--dragging' : '',
        isMaximized ? 'chat-window--maximized' : '',
      ].filter(Boolean).join(' ')}
      style={{
        zIndex,
        left: isMaximized ? 0 : position.x,
        top: isMaximized ? 0 : position.y,
      }}
      onClick={() => focusChat(contactId)}
    >
      {/*
        shake-layer: inner wrapper that receives the buzz animation.
        The outer div keeps position:fixed (can't animate transform on fixed
        elements when an ancestor has backdrop-filter). This inner div is a
        normal block element — transform works reliably on it.
      */}
      <div className="chat-window__shake-layer">

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

      {/* Bottom section: toolbar + input row */}
      <div className="chat-window__bottom">

        {/* Toolbar — buzz & emoticons */}
        <div className="chat-window__toolbar">
          <button
            className="chat-window__tool-btn"
            title="Open emoticons (Ctrl+I)"
            onClick={(e) => { e.stopPropagation(); handleOpenEmoji() }}
          >
            <IconEmoji />
            <span>Emoticons</span>
          </button>

          <button
            className={`chat-window__tool-btn chat-window__tool-btn--buzz ${isBuzzing ? 'chat-window__tool-btn--buzzing' : ''}`}
            title="Send a Buzz!"
            onClick={(e) => { e.stopPropagation(); handleBuzz() }}
          >
            <IconBuzz />
            <span>Buzz!</span>
          </button>
        </div>

        {/* Input row */}
        <div className="chat-window__input-row">
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

        {/* Typing indicator — always rendered to avoid layout shifts */}
        <div className="chat-window__typing-bar">
          {typingStatus[contactId] && (
            <>
              <span className="chat-window__typing-text">{contact.name} is typing</span>
              <span className="chat-window__typing-dots" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
            </>
          )}
        </div>

      </div>

      </div>{/* end chat-window__shake-layer */}
    </div>
  )
}

export default ChatWindow
