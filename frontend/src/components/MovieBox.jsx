import './MovieBox.css'
import { Link } from 'react-router-dom'

function MovieBox({ id, title, genre, rating }) {
  return (
    <article className="movie-box">
      <Link className="movie-box__link" to={`/movies/${id}`}>
        <div className="movie-box__poster" aria-hidden="true">
          <span className="movie-box__poster-mark">poster goes here</span>
        </div>
        <div className="movie-box__details">
          <h2>{title}</h2>
          <p>{genre}</p>
          <p className="movie-box__rating">Rating: {rating}</p>
        </div>
      </Link>
    </article>
  )
}

export default MovieBox
