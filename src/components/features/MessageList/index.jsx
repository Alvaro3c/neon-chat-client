import { useEffect, useRef, useState } from 'react'
import './MessageList.css'

const REACTIONS = ['💀', '🖤', '⭐', '🔥', '😭']

/**
 * MessageList
 *
 * MSN Messenger-style: all messages left-aligned, prefixed with
 * "Username: message text". Sent messages use cyan, received use green.
 *
 * @param {Array}    messages              - [{ id, text, sender, timestamp, reaction? }]
 * @param {string}   contactName           - display name of the other person
 * @param {Function} onReact(id, emoji)    - called when a reaction is picked
 */
function MessageList({ messages = [], contactName = 'them', onReact }) {
  const bottomRef = useRef(null)
  const [pickerOpen, setPickerOpen] = useState(null)

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function formatTime(date) {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  function handleLineClick(e, id) {
    e.stopPropagation()
    setPickerOpen((prev) => (prev === id ? null : id))
  }

  function handleReact(e, id, emoji) {
    e.stopPropagation()
    onReact?.(id, emoji)
    setPickerOpen(null)
  }

  // Close picker when clicking elsewhere
  useEffect(() => {
    if (!pickerOpen) return
    function close() { setPickerOpen(null) }
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [pickerOpen])

  if (messages.length === 0) {
    return (
      <div className="message-list">
        <div className="message-list__empty">
          <p className="message-list__empty-title">~*no messages yet*~</p>
        </div>
      </div>
    )
  }

  return (
    <div className="message-list">
      {messages.map((msg) => {

        // ── System message (buzz, nudge, etc.) ──────────────────
        if (msg.sender === 'system') {
          return (
            <div key={msg.id} className="message-row message-row--system animate-slide-in">
              <p className="message-system">{msg.text}</p>
            </div>
          )
        }

        // ── Regular message ─────────────────────────────────────
        const isMe = msg.sender === 'me'
        const displayName = isMe ? 'xX_You_Xx' : contactName

        return (
          <div key={msg.id} className="message-row animate-slide-in">
            <p
              className="message-line"
              onClick={(e) => handleLineClick(e, msg.id)}
            >
              <span className={`message-sender message-sender--${msg.sender}`}>
                {displayName}:
              </span>
              {' '}
              <span className={`message-text message-text--${msg.sender}`}>
                {msg.text}
              </span>

              {msg.reaction && (
                <span className="message-bubble__reaction">{msg.reaction}</span>
              )}
            </p>

            <span className="message-timestamp">{formatTime(msg.timestamp)}</span>

            {pickerOpen === msg.id && (
              <div className="reaction-picker" onClick={(e) => e.stopPropagation()}>
                {REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={(e) => handleReact(e, msg.id, emoji)}
                    title={emoji}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      })}

      <div ref={bottomRef} />
    </div>
  )
}

export default MessageList
