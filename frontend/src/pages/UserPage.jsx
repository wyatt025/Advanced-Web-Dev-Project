import './UserPage.css'

const ticketHistory = [
  {
    id: 'ticket-1',
    movie: 'Example movie',
    date: '12 December 2026 · 18:30',
    location: 'Oulu',
    auditorium: 1,
    seats: '12, 14',
  },
]

function UserPage() {
  return (
    <main className="user-page">
      <header className="user-page__heading">
        <p>Account</p>
        <h1>My account</h1>
      </header>

      <section className="user-panel" aria-labelledby="user-email-title">
        <h2 id="user-email-title">Email address</h2>
        <p className="user-page__email">user@example.com</p>
      </section>

      <section className="user-panel" aria-labelledby="ticket-history-title">
        <div className="user-panel__heading">
          <div>
            <h2 id="ticket-history-title">Ticket history</h2>
          </div>
          <span className="user-page__placeholder">Placeholder data</span>
        </div>
        <div className="user-ticket-list">
          {ticketHistory.map((ticket) => (
            <article className="user-ticket" key={ticket.id}>
              <div className="user-ticket__movie">
                <h3>{ticket.movie}</h3>
                <p>{ticket.date}</p>
              </div>
              <div className="user-ticket__details">
                <span>{ticket.location}</span>
                <span>Auditorium {ticket.auditorium}</span>
                <span>Seat{ticket.seats.includes(',') ? 's' : ''} {ticket.seats}</span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}

export default UserPage
