import './Navbar.css'
import { Link } from 'react-router-dom'

function Navbar() {
  return (
    <header className="site-header">
      <nav className="site-nav" aria-label="Main navigation">
        <Link className="site-nav__brand" to="/" aria-label="Movie Theater Rio">
          Rio
        </Link>

        <div className="site-nav__search" role="search">
          <label className="site-nav__search-label" htmlFor="movie-search">
            Search movies
          </label>
          <input
            id="movie-search"
            type="search"
            placeholder="Search movies..."
          />
          <button className="site-nav__search-button" type="button" aria-label="Search">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              width="22"
              height="22"
              fill="none"
            >
              <circle cx="10.8" cy="10.8" r="6.8" />
              <path d="m16 16 4.5 4.5" />
            </svg>
          </button>
        </div>

        <div className="site-nav__actions">
          <div className="site-nav__links">
            <Link to="/movies">Make a reservation</Link>
            <Link to="/about">About Us</Link>
          </div>
          <Link className="site-nav__account" to="/login">
            Login / Register
          </Link>
        </div>
      </nav>
    </header>
  )
}

export default Navbar
