import { Link, Navigate } from 'react-router-dom'
import UserPage from '../pages/UserPage.jsx'

function UserRoute({ session, sessionLoading, sessionError }) {
  if (sessionLoading) {
    return <div className="about-page" role="status">Checking your session...</div>
  }

  if (sessionError) {
    return (
      <div className="about-page" role="alert">
        <h1>Could not check your session</h1>
        <p>{sessionError} Use Retry in the sidebar to try again.</p>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  if (!['user', 'admin'].includes(session?.role)) {
    return (
      <div className="about-page" role="alert">
        <h1>Access denied</h1>
        <p>Please login to access your user page.</p>
        <Link to="/">Back to home</Link>
      </div>
    )
  }

  return <UserPage />
}

export default UserRoute
