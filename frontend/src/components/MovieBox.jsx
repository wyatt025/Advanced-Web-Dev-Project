import './MovieBox.css'

function MovieBox({ title, genre, rating }) {
  return (
    <article className="movie-box">
      <div className="movie-box__poster" aria-hidden="true">
        <span className="movie-box__poster-mark">poster goes here</span>
      </div>
      <div className="movie-box__details">
        <h2>{title}</h2>
        <p>{genre}</p>
        <p className="movie-box__rating">Rating: {rating}</p>
      </div>
    </article>
  )
}

export default MovieBox
