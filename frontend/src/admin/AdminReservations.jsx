import { useEffect, useId, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import {
  getAdminReservations, searchReservationUsers, createAdminReservation, deleteAdminReservation,
  getAdminScreenings, getAdminScreening,
} from '../api/adminApi.js'
import { formatScreeningDate } from '../pages/screeningDates.js'
import { regularSeats } from '../pages/screeningAvailability.js'
import { summarizeReservationSeats } from '../pages/reservationDisplay.js'
import '../pages/TicketPage.css'

const statusLabels = {
  pending_payment: 'Pending payment', paid: 'Paid', unpaid: 'Unpaid',
  expired: 'Expired', cancelled: 'Cancelled',
}

function SeatPicker({ screening, selected, onChange }) {
  const seats = regularSeats(screening)
  const taken = new Set(screening.takenSeats)
  const count = Math.ceil(seats.length / 10)
  return <section className="ticket-panel" aria-label="Select seats">
    <h2>Select seats</h2>
    <div className="ticket-seat-map">
      {Array.from({ length: count }, (_, index) => count - index).map((position) => {
        const row = position >= 13 ? position + 1 : position
        return <div key={row} className={`ticket-seat-row${position % 2 ? ' is-reversed' : ''}`}>
          <span className="ticket-seat-row__label">{row}</span>
          {seats.slice((position - 1) * 10, position * 10).map((seat) => <button
            type="button" key={seat} disabled={taken.has(seat)}
            className={`ticket-seat${taken.has(seat) ? ' is-reserved' : ''}${selected.includes(seat) ? ' is-selected' : ''}`}
            aria-label={`Row ${row}, seat ${seat}${taken.has(seat) ? ', reserved' : ''}`}
            aria-pressed={selected.includes(seat)}
            onClick={() => onChange(selected.includes(seat) ? selected.filter((item) => item !== seat) : [...selected, seat].sort((a, b) => a - b))}
          >{seat}</button>)}
          <span className="ticket-seat-row__label">{row}</span>
        </div>
      })}
    </div>
    <div className="ticket-legend"><span><i className="ticket-legend__seat" /> Available</span><span><i className="ticket-legend__seat is-selected" /> Selected</span><span><i className="ticket-legend__seat is-reserved" /> Reserved</span></div>
    <p>Wheelchair space booking is not available yet.</p>
  </section>
}

function ReservationForm({ requestConfirmation, onCancel, onSaved }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [userId, setUserId] = useState(null)
  const [userQuery, setUserQuery] = useState('')
  const [users, setUsers] = useState([])
  const [searchedUsers, setSearchedUsers] = useState(false)
  const [search, setSearch] = useState('')
  const [showScreenings, setShowScreenings] = useState(false)
  const searchInput = useRef(null)
  const screeningListId = useId()
  const [screenings, setScreenings] = useState([])
  const [screening, setScreening] = useState(null)
  const [seats, setSeats] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [loadingScreenings, setLoadingScreenings] = useState(true)

  useEffect(() => {
    let active = true
    getAdminScreenings().then((items) => {
      if (!Array.isArray(items)) throw new Error('Invalid screening list.')
      if (active) setScreenings(items.filter((item) => new Date(item.date).getTime() > Date.now()))
    }).catch((loadError) => { if (active) setError(loadError.message) })
      .finally(() => { if (active) setLoadingScreenings(false) })
    return () => { active = false }
  }, [])

  async function findUsers() {
    setError(''); setBusy(true); setUsers([]); setSearchedUsers(false)
    try { setUsers(await searchReservationUsers(userQuery)); setSearchedUsers(true) }
    catch (searchError) { setError(searchError.message) }
    finally { setBusy(false) }
  }
  async function selectScreening(id) {
    setScreening(null); setSeats([]); setError('')
    if (!id) return
    setBusy(true)
    try { setScreening(await getAdminScreening(id)) }
    catch (loadError) { setError(loadError.message) }
    finally { setBusy(false) }
  }
  function submit(event) {
    event.preventDefault()
    if (!screening || !seats.length) { setError('Choose a screening and at least one available seat.'); return }
    requestConfirmation({
      kind: 'confirm', title: 'Create this unpaid reservation?',
      message: 'This will reserve the selected seats. No payment or customer notification is sent.',
      onConfirm: async () => {
        setBusy(true); setError('')
        try {
          await createAdminReservation({ name, email, phone, userId, screeningId: screening.id, seats })
          onSaved()
        } catch (saveError) {
          setError(saveError.message)
          if (screening) {
            try { setScreening(await getAdminScreening(screening.id)); setSeats([]) }
            catch (refreshError) { setError(`${saveError.message} Could not refresh seats: ${refreshError.message}`) }
          }
        } finally { setBusy(false) }
      },
    })
  }
  const matching = screenings.filter((item) => [item.title, item.cinema, item.auditorium].some((value) => String(value || '').toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())))
  return <form className="admin-panel admin-reservation-form" onSubmit={submit}>
    <h1>Add reservation</h1>
    {error && <p role="alert">{error}</p>}
    <fieldset disabled={busy} className="admin-screening-form__fields">
      <label className="admin-field">Find registered customer<input value={userQuery} onChange={(event) => { setUserQuery(event.target.value); setUsers([]); setSearchedUsers(false) }} placeholder="Name or email" /></label>
      <button type="button" className="admin-action admin-action--gold" onClick={findUsers}>Search customers</button>
      {searchedUsers && users.length === 0 && <p>No registered customers found.</p>}
      {users.length > 0 && <ul className="admin-reservation-search-results">{users.map((user) => <li key={user.id}>
        <button type="button" className="admin-action admin-action--gold" onClick={() => {
          setUserId(user.id); setName(user.name); setEmail(user.email); setPhone(user.phone || ''); setUsers([]); setSearchedUsers(false)
        }}>{user.name} — {user.email}</button>
      </li>)}</ul>}
      {userId && <p>Registered customer selected. Editing contact information will make this a guest booking.</p>}
      <label className="admin-field">Customer name<input required maxLength={255} value={name} onChange={(event) => { setName(event.target.value); setUserId(null) }} /></label>
      <label className="admin-field">Email<input required type="email" maxLength={254} value={email} onChange={(event) => { setEmail(event.target.value); setUserId(null) }} /></label>
      <label className="admin-field">Phone (optional)<input type="tel" maxLength={50} value={phone} onChange={(event) => { setPhone(event.target.value); setUserId(null) }} /></label>
      <div className="admin-reservation-screening-picker">
        <div className="admin-reservation-screening-picker__controls">
          <label className="admin-field">Search movies or locations
            <input ref={searchInput} type="search" value={search} disabled={loadingScreenings}
              onChange={(event) => {
                setSearch(event.target.value); setShowScreenings(true)
                setScreening(null); setSeats([])
              }}
              onKeyDown={(event) => { if (event.key === 'Escape') setShowScreenings(false) }}
              placeholder="Movie, cinema or theater" />
          </label>
          <button type="button" className="admin-action admin-action--gold" disabled={loadingScreenings}
            aria-expanded={showScreenings} aria-controls={screeningListId}
            onClick={() => {
              if (!showScreenings) setSearch('')
              setShowScreenings(!showScreenings)
            }}>{showScreenings ? 'Close list' : 'Browse screenings'}</button>
        </div>
        {loadingScreenings && <p role="status">Loading screenings...</p>}
        <div id={screeningListId} hidden={!showScreenings}>
          <p role="status">{matching.length === 0 ? 'No screenings match your search.' : `${matching.length} ${matching.length === 1 ? 'screening' : 'screenings'} available.`}</p>
          {matching.length > 0 && <ul className="admin-reservation-screening-results">
            {matching.map((item) => <li key={item.id}><button type="button" onClick={() => {
              setSearch(item.title); setShowScreenings(false); searchInput.current?.focus(); selectScreening(item.id)
            }}>{item.title} — {formatScreeningDate(item.date)} — {item.auditorium}, {item.cinema}</button></li>)}
          </ul>}
        </div>
        {screening && <p>Selected screening: {screening.title} — {formatScreeningDate(screening.date)} — {screening.auditorium}, {screening.cinema}</p>}
      </div>
      {screening && <SeatPicker screening={screening} selected={seats} onChange={setSeats} />}
      <p>Selected seats: {seats.join(', ') || 'none'}</p>
      <div className="admin-screening-form__actions">
        <button type="submit" className="admin-action admin-action--green">Confirm</button>
        <button type="button" className="admin-action admin-action--gold" onClick={onCancel}>Cancel</button>
      </div>
    </fieldset>
  </form>
}

export default function AdminReservations({ requestConfirmation }) {
  const { state: navigationState } = useLocation()
  const [screeningFilter, setScreeningFilter] = useState(() => navigationState?.screeningId ? { id: navigationState.screeningId, title: navigationState.screeningTitle } : null)
  const [bookings, setBookings] = useState([])
  const [section, setSection] = useState('list')
  const [selected, setSelected] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [revision, setRevision] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    getAdminReservations().then((items) => {
      if (!Array.isArray(items)) throw new Error('Invalid reservation list.')
      if (active) { setBookings(items); setError('') }
    }).catch((loadError) => { if (active) setError(loadError.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [revision])

  function refresh() { setLoading(true); setRevision((value) => value + 1) }
  function requestDelete(booking) {
    requestConfirmation({
      kind: 'delete', title: `Delete reservation for ${booking.customerName || booking.email || 'this customer'}?`,
      message: 'Deleting this reservation releases its seats. Paid bookings are not automatically refunded, and customers are not notified.',
      onConfirm: async () => {
        setError('')
        try {
          await deleteAdminReservation(booking)
          setNotice('Reservation deleted.'); setSelected(null); setSection('list'); refresh()
        } catch (deleteError) { setError(deleteError.message) }
      },
    })
  }
  const filtered = bookings.filter((item) => {
    const text = query.trim().toLocaleLowerCase()
    return (!screeningFilter || item.screeningId === screeningFilter.id) && (!status || item.status === status) &&
      [item.customerName, item.email, item.title, item.cinema, formatScreeningDate(item.screeningDate)].some((value) => String(value || '').toLocaleLowerCase().includes(text))
  })

  return <>
    {error && <p className="admin-feedback" role="alert">{error}</p>}
    {notice && <p className="admin-feedback" role="status">{notice}</p>}
    {section === 'list' && <section className="admin-panel admin-movies admin-screenings">
      <h1>Reservations</h1>
      <div className="admin-movies__toolbar">
        <label className="admin-field"><span className="admin-visually-hidden">Search reservations</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Email, name, movie or date..." /></label>
        <button type="button" className="admin-action admin-action--neutral" aria-expanded={showFilters} onClick={() => setShowFilters(!showFilters)}>Filters</button>
        <button type="button" className="admin-action admin-action--green" onClick={() => { setNotice(''); setError(''); setSection('add') }}>Add reservation</button>
      </div>
      {showFilters && <div className="admin-movies__filters"><label className="admin-field">Status<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option>{Object.entries(statusLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label></div>}
      {screeningFilter && <p>Showing reservations for {screeningFilter.title}. <button type="button" className="admin-action admin-action--neutral" onClick={() => setScreeningFilter(null)}>Clear screening filter</button></p>}
      {loading ? <p role="status">Loading reservations...</p> : error ? <button className="admin-action admin-action--gold" onClick={refresh}>Retry</button> : filtered.length === 0 ? <p>No reservations match your search.</p> :
        <ul className="admin-movies__list">{filtered.map((item) => <li className="admin-movies__row admin-reservation-row" key={`${item.kind}:${item.id}`}>
          <span>{item.cinema} - {item.auditorium}</span>
          <div className="admin-movies__details"><strong>{item.customerName || 'Name unavailable'}</strong><span className="admin-reservation-email">{item.email || 'Email unavailable'}</span></div>
          <div className="admin-movies__details"><strong>{item.title}</strong><span>{formatScreeningDate(item.screeningDate)}</span></div>
          <span>Seats: {summarizeReservationSeats(item.seats)}</span>
          <span className={`admin-reservation-status admin-reservation-status--${item.status}`}>{statusLabels[item.status] || item.status}</span>
          <div className="admin-movies__actions"><button type="button" className="admin-action admin-action--gold" onClick={() => { setSelected(item); setError(''); setSection('details') }}>Details</button><button type="button" className="admin-action admin-action--red" disabled={item.status === 'pending_payment'} title={item.status === 'pending_payment' ? 'Pending-payment bookings cannot be deleted while checkout may be active.' : undefined} onClick={() => requestDelete(item)}>Delete</button></div>
        </li>)}</ul>}
    </section>}
    {section === 'details' && selected && <section className="admin-panel">
      <div className="admin-detail-toolbar"><button className="admin-action admin-action--gold" onClick={() => setSection('list')}>Back to reservations</button><button className="admin-action admin-action--red" disabled={selected.status === 'pending_payment'} title={selected.status === 'pending_payment' ? 'Pending-payment bookings cannot be deleted while checkout may be active.' : undefined} onClick={() => requestDelete(selected)}>Delete</button></div>
      <h1>Reservation details</h1>
      <p><strong>Customer:</strong> {selected.customerName || 'Name unavailable'}</p>
      <p><strong>Email:</strong> {selected.email || 'Unavailable'}</p>
      <p><strong>Phone:</strong> {selected.customerPhone || 'Unavailable'}</p>
      <p><strong>Movie:</strong> {selected.title}</p>
      <p><strong>Screening:</strong> {formatScreeningDate(selected.screeningDate)} — {selected.auditorium}, {selected.cinema}</p>
      <p><strong>Seats:</strong> {selected.seats.join(', ') || 'None'}</p>
      <p><strong>Status:</strong> {statusLabels[selected.status] || selected.status}</p>
    </section>}
    {section === 'add' && <ReservationForm requestConfirmation={requestConfirmation} onCancel={() => requestConfirmation({ kind: 'cancel', title: 'Discard your changes?', onConfirm: () => { setError(''); setSection('list') } })} onSaved={() => { setNotice('Unpaid reservation created.'); setSection('list'); refresh() }} />}
  </>
}
