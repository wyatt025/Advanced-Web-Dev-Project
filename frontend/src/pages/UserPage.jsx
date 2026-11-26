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
    </main>
  )
}

export default UserPage
