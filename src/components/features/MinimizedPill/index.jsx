import { IconMaximize, IconClose } from '../ChatWindow/icons'
import './MinimizedPill.css'

// How many minimized pills fit per row before wrapping to the next line
const PILLS_PER_ROW = 5
const PILL_SLOT_W   = 175
const PILL_SLOT_H   = 52
const PILL_OFFSET_X = 16
const PILL_OFFSET_Y = 16

/**
 * Minimized state of a ChatWindow — rendered as a floating pill at the
 * bottom of the viewport. Multiple pills arrange themselves in rows.
 *
 * @param {object}   props
 * @param {object}   props.contact         - { avatar, name }
 * @param {number}   props.zIndex
 * @param {number}   props.minimizedIndex  - Position in the global minimized list.
 * @param {boolean}  props.isBlinking      - True when there is an unread message.
 * @param {Function} props.onUnminimize
 * @param {Function} props.onClose
 */
function MinimizedPill({ contact, zIndex, minimizedIndex, isBlinking, onUnminimize, onClose }) {
  const col        = minimizedIndex % PILLS_PER_ROW
  const row        = Math.floor(minimizedIndex / PILLS_PER_ROW)
  const pillLeft   = PILL_OFFSET_X + col * PILL_SLOT_W
  const pillBottom = PILL_OFFSET_Y + row * PILL_SLOT_H

  return (
    <div
      className={`chat-window chat-window--minimized animate-fade-in${isBlinking ? ' chat-window--has-notification' : ''}`}
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
          onClick={(e) => { e.stopPropagation(); onClose() }}
        >
          <IconClose />
        </button>
      </div>
    </div>
  )
}

export default MinimizedPill
