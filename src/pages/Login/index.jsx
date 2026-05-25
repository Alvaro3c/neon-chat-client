import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuth from '../../hooks/useAuth'
import Button from '../../components/shared/Button'
import './Login.css'

// Google "G" mark — styled with currentColor so it inherits the neon theme
function GoogleIcon() {
  return (
    <svg
      className="login__google-icon"
      width="18"
      height="18"
      viewBox="0 0 18 18"
      aria-hidden="true"
      fill="currentColor"
    >
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" />
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" />
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" />
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" />
    </svg>
  )
}

function LoginPage() {
  const { user, loading, signInWithGoogle } = useAuth()
  const navigate = useNavigate()
  const [signingIn, setSigningIn] = useState(false)

  // If already authenticated, skip straight to the app
  useEffect(() => {
    if (!loading && user) {
      navigate('/', { replace: true })
    }
  }, [user, loading, navigate])

  // Guard against double-clicks and concurrent popup attempts
  const handleSignIn = async () => {
    if (signingIn) return
    setSigningIn(true)
    try {
      await signInWithGoogle()
    } catch (err) {
      console.error('[Login] Sign-in error:', err)
    } finally {
      setSigningIn(false)
    }
  }

  if (loading) {
    return (
      <div className="login login--loading">
        <span className="animate-pulse neon-text-cyan" aria-label="loading">💀</span>
      </div>
    )
  }

  return (
    <div className="login">
      {/* Retro scanline overlay */}
      <div className="login__scanlines" aria-hidden="true" />

      {/* Brand */}
      <div className="login__brand">
        <span className="animate-pulse" aria-hidden="true">💀</span>
        <h1 className="login__brand-title neon-text-cyan">xX_NeonMessenger_Xx</h1>
        <span className="animate-pulse" aria-hidden="true">💀</span>
      </div>

      {/* Login card */}
      <main className="login__card animate-slide-in">
        <p className="login__card-deco" aria-hidden="true">★ ★ ★</p>

        <h2 className="login__title">enter the void</h2>

        <p className="login__message">
          we know you don't have the time to fill out a registration form.{' '}
          <span className="login__message-highlight">you can use google.</span>
          <br />
          <span className="login__message-sub">
            no passwords. no forms. just vibes.
          </span>
        </p>

        <div className="login__divider" aria-hidden="true">
          <span>·· sign in ··</span>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={handleSignIn}
          disabled={signingIn}
          className="login__google-btn"
          aria-label="Continue with Google"
        >
          <GoogleIcon />
          {signingIn ? 'connecting...' : 'continue with google'}
        </Button>

        <p className="login__disclaimer">
          ✦ no spam · no tracking · pinky promise ✦
        </p>
      </main>

      <footer className="login__footer">
        <span>★ xX_DarkMessenger_Xx © 2007 ★ · made with 🖤 and energy drinks</span>
      </footer>
    </div>
  )
}

export default LoginPage
