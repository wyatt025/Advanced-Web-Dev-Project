import { useEffect, useState } from 'react'
import { getMovieLocation, getMovies } from '../api/moviesApi.js'
import MovieBox from '../components/MovieBox.jsx'

function HomePage() {
  const [movies, setMovies] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    getMovies(controller.signal)
      .then(setMovies)
      .catch((error) => {
        if (!controller.signal.aborted) {
          setLoadError(error.message || 'Could not load movies.')
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false)
      })

    return () => controller.abort()
  }, [])

  return (
    <main className="movie-catalog">
      <header className="movie-catalog__heading">
        <h1>Now Showing</h1>
      </header>
      <section className="movie-catalog__grid" aria-label="Movies">
        {isLoading && <p role="status">Loading movies...</p>}
        {loadError && <p role="alert">{loadError}</p>}
        {!isLoading && !loadError && movies.length === 0 && (
          <p role="status">No movies are currently available.</p>
        )}
        {!isLoading && !loadError && movies.map((movie) => (
          <MovieBox
            key={`${movie.id}-${movie.cinemaId}-${movie.auditoriumId}`}
            {...movie}
            location={getMovieLocation(movie)}
          />
        ))}
      </section>
    </main>
  )
}

export default HomePage
