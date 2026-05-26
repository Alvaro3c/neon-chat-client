import EmoticonPicker from '../EmoticonPicker'
import { IconEmoji, IconBuzz, IconSend } from '../ChatWindow/icons'
import './ChatBottom.css'

/**
 * Bottom section of the ChatWindow.
 * Contains the EmoticonPicker (when open), the toolbar, the composer
 * input row, and the typing indicator bar.
 *
 * @param {object}   props
 * @param {object}   props.composerRef        - Ref forwarded to the contenteditable div.
 * @param {boolean}  props.isEmpty            - True when the composer has no content.
 * @param {Function} props.onInput
 * @param {Function} props.onKeyDown
 * @param {Function} props.onPaste
 * @param {Function} props.onSend
 * @param {boolean}  props.isPickerOpen
 * @param {boolean}  props.isBuzzing
 * @param {Function} props.onOpenPicker
 * @param {Function} props.onClosePicker
 * @param {Function} props.onEmoticonSelect
 * @param {Function} props.onBuzz
 * @param {boolean}  props.isTyping
 * @param {string}   props.contactName
 */
function ChatBottom({
  composerRef,
  isEmpty,
  onInput,
  onKeyDown,
  onPaste,
  onSend,
  isPickerOpen,
  isBuzzing,
  onOpenPicker,
  onClosePicker,
  onEmoticonSelect,
  onBuzz,
  isTyping,
  contactName,
}) {
  return (
    <div className="chat-window__bottom">

      {/* Emoticon picker — floats above the toolbar */}
      {isPickerOpen && (
        <EmoticonPicker
          onSelect={onEmoticonSelect}
          onClose={onClosePicker}
        />
      )}

      {/* Toolbar — buzz & emoticons */}
      <div className="chat-window__toolbar">
        <button
          className={`chat-window__tool-btn ${isPickerOpen ? 'chat-window__tool-btn--active' : ''}`}
          title="Open emoticons (Ctrl+I)"
          onClick={onOpenPicker}
        >
          <IconEmoji />
          <span>Emoticons</span>
        </button>

        <button
          className={`chat-window__tool-btn chat-window__tool-btn--buzz ${isBuzzing ? 'chat-window__tool-btn--buzzing' : ''}`}
          title="Send a Buzz!"
          onClick={(e) => { e.stopPropagation(); onBuzz() }}
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
          onInput={onInput}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          onClick={(e) => e.stopPropagation()}
        />
        <button
          className="chat-window__send-btn"
          onClick={(e) => { e.stopPropagation(); onSend() }}
          disabled={isEmpty}
        >
          <IconSend />
        </button>
      </div>

      {/* Typing indicator — always rendered to avoid layout shifts */}
      <div className="chat-window__typing-bar">
        {isTyping && (
          <>
            <span className="chat-window__typing-text">{contactName} is typing</span>
            <span className="chat-window__typing-dots" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          </>
        )}
      </div>

    </div>
  )
}

export default ChatBottom
