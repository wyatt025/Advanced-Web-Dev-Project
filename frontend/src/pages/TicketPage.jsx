import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getMovie } from '../api/moviesApi.js'
import { hasAvailableRegularSeat, regularSeats } from './screeningAvailability.js'
import './TicketPage.css'

const seatsPerRow = 10

function formatScreeningDate(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Europe/Helsinki',
  }).format(date)
}

function leavesSeatGap(seats) {
  const positions = seats
    .map((seat) => {
      const seatIndex = seat > 13 ? seat - 1 : seat
      return {
        row: Math.floor((seatIndex - 1) / seatsPerRow),
        column: (seatIndex - 1) % seatsPerRow,
      }
    })
    .sort((first, second) => first.row - second.row || first.column - second.column)

  return positions.some(
    (position, index) =>
      index > 0 &&
      position.row === positions[index - 1].row &&
      position.column > positions[index - 1].column + 1,
  )
}

function TicketPage() {
  const { movieId } = useParams()
  const requestKey = movieId
  const [movieResult, setMovieResult] = useState(null)
  const [booking, setBooking] = useState(null)
  const [email, setEmail] = useState('')
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [checkoutError, setCheckoutError] = useState('')
  const currentBooking = booking?.key === requestKey
    ? booking
    : { cinemaId: '', screeningId: '', seats: [], gapMessage: '' }
  const selectedCinemaId = currentBooking.cinemaId
  const selectedScreeningId = currentBooking.screeningId
  const selectedSeats = currentBooking.seats
  const seatGapMessage = currentBooking.gapMessage
  const movie = movieResult?.key === requestKey ? movieResult.movie : null
  useEffect(() => {
    const controller = new AbortController()

    getMovie(movieId, controller.signal)
      .then((loadedMovie) => setMovieResult({ key: requestKey, movie: loadedMovie }))
      .catch((error) => {
        if (!controller.signal.aborted) {
          setMovieResult({
            key: requestKey,
            error: error.message || 'Could not load movie.',
          })
        }
      })

    return () => controller.abort()
  }, [movieId, requestKey])

  const currentResult = movieResult?.key === requestKey ? movieResult : null

  if (!currentResult) {
    return <main className="ticket-page" role="status">Loading movie...</main>
  }

  if (currentResult.error) {
    return <main className="ticket-page" role="alert">{currentResult.error}</main>
  }

  if (!movie) {
    return (
      <main className="ticket-page">
        <h1>Movie not found</h1>
        <Link className="ticket-page__back" to="/movies">
          Back to movies
        </Link>
      </main>
    )
  }
  if (movie.comingSoon) {
    return (
    <main className="ticket-page">
    <h1>Coming soon</h1>
    <p>Tickets are not available for this movie yet.</p>
    <Link className="ticket-page__back" to={`/movies/${movie.id}`}>
    Back to movie details
    </Link>
    </main>
    )
  }
  const availableScreenings = movie.screenings.filter(hasAvailableRegularSeat)
  const cinemas = [...new Map(
    availableScreenings.map((screening) => [screening.cinemaId, screening.cinema])
  )]
  const cinemaScreenings = availableScreenings.filter(
    (screening) => String(screening.cinemaId) === selectedCinemaId
  )
  const selectedScreening = cinemaScreenings.find(
    (screening) => String(screening.id) === selectedScreeningId,
  )
  const seats = selectedScreening ? regularSeats(selectedScreening) : []
  const rowCount = Math.ceil(seats.length / seatsPerRow)
  const rows = Array.from({ length: rowCount }, (_, index) => rowCount - index)
  const accessibleSeatCount = selectedScreening?.accessibleSeatCount || 0

  function toggleSeat(seat) {
    if (!selectedScreening || selectedScreening.takenSeats.includes(seat)) return
    const nextSeats = selectedSeats.includes(seat)
      ? selectedSeats.filter((selectedSeat) => selectedSeat !== seat)
      : [...selectedSeats, seat].sort((first, second) => first - second)

    setBooking({
      key: requestKey,
      cinemaId: selectedCinemaId,
      screeningId: selectedScreeningId,
      seats: nextSeats,
      gapMessage: leavesSeatGap(nextSeats)
        ? 'Please do not leave a gap between reserved seats.'
        : '',
    })
  }

  async function continueToCheckout() {
    if (!selectedScreening || selectedSeats.length === 0) return
    setCheckoutLoading(true)
    setCheckoutError('')
    try {
      const response = await fetch('/api/checkout-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          screeningId: selectedScreening.id,
          seatIds: selectedSeats,
          email,
        }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'Could not start checkout.')
      if (!body.url) throw new Error('Stripe did not return a checkout URL.')
      window.location.assign(body.url)
    } catch (error) {
      setCheckoutError(error.message || 'Could not start checkout.')
    } finally {
      setCheckoutLoading(false)
    }
  }

  return (
    <main className="ticket-page">
      <Link
        className="ticket-page__back"
        to={`/movies/${movie.id}`}
      >
        Back to {movie.title}
      </Link>
      <header className="ticket-page__heading">
        <h1>{movie.title}</h1>
        {movie.genre && <p>{movie.genre}</p>}
      </header>

      <section className="ticket-panel" aria-labelledby="cinema-title">
        <div className="ticket-panel__heading">
          <h2 id="cinema-title">Choose a cinema</h2>
        </div>
        {cinemas.length === 0 ? (
          <p>No screenings with available regular seats are currently available.</p>
        ) : (
          <div className="ticket-times" role="group" aria-label="Cinema">
            {cinemas.map(([id, name]) => (
              <button
                key={id}
                type="button"
                className={`ticket-times__button${selectedCinemaId === String(id) ? ' is-selected' : ''}`}
                aria-pressed={selectedCinemaId === String(id)}
                onClick={() => setBooking({
                  key: requestKey,
                  cinemaId: String(id),
                  screeningId: '',
                  seats: [],
                  gapMessage: '',
                })}
              >
                {name}
              </button>
            ))}
          </div>
        )}
      </section>

      {selectedCinemaId && (
      <section className="ticket-panel" aria-labelledby="screening-title">
        <div className="ticket-panel__heading">
          <h2 id="screening-title">Choose a screening</h2>
          <span>{cinemaScreenings.length} available</span>
        </div>
        <div className="ticket-times" role="group" aria-label="Screening time">
          {cinemaScreenings.map((screening) => (
            <button
              key={screening.id}
              className={`ticket-times__button${selectedScreeningId === String(screening.id) ? ' is-selected' : ''}`}
              type="button"
              aria-pressed={selectedScreeningId === String(screening.id)}
              onClick={() => {
                setBooking({
                  key: requestKey,
                  cinemaId: selectedCinemaId,
                  screeningId: String(screening.id),
                  seats: [],
                  gapMessage: '',
                })
              }}
            >
              {formatScreeningDate(screening.date)} · {screening.auditorium}
            </button>
          ))}
        </div>
      </section>
      )}

      {selectedScreening && (
      <section className="ticket-panel ticket-seating" aria-labelledby="seats-title">
        <div className="ticket-panel__heading">
          <h2 id="seats-title">Choose your seats</h2>
          <span>{selectedScreening.auditorium} · {selectedScreening.seatCapacity} seats</span>
        </div>
        <div className="ticket-doors" aria-label="Auditorium doors">
          <span>DOOR</span>
          <span>DOOR</span>
        </div>
        <div className="ticket-seat-map" role="group" aria-label="Available seats">
          {rows.map((rowPosition) => {
            const row = rowPosition >= 13 ? rowPosition + 1 : rowPosition
            const reversed = rowPosition % 2 === 1

            return (
              <div
                className={`ticket-seat-row${reversed ? ' is-reversed' : ''}`}
                key={row}
                aria-label={`Row ${row}`}
              >
                <span className="ticket-seat-row__label" aria-hidden="true">{row}</span>
                {seats.slice((rowPosition - 1) * seatsPerRow, rowPosition * seatsPerRow).map((seat) => {
                  const selected = selectedSeats.includes(seat)
                  const reserved = selectedScreening.takenSeats.includes(seat)

                  return (
                    <button
                      key={seat}
                      className={`ticket-seat${selected ? ' is-selected' : ''}${reserved ? ' is-reserved' : ''}`}
                      type="button"
                      aria-label={`Row ${row}, seat ${seat}${reserved ? ', reserved' : ''}`}
                      aria-pressed={selected}
                      disabled={reserved}
                      onClick={() => toggleSeat(seat)}
                    >
                      {seat}
                    </button>
                  )
                })}
                <span className="ticket-seat-row__label" aria-hidden="true">{row}</span>
              </div>
            )
          })}
        </div>
        <div className="ticket-wheelchair-row">
          <p>Wheelchair space booking is not available yet.</p>
          <div
            className="ticket-wheelchair-slots"
            role="img"
            aria-label={`${accessibleSeatCount} wheelchair spaces, booking not available`}
          >
            {Array.from({length: accessibleSeatCount}, (_, index) => (
              <span className="ticket-wheelchair-slot" key={index}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="10" cy="4" r="2" />
                  <path d="m9 8-2 6h6l2 4h4m-9-10 5 2 2 5h3" />
                  <path d="M13 16a6 6 0 1 1-5-7" />
                </svg>
              </span>
            ))}
          </div>
        </div>
        <div className="ticket-screen" aria-label="Screen at the front of the auditorium">
          <span>SCREEN</span>
        </div>
        <div className="ticket-legend" aria-label="Seat legend">
          <span><i className="ticket-legend__seat" /> Available</span>
          <span><i className="ticket-legend__seat is-selected" /> Selected</span>
          <span><i className="ticket-legend__seat is-reserved" /> Reserved</span>
        </div>
      </section>
      )}

      <footer className="ticket-summary">
        <div className="ticket-summary__selection" aria-live="polite">
          <strong>
            {selectedSeats.length
              ? `${selectedSeats.length} ${selectedSeats.length === 1 ? 'seat' : 'seats'} selected`
              : 'No seats selected'}
          </strong>
          <span>
            {selectedScreening
              ? formatScreeningDate(selectedScreening.date)
              : 'Choose a screening time'}
            {selectedSeats.length ? ` · ${selectedSeats.join(', ')}` : ''}
          </span>
          {seatGapMessage && (
            <span className="ticket-seat-warning" role="status">
              {seatGapMessage}
            </span>
          )}
          <span>Seat selections are held for 31 minutes during checkout.</span>
        </div>
        <div className="ticket-summary__checkout">
          <label htmlFor="ticket-email">Email</label>
          <input
            id="ticket-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            disabled={checkoutLoading}
          />
          {checkoutError && (
            <span className="ticket-seat-warning" role="alert">{checkoutError}</span>
          )}
        </div>
        <button
          className="ticket-summary__continue"
          type="button"
          disabled={!selectedScreening || selectedSeats.length === 0 || !email.trim() || checkoutLoading}
          onClick={continueToCheckout}
        >
          {checkoutLoading ? 'Opening checkout...' : 'Continue'}
        </button>
      </footer>
    </main>
  )
}

export default TicketPage
