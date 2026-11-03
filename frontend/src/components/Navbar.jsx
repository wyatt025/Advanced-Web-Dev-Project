import './Navbar.css'

function Navbar() {
  return (
    <header className="site-header">
      <nav className="site-nav" aria-label="Main navigation">
        <a className="site-nav__brand" href="/" aria-label="Movie Theater Rio">
          Rio
        </a>

        <div className="site-nav__links">
          <a href="/movies">Make a reservation</a>
          <a href="/about">About Us</a>
        </div>

        <div className="site-nav__search" role="search">
          <label className="site-nav__search-label" htmlFor="movie-search">
            Search movies
          </label>
          <input
            id="movie-search"
            type="search"
            placeholder="Search movies..."
          />
          <button type="button">Search</button>
        </div>

      </nav>
    </header>
  )
}

export default Navbar
