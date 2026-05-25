import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ChatProvider, useChat } from './context/ChatContext'
import { AuthProvider } from './context/AuthContext'
import useAuth from './hooks/useAuth'
import ConversationSidebar from './components/features/ConversationSidebar'
import ChatWindow from './components/features/ChatWindow'
import LoginPage from './pages/Login'
import './styles/global.css'
import './App.css'

// ── Protected route guard ────────────────────────────────────
// Redirects unauthenticated users to /login.
// Shows a loading skull while Firebase resolves the auth state.
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="app-loading">
        <span className="animate-pulse neon-text-cyan" aria-label="loading">💀</span>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  return children
}

// ── Inner app (needs ChatContext in scope) ───────────────────
function AppShell() {
  const { openChats } = useChat()
  const { user, signOut } = useAuth()

  return (
    <div className="app">
      {/* ── Header ──────────────────────────────────────────── */}
      <header className="app__header">
        <div className="app__header-inner">
          <div className="app__brand">
            <span className="animate-pulse" aria-hidden="true">💀</span>
            <h1 className="app__title neon-text-cyan">xX_NeonMessenger_Xx</h1>
            <span className="animate-pulse" aria-hidden="true">💀</span>
          </div>

          <span className="app__tagline">
            ★ chat like its 2007 ★
          </span>

          {/* ── Logged-in user + sign out ── */}
          <div className="app__user">
            {user?.photoURL && (
              <img
                className="app__user-avatar"
                src={user.photoURL}
                alt={user.displayName ?? 'your avatar'}
                referrerPolicy="no-referrer"
              />
            )}
            <span className="app__user-name">
              {user?.displayName?.split(' ')[0]}
            </span>
            <button
              className="app__sign-out"
              onClick={signOut}
              title="sign out"
              aria-label="Sign out"
            >
              ✕
            </button>
          </div>
        </div>
      </header>

      {/* ── Body — dark backdrop with centered buddy list ────── */}
      <div className="app__body">
        <ConversationSidebar />
      </div>

      {/* ── Footer — slim status bar ─────────────────────────── */}
      <footer className="app__footer">
        <span className="app__footer-text">
          {openChats.length > 0
            ? `| ${openChats.length} chat window${openChats.length !== 1 ? 's' : ''} open`
            : '| no chats open rn'}
        </span>
      </footer>

      {/* ── Floating chat windows (rendered over everything) ── */}
      {openChats.map((chat) => (
        <ChatWindow
          key={chat.contactId}
          contactId={chat.contactId}
          zIndex={chat.zIndex}
          initialPosition={chat.position}
        />
      ))}
    </div>
  )
}

// ── Root — router + providers ────────────────────────────────
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public: login page (redirects to / if already signed in) */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected: main chat app */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <ChatProvider>
                  <AppShell />
                </ChatProvider>
              </ProtectedRoute>
            }
          />

          {/* Catch-all: redirect unknown paths to root */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
