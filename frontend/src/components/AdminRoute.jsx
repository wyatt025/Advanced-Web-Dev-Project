import { Link, Navigate, useLocation } from 'react-router-dom'
import AdminDashboard from '../pages/AdminDashboard.jsx'

function AdminRoute({ session, sessionLoading, sessionError }) {
  const location = useLocation()
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

  if (session.role !== 'admin') {
    return (
      <div className="about-page" role="alert">
        <h1>Access denied</h1>
        <p>Only administrators can access the admin console.</p>
        <Link to="/">Back to home</Link>
      </div>
    )
  }

  return <AdminDashboard key={location.key} />
}

export default AdminRoute
