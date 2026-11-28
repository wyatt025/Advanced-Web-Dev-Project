import { useEffect, useRef, useState } from 'react'
import {
  searchExternalMovieDatabase,
  addMovieManually,
  updateMovie,
  getExternalMovieDetails,
  getOpenAuditoriums,
} from '../api/adminApi'
import './AdminDashboard.css'

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

function AdminMovieForm({ movie, onSaved, onCancel, onDelete, requestConfirmation }) {
  const isEditing = Boolean(movie)
  const [ticketPrice, setTicketPrice] = useState(movie?.price == null ? '' : String(movie.price))
  const [searchTitle, setSearchTitle] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [selectedMovie, setSelectedMovie] = useState(
    movie ? { Title: movie.title, imdbID: movie.imdb_id } : null
  )
  const [movieStatus, setMovieStatus] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [movieForm, setMovieForm] = useState(() => Object.fromEntries(
    Object.keys(emptyMovie).map((field) => [
      field,
      movie?.[field] == null ? '' : String(movie[field]).slice(0, field === 'released_date' ? 10 : undefined),
    ])
  ))
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)
  const [imdbLookup, setImdbLookup] = useState('')
  const [formOpen, setFormOpen] = useState(true)
  const [searchPage, setSearchPage] = useState(1)
  const [totalResults, setTotalResults] = useState(0)
  const [searchedTitle, setSearchedTitle] = useState('')
  const [comingSoon, setComingSoon] = useState(Boolean(movie?.coming_soon))
  const [screenings, setScreenings] = useState([{ auditoriumId: '', date: '', time: '' }])
  const [auditoriums, setAuditoriums] = useState([])
  const [auditoriumError, setAuditoriumError] = useState('')
  const [isLoadingAuditoriums, setIsLoadingAuditoriums] = useState(!isEditing)
  const [auditoriumRequest, setAuditoriumRequest] = useState(0)
  const moviePickerRef = useRef(null)

  useEffect(() => {
    if (isEditing) return
    const controller = new AbortController()

    getOpenAuditoriums(controller.signal)
      .then((items) => {
        setAuditoriums(items)
        setAuditoriumError('')
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setAuditoriumError(error.message || 'Could not load auditoriums.')
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoadingAuditoriums(false)
      })

    return () => controller.abort()
  }, [auditoriumRequest, isEditing])

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
      if (moviePickerRef.current) {
        moviePickerRef.current.open = false
      }
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

    const runtime = Number(movieForm.runtime_minutes)
    if (!Number.isSafeInteger(runtime) || runtime < 1 || runtime > 9999999) {
      setMovieStatus('Enter a valid runtime in minutes (1-9999999).')
      return
    }
    if (!isEditing && !comingSoon) {
      if (isLoadingAuditoriums || auditoriumError || auditoriums.length === 0) {
        setMovieStatus('Open auditoriums must be available before scheduling a screening.')
        return
      }
      if (screenings.some((screening) =>
          !Number.isSafeInteger(Number(screening.auditoriumId)) ||
          Number(screening.auditoriumId) < 1 || !screening.date || !screening.time
        )) {
        setMovieStatus('Choose an auditorium and date and time for each screening.')
        return
      }
    }


    // Accept up to six digits before the decimal and up to two after it.
    const priceFormat = /^\d{1,6}(\.\d{1,2})?$/

    if (!priceFormat.test(ticketPrice) || Number(ticketPrice) <= 0) {
      setMovieStatus('Enter a valid ticket price greater than zero.')
      return
    }

    requestConfirmation({
      kind: 'confirm',
      title: isEditing ? 'Save changes to this movie?' : 'Add this movie?',
      onConfirm: async () => {
        setMovieStatus('')
        setIsAdding(true)
        try {
          const data = {
            ...movieForm,
            price: ticketPrice,
            coming_soon: comingSoon,
            screenings: comingSoon ? [] : screenings.map((screening) => ({
              auditoriumId: Number(screening.auditoriumId),
              localStart: `${screening.date}T${screening.time}`
            }))
          }
          const savedMovie = isEditing
            ? await updateMovie(movie.id, data)
            : await addMovieManually(data)
          onSaved(savedMovie, isEditing)
        } catch (error) {
          setMovieStatus(error.message || 'Could not save the movie.')
        } finally {
          setIsAdding(false)
        }
      },
    })
  }

  return (
    <>
      <section className="admin-panel" aria-labelledby="movie-form-title">
        <div className="admin-panel__heading">
          <div>
            <h2 id="movie-form-title">{isEditing ? 'Edit movie' : 'Add movie'}</h2>
          </div>
        </div>

        <form className="admin-movie-form" onSubmit={handleAddMovie} noValidate>
          <div className="admin-movie-picker">
            <details className="admin-movie-dropdown" ref={moviePickerRef}>
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
                <button className="admin-action admin-action--gold" type="button" onClick={() => handleSearch()} disabled={isSearching || isLoadingDetails || isAdding}>
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
                  className="admin-action admin-action--gold"
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
                          className="admin-action admin-action--gold"
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
                    <button className="admin-action admin-action--gold" type="button" onClick={() => handleSearch(searchPage - 1)} disabled={searchPage <= 1 || isSearching || isLoadingDetails || isAdding}>
                      Previous
                    </button>
                    <span> Page {searchPage} </span>
                    <button className="admin-action admin-action--gold" type="button" onClick={() => handleSearch(searchPage + 1)} disabled={searchPage >= 100 || searchPage * 10 >= totalResults || searchedTitle !== searchTitle.trim() || isSearching || isLoadingDetails || isAdding}>
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

          {isEditing && <p>Screenings and coming-soon status are managed separately.</p>}
          {!isEditing && <>
          <div className="admin-section-heading">
            <div>
              <h3>Screenings</h3>
              <p>Times are entered in Finnish local time.</p>
            </div>
          </div>

          <label className="admin-field">
            <span className="admin-coming-soon">
              <input
                type="checkbox"
                checked={comingSoon}
                onChange={(event) => setComingSoon(event.target.checked)}
                disabled={isAdding}
              />{' '}
              Coming soon (no screenings yet)
            </span>
          </label>

          {!comingSoon && (
            <div className="admin-showtimes">
              {isLoadingAuditoriums && <p role="status">Loading auditoriums...</p>}
              {auditoriumError && (
                <div role="alert">
                  <p>{auditoriumError}</p>
                  <button className="admin-action admin-action--gold" type="button" onClick={() => {
                    setAuditoriumError('')
                    setIsLoadingAuditoriums(true)
                    setAuditoriumRequest((request) => request + 1)
                  }}>
                    Retry
                  </button>
                </div>
              )}
              {!isLoadingAuditoriums && !auditoriumError && auditoriums.length === 0 && (
                <p>No open auditoriums are available.</p>
              )}
              {screenings.map((screening, index) => (
                <fieldset key={index} disabled={isAdding || isLoadingAuditoriums || Boolean(auditoriumError)}>
                  <legend>Screening {index + 1}</legend>
                  <label className="admin-field">
                    Cinema and auditorium
                    <select
                      value={screening.auditoriumId}
                      onChange={(event) => setScreenings((current) => current.map((item, i) =>
                        i === index ? { ...item, auditoriumId: event.target.value } : item
                      ))}
                      required
                    >
                      <option value="">Select an auditorium</option>
                      {auditoriums.map((auditorium) => (
                        <option key={auditorium.id} value={auditorium.id}>
                          {auditorium.cinemaName} — {auditorium.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="admin-screening-date-time">
                    <label className="admin-field">Date
                      <input type="date" value={screening.date} onChange={(event) => setScreenings((current) => current.map((item, i) =>
                        i === index ? { ...item, date: event.target.value } : item
                      ))} required />
                    </label>
                    <label className="admin-field">Time (Finland)
                      <input type="time" value={screening.time} onChange={(event) => setScreenings((current) => current.map((item, i) =>
                        i === index ? { ...item, time: event.target.value } : item
                      ))} required />
                    </label>
                  </div>
                  <button
                    className="admin-action admin-action--red"
                    type="button"
                    disabled={screenings.length === 1}
                    onClick={() => setScreenings((current) => current.filter((_, i) => i !== index))}
                  >
                    Remove screening
                  </button>
                </fieldset>
              ))}
              <button
                className="admin-action admin-action--green"
                type="button"
                disabled={isAdding}
                onClick={() => setScreenings((current) => [...current, { auditoriumId: '', date: '', time: '' }])}
              >
                Add another screening
              </button>
            </div>
          )}
          </>}

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
            <button className="admin-action admin-action--green" type="submit"
            disabled={isAdding || isSearching || isLoadingDetails}
            >
              {isAdding ? 'Saving...' : 'Confirm'}
            </button>
            <button className="admin-action admin-action--gold" type="button" disabled={isAdding} onClick={onCancel}>Cancel</button>
            {isEditing && <button className="admin-action admin-action--red" type="button" disabled={isAdding} onClick={() => onDelete(movie)}>Delete</button>}
          </div>
        </form>
      </section>

    </>
  )
}

export default AdminMovieForm
