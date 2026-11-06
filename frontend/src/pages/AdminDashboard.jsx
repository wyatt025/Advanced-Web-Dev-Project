import { useState } from 'react'
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

function AdminDashboard() {
  const [ticketPrice, setTicketPrice] = useState('')

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

        <form className="admin-movie-form">
          <div className="admin-movie-picker">
            <label className="admin-field admin-movie-picker__field">
              Movie
              <select name="movie" defaultValue="" aria-describedby="movie-api-note">
                <option value="" disabled>
                  Choose a movie from the catalog
                </option>
              </select>
            </label>
          </div>

          <div className="admin-form-divider" />

          <div className="admin-section-heading">
            <div>
              <h3>Showtimes</h3>
              <p>Choose the date and available screening times</p>
            </div>
          </div>
          <div className="admin-showtimes">
            <label className="admin-field">
              Screening date
              <input type="date" name="screening-date" />
            </label>
            <fieldset className="admin-time-options">
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
              <p>Set the ticket price before adding this movie.</p>
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
                  aria-describedby="price-warning"
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
            <button className="admin-button admin-button--primary" type="button">
              Add movie
              <span aria-hidden="true">+</span>
            </button>
          </div>
        </form>
      </section>

      <section className="admin-panel admin-reservations" aria-labelledby="reservations-title">
        <div className="admin-panel__heading admin-reservations__heading">
          <div>
            <h2 id="reservations-title">Reservations</h2>
            <p>Review and manage recent ticket bookings.</p>
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
