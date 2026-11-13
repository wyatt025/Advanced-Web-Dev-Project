import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCurrentSession, login } from '../api/authApi'
import './LoginPage.css'

function LoginPage({ onSessionChange }) {
  const [mode, setMode] = useState('login')
  const [showPassword, setShowPassword] = useState(false)
  const [status, setStatus] = useState('')
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isRegistering = mode === 'register'

  function changeMode(nextMode) {
    setMode(nextMode)
    setShowPassword(false)
    setStatus('')
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    if (isRegistering &&
      formData.get('password') !== formData.get('confirm-password')
    ) {
      setStatus('Passwords do not match. Please check them and try again.')
      return
    }

    if (isRegistering) {
      setStatus("Registration isn't connected to an account service yet. Your details haven't been sent.")
      return
    }

    setStatus('')
    setIsSubmitting(true)
    try {
      await login(formData.get('email'), formData.get('password'))
      const session = await getCurrentSession();
      if (!session) {
        throw new Error('Login succeeded, but the session could not be established.')
      }
      onSessionChange(session);
      navigate(session.role === 'admin' ? '/admin' : '/')
    } catch (error) {
      setStatus(error.message || 'Login failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
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
              disabled={isSubmitting}
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
              disabled={isSubmitting}
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
            {isRegistering ? (
              <label>
                Email address
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                />
              </label>
            ) : (
              <label>
                Email address
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                />
              </label>
            )}
            <label>
              Password
              <span className="account-form__password">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  autoComplete={isRegistering ? 'new-password' : 'current-password'}
                  minLength={isRegistering ? 8 : undefined}
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
                <input type="checkbox" name="remember" disabled />
                <span>Remember me (not available yet)</span>
              </label>
            )}

            <button className="account-form__submit" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Logging in...' : isRegistering ? 'Continue to authentication' : 'Log in'}
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
