import { useState, useRef } from 'react'
import { EMOTICONS_SORTED, getEmoticonSrc } from '../utils/emoticons'
import * as chatSocket from '../services/socket/chatSocket'

// ── DOM helpers ──────────────────────────────────────────────────────────────

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

// ── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Manages all state and handlers for the contenteditable composer.
 *
 * @param {object}   params
 * @param {string}   params.contactId
 * @param {Function} params.sendMessage  - From ChatContext.
 *
 * @returns {{ isEmpty, composerRef, handleComposerInput, handleComposerKeyDown,
 *             handleComposerPaste, handleSend, handleEmoticonSelect }}
 */
export function useChatComposer({ contactId, sendMessage }) {
  const [isEmpty, setIsEmpty] = useState(true)

  const composerRef       = useRef(null)
  // Tracks the timestamp of the last sendTyping() call so we throttle to
  // one event per 1.5 s — the ChatContext auto-clears the indicator after 2 s
  // of silence, so 1.5 s keeps it alive without spamming the server.
  const typingThrottleRef = useRef(0)

  function handleComposerInput() {
    const div = composerRef.current
    if (!div) return

    // Keep the send button state in sync
    const serialized = serializeComposer(div).trim()
    setIsEmpty(serialized === '')

    // ── Typing indicator ─────────────────────────────────────────────────────
    // Emit a typing event at most once per 1.5 s while the composer has text.
    if (serialized !== '') {
      const now = Date.now()
      if (now - typingThrottleRef.current >= 1_500) {
        typingThrottleRef.current = now
        chatSocket.sendTyping(contactId)
      }
    }

    // ── Shortcode auto-replace (keyboard shortcuts) ──────────────────────────
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

  /**
   * Insert an emoticon at the cursor. Called from the EmoticonPicker.
   * Does NOT close the picker — the caller decides that.
   */
  function handleEmoticonSelect(emoticon) {
    const div = composerRef.current
    if (!div) return
    div.focus()
    insertEmoticonAtCursor(div, emoticon)
    setIsEmpty(false)
  }

  return {
    isEmpty,
    composerRef,
    handleComposerInput,
    handleComposerKeyDown,
    handleComposerPaste,
    handleSend,
    handleEmoticonSelect,
  }
}
