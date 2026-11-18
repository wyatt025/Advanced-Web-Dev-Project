import { useEffect, useRef, useState } from 'react'
import { getCurrentSession } from './api/authApi.js'
import './App.css'
import Sidebar from './components/Sidebar.jsx'
import AdminSidebar from './components/AdminSidebar.jsx'
import BottomBar from './components/BottomBar.jsx'
import AdminRoute from './components/AdminRoute.jsx'
import UserRoute from './components/UserRoute.jsx'
import { Route, Routes } from 'react-router-dom'
import AboutPage from './pages/AboutPage.jsx'
import HomePage from './pages/HomePage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import MoviePage from './pages/MoviePage.jsx'
import TicketPage from './pages/TicketPage.jsx'
import { Cancel, Success } from './PaymentPages.jsx'


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
      {session?.role === 'admin' ? (
        <AdminSidebar 
          session={session}
          sessionLoading={sessionLoading}
          sessionError={sessionError}
          onSessionChange={updateSession}
        />
      ) : (
        <Sidebar 
          session={session}
          sessionLoading={sessionLoading}
          sessionError={sessionError}
          onSessionChange={updateSession}
        />
      )}
      <div className="app-content">
        <main className="app-main">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/movies/:movieId/tickets" element={<TicketPage />} />
            <Route path="/movies/:movieId" element={<MoviePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/movies" element={<HomePage />} />
            <Route path="/success" element={<Success />} />
            <Route path="/cancel" element={<Cancel />} />
            <Route path="/login" element={<LoginPage onSessionChange={updateSession} />} />
            <Route path="/admin" element={
              <AdminRoute
                session={session}
                sessionLoading={sessionLoading}
                sessionError={sessionError}
              />
            } />
            <Route path="/user" element={
              <UserRoute
                session={session}
                sessionLoading={sessionLoading}
                sessionError={sessionError}
              />
            } />
            <Route path="*" element={<HomePage />} />
          </Routes>
        </main>
        <BottomBar />
      </div>
    </div>
  )
}

export default App
