import { useEffect, useState } from 'react'
import { getRegisteredProfile } from '../api/authApi.js'
import './UserPage.css'

function UserPage() {
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    getRegisteredProfile(controller.signal)
      .then(setProfile)
      .catch((loadError) => {
        if (!controller.signal.aborted) {
          setError(loadError.message || 'Could not load your account details.')
        }
      })
    return () => controller.abort()
  }, [])

  return (
    <main className="user-page">
      <header className="user-page__heading">
        <p>Account</p>
        <h1>My account</h1>
      </header>

      <section className="user-panel" aria-labelledby="user-username-title">
        <h2 id="user-username-title">Username</h2>
        {error ? (
          <p role="alert">{error}</p>
        ) : profile ? (
          <p className="user-page__email">{profile.username}</p>
        ) : (
          <p role="status">Loading account...</p>
        )}
      </section>
      {profile && !error && (
        <>
          <section className="user-panel" aria-labelledby="user-email-title">
            <h2 id="user-email-title">Email</h2>
            <p className="user-page__email">{profile.email || 'No email is linked to this account.'}</p>
          </section>
          <section className="user-panel" aria-labelledby="user-tickets-title">
            <div className="user-panel__heading">
              <h2 id="user-tickets-title">My tickets</h2>
            </div>
            {profile.tickets.length === 0 ? (
              <p className="user-page__placeholder">You have no purchased tickets yet.</p>
            ) : (
              <div className="user-ticket-list">
                {profile.tickets.map((ticket) => (
                  <article className="user-ticket" key={ticket.id}>
                    <div className="user-ticket__movie">
                      <h3>{ticket.movieTitle}</h3>
                      <p>
                        {new Date(ticket.screeningDate).toLocaleString()} · {ticket.cinemaName} · {ticket.auditoriumName}
                      </p>
                    </div>
                    <div className="user-ticket__details">
                      <span>Seats: {ticket.seatIds.join(', ')}</span>
                      <span>€{(ticket.totalAmountCents / 100).toFixed(2)}</span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  )
}

export default UserPage
