import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { logout } from '../api/authApi'
import rioLogo from '../images/Cinematic_RIO_Marquee_Logo.png'
import './AdminSidebar.css'

function AdminSidebar({ session, sessionLoading, sessionError, onSessionChange }) {
  const navigate = useNavigate()
  const [logoutStatus, setLogoutStatus] = useState('')
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  async function handleLogout() {
    setLogoutStatus('')
    setIsLoggingOut(true)

    try {
      await logout()
      onSessionChange(null)
      navigate('/login')
    } catch (error) {
      setLogoutStatus(error.message || 'Could not log out. Please try again.')
    } finally {
      setIsLoggingOut(false)
    }
  }
  return (
    <aside className="site-sidebar">
      <Link className="site-sidebar__brand" to="/" aria-label="Movie Theater Rio home">
        <img src={rioLogo} alt="Rio - Oulu Tampere" />
      </Link>

      <nav className="site-sidebar__nav" aria-label="Main navigation">
        
        {!sessionLoading && !sessionError && session?.role === 'admin' && (
          <NavLink
            className={({ isActive }) =>
              `site-sidebar__link${isActive ? ' is-active' : ''}`
            }
            to="/admin"
          >
            <span>Admin Dashboard</span>
          </NavLink>
        )}

        <span>Movies</span>
        <span>Screenings</span>
        <span>Reservations</span>
        <span>Users</span>
        <span>Locations</span>

        {!sessionLoading && !sessionError && session && (
        <NavLink
          className={({ isActive }) =>
            `site-sidebar__link${isActive ? ' is-active' : ''}`
          }
          to="/user"
          style={({
            marginTop: "auto"
          })}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-person" viewBox="0 0 16 16">
            <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6m2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0m4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4m-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10s-3.516.68-4.168 1.332c-.678.678-.83 1.418-.832 1.664z"></path>
          </svg>  {/* This icon is from bootstrap icons https://icons.getbootstrap.com/icons/person/*/}
          <span>User</span>
        </NavLink>
        )}
      </nav>

        
      <div className="site-sidebar__account">
        {sessionLoading ? (
          <p>Loading session...</p>
        ) : sessionError ? (
          <>
            <p role="alert">{sessionError}</p>
            <button className="site-sidebar__account__link" type="button" onClick={() => window.location.reload()}>
              Retry
            </button>
          </>
        ) : session ? (
          <>
            <button
              type="button"
              className="site-sidebar__account__link"
              onClick={handleLogout}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? 'Logging out...' : 'Log out'}
            </button>
            <p role="status" aria-live="polite">{logoutStatus}</p>
          </>

        ) : (
          <NavLink
            className={({ isActive }) =>
              `site-sidebar__link${isActive ? ' is-active' : ''}`
            }
            to="/login"
          >
            <span>Login / Register</span>
          </NavLink>
        )}
      </div>
    </aside>
  )
}

export default AdminSidebar
