import { useState } from 'react'
import {
  searchExternalMovieDatabase,
  addMovieManually,
  getExternalMovieDetails,
} from '../api/adminApi'
import './AdminDashboard.css'

const reservations = [
  {
    id: 'OULU-1',
    customer: 'Olivia Martin',
    email: 'olivia.martin@example.com',
    movie: 'example movie',
    showtime: 'Today · 6:30 PM',
    seats: 'F4, F5',
    total: '20€',
    status: 'Confirmed',
  },
  {
    id: 'TAMPERE-1',
    customer: 'Noah Williams',
    email: 'noah.williams@example.com',
    movie: 'example movie',
    showtime: 'Today · 10 PM',
    seats: 'C7',
    total: '10€',
    status: 'Confirmed',
  },
]
const emptyMovie = {
  imdb_id: '',
  title: '',
  release_year: '',
  rated: '',
  released_date: '',
  runtime_minutes: '',
  genre: '',
  director: '',
  writer: '',
  actors: '',
  plot: '',
  languages: '',
  poster_url: '',
  rating_imdb: '',
  rating_rotten_tomatoes: '',
  rating_metacritic: '',
}

function AdminDashboard() {
  const [ticketPrice, setTicketPrice] = useState('')
  const [searchTitle, setSearchTitle] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [selectedMovie, setSelectedMovie] = useState(null)
  const [movieStatus, setMovieStatus] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [movieForm, setMovieForm] = useState(emptyMovie)
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)
  const [imdbLookup, setImdbLookup] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [searchPage, setSearchPage] = useState(1)
  const [totalResults, setTotalResults] = useState(0)
  const [searchedTitle, setSearchedTitle] = useState('')

  function handleMovieFieldChange(e) {
    const { name, value } = e.target
    setMovieForm((prevForm) => ({
      ...prevForm,
      [name]: value,
    }))
  }

  async function loadMovieDetails(imdbID, movie) {
    if (Object.values(movieForm).some((value) => value !== '') &&
        !window.confirm('Loading another movie will replace the current movie details. Continue?')) {
      return
    }
    setMovieStatus('')
    setIsLoadingDetails(true)

    try {
      const details = await getExternalMovieDetails(imdbID)
      if (!details || typeof details.title !== 'string' || !details.title.trim() ||
          typeof details.imdb_id !== 'string' || details.imdb_id !== imdbID) {
        throw new Error('The movie service returned unexpected details.')
      }

      const formValues = Object.fromEntries(
        Object.keys(emptyMovie).map((field) => [
          field,
          details[field] == null ? '' : String(details[field]),
        ])
      )

      setMovieForm(formValues)
      setSelectedMovie(movie || {
        imdbID: details.imdb_id,
        Title: details.title,
      })
      setFormOpen(true)
      setMovieStatus(`Loaded ${details.title}. Review the movie fields below.`)
    } catch (error) {
      setMovieStatus(error.message || 'Could not load movie details.')
    } finally {
      setIsLoadingDetails(false)
    }
  }

  async function handleSearch(page = 1) {
    const title = searchTitle.trim()
    if (!title) {
      setMovieStatus('Enter a movie title to search.')
      return
    }
    setMovieStatus('')
    setSearchResults([])
    setIsSearching(true)

    try {
      const data = await searchExternalMovieDatabase(title, page)

      if (!Array.isArray(data.Search)) {
        throw new Error('The movie service returned an unexpected response.')
      }

      setSearchResults(data.Search)
      setSearchPage(page)
      setSearchedTitle(title)
      setTotalResults(Number(data.totalResults) || 0)

      if (data.Search.length === 0) {
        setMovieStatus('No movies found.')
      }
    } catch (error) {
      setMovieStatus(error.message || 'Could not search for movies.')
    } finally {
      setIsSearching(false)
    }
  }

  function handleImdbLookup() {
    const imdbID = imdbLookup.trim()
    if (!imdbID) {
      setMovieStatus('Enter an IMDb ID to look up.')
      return
    }
    loadMovieDetails(imdbID)
  }

  async function handleAddMovie(event) {
    event.preventDefault()
    if (isAdding || isSearching || isLoadingDetails) return
    if (!movieForm.title.trim()) {
      setMovieStatus('Enter a movie title.')
      return
    }

    // Accept up to six digits before the decimal and up to two after it.
    const priceFormat = /^\d{1,6}(\.\d{1,2})?$/

    if (!priceFormat.test(ticketPrice) || Number(ticketPrice) <= 0) {
      setMovieStatus('Enter a valid ticket price greater than zero.')
      return
    }

    setMovieStatus('')
    setIsAdding(true)

    try {
      const savedMovie = await addMovieManually({
        ...movieForm,
        price: ticketPrice,
      })

      setMovieStatus(`Added ${savedMovie.title} successfully.`)
      setMovieForm(emptyMovie)
      setSelectedMovie(null)
      setSearchResults([])
      setTotalResults(0)
      setSearchedTitle('')
      setSearchPage(1)
      setSearchTitle('')
      setImdbLookup('')
      setTicketPrice('')
    } catch (error) {
      setMovieStatus(error.message || 'Could not add the movie.')
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <main className="admin-dashboard">
      <header className="admin-dashboard__heading">
        <div>
          <h1>Admin Dashboard</h1>
        </div>
      </header>

      <section className="admin-panel" aria-labelledby="movie-form-title">
        <div className="admin-panel__heading">
          <div>
            <h2 id="movie-form-title">Add a movie</h2>
          </div>
        </div>

        <form className="admin-movie-form" onSubmit={handleAddMovie} noValidate>
          <div className="admin-movie-picker">
            <details className="admin-movie-dropdown">
              <summary className="admin-field">
                Movie
                <span className="admin-movie-dropdown__trigger">
                  {selectedMovie ? selectedMovie.Title : 'Choose a movie from the catalog'}
                </span>
              </summary>
              <div className="admin-movie-dropdown__content">
                <label className="admin-field">
                  Search movies
                  <input
                    type="search"
                    name="movie-search"
                    placeholder="Search the movie catalog..."
                    value={searchTitle}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        if (!isSearching && !isLoadingDetails && !isAdding) handleSearch()
                      }
                    }}
                    onChange={(e) => {
                      setSearchTitle(e.target.value)
                      setSearchResults([])
                      setTotalResults(0)
                      setSearchedTitle('')
                      setMovieStatus('')
                    }}
                    disabled={isSearching || isLoadingDetails || isAdding}
                  />
                </label>
                <button type="button" onClick={() => handleSearch()} disabled={isSearching || isLoadingDetails || isAdding}>
                  {isSearching ? 'Searching...' : 'Search'}
                </button>

                <label className="admin-field">
                  Look up by IMDb ID
                  <input
                    type="text"
                    placeholder="e.g. tt0133093"
                    value={imdbLookup}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        if (!isSearching && !isLoadingDetails && !isAdding) handleImdbLookup()
                      }
                    }}
                    onChange={(event) => setImdbLookup(event.target.value)}
                    disabled={isSearching || isLoadingDetails || isAdding}
                  />
                </label>

                <button
                  type="button"
                  onClick={handleImdbLookup}
                  disabled={isSearching || isLoadingDetails || isAdding}
                >
                  {isLoadingDetails ? 'Loading details...' : 'Look up ID'}
                </button>

                {searchResults.length > 0 && (
                  <>
                  <ul>
                    {searchResults.map((movie) => (
                      <li key={movie.imdbID}>
                        <button
                          type="button"
                          onClick={() => loadMovieDetails(movie.imdbID, movie)}
                          disabled={isLoadingDetails || isSearching || isAdding}
                          aria-pressed={selectedMovie?.imdbID === movie.imdbID}
                        >
                          {movie.Title} ({movie.Year})
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div>
                    <button type="button" onClick={() => handleSearch(searchPage - 1)} disabled={searchPage <= 1 || isSearching || isLoadingDetails || isAdding}>
                      Previous
                    </button>
                    <span> Page {searchPage} </span>
                    <button type="button" onClick={() => handleSearch(searchPage + 1)} disabled={searchPage >= 100 || searchPage * 10 >= totalResults || searchedTitle !== searchTitle.trim() || isSearching || isLoadingDetails || isAdding}>
                      Next
                    </button>
                  </div>
                  </>
                )}
              </div>
            </details>
          </div>

          <p role="status" aria-live="polite">{movieStatus}</p>

          <details className="admin-manual-movie" open={formOpen} onToggle={(event) => setFormOpen(event.currentTarget.open)}>
            <summary>Review or enter movie details</summary>
            <fieldset className="admin-manual-movie__fields" disabled={isLoadingDetails || isAdding}>
              <label className="admin-field">
                Movie title
                <input type="text" name="title" placeholder="Movie title"
                  value={movieForm.title}
                onChange={handleMovieFieldChange}
                />
              </label>
              <label className="admin-field">
                IMDb ID
                <input
                  type="text"
                  name="imdb_id"
                  placeholder="e.g. tt0133093"
                  value={movieForm.imdb_id}
                  onChange={handleMovieFieldChange}
                />
              </label>
              <label className="admin-field">
                Release year
                <input
                  type="number"
                  name="release_year"
                  placeholder="e.g. 1999"
                  value={movieForm.release_year}
                  onChange={handleMovieFieldChange}
                />
              </label>
              <label className="admin-field">
                Release date
                <input
                  type="date"
                  name="released_date"
                  value={movieForm.released_date}
                  onChange={handleMovieFieldChange}
                />
              </label>
              <label className="admin-field">
                Director
                <input
                  type="text"
                  name="director"
                  value={movieForm.director}
                  onChange={handleMovieFieldChange}
                />
              </label>
              <label className="admin-field">
                Age rating
                <input
                  type="text"
                  name="rated"
                  maxLength={20}
                  placeholder="e.g. PG-13"
                  value={movieForm.rated}
                  onChange={handleMovieFieldChange}
                />
              </label>
              <label className="admin-field">
                Actors
                <input
                  type="text"
                  name="actors"
                  placeholder="Separate actor names with commas"
                  value={movieForm.actors}
                  onChange={handleMovieFieldChange}
                />
              </label>
              <label className="admin-field">
                Genre
                <input type="text" name="genre" placeholder="e.g. Drama" value={movieForm.genre} onChange={handleMovieFieldChange} />
              </label>
              <label className="admin-field">
                Runtime (minutes)
                <input
                  type="number"
                  name="runtime_minutes"
                  min="1"
                  placeholder="120"
                  value={movieForm.runtime_minutes}
                  onChange={handleMovieFieldChange}
                />
              </label>
              <label className="admin-field admin-manual-movie__synopsis">
                Description
                <textarea
                  name="plot"
                  rows="3"
                  placeholder="Short movie synopsis"
                  value={movieForm.plot}
                  onChange={handleMovieFieldChange}
                />
              </label>
              <label className="admin-field">
                Writer
                <input
                  type="text"
                  name="writer"
                  value={movieForm.writer}
                  onChange={handleMovieFieldChange}
                />
              </label>
              <label className="admin-field">
                Languages
                <input
                  type="text"
                  name="languages"
                  value={movieForm.languages}
                  onChange={handleMovieFieldChange}
                />
              </label>
              <label className="admin-field">
                Poster URL
                <input
                  type="url"
                  name="poster_url"
                  value={movieForm.poster_url}
                  onChange={handleMovieFieldChange}
                />
              </label>
              <label className="admin-field">
                IMDb rating
                <input
                  type="text"
                  name="rating_imdb"
                  value={movieForm.rating_imdb}
                  onChange={handleMovieFieldChange}
                />
              </label>
              <label className="admin-field">
                Rotten Tomatoes rating
                <input
                  type="text"
                  name="rating_rotten_tomatoes"
                  value={movieForm.rating_rotten_tomatoes}
                  onChange={handleMovieFieldChange}
                />
              </label>
              <label className="admin-field">
                Metacritic rating
                <input
                  type="text"
                  name="rating_metacritic"
                  value={movieForm.rating_metacritic}
                  onChange={handleMovieFieldChange}
                />
              </label>
            </fieldset>
          </details>

          <div className="admin-form-divider" />

          <div className="admin-section-heading">
            <div>
              <h3>Showtimes</h3>
              <p>Screening scheduling is not available yet. Adding a movie does not create a screening.</p>
            </div>
          </div>
          <div className="admin-showtimes">
            <label className="admin-field">
              Screening date
              <input type="date" name="screening-date" disabled />
            </label>
            <fieldset className="admin-time-options" disabled>
              <legend>Available times</legend>
              <label>
                <input type="radio" name="showtime" value="12:30" />
                <span>12:30 PM</span>
              </label>
              <label>
                <input type="radio" name="showtime" value="15:45" />
                <span>3:45 PM</span>
              </label>
              <label>
                <input type="radio" name="showtime" value="18:30" />
                <span>6:30 PM</span>
              </label>
            </fieldset>
          </div>

          <div className="admin-form-divider" />

          <div className="admin-section-heading">
            <div>
              <h3>Ticket pricing</h3>
            </div>
          </div>
          <div className="admin-pricing">
            <label className="admin-field admin-pricing__field">
              Standard ticket
              <span className="admin-field__unit admin-field__unit--currency">
                <span>€</span>
                <input
                  type="number"
                  name="ticket-price"
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  value={ticketPrice}
                  onChange={(event) => setTicketPrice(event.target.value)}
                  disabled={isAdding}
                  aria-describedby={!ticketPrice || Number(ticketPrice) <= 0 ? 'price-warning' : undefined}
                />
              </span>
            </label>
            {(!ticketPrice || Number(ticketPrice) <= 0) && (
              <p className="admin-price-warning" id="price-warning" role="note">
                <span aria-hidden="true">!</span>
                Ticket price is required. Add a price before publishing this movie.
              </p>
            )}
          </div>

          <div className="admin-form-actions">
            <button className="admin-button admin-button--primary" type="submit"
            disabled={isAdding || isSearching || isLoadingDetails}
            >
              {isAdding ? 'Adding...' : 'Add movie'}
              <span aria-hidden="true">+</span>
            </button>
          </div>
        </form>
      </section>

      <section className="admin-panel admin-reservations" aria-labelledby="reservations-title">
        <div className="admin-panel__heading admin-reservations__heading">
          <div>
            <h2 id="reservations-title">Reservations</h2>
          </div>
        </div>

        <div className="admin-table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">Reservation</th>
                <th scope="col">Customer</th>
                <th scope="col">Movie &amp; showtime</th>
                <th scope="col">Seats</th>
                <th scope="col">Total</th>
                <th scope="col">Status</th>
                <th scope="col">
                  <span className="admin-visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {reservations.map((reservation) => (
                <tr key={reservation.id}>
                  <td className="admin-table__id">{reservation.id}</td>
                  <td>
                    <span className="admin-table__customer">{reservation.customer}</span>
                    <span className="admin-table__subtext">{reservation.email}</span>
                  </td>
                  <td>
                    <span className="admin-table__customer">{reservation.movie}</span>
                    <span className="admin-table__subtext">{reservation.showtime}</span>
                  </td>
                  <td>{reservation.seats}</td>
                  <td className="admin-table__total">{reservation.total}</td>
                  <td>
                    <span
                      className={`admin-status ${reservation.status === 'Pending' ? 'admin-status--pending' : ''}`}
                    >
                      <span />
                      {reservation.status}
                    </span>
                  </td>
                  <td>
                    <button className="admin-table__action" type="button">
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}

export default AdminDashboard
