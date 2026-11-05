import { useState } from 'react'
import './LoginPage.css'

function LoginPage() {
  const [mode, setMode] = useState('login')
  const isRegistering = mode === 'register'

  function handleSubmit(event) {
    event.preventDefault()
  }

  return (
    <main className="account-page">
      <section className="account-card" aria-labelledby="account-title">
        <div className="account-card__tabs" role="tablist" aria-label="Account options">
          <button
            id="login-tab"
            className={!isRegistering ? 'is-active' : ''}
            type="button"
            role="tab"
            aria-selected={!isRegistering}
            aria-controls="account-form"
            onClick={() => setMode('login')}
          >
            Log in
          </button>
          <button
            id="register-tab"
            className={isRegistering ? 'is-active' : ''}
            type="button"
            role="tab"
            aria-selected={isRegistering}
            aria-controls="account-form"
            onClick={() => setMode('register')}
          >
            Register
          </button>
        </div>

        <h1 id="account-title">{isRegistering ? 'Create an account' : 'Welcome back'}</h1>
        <p className="account-card__intro">
          {isRegistering
            ? 'Create an account to plan your next movie night.'
            : 'Log in to continue to Rio.'}
        </p>

        <form
          id="account-form"
          className="account-form"
          onSubmit={handleSubmit}
          aria-labelledby={isRegistering ? 'register-tab' : 'login-tab'}
        >
          {isRegistering && (
            <label>
              Name
              <input
                type="text"
                name="name"
                autoComplete="name"
                placeholder="Your name"
                required
              />
            </label>
          )}
          <label>
            Email
            <input
              type="email"
              name="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              name="password"
              autoComplete={isRegistering ? 'new-password' : 'current-password'}
              placeholder="Enter your password"
              required
            />
          </label>
          <button className="account-form__submit" type="submit">
            {isRegistering ? 'Create account' : 'Log in'}
          </button>
        </form>
      </section>
    </main>
  )
}

export default LoginPage
