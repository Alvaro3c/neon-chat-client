import { useState, useRef, useEffect } from 'react'
import { THEMES } from '../../../constants/themes'
import './PanelHeader.css'

/**
 * PanelHeader
 *
 * Top bar of the ContactsPanel. Shows the app title, live online-friend
 * count, and a theme-switcher dropdown that applies a CSS class to <html>.
 */
function PanelHeader({ onlineCount }) {
  const [theme, setTheme] = useState('cyan')
  const [themeMenuOpen, setThemeMenuOpen] = useState(false)
  const themeRef = useRef(null)

  // ── Click-outside: close theme menu ──────────────────────
  useEffect(() => {
    if (!themeMenuOpen) return
    function handleClickOutside(e) {
      if (themeRef.current && !themeRef.current.contains(e.target)) {
        setThemeMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [themeMenuOpen])

  // ── Theme switch ──────────────────────────────────────────
  function handleThemeChange(value) {
    setTheme(value)
    setThemeMenuOpen(false)
    const root = document.documentElement
    THEMES.forEach((t) => root.classList.remove(`theme-${t.value}`))
    root.classList.add(`theme-${value}`)
  }

  return (
    <div className="sidebar__header">
      <div className="sidebar__header-center">
        <h1 className="sidebar__title">Sidekicks</h1>
        <p className="sidebar__online-count">
          {onlineCount === 0
            ? 'no friends online'
            : onlineCount === 1
              ? '1 friend online'
              : `${onlineCount} friends online`}
        </p>
      </div>

      {/* Theme switcher */}
      <div style={{ position: 'relative' }} ref={themeRef}>
        <button
          className="sidebar__theme-btn"
          onClick={() => setThemeMenuOpen((o) => !o)}
          title="Change theme"
        >
          🎨
        </button>
        {themeMenuOpen && (
          <div className="sidebar__theme-menu">
            {THEMES.map((t) => (
              <button
                key={t.value}
                className={`sidebar__theme-option ${theme === t.value ? 'sidebar__theme-option--active' : ''}`}
                onClick={() => handleThemeChange(t.value)}
              >
                <span
                  className="sidebar__theme-dot"
                  style={{ background: t.dot }}
                />
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default PanelHeader
