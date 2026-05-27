import { useState, useRef, useEffect } from 'react'
import MessageList from '../MessageList'
import ChatTitleBar from '../ChatTitleBar'
import ChatBottom from '../ChatBottom'
import MinimizedPill from '../MinimizedPill'
import { useChat } from '../../../context/ChatContext'
import { useChatWindowDrag } from '../../../hooks/useChatWindowDrag'
import { useChatComposer } from '../../../hooks/useChatComposer'
import * as chatSocket from '../../../services/socket/chatSocket'
import { playBuzzSound } from '../../../hooks/useSounds'
import './ChatWindow.css'

/**
 * ChatWindow
 *
 * A floating, draggable chat window.
 * Reads contact data and messages from ChatContext.
 * Delegates drag logic to useChatWindowDrag, composer logic to useChatComposer,
 * and rendering to ChatTitleBar, ChatBottom, and MinimizedPill.
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
  const {
    contacts, messages, closeChat, focusChat, sendMessage,
    addReaction, typingStatus, buzzSignals, newMessageSignals, addSystemMessage,
    contactStatuses,
  } = useChat()

  const contact = contacts.find((c) => c.id === contactId)

  // Merge live mood from socket events (contactStatuses is keyed by uid, not id)
  const liveStatus      = contact ? contactStatuses[contact.uid] : null
  const enrichedContact = contact
    ? { ...contact, mood: liveStatus?.mood ?? contact.mood }
    : contact

  const [isMaximized,  setIsMaximized]  = useState(false)
  const [isBuzzing,    setIsBuzzing]    = useState(false)
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [isBlinking,   setIsBlinking]   = useState(false)

  const { windowRef, position, isDragging, handleTitleBarMouseDown } = useChatWindowDrag({
    isMaximized,
    contactId,
    focusChat,
    initialPosition,
  })

  const {
    isEmpty,
    composerRef,
    handleComposerInput,
    handleComposerKeyDown,
    handleComposerPaste,
    handleSend,
    handleEmoticonSelect,
  } = useChatComposer({ contactId, sendMessage })

  // Captures the buzz count at mount time so we never replay a buzz that
  // arrived while this window was closed or hadn't been opened yet.
  const lastSeenBuzzRef      = useRef(buzzSignals[contactId] ?? 0)
  // Always start at 0 so a pending notification is detected even when
  // the component mounts AFTER the message arrived (e.g. auto-open).
  const lastSeenMsgSignalRef = useRef(0)
  // Mirror isMinimized as a ref so the effect below always reads the live value
  const isMinimizedRef       = useRef(isMinimized)
  const buzzTimerRef         = useRef(null)   // ID del setTimeout de la animación de buzz
  useEffect(() => { isMinimizedRef.current = isMinimized }, [isMinimized])

  // ── React to incoming buzz ────────────────────────────────
  useEffect(() => {
    const current = buzzSignals[contactId] ?? 0
    if (current <= lastSeenBuzzRef.current) return
    lastSeenBuzzRef.current = current

    const el = windowRef.current
    if (el) {
      clearTimeout(buzzTimerRef.current)     // cancel any in-flight timer first
      el.classList.remove('chat-window--buzzed')
      void el.offsetWidth                    // force reflow → animation restarts
      el.classList.add('chat-window--buzzed')
      buzzTimerRef.current = setTimeout(
        () => el.classList.remove('chat-window--buzzed'),
        820
      )
    }
    playBuzzSound() // only the receiver hears it

    return () => clearTimeout(buzzTimerRef.current)
  }, [buzzSignals[contactId]]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── React to incoming messages ────────────────────────────
  // If the window is minimized, blink the pill.
  useEffect(() => {
    const current = newMessageSignals[contactId] ?? 0
    if (current <= lastSeenMsgSignalRef.current) return
    lastSeenMsgSignalRef.current = current

    if (isMinimizedRef.current) setIsBlinking(true)
  }, [newMessageSignals[contactId]]) // eslint-disable-line react-hooks/exhaustive-deps

  // Clear blink as soon as the user opens the window
  useEffect(() => {
    if (!isMinimized) setIsBlinking(false)
  }, [isMinimized])

  // ── Toolbar handlers ──────────────────────────────────────
  function handleBuzz() {
    setIsBuzzing(true)
    setTimeout(() => setIsBuzzing(false), 600)
    chatSocket.sendBuzz(contactId)
    addSystemMessage(contactId, `You sent ${contact?.name ?? 'them'} a buzz! 〰️`)
  }

  function handleOpenPicker(e) {
    e.stopPropagation()
    setIsPickerOpen((prev) => !prev)
  }

  function handleEmoticonSelectWithClose(emoticon) {
    handleEmoticonSelect(emoticon)
    setIsPickerOpen(false)
  }

  if (!contact) return null

  const contactMessages = messages[contactId] ?? []

  // ── Minimized pill ────────────────────────────────────────
  if (isMinimized) {
    return (
      <MinimizedPill
        contact={contact}
        zIndex={zIndex}
        minimizedIndex={minimizedIndex}
        isBlinking={isBlinking}
        onUnminimize={onUnminimize}
        onClose={() => closeChat(contactId)}
      />
    )
  }

  // ── Full window ───────────────────────────────────────────
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

        <ChatTitleBar
          contact={enrichedContact}
          isMaximized={isMaximized}
          onMouseDown={handleTitleBarMouseDown}
          onMinimize={onMinimize}
          onToggleMaximize={() => setIsMaximized((m) => !m)}
          onClose={() => closeChat(contactId)}
        />

        <MessageList
          messages={contactMessages}
          contactName={contact.name}
          onReact={(msgId, emoji) => addReaction(contactId, msgId, emoji)}
        />

        <ChatBottom
          composerRef={composerRef}
          isEmpty={isEmpty}
          onInput={handleComposerInput}
          onKeyDown={handleComposerKeyDown}
          onPaste={handleComposerPaste}
          onSend={handleSend}
          isPickerOpen={isPickerOpen}
          isBuzzing={isBuzzing}
          onOpenPicker={handleOpenPicker}
          onClosePicker={() => setIsPickerOpen(false)}
          onEmoticonSelect={handleEmoticonSelectWithClose}
          onBuzz={handleBuzz}
          isTyping={typingStatus[contactId]}
          contactName={contact.name}
        />

      </div>{/* end chat-window__shake-layer */}
    </div>
  )
}

export default ChatWindow
