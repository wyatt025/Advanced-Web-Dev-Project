import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getMovie } from '../api/moviesApi.js'
import './MoviePage.css'

function MoviePage() {
  const { movieId } = useParams()
  const requestKey = movieId
  const [movieResult, setMovieResult] = useState(null)

  useEffect(() => {
    const controller = new AbortController()

    getMovie(movieId, controller.signal)
      .then((movie) => setMovieResult({ key: requestKey, movie }))
      .catch((error) => {
        if (!controller.signal.aborted) {
          setMovieResult({
            key: requestKey,
            error: error.message || 'Could not load movie.',
          })
        }
      })

    return () => controller.abort()
  }, [movieId, requestKey])

  const currentResult = movieResult?.key === requestKey ? movieResult : null

  if (!currentResult) {
    return <main className="movie-page" role="status">Loading movie...</main>
  }

  if (currentResult.error) {
    return <main className="movie-page" role="alert">{currentResult.error}</main>
  }

  const movie = currentResult.movie
  if (!movie) {
    return (
      <main className="movie-page">
        <h1>Movie not found</h1>
        <Link className="movie-page__back" to="/movies">
          Back to movies
        </Link>
      </main>
    )
  }

  return (
    <main className="movie-page">
      <Link className="movie-page__back" to="/movies">
        Back to frontpage
      </Link>
      <section
        className={`movie-detail${movie.posterUrl ? '' : ' movie-detail--without-poster'}`}
        aria-labelledby="movie-title"
      >
        {movie.posterUrl && (
          <div className="movie-detail__poster">
            <img src={movie.posterUrl} alt={`${movie.title} poster`} />
          </div>
        )}
        <div className="movie-detail__content">
          <p className="movie-detail__eyebrow">{movie.comingSoon ? 'Coming soon' : 'Now Showing'}</p>
          <h1 id="movie-title">{movie.title}</h1>
          <div className="movie-detail__metadata">
            {movie.genre && <span>{movie.genre}</span>}
            {movie.rating && <span>Age rating: {movie.rating}</span>}
          </div>
          {!movie.comingSoon && (
          <Link
            className="movie-detail__ticket-button"
            to={`/movies/${movie.id}/tickets`}
          >
            Buy a ticket
          </Link>
          )}
          {movie.plot && (
            <div className="movie-detail__section">
              <h2>About the movie</h2>
              <p>{movie.plot}</p>
            </div>
          )}
          {movie.actors && (
            <div className="movie-detail__section">
              <h2>Cast</h2>
              <p>{movie.actors}</p>
            </div>
          )}
          {movie.director && (
            <div className="movie-detail__section">
              <h2>Director</h2>
              <p>{movie.director}</p>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}

export default MoviePage
