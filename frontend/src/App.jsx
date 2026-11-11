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

function App() {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-content">
        <main className="app-main">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/movies/:movieId/tickets" element={<TicketPage />} />
            <Route path="/movies/:movieId" element={<MoviePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/movies" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="*" element={<HomePage />} />
          </Routes>
        </main>
        <BottomBar />
      </div>
    </div>
  )
}

export default App
