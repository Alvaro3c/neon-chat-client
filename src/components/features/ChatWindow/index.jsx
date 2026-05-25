import { useState, useRef, useEffect, useCallback } from 'react'
import MessageList from '../MessageList'
import EmoticonPicker from '../EmoticonPicker'
import { useChat } from '../../../context/ChatContext'
import * as chatSocket from '../../../services/chatSocket'
import { EMOTICONS_SORTED, getEmoticonSrc } from '../../../utils/emoticons'
import './ChatWindow.css'

function playBuzzSound() {
  const audio = new Audio('/assets/sounds/zumbido.mp3')
  audio.play().catch(() => {}) // silently ignore autoplay policy blocks
}

// Simple SVG icon helpers — no external icon library
const IconMinus    = () => <span title="Minimise">─</span>
const IconMaximize = () => <span title="Maximise">□</span>
const IconRestore  = () => <span title="Restore">❐</span>
const IconClose    = () => <span title="Close">✕</span>
const IconSend     = () => <span>➤</span>

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
const PILL_SLOT_W   = 175
const PILL_SLOT_H   = 52
const PILL_OFFSET_X = 16
const PILL_OFFSET_Y = 16

// ── Composer helpers ────────────────────────────────────────────────────────

/**
 * Serialize a contenteditable div to a plain-text string.
 * Text nodes → their text content.
 * <img data-shortcode="..."> → the shortcode string (e.g. "(8)").
 * <br> and other elements are ignored / flattened.
 */
function serializeComposer(div) {
  let text = ''
  for (const node of div.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent
    } else if (node.nodeName === 'IMG') {
      text += node.dataset.shortcode ?? ''
    } else if (node.nodeName === 'BR') {
      // prevent Enter from adding newlines (handled in keydown)
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      // Browsers sometimes wrap pasted text in <span>/<div> — flatten it
      for (const child of node.childNodes) {
        if (child.nodeType === Node.TEXT_NODE) text += child.textContent
        else if (child.nodeName === 'IMG') text += child.dataset.shortcode ?? ''
      }
    }
  }
  return text
}

/**
 * Build and insert an emoticon <img> at the current cursor position
 * inside the composer div. Falls back to appending at the end.
 */
function insertEmoticonAtCursor(div, emoticon) {
  const img = buildEmoticonImg(emoticon)

  const sel = window.getSelection()
  if (sel && sel.rangeCount) {
    const range = sel.getRangeAt(0)
    if (div.contains(range.commonAncestorContainer)) {
      range.deleteContents()
      range.insertNode(img)
      // Move cursor right after the img
      const after = document.createRange()
      after.setStartAfter(img)
      after.collapse(true)
      sel.removeAllRanges()
      sel.addRange(after)
      return
    }
  }
  // Fallback: append at end and place cursor there
  div.appendChild(img)
  const r = document.createRange()
  r.setStartAfter(img)
  r.collapse(true)
  const s = window.getSelection()
  s?.removeAllRanges()
  s?.addRange(r)
}

/** Create the <img> DOM node used for inline emoticons in the composer. */
function buildEmoticonImg(emoticon) {
  const img = document.createElement('img')
  img.src               = getEmoticonSrc(emoticon.filename)
  img.alt               = emoticon.shortcode
  img.title             = `${emoticon.name}  ${emoticon.shortcode}`
  img.className         = 'chat-composer__emoticon'
  img.dataset.shortcode = emoticon.shortcode
  img.contentEditable   = 'false' // cursor can't land inside the img
  return img
}

// ── Component ───────────────────────────────────────────────────────────────

/**
 * ChatWindow
 *
 * A floating, draggable chat window.
 * Reads contact data and messages from ChatContext.
 *
 * @param {string}   contactId
 * @param {number}   zIndex
 * @param {{x,y}}    initialPosition
 * @param {boolean}  isMinimized
 * @param {number}   minimizedIndex
 * @param {Function} onMinimize
 * @param {Function} onUnminimize
 */
function ChatWindow({ contactId, zIndex, initialPosition, isMinimized, minimizedIndex, onMinimize, onUnminimize }) {
  const { contacts, messages, closeChat, focusChat, sendMessage, addReaction, typingStatus, buzzSignals, addSystemMessage } = useChat()
  const contact = contacts.find((c) => c.id === contactId)

  const [isEmpty, setIsEmpty]           = useState(true)
  const [isMaximized, setIsMaximized]   = useState(false)
  const [position, setPosition]         = useState(initialPosition)
  const [isDragging, setIsDragging]     = useState(false)
  const [isBuzzing, setIsBuzzing]       = useState(false)
  const [isPickerOpen, setIsPickerOpen] = useState(false)

  const dragOffset  = useRef({ x: 0, y: 0 })
  const windowRef   = useRef(null)
  const composerRef = useRef(null)

  // Captures the buzz count at mount time so we never replay a buzz that
  // arrived while this window was closed or hadn't been opened yet.
  const lastSeenBuzzRef = useRef(buzzSignals[contactId] ?? 0)

  // ── React to incoming buzz ────────────────────────────────────
  useEffect(() => {
    const current = buzzSignals[contactId] ?? 0
    if (current <= lastSeenBuzzRef.current) return
    lastSeenBuzzRef.current = current

    const el = windowRef.current
    if (el) {
      el.classList.remove('chat-window--buzzed')
      void el.offsetWidth                    // force reflow → animation restarts
      el.classList.add('chat-window--buzzed')
      setTimeout(() => el.classList.remove('chat-window--buzzed'), 820)
    }
    playBuzzSound() // only the receiver hears it
  }, [buzzSignals[contactId]]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Toolbar handlers ──────────────────────────────────────────
  function handleBuzz() {
    setIsBuzzing(true)
    setTimeout(() => setIsBuzzing(false), 600)
    chatSocket.sendBuzz(contactId)
    addSystemMessage(contactId, `You sent ${contact?.name ?? 'them'} a buzz! 〰️`)
  }

  function handleOpenEmoji(e) {
    e.stopPropagation()
    setIsPickerOpen((prev) => !prev)
  }

  function handleEmojiSelect(emoticon) {
    const div = composerRef.current
    if (!div) return
    div.focus()
    insertEmoticonAtCursor(div, emoticon)
    setIsEmpty(false)
    setIsPickerOpen(false)
  }

  // ── Composer handlers ─────────────────────────────────────────
  function handleComposerInput() {
    const div = composerRef.current
    if (!div) return

    // Keep the send button state in sync
    setIsEmpty(serializeComposer(div).trim() === '')

    // ── Shortcode auto-replace (keyboard shortcuts) ─────────────
    // Check whether the text ending at the cursor matches any shortcode.
    // EMOTICONS_SORTED is longest-first, so the first match is greedy.
    const sel = window.getSelection()
    if (!sel || !sel.rangeCount) return

    const range = sel.getRangeAt(0)
    const node  = range.startContainer
    if (node.nodeType !== Node.TEXT_NODE) return

    const text       = node.textContent
    const cursorPos  = range.startOffset
    const upToCursor = text.slice(0, cursorPos)

    for (const em of EMOTICONS_SORTED) {
      if (!upToCursor.endsWith(em.shortcode)) continue

      // Match found — splice the shortcode out and replace with <img>
      const codeLen  = em.shortcode.length
      const before   = text.slice(0, cursorPos - codeLen)
      const after    = text.slice(cursorPos)
      const parent   = node.parentNode

      const img = buildEmoticonImg(em)

      if (before) parent.insertBefore(document.createTextNode(before), node)
      parent.insertBefore(img, node)
      const afterNode = document.createTextNode(after)
      parent.insertBefore(afterNode, node)
      parent.removeChild(node)

      // Place cursor at the beginning of the remaining text (after img)
      const newRange = document.createRange()
      newRange.setStart(afterNode, 0)
      newRange.collapse(true)
      sel.removeAllRanges()
      sel.addRange(newRange)

      setIsEmpty(serializeComposer(div).trim() === '')
      break
    }
  }

  function handleComposerKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault() // prevent <br> insertion in contenteditable
      handleSend()
    }
  }

  function handleComposerPaste(e) {
    // Strip HTML — paste only plain text so auto-replace still works
    e.preventDefault()
    const text = e.clipboardData.getData('text/plain')
    document.execCommand('insertText', false, text)
  }

  // ── Send ──────────────────────────────────────────────────────
  function handleSend() {
    const div = composerRef.current
    if (!div) return
    const text = serializeComposer(div).trim()
    if (!text) return
    sendMessage(contactId, text)
    div.innerHTML = ''
    setIsEmpty(true)
    div.focus()
  }

  // ── Drag logic ────────────────────────────────────────────────
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
        x: Math.max(0, Math.min(e.clientX - dragOffset.current.x, window.innerWidth  - 380)),
        y: Math.max(0, Math.min(e.clientY - dragOffset.current.y, window.innerHeight - 80)),
      })
    }
    function onUp() { setIsDragging(false) }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup',   onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup',   onUp)
    }
  }, [isDragging])

  if (!contact) return null

  const contactMessages = messages[contactId] ?? []

  // ── Minimized pill ────────────────────────────────────────────
  if (isMinimized) {
    const col       = minimizedIndex % PILLS_PER_ROW
    const row       = Math.floor(minimizedIndex / PILLS_PER_ROW)
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

  // ── Full window ───────────────────────────────────────────────
  return (
    <div
      ref={windowRef}
      className={[
        'chat-window',
        'animate-fade-in',
        isDragging  ? 'chat-window--dragging'  : '',
        isMaximized ? 'chat-window--maximized' : '',
      ].filter(Boolean).join(' ')}
      style={{
        zIndex,
        left: isMaximized ? 0 : position.x,
        top:  isMaximized ? 0 : position.y,
      }}
      onClick={() => focusChat(contactId)}
    >
      {/*
        shake-layer: inner wrapper that receives the buzz animation.
        The outer div keeps position:fixed; transforms on fixed elements are
        unreliable when an ancestor has backdrop-filter. This inner div is
        a normal block element — transform works reliably on it.
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

        {/* Bottom section: picker (when open) + toolbar + input row */}
        <div className="chat-window__bottom">

          {/* Emoticon picker — floats above the toolbar */}
          {isPickerOpen && (
            <EmoticonPicker
              onSelect={handleEmojiSelect}
              onClose={() => setIsPickerOpen(false)}
            />
          )}

          {/* Toolbar — buzz & emoticons */}
          <div className="chat-window__toolbar">
            <button
              className={`chat-window__tool-btn ${isPickerOpen ? 'chat-window__tool-btn--active' : ''}`}
              title="Open emoticons (Ctrl+I)"
              onClick={handleOpenEmoji}
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
            {/*
              contenteditable div instead of <input> so emoticon <img> nodes
              can be inserted inline. serializeComposer() converts it back to
              plain text (with shortcodes) before sending.
            */}
            <div
              ref={composerRef}
              className="chat-window__composer"
              contentEditable
              suppressContentEditableWarning
              data-placeholder="type ur msg..."
              onInput={handleComposerInput}
              onKeyDown={handleComposerKeyDown}
              onPaste={handleComposerPaste}
              onClick={(e) => e.stopPropagation()}
            />
            <button
              className="chat-window__send-btn"
              onClick={(e) => { e.stopPropagation(); handleSend() }}
              disabled={isEmpty}
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
