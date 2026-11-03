import './App.css'
import Navbar from './components/Navbar.jsx'
import MovieBox from './components/MovieBox.jsx'
import BottomBar from './components/BottomBar.jsx'

const movies = [
  { title: 'movie 1', genre: 'action', rating: 'PG 13' },
  { title: 'movie 2', genre: 'drama', rating: 'PG 13' },
  { title: 'movie 3', genre: 'thriller', rating: 'R' },
  { title: 'movie 4', genre: 'tomance', rating: 'PG' },
]

function App() {
  return (
    <>
      <Navbar />
      <main className="movie-catalog">
        <h1>Now Showing</h1>
        <section className="movie-catalog__grid" aria-label="Movies">
          {movies.map((movie) => (
            <MovieBox key={movie.title} {...movie} />
          ))}
        </section>
        <section className="movie-catalog__grid" aria-label="Movies">
          {movies.map((movie) => (
            <MovieBox key={movie.title} {...movie} />
          ))}
        </section>
      </main>
      <BottomBar />
    </>
  )
}

export default App
