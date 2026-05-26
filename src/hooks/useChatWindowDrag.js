import { useState, useRef, useCallback, useEffect } from 'react'

/**
 * Encapsulates all drag-to-move logic for a floating ChatWindow.
 *
 * @param {object}   params
 * @param {boolean}  params.isMaximized    - Drag is disabled while maximized.
 * @param {string}   params.contactId      - Used to call focusChat on mousedown.
 * @param {Function} params.focusChat      - Brings the window to the front.
 * @param {{x,y}}    params.initialPosition
 *
 * @returns {{ windowRef, position, isDragging, handleTitleBarMouseDown }}
 */
export function useChatWindowDrag({ isMaximized, contactId, focusChat, initialPosition }) {
  const [position, setPosition]   = useState(initialPosition)
  const [isDragging, setIsDragging] = useState(false)

  const dragOffset = useRef({ x: 0, y: 0 })
  const windowRef  = useRef(null)

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

  return { windowRef, position, isDragging, handleTitleBarMouseDown }
}
