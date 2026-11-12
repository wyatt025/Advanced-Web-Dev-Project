import { useEffect, useRef, useState } from 'react'
import { getCurrentSession } from './api/authApi.js'
import './App.css'
import Sidebar from './components/Sidebar.jsx'
import BottomBar from './components/BottomBar.jsx'
import { Route, Routes } from 'react-router-dom'
import AboutPage from './pages/AboutPage.jsx'
import HomePage from './pages/HomePage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'
import MoviePage from './pages/MoviePage.jsx'
import TicketPage from './pages/TicketPage.jsx'
import UserPage from './pages/UserPage.jsx'

function App() {
  const [session, setSession] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [sessionError, setSessionError] = useState(null);
  const sessionVersion = useRef(0);

  function updateSession(nextSession) {
    sessionVersion.current += 1
    setSession(nextSession);
    setSessionError('');
    setSessionLoading(false);
  }

  useEffect(() => {
    const controller = new AbortController();
    const version = sessionVersion.current;
    async function checkSession() {
      try {
        const currentSession = await getCurrentSession(controller.signal);
        if (!controller.signal.aborted && version === sessionVersion.current) {
          updateSession(currentSession);
          setSessionError('');
        }
      } catch (error) {
        if (!controller.signal.aborted && version === sessionVersion.current) {
          setSessionError(error.message || 'Could not check the login session.');
          setSessionLoading(false);
        }
      } finally {
        if (!controller.signal.aborted && version === sessionVersion.current) {
          setSessionLoading(false);
        }
      }
    }
    checkSession();
    return () => {
      controller.abort();
    };
  }, []);

  return (
    <div className="app-shell">
      <Sidebar 
        session={session}
        sessionLoading={sessionLoading}
        sessionError={sessionError}
        onSessionChange={updateSession}
      />
      <div className="app-content">
        <main className="app-main">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/movies/:movieId/tickets" element={<TicketPage />} />
            <Route path="/movies/:movieId" element={<MoviePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/movies" element={<HomePage />} />
            <Route path="/login" element={<LoginPage onSessionChange={updateSession} />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/user" element={<UserPage />} />
            <Route path="*" element={<HomePage />} />
          </Routes>
        </main>
        <BottomBar />
      </div>
    </div>
  )
}

export default App
