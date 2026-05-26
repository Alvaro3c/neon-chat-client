import Avatar from '../../shared/Avatar'
import './RequestList.css'

/**
 * RequestList
 *
 * List of incoming friend/conversation requests.
 * Purely presentational — accept/decline actions are delegated up.
 */
function RequestList({ requests, onAccept, onDecline }) {
  return (
    <ul className="sidebar__list">
      {requests.length === 0 ? (
        <li className="sidebar__empty-state">no pending requests ✨</li>
      ) : (
        requests.map((req) => (
          <li key={req.id} className="request-item">
            <Avatar src={req.photoURL || undefined} emoji={req.avatar} size="md" />
            <div className="request-item__info">
              <p className="request-item__name">{req.name}</p>
              <p className="request-item__email">{req.email}</p>
            </div>
            <div className="request-item__actions">
              <button
                className="request-item__accept"
                onClick={() => onAccept(req.id)}
                title="Accept"
              >
                ✓
              </button>
              <button
                className="request-item__decline"
                onClick={() => onDecline(req.id)}
                title="Decline"
              >
                ✕
              </button>
            </div>
          </li>
        ))
      )}
    </ul>
  )
}

export default RequestList
