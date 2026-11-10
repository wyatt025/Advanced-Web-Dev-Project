import './Sidebar.css'
import { Link, NavLink } from 'react-router-dom'

function Sidebar() {
  return (
    <aside className="site-sidebar">
      <Link className="site-sidebar__brand" to="/" aria-label="Movie Theater Rio home">
        <span>Rio</span>
      </Link>

      <div className="site-sidebar__search" role="search">
        <label className="site-sidebar__search-label" htmlFor="movie-search">
          Search movies
        </label>
        <input
          id="movie-search"
          type="search"
          placeholder="Search movies..."
        />
        <button className="site-sidebar__search-button" type="button" aria-label="Search">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
          >
            <circle cx="10.8" cy="10.8" r="6.8" />
            <path d="m16 16 4.5 4.5" />
          </svg>
        </button>
      </div>

      <nav className="site-sidebar__nav" aria-label="Main navigation">
        <NavLink
          className={({ isActive }) =>
            `site-sidebar__link${isActive ? ' is-active' : ''}`
          }
          to="/about"
        >
          <span>About Us</span>
        </NavLink>
      </nav>

      <div className="site-sidebar__account">
        <NavLink
          className={({ isActive }) =>
            `site-sidebar__link${isActive ? ' is-active' : ''}`
          }
          to="/login"
        >
          <span>Login / Register</span>
        </NavLink>
      </div>
    </aside>
  )
}

export default Sidebar
