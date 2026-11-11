import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import movies from './movies.js'
import './TicketPage.css'

const screeningTimes = ['12:30', '15:45', '18:30', '20:45']
const seatsPerRow = 10
const seatNumbers = Array.from({ length: seatsPerRow }, (_, index) => index + 1)

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
  const movie = movies.find((item) => item.id === movieId)
  const seatCapacity = movie?.auditorium === 2 ? 200 : 100
  const rowCount = seatCapacity / seatsPerRow
  const rows = Array.from({ length: rowCount }, (_, index) => rowCount - index)
  const [selectedTime, setSelectedTime] = useState('')
  const [selectedSeats, setSelectedSeats] = useState([])
  const [seatGapMessage, setSeatGapMessage] = useState('')

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

  function toggleSeat(seat) {
    const nextSeats = selectedSeats.includes(seat)
      ? selectedSeats.filter((selectedSeat) => selectedSeat !== seat)
      : [...selectedSeats, seat].sort((first, second) => first - second)

    setSelectedSeats(nextSeats)
    setSeatGapMessage(
      leavesSeatGap(nextSeats)
        ? 'Please do not leave a gap between reserved seats.'
        : '',
    )
  }

  return (
    <main className="ticket-page">
      <Link className="ticket-page__back" to={`/movies/${movie.id}`}>
        Back to {movie.title}
      </Link>
      <header className="ticket-page__heading">
        <p className="ticket-page__eyebrow">Book your seats</p>
        <h1>{movie.title}</h1>
        <p>{movie.genre} · Auditorium {movie.auditorium}</p>
      </header>

      <section className="ticket-panel" aria-labelledby="screening-title">
        <div className="ticket-panel__heading">
          <h2 id="screening-title">Choose a screening</h2>
          <span>Today</span>
        </div>
        <div className="ticket-times" role="group" aria-label="Screening time">
          {screeningTimes.map((time) => (
            <button
              key={time}
              className={`ticket-times__button${selectedTime === time ? ' is-selected' : ''}`}
              type="button"
              aria-pressed={selectedTime === time}
              onClick={() => setSelectedTime(time)}
            >
              {time}
            </button>
          ))}
        </div>
      </section>

      <section className="ticket-panel ticket-seating" aria-labelledby="seats-title">
        <div className="ticket-panel__heading">
          <h2 id="seats-title">Choose your seats</h2>
          <span>Auditorium {movie.auditorium} · {seatCapacity} seats</span>
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
                {seatNumbers.map((number) => {
                  const seatIndex = (rowPosition - 1) * seatsPerRow + number
                  const seat = seatIndex >= 13 ? seatIndex + 1 : seatIndex
                  const selected = selectedSeats.includes(seat)

                  return (
                    <button
                      key={seat}
                      className={`ticket-seat${selected ? ' is-selected' : ''}`}
                      type="button"
                      aria-label={`Row ${row}, seat ${seat}`}
                      aria-pressed={selected}
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
          <div
            className="ticket-wheelchair-slots"
            role="img"
            aria-label="10 wheelchair spaces"
          >
            {Array.from({ length: 10 }, (_, index) => (
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

      <footer className="ticket-summary">
        <div className="ticket-summary__selection" aria-live="polite">
          <strong>
            {selectedSeats.length
              ? `${selectedSeats.length} ${selectedSeats.length === 1 ? 'seat' : 'seats'} selected`
              : 'No seats selected'}
          </strong>
          <span>
            {selectedTime ? `Today at ${selectedTime}` : 'Choose a screening time'}
            {selectedSeats.length ? ` · ${selectedSeats.join(', ')}` : ''}
          </span>
          {seatGapMessage && (
            <span className="ticket-seat-warning" role="status">
              {seatGapMessage}
            </span>
          )}
        </div>
        <button
          className="ticket-summary__continue"
          type="button"
          disabled={!selectedTime || selectedSeats.length === 0}
        >
          Continue
        </button>
      </footer>
    </main>
  )
}

export default TicketPage
