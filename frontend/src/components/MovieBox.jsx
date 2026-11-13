import './MovieBox.css'
import { Link } from 'react-router-dom'

function MovieBox({ id, title, genre, rating, posterUrl, location, auditoriumId }) {
  return (
    <article className="movie-box">
      <Link
        className="movie-box__link"
        to={{
          pathname: `/movies/${id}`,
          search: `?location=${encodeURIComponent(location)}&auditorium=${encodeURIComponent(auditoriumId)}`,
        }}
      >
        <div className="movie-box__poster">
          {posterUrl && <img src={posterUrl} alt={`${title} poster`} />}
        </div>
        <div className="movie-box__details">
          <h2>{title}</h2>
          {genre && <p>{genre}</p>}
          {rating && <p className="movie-box__rating">Rating: {rating}</p>}
        </div>
      </Link>
    </article>
  )
}

export default MovieBox
