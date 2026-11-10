import { Link, useParams } from 'react-router-dom'
import movies from './movies.js'
import './MoviePage.css'

function MoviePage() {
  const { movieId } = useParams()
  const movie = movies.find((item) => item.id === movieId)

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
      <section className="movie-detail" aria-labelledby="movie-title">
        <div className="movie-detail__poster" aria-hidden="true">
          <span>poster goes here</span>
        </div>
        <div className="movie-detail__content">
          <p className="movie-detail__eyebrow">Now Showing</p>
          <h1 id="movie-title">{movie.title}</h1>
          <div className="movie-detail__metadata">
            <span>{movie.genre}</span>
            <span>Age rating: {movie.rating}</span>
            <span>Auditorium {movie.auditorium}</span>
          </div>
          <button className="movie-detail__ticket-button" type="button">
            Buy a ticket
          </button>
          <div className="movie-detail__section">
            <h2>About the movie</h2>
            <p>Details about the movie</p>
          </div>
          <div className="movie-detail__section">
            <h2>Cast</h2>
            <p>Cast information</p>
          </div>
        </div>
      </section>
    </main>
  )
}

export default MoviePage
