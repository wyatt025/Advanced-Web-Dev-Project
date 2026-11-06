import { useState } from 'react'
import { Link } from 'react-router-dom'
import './LoginPage.css'

function LoginPage() {
  const [mode, setMode] = useState('login')
  const [showPassword, setShowPassword] = useState(false)
  const [status, setStatus] = useState('')
  const isRegistering = mode === 'register'

  function changeMode(nextMode) {
    setMode(nextMode)
    setShowPassword(false)
    setStatus('')
  }

  function handleSubmit(event) {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    if (
      isRegistering &&
      formData.get('password') !== formData.get('confirm-password')
    ) {
      setStatus('Passwords do not match. Please check them and try again.')
      return
    }

    setStatus(
      `${isRegistering ? 'Registration' : 'Login'} isn't connected to an account service yet. Your details haven't been sent.`,
    )
  }

  return (
    <main className="account-page">
      <section className="account-card" aria-labelledby="account-title">
        <div className="account-card__content">
          <div className="account-card__tabs" role="tablist" aria-label="Account options">
            <button
              id="login-tab"
              className={!isRegistering ? 'is-active' : ''}
              type="button"
              role="tab"
              aria-selected={!isRegistering}
              aria-controls="account-form"
              onClick={() => changeMode('login')}
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
              onClick={() => changeMode('register')}
            >
              Create account
            </button>
          </div>

          <h1 id="account-title">
            {isRegistering ? 'Create an account' : 'Log in'}
          </h1>


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
                  required
                />
              </label>
            )}
            <label>
              Email address
              <input
                type="email"
                name="email"
                autoComplete="email"
                required
              />
            </label>
            <label>
              Password
              <span className="account-form__password">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  autoComplete={isRegistering ? 'new-password' : 'current-password'}
                  minLength={8}
                  required
                />
                <button
                  className="account-form__visibility"
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((isVisible) => !isVisible)}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </span>
            </label>
            {isRegistering && (
              <label>
                Confirm password
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="confirm-password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </label>
            )}

            {!isRegistering && (
              <label className="account-form__remember">
                <input type="checkbox" name="remember" />
                <span>Remember me</span>
              </label>
            )}

            <button className="account-form__submit" type="submit">
              {isRegistering ? 'Continue to authentication' : 'Log in'}
              <span aria-hidden="true">→</span>
            </button>
            <p className="account-form__status" role="status" aria-live="polite">
              {status}
            </p>
          </form>
        </div>
      </section>
    </main>
  )
}

export default LoginPage
