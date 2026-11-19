import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { deleteMovie, getDashboardMetrics, getMovies } from '../api/adminApi'
import AdminMovieForm from './AdminMovieForm.jsx'
import './AdminDashboard.css'
import './MoviePage.css'

const metrics = [
  ['movies', 'Total movies'],
  ['screenings', 'Total screenings'],
  ['upcomingScreenings', 'Upcoming screenings'],
  ['reservations', 'Total reservations'],
  ['cinemas', 'Total cinemas'],
  ['users', 'Total users'],
  ['employees', 'Total employees'],
]

function ConfirmationDialog({ confirmation, onDismiss }) {
  const dialog = useRef(null)
  const [text, setText] = useState('')
  const [deleteConfirmed, setDeleteConfirmed] = useState(false)
  const isDelete = confirmation.kind === 'delete'
  const isDeleteFinalStep = isDelete && deleteConfirmed

  useEffect(() => {
    dialog.current.showModal()
  }, [])

  return (
    <dialog
      ref={dialog}
      className="admin-confirmation"
      aria-labelledby="admin-confirmation-title"
      onCancel={(event) => {
        event.preventDefault()
        onDismiss()
      }}
    >
      <h2 id="admin-confirmation-title">{confirmation.title}</h2>
      {isDelete && !isDeleteFinalStep && (
        <p>Deleting this movie also permanently deletes its screenings and reservations.</p>
      )}
      {isDeleteFinalStep && (
          <label className="admin-field">
            Type DELETE to confirm.
            <input value={text} onChange={(event) => setText(event.target.value)} autoComplete="off" />
          </label>
      )}
      <div className="admin-confirmation__actions">
        <button
          type="button"
          className="admin-action admin-action--green"
          disabled={isDeleteFinalStep && text !== 'DELETE'}
          onClick={() => {
            if (isDelete && !isDeleteFinalStep) {
              setDeleteConfirmed(true)
              return
            }
            onDismiss()
            confirmation.onConfirm()
          }}
        >{isDeleteFinalStep ? 'Confirm' : 'Yes'}</button>
        <button type="button" className="admin-action admin-action--red" onClick={onDismiss}>
          {isDeleteFinalStep ? 'Cancel' : 'No'}
        </button>
      </div>
    </dialog>
  )
}

function AdminDashboard() {
  const { pathname } = useLocation()
  const isMovies = pathname === '/admin/movies' || pathname === '/admin/movies/'
  const isDashboard = pathname === '/admin' || pathname === '/admin/'
  const [section, setSection] = useState('list')
  const [selected, setSelected] = useState(null)
  const [movies, setMovies] = useState([])
  const [summary, setSummary] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)
  const [revision, setRevision] = useState(0)
  const [confirmation, setConfirmation] = useState(null)
  const [query, setQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [genre, setGenre] = useState('')
  const [rating, setRating] = useState('')
  const [year, setYear] = useState('')
  const [status, setStatus] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    let active = true
    async function load() {
      setLoading(true)
      setError('')
      try {
        if (isMovies) {
          const result = await getMovies()
          if (!Array.isArray(result)) throw new Error('The server returned an invalid movie list.')
          if (active) setMovies(result)
        } else if (isDashboard) {
          const result = await getDashboardMetrics(controller.signal)
          if (active) setSummary(result)
        }
      } catch (loadError) {
        if (active) setError(loadError.message || 'Could not load admin data.')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => {
      active = false
      controller.abort()
    }
  }, [isMovies, isDashboard, revision])

  function requestDelete(movie) {
    setConfirmation({
      kind: 'delete',
      title: `Delete ${movie.title}?`,
      onConfirm: async () => {
        setError('')
        try {
          await deleteMovie(movie.id)
          setNotice(`Deleted ${movie.title}.`)
          setSelected(null)
          setSection('list')
          setRevision((value) => value + 1)
        } catch (deleteError) {
          setError(deleteError.message || 'Could not delete the movie.')
        }
      },
    })
  }

  const searchableFields = [
    'title', 'imdb_id', 'release_year', 'rated', 'released_date', 'runtime_minutes',
    'genre', 'director', 'writer', 'actors', 'plot', 'languages', 'poster_url',
    'rating_imdb', 'rating_rotten_tomatoes', 'rating_metacritic', 'price',
  ]
  const filteredMovies = movies.filter((movie) => {
    const search = query.trim().toLocaleLowerCase()
    return (!search || searchableFields.some((field) => String(movie[field] ?? '').toLocaleLowerCase().includes(search)))
      && (!genre || String(movie.genre ?? '').toLocaleLowerCase().includes(genre.toLocaleLowerCase()))
      && (!rating || movie.rated === rating)
      && (!year || String(movie.release_year ?? '') === year)
      && (!status || (status === 'coming' ? Boolean(movie.coming_soon) : !movie.coming_soon))
  })
  const ratings = [...new Set(movies.map((movie) => movie.rated).filter(Boolean))].sort()

  return (
    <main className="admin-dashboard">
      {error && <p className="admin-feedback" role="alert">{error}</p>}
      {notice && <p className="admin-feedback" role="status">{notice}</p>}
      {isDashboard && (
        <>
          <header className="admin-dashboard__heading"><h1>Admin Dashboard</h1></header>
          {loading && <p role="status">Loading dashboard metrics...</p>}
          {!loading && summary && !error && (
            <section className="admin-metrics" aria-label="Dashboard metrics">
              {metrics.map(([key, label]) => (
                <article className="admin-metric" key={key}>
                  <h2>{label}</h2>
                  <p>{summary[key]}</p>
                </article>
              ))}
            </section>
          )}
          {!loading && error && <button className="admin-action admin-action--gold" onClick={() => setRevision((value) => value + 1)}>Retry</button>}
        </>
      )}
      {isMovies && (
        <>
          {section === 'list' && (
            <section className="admin-panel admin-movies" aria-labelledby="admin-movies-title">
              <h1 id="admin-movies-title">Movies</h1>
              <div className="admin-movies__toolbar">
                <label className="admin-field">
                  <span className="admin-visually-hidden">Search movie details</span>
                  <input type="search" placeholder="Movie name, IMDb ID or details..." value={query} onChange={(event) => setQuery(event.target.value)} />
                </label>
                <button className="admin-action admin-action--neutral" type="button" aria-expanded={showFilters} onClick={() => setShowFilters(!showFilters)}>Filters</button>
                <button className="admin-action admin-action--green" type="button" onClick={() => { setNotice(''); setSection('add') }}>Add movie</button>
              </div>
              {showFilters && (
                <div className="admin-movies__filters">
                  <label className="admin-field">Genre<input value={genre} onChange={(event) => setGenre(event.target.value)} /></label>
                  <label className="admin-field">Release year<input type="number" value={year} onChange={(event) => setYear(event.target.value)} /></label>
                  <label className="admin-field">Age rating<select value={rating} onChange={(event) => setRating(event.target.value)}><option value="">All ratings</option>{ratings.map((item) => <option key={item}>{item}</option>)}</select></label>
                  <label className="admin-field">Status<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option><option value="coming">Coming soon</option><option value="available">Not coming soon</option></select></label>
                </div>
              )}
              {loading ? <p role="status">Loading movies...</p> : error ? (
                <button className="admin-action admin-action--gold" onClick={() => setRevision((value) => value + 1)}>Retry</button>
              ) : filteredMovies.length === 0 ? <p>No movies match your search.</p> : (
                <ul className="admin-movies__list">
                  {filteredMovies.map((movie) => (
                    <li className="admin-movies__row" key={movie.id}>
                      {movie.poster_url ? <img src={movie.poster_url} alt="" /> : <div className="admin-movies__poster-placeholder" aria-hidden="true" />}
                      <div className="admin-movies__details">
                        <strong>{movie.title}</strong>
                        <span>{movie.genre || 'Genre not specified'}</span>
                        <span>Rating: {movie.rated || 'Not specified'}</span>
                      </div>
                      <div className="admin-movies__actions">
                        <button className="admin-action admin-action--gold" onClick={() => { setSelected(movie); setSection('details'); setNotice('') }}>Details</button>
                        <button className="admin-action admin-action--red" onClick={() => requestDelete(movie)}>Delete</button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
          {(section === 'add' || section === 'edit') && (
            <AdminMovieForm
              key={section === 'edit' ? selected.id : 'add'}
              movie={section === 'edit' ? selected : null}
              requestConfirmation={setConfirmation}
              onCancel={() => setConfirmation({
                kind: 'cancel',
                title: 'Discard your changes?',
                onConfirm: () => { setSection(section === 'edit' ? 'details' : 'list'); setError('') },
              })}
              onDelete={requestDelete}
              onSaved={(saved, edited) => {
                setSelected(null)
                setNotice(`${saved.title} ${edited ? 'updated' : 'added'} successfully.`)
                setSection('list')
                setRevision((value) => value + 1)
              }}
            />
          )}
          {section === 'details' && selected && (
            <section className="admin-panel">
              <button className="admin-action admin-action--gold" onClick={() => setSection('list')}>Back to movies</button>
              <div className={`movie-detail${selected.poster_url ? '' : ' movie-detail--without-poster'}`}>
                {selected.poster_url && <div className="movie-detail__poster"><img src={selected.poster_url} alt={`${selected.title} poster`} /></div>}
                <div className="movie-detail__content">
                  <p className="movie-detail__eyebrow">{selected.coming_soon ? 'Coming soon' : 'Available'}</p>
                  <h1>{selected.title}</h1>
                  <div className="movie-detail__metadata"><span>{selected.genre}</span><span>{selected.rated ? `Age rating: ${selected.rated}` : ''}</span></div>
                  <div className="admin-movies__actions">
                    <button className="admin-action admin-action--gold" onClick={() => setSection('edit')}>Edit details</button>
                    <button className="admin-action admin-action--gold" disabled title="Screening management is coming later">View screenings</button>
                  </div>
                  <p>Screening management is coming later.</p>
                  {selected.plot && <div className="movie-detail__section"><h2>About the movie</h2><p>{selected.plot}</p></div>}
                  {selected.actors && <div className="movie-detail__section"><h2>Cast</h2><p>{selected.actors}</p></div>}
                  {selected.director && <div className="movie-detail__section"><h2>Director</h2><p>{selected.director}</p></div>}
                </div>
              </div>
            </section>
          )}
        </>
      )}
      {!isDashboard && !isMovies && <section className="admin-panel"><h1>Coming later</h1><p>This admin section is not available yet.</p></section>}
      {confirmation && <ConfirmationDialog confirmation={confirmation} onDismiss={() => setConfirmation(null)} />}
    </main>
  )
}

export default AdminDashboard
