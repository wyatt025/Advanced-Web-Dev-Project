import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getMovieLocation, getMovies } from '../api/moviesApi.js'
import MovieBox from '../components/MovieBox.jsx'

function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [location, setLocation] = useState(() =>
    ['Oulu', 'Tampere'].includes(searchParams.get('location'))
      ? searchParams.get('location')
      : 'Oulu',
  )
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

  const locationMovies = movies.filter(
    (movie) => getMovieLocation(movie) === location,
  )

  return (
    <main className="movie-catalog">
      <header className="movie-catalog__heading">
        <h1>Now Showing</h1>
        <div className="movie-location" aria-label="Choose cinema location">
          <span className="movie-location__label">Cinema</span>
          <div className="movie-location__options">
            {['Oulu', 'Tampere'].map((option) => (
              <button
                key={option}
                className={`movie-location__button${location === option ? ' is-active' : ''}`}
                type="button"
                aria-pressed={location === option}
                onClick={() => {
                  setLocation(option)
                  setSearchParams({ location: option })
                }}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </header>
      <section className="movie-catalog__grid" aria-label="Movies">
        {isLoading && <p role="status">Loading movies...</p>}
        {loadError && <p role="alert">{loadError}</p>}
        {!isLoading && !loadError && locationMovies.map((movie) => (
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
