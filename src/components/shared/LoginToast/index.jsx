import './LoginToast.css'

/**
 * LoginToast
 *
 * Renders a stack of MSN-style "friend signed in" toasts
 * in the bottom-right corner. Each toast pops up like a piece
 * of bread jumping out of a toaster, then auto-dismisses.
 *
 * Props:
 *  - toasts      Array<{ id: string, name: string, exiting: boolean }>
 *  - onDismiss   (id: string) => void
 */
export default function LoginToast({ toasts, onDismiss }) {
  if (toasts.length === 0) return null

  return (
    <div className="login-toast-container" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`login-toast${toast.exiting ? ' login-toast--exiting' : ''}`}
          onClick={() => onDismiss(toast.id)}
          role="alert"
          aria-label={`${toast.name} ha iniciado sesión`}
          title="Haz clic para cerrar"
        >
          {/* Online status dot */}
          <span className="login-toast__dot" aria-hidden="true" />

          {/* Text */}
          <div className="login-toast__body">
            <span className="login-toast__name">{toast.name}</span>
            <span className="login-toast__message">ha iniciado sesión</span>
          </div>
        </div>
      ))}
    </div>
  )
}
