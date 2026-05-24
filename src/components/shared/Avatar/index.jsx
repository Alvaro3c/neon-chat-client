import './Avatar.css'

/**
 * Avatar
 * @param {string}  [emoji]   - emoji character used as avatar (used when src is absent)
 * @param {string}  [src]     - photo URL (takes priority over emoji)
 * @param {'online'|'away'|'busy'|'offline'} [status]
 * @param {'sm'|'md'|'lg'} [size='md']
 */
function Avatar({ emoji, src, status, size = 'md', className = '' }) {
  return (
    <span className={`avatar avatar--${size} ${className}`}>
      {src
        ? <img
            className="avatar__img"
            src={src}
            alt=""
            aria-hidden="true"
            referrerPolicy="no-referrer"
          />
        : <span className="avatar__emoji" aria-hidden="true">{emoji}</span>
      }
      {status && (
        <span
          className={`avatar__status avatar__status--${status}`}
          title={status}
        />
      )}
    </span>
  )
}

export default Avatar
