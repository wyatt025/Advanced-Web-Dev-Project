import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  getAdminScreenings, getAdminScreening, getMovies, getOpenAuditoriums,
  checkAdminScreenings, createAdminScreenings, updateAdminScreening, deleteAdminScreening,
} from '../api/adminApi.js'
import { formatScreeningDate, screeningLocalInput } from './screeningDates.js'
import { regularSeats } from './screeningAvailability.js'
import './TicketPage.css'

function ScreeningForm({ screening, movies, auditoriums, requestConfirmation, onCancel, onSaved, onDelete }) {
  const isEditing = Boolean(screening)
  const restricted = isEditing && screening.reservationCount > 0
  const [movieId, setMovieId] = useState(screening ? String(screening.movieId) : '')
  const [cinemaIds, setCinemaIds] = useState(screening ? [String(screening.cinemaId)] : [])
  const [auditoriumIds, setAuditoriumIds] = useState(screening ? [String(screening.auditoriumId)] : [])
  const [localStart, setLocalStart] = useState(screening ? screeningLocalInput(screening.date) : '')
  const [queue, setQueue] = useState([])
  const [editingIndex, setEditingIndex] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const cinemas = [...new Map(auditoriums.map((a) => [String(a.cinemaId), a.cinemaName])).entries()]
  const availableAuditoriums = auditoriums.filter((a) => cinemaIds.includes(String(a.cinemaId)))

  function clearFields() {
    setMovieId(screening ? String(screening.movieId) : '')
    setCinemaIds(screening ? [String(screening.cinemaId)] : [])
    setAuditoriumIds(screening ? [String(screening.auditoriumId)] : [])
    setLocalStart(screening ? screeningLocalInput(screening.date) : '')
    setEditingIndex(null)
    setError('')
  }

  async function acceptFields() {
    if (!movieId || !localStart || !auditoriumIds.length || (isEditing && auditoriumIds.length !== 1)) {
      setError(isEditing ? 'Choose a movie, one auditorium and a date and time.' : 'Choose a movie, at least one auditorium and a date and time.')
      return
    }
    const additions = auditoriumIds.map((auditoriumId) => ({
      movieId: Number(movieId), auditoriumId: Number(auditoriumId), localStart,
    }))
    const remaining = editingIndex === null ? queue : queue.filter((_, index) => index !== editingIndex)
    const proposed = isEditing ? additions : [...remaining, ...additions]
    setBusy(true)
    setError('')
    try {
      await checkAdminScreenings(proposed, screening?.id)
      setQueue(proposed)
      clearFields()
    } catch (checkError) {
      setError(checkError.message || 'Could not check availability.')
    } finally {
      setBusy(false)
    }
  }

  function editItem(item, index) {
    const auditorium = auditoriums.find((a) => a.id === item.auditoriumId)
    if (!auditorium) {
      setError('This auditorium is no longer available. Remove this item and reload the form.')
      return
    }
    setMovieId(String(item.movieId))
    setCinemaIds([String(auditorium.cinemaId)])
    setAuditoriumIds([String(item.auditoriumId)])
    setLocalStart(item.localStart)
    setEditingIndex(index)
    setError('')
  }

  function save() {
    if (!queue.length || editingIndex !== null || busy) return
    requestConfirmation({
      kind: 'confirm',
      title: isEditing ? 'Save changes to this screening?' : `Add ${queue.length} ${queue.length === 1 ? 'screening' : 'screenings'}?`,
      message: isEditing ? 'If reservations exist, customers are not automatically notified or refunded when the screening time changes.' : undefined,
      onConfirm: async () => {
        setBusy(true)
        setError('')
        try {
          if (isEditing) await updateAdminScreening(screening.id, queue[0])
          else await createAdminScreenings(queue)
          onSaved(isEditing)
        } catch (saveError) {
          setError(saveError.message || 'Could not save screenings.')
        } finally {
          setBusy(false)
        }
      },
    })
  }

  return (
    <section className="admin-panel admin-screening-form">
      <h1>{isEditing ? 'Edit screening' : 'Add screenings'}</h1>
      {restricted && <p>Reservations exist: only the time can be changed. Customers are not automatically notified or refunded.</p>}
      {error && <p role="alert">{error}</p>}
      <fieldset disabled={busy} className="admin-screening-form__fields">
        <label className="admin-field">Movie
          <select value={movieId} disabled={restricted} onChange={(event) => setMovieId(event.target.value)}>
            <option value="">Select a movie</option>
            {movies.map((movie) => <option value={movie.id} key={movie.id}>{movie.title}</option>)}
          </select>
        </label>
        <label className="admin-field">Cinemas (select one or more)
          <select multiple value={cinemaIds} disabled={restricted} onChange={(event) => {
            const ids = [...event.target.selectedOptions].map((option) => option.value)
            setCinemaIds(ids)
            setAuditoriumIds((current) => current.filter((value) => auditoriums.some((a) => String(a.id) === value && ids.includes(String(a.cinemaId)))))
          }}>
            {cinemas.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        </label>
        {!restricted && <p className="admin-screening-form__hint">Hold Ctrl (or Command on Mac) to select multiple cinemas or auditoriums.</p>}
        {!restricted && <button type="button" className="admin-action admin-action--gold" onClick={() => setCinemaIds(cinemas.map(([id]) => id))}>Select all cinemas</button>}
        <label className="admin-field">Auditoriums ({isEditing ? 'select one' : 'select one or more'})
          <select multiple={!isEditing} value={isEditing ? (auditoriumIds[0] || '') : auditoriumIds} disabled={restricted} onChange={(event) => {
            setAuditoriumIds(isEditing ? (event.target.value ? [event.target.value] : []) : [...event.target.selectedOptions].map((option) => option.value))
          }}>
            {isEditing && <option value="">Select an auditorium</option>}
            {availableAuditoriums.map((auditorium) => <option key={auditorium.id} value={auditorium.id}>{auditorium.cinemaName} - {auditorium.name}</option>)}
          </select>
        </label>
        <label className="admin-field">Screening date and time (Finland)
          <input type="datetime-local" value={localStart} onChange={(event) => setLocalStart(event.target.value)} />
        </label>
        <div className="admin-movies__actions">
          <button type="button" className="admin-action admin-action--green" onClick={acceptFields}>{editingIndex !== null ? 'Confirm changes' : 'Confirm fields'}</button>
          <button type="button" className="admin-action admin-action--gold" onClick={clearFields}>Cancel fields</button>
        </div>
      </fieldset>
      <h2>Screenings to {isEditing ? 'save' : 'add'}</h2>
      <ul className="admin-movies__list admin-screening-queue">
        {queue.length === 0 && <li className="admin-movies__row">No screenings queued.</li>}
        {queue.map((item, index) => {
          const auditorium = auditoriums.find((a) => a.id === item.auditoriumId)
          const movie = movies.find((m) => m.id === item.movieId)
          return <li className="admin-movies__row" key={`${item.movieId}-${item.auditoriumId}-${item.localStart}`}>
            <div className="admin-movies__details"><strong>{movie?.title}</strong><span>{item.localStart.slice(8, 10)}.{item.localStart.slice(5, 7)}.{item.localStart.slice(0, 4)} {item.localStart.slice(11)} (Finland)</span><span>{auditorium?.name}, {auditorium?.cinemaName}</span></div>
            <div className="admin-movies__actions"><button type="button" className="admin-action admin-action--gold" disabled={busy} onClick={() => editItem(item, index)}>Edit</button><button type="button" className="admin-action admin-action--red" disabled={busy} onClick={() => { setQueue(queue.filter((_, i) => i !== index)); clearFields() }}>Remove</button></div>
          </li>
        })}
      </ul>
      <div className="admin-screening-form__actions">
        <button type="button" className="admin-action admin-action--green" disabled={!queue.length || editingIndex !== null || busy} onClick={save}>Confirm all</button>
        <button type="button" className="admin-action admin-action--gold" disabled={busy} onClick={onCancel}>Cancel</button>
        {isEditing && <button type="button" className="admin-action admin-action--red" disabled={busy} onClick={() => onDelete(screening)}>Delete</button>}
      </div>
    </section>
  )
}

function ScreeningDetails({ screening, onBack, onEdit, onMovie }) {
  const seats = regularSeats(screening)
  const taken = new Set(screening.takenSeats)
  const rows = Array.from({ length: Math.ceil(seats.length / 10) }, (_, index) => index + 1)
  return <section className="admin-panel">
    <button className="admin-action admin-action--gold" onClick={onBack}>Back to screenings</button>
    <div className={`movie-detail${screening.posterUrl ? '' : ' movie-detail--without-poster'}`}>
      {screening.posterUrl && <div className="movie-detail__poster"><img src={screening.posterUrl} alt={`${screening.title} poster`} /></div>}
      <div className="movie-detail__content">
        <h1>{screening.title}</h1>
        <p>{formatScreeningDate(screening.date)} (Finland)</p>
        <p>{screening.auditorium}, {screening.cinema}</p>
        <p>{screening.reservationCount} / {screening.seatCapacity} seats reserved</p>
        <p>Counts and seat markings include database reservations only. Payment bookings may not be included.</p>
        <div className="admin-movies__actions">
          <button className="admin-action admin-action--gold" onClick={onMovie}>Movie details</button>
          <button className="admin-action admin-action--gold" onClick={onEdit}>Edit screening</button>
          <button className="admin-action admin-action--gold" disabled title="Reservation management is coming later">View reservations</button>
        </div>
      </div>
    </div>
    <section className="ticket-panel" aria-label="Screening seating layout">
      <h2>Seating layout</h2>
      <div className="ticket-doors"><span>DOOR</span><span>DOOR</span></div>
      <div className="ticket-seat-map">
        {rows.map((position) => {
          const row = position >= 13 ? position + 1 : position
          return <div className={`ticket-seat-row${position % 2 ? ' is-reversed' : ''}`} key={row}>
            <span className="ticket-seat-row__label">{row}</span>
            {seats.slice((position - 1) * 10, position * 10).map((seat) => <span role="img" key={seat} className={`ticket-seat admin-screening-seat${taken.has(seat) ? ' is-reserved' : ''}`} aria-label={`Row ${row}, seat ${seat}${taken.has(seat) ? ', reserved' : ', available'}`}>{seat}</span>)}
            <span className="ticket-seat-row__label">{row}</span>
          </div>
        })}
      </div>
      <div className="ticket-wheelchair-row">
        <p>{screening.accessibleSeatCount} wheelchair spaces included in capacity; individual bookings are not available yet.</p>
        <div className="ticket-wheelchair-slots" role="img" aria-label={`${screening.accessibleSeatCount} wheelchair spaces, booking not available`}>
          {Array.from({ length: screening.accessibleSeatCount }, (_, index) => <span className="ticket-wheelchair-slot" key={index}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="4" r="2" /><path d="m9 8-2 6h6l2 4h4m-9-10 5 2 2 5h3" /><path d="M13 16a6 6 0 1 1-5-7" /></svg>
          </span>)}
        </div>
      </div>
      <div className="ticket-screen">SCREEN</div>
      <div className="ticket-legend"><span><i className="ticket-legend__seat" /> Available</span><span><i className="ticket-legend__seat is-reserved" /> Reserved</span></div>
    </section>
  </section>
}

export default function AdminScreenings({ requestConfirmation }) {
  const navigate = useNavigate()
  const { state: navigationState } = useLocation()
  const [movieFilter, setMovieFilter] = useState(() => navigationState?.movieId ? { id: navigationState.movieId, title: navigationState.movieTitle } : null)
  const [screenings, setScreenings] = useState([])
  const [movies, setMovies] = useState([])
  const [auditoriums, setAuditoriums] = useState([])
  const [section, setSection] = useState('list')
  const [selected, setSelected] = useState(null)
  const [query, setQuery] = useState('')
  const [period, setPeriod] = useState('upcoming')
  const [showFilters, setShowFilters] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [revision, setRevision] = useState(0)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    let active = true
    const controller = new AbortController()
    Promise.all([getAdminScreenings(), getMovies(), getOpenAuditoriums(controller.signal)])
      .then(([items, movieItems, auditoriumItems]) => {
        if (!Array.isArray(items) || !Array.isArray(movieItems)) throw new Error('The server returned an invalid list.')
        if (active) { setScreenings(items); setMovies(movieItems); setAuditoriums(auditoriumItems); setNow(Date.now()); setError('') }
      })
      .catch((loadError) => { if (active) setError(loadError.message || 'Could not load screenings.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false; controller.abort() }
  }, [revision])

  async function openDetails(item) {
    setError('')
    setLoading(true)
    try {
      setSelected(await getAdminScreening(item.id))
      setSection('details')
      setNotice('')
    } catch (loadError) { setError(loadError.message || 'Could not load screening.') }
    finally { setLoading(false) }
  }

  function requestDelete(item) {
    requestConfirmation({
      kind: 'delete', title: `Delete screening of ${item.title}?`,
      message: 'Deleting this screening permanently deletes its database reservations. Customers are not automatically notified or refunded.',
      onConfirm: async () => {
        setError('')
        try {
          await deleteAdminScreening(item.id)
          setSection('list'); setSelected(null); setNotice('Screening deleted.'); setRevision((value) => value + 1)
        } catch (deleteError) { setError(deleteError.message || 'Could not delete the screening.') }
      },
    })
  }

  const filtered = screenings.filter((item) => {
    const isUpcoming = new Date(item.date).getTime() >= now
    const search = query.trim().toLocaleLowerCase()
    return (!movieFilter || item.movieId === movieFilter.id) &&
      (period === 'all' || (period === 'upcoming' ? isUpcoming : !isUpcoming)) &&
      [item.title, item.imdbId, item.cinema, item.auditorium, formatScreeningDate(item.date)].some((value) => String(value ?? '').toLocaleLowerCase().includes(search))
  })

  return <>
    {error && <p className="admin-feedback" role="alert">{error}</p>}
    {notice && <p className="admin-feedback" role="status">{notice}</p>}
    {section === 'list' && <section className="admin-panel admin-movies">
      <h1>Screenings</h1>
      <div className="admin-movies__toolbar">
        <label className="admin-field"><span className="admin-visually-hidden">Search screenings</span><input type="search" placeholder="Movie, IMDb ID, cinema or auditorium..." value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        <button type="button" className="admin-action admin-action--neutral" aria-expanded={showFilters} onClick={() => setShowFilters(!showFilters)}>Filters</button>
        <button type="button" className="admin-action admin-action--green" disabled={loading || Boolean(error)} onClick={() => { setSection('add'); setNotice('') }}>Add screening</button>
      </div>
      {showFilters && <div className="admin-movies__filters"><label className="admin-field">Screening time<select value={period} onChange={(event) => setPeriod(event.target.value)}><option value="upcoming">Upcoming</option><option value="past">Past</option><option value="all">All</option></select></label></div>}
      {movieFilter && <p>Showing screenings for {movieFilter.title}. <button type="button" className="admin-action admin-action--neutral" onClick={() => setMovieFilter(null)}>Clear movie filter</button></p>}
      {loading ? <p role="status">Loading screenings...</p> : error ? <button className="admin-action admin-action--gold" onClick={() => { setLoading(true); setRevision((value) => value + 1) }}>Retry</button> : filtered.length === 0 ? <p>No screenings match your search.</p> :
        <ul className="admin-movies__list">{filtered.map((item) => <li className="admin-movies__row" key={item.id}>
          <div className="admin-movies__details"><strong>{item.title}</strong><span>{formatScreeningDate(item.date)} (Finland)</span><span>{item.auditorium}, {item.cinema}</span></div>
          <div className="admin-movies__actions"><button className="admin-action admin-action--gold" onClick={() => openDetails(item)}>Details</button><button className="admin-action admin-action--red" onClick={() => requestDelete(item)}>Delete</button></div>
        </li>)}</ul>}
    </section>}
    {section === 'details' && selected && <ScreeningDetails screening={selected} onBack={() => setSection('list')} onEdit={() => setSection('edit')} onMovie={() => navigate('/admin/movies', { state: { movieId: selected.movieId } })} />}
    {(section === 'add' || section === 'edit') && <ScreeningForm key={section === 'edit' ? selected.id : 'add'} screening={section === 'edit' ? selected : null} movies={movies} auditoriums={auditoriums} requestConfirmation={requestConfirmation} onDelete={requestDelete}
      onCancel={() => requestConfirmation({ kind: 'cancel', title: 'Discard your changes?', onConfirm: () => { setError(''); setSection(section === 'edit' ? 'details' : 'list') } })}
      onSaved={(edited) => { setSection('list'); setSelected(null); setNotice(edited ? 'Screening updated.' : 'Screenings added.'); setRevision((value) => value + 1) }} />}
  </>
}
