/**
 * constants/statuses.js
 *
 * User presence status definitions.
 *
 * Each entry:
 *   value  — internal identifier sent to the server via chatSocket.updateStatus()
 *   label  — human-readable string shown in the status picker
 *   color  — CSS colour for the status label text in the sidebar
 *   dot    — canonical Avatar dot state: 'online' | 'away' | 'busy' | 'offline'
 *            (keeps Avatar simple — it only needs CSS for these 4 states)
 */

export const USER_STATUSES = [
  { value: 'online',    label: 'Online',                    color: 'var(--color-status-online)', dot: 'online'  },
  { value: 'away',      label: 'Away',                      color: 'var(--color-status-away)',   dot: 'away'    },
  { value: 'busy',      label: 'Busy',                      color: 'var(--color-status-busy)',   dot: 'busy'    },
  { value: 'sober',     label: 'sober JK unless',           color: 'var(--color-neon-cyan)',     dot: 'online'  },
  { value: 'breaking',  label: 'Breaking stuff',            color: 'var(--color-status-busy)',   dot: 'busy'    },
  { value: 'noregret',  label: 'I got no regret right now', color: 'var(--color-neon-cyan)',     dot: 'online'  },
  { value: 'train',     label: 'There is a train',          color: 'var(--color-status-away)',   dot: 'away'    },
  { value: 'misrep',    label: 'Misrepresented',            color: 'var(--color-text-muted)',    dot: 'offline' },
  { value: 'scotty',    label: "Scotty doesn't know",       color: 'var(--color-status-online)', dot: 'online'  },
]

/** Resolve a status value to its human-readable label, falling back to the raw value. */
export const getStatusLabel = (value) =>
  USER_STATUSES.find((s) => s.value === value)?.label ?? value

/** Resolve a status value to its canonical Avatar dot state (online|away|busy|offline). */
export const getStatusDot = (value) =>
  USER_STATUSES.find((s) => s.value === value)?.dot ?? 'offline'
