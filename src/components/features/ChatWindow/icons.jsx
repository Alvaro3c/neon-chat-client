// Simple SVG icon helpers — no external icon library

export const IconMinus    = () => <span title="Minimise">─</span>
export const IconMaximize = () => <span title="Maximise">□</span>
export const IconRestore  = () => <span title="Restore">❐</span>
export const IconClose    = () => <span title="Close">✕</span>
export const IconSend     = () => <span>➤</span>

export const IconEmoji = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M8 14s1.5 2 4 2 4-2 4-2" />
    <line x1="9" y1="9" x2="9.01" y2="9" />
    <line x1="15" y1="9" x2="15.01" y2="9" />
  </svg>
)

export const IconBuzz = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12c0-1 .5-2 1.5-2.5M6 7.5C7.5 5.5 9.5 4 12 4s4.5 1.5 6 3.5" />
    <path d="M4.5 16.5C3.5 15 3 13.5 3 12M22 12c0 1-.5 2-1.5 2.5" />
    <path d="M18 16.5c-1.5 2-3.5 3.5-6 3.5s-4.5-1.5-6-3.5" />
    <circle cx="12" cy="12" r="2" fill="currentColor" />
  </svg>
)
