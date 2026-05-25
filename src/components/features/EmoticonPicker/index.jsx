import { useEffect, useRef } from 'react'
import { EMOTICONS, getEmoticonSrc } from '../../../utils/emoticons'
import './EmoticonPicker.css'

/**
 * EmoticonPicker
 *
 * Floating grid panel listing all MSN emoticons.
 * Rendered inside `.chat-window__bottom` (position:relative) so it
 * slides up over the message area without escaping the chat window.
 *
 * @param {Function} onSelect(emoticon)  — called when the user picks one
 * @param {Function} onClose             — called when clicking outside
 */
function EmoticonPicker({ onSelect, onClose }) {
  const ref = useRef(null)

  // Close when clicking outside — small delay so the button click that
  // opened us doesn't immediately re-close the picker.
  useEffect(() => {
    let handler
    const tid = setTimeout(() => {
      handler = (e) => {
        if (ref.current && !ref.current.contains(e.target)) onClose()
      }
      document.addEventListener('click', handler)
    }, 0)
    return () => {
      clearTimeout(tid)
      if (handler) document.removeEventListener('click', handler)
    }
  }, [onClose])

  return (
    <div
      ref={ref}
      className="emoticon-picker"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="emoticon-picker__grid">
        {EMOTICONS.map((em) => (
          <button
            key={em.shortcode}
            className="emoticon-picker__btn"
            title={`${em.name}  ${em.shortcode}`}
            onClick={() => onSelect(em)}
          >
            <img
              src={getEmoticonSrc(em.filename)}
              alt={em.shortcode}
              className="emoticon-picker__img"
              loading="lazy"
            />
          </button>
        ))}
      </div>
    </div>
  )
}

export default EmoticonPicker
