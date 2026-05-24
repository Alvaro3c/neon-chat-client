import { useRef } from 'react'

/**
 * useDragAndDrop
 *
 * Provides drag-and-drop handlers for reordering a list of items.
 * Uses the native HTML5 Drag and Drop API.
 *
 * @param {Array}    items      - the current ordered array
 * @param {Function} setItems   - state setter that receives the reordered array
 * @returns {Object} - { getDragProps, getDropProps }
 *
 * Usage:
 *   const { getDragProps, getDropProps } = useDragAndDrop(items, setItems)
 *
 *   <li draggable {...getDragProps(index)} {...getDropProps(index)}>
 */
function useDragAndDrop(items, setItems) {
  // Track the index that is currently being dragged
  const dragIndexRef = useRef(null)

  /**
   * Props to spread on the draggable element.
   * @param {number} index
   */
  function getDragProps(index) {
    return {
      draggable: true,
      onDragStart: (e) => {
        dragIndexRef.current = index
        // Use a ghost image so the original element stays visible
        e.dataTransfer.effectAllowed = 'move'
      },
      onDragEnd: () => {
        dragIndexRef.current = null
      },
    }
  }

  /**
   * Props to spread on the drop target element.
   * @param {number} index
   */
  function getDropProps(index) {
    return {
      onDragOver: (e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
      },
      onDrop: (e) => {
        e.preventDefault()
        const from = dragIndexRef.current
        if (from === null || from === index) return

        const reordered = [...items]
        const [moved] = reordered.splice(from, 1)
        reordered.splice(index, 0, moved)
        setItems(reordered)
        dragIndexRef.current = null
      },
    }
  }

  return { getDragProps, getDropProps }
}

export default useDragAndDrop
