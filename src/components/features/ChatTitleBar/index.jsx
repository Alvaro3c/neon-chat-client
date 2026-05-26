import { IconMinus, IconMaximize, IconRestore, IconClose } from '../ChatWindow/icons'
import './ChatTitleBar.css'

/**
 * Title bar for the floating ChatWindow.
 * Shows the contact's avatar, name and mood, plus window controls.
 *
 * @param {object}   props
 * @param {object}   props.contact          - { avatar, name, mood }
 * @param {boolean}  props.isMaximized
 * @param {Function} props.onMouseDown      - Passed directly to the bar for drag handling.
 * @param {Function} props.onMinimize
 * @param {Function} props.onToggleMaximize
 * @param {Function} props.onClose
 */
function ChatTitleBar({ contact, isMaximized, onMouseDown, onMinimize, onToggleMaximize, onClose }) {
  return (
    <div
      className={`chat-window__titlebar ${isMaximized ? 'chat-window__titlebar--no-drag' : ''}`}
      onMouseDown={onMouseDown}
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
          onClick={(e) => { e.stopPropagation(); onToggleMaximize() }}
        >
          {isMaximized ? <IconRestore /> : <IconMaximize />}
        </button>
        <button
          className="chat-window__ctrl-btn chat-window__ctrl-btn--close"
          onClick={(e) => { e.stopPropagation(); onClose() }}
        >
          <IconClose />
        </button>
      </div>
    </div>
  )
}

export default ChatTitleBar
