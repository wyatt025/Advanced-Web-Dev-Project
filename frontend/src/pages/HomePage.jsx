import { useState } from 'react'
import MovieBox from '../components/MovieBox.jsx'
import movies from './movies.js'

function HomePage() {
  const [location, setLocation] = useState('Oulu')
  const locationMovies = movies.filter((movie) => movie.location === location)

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
                onClick={() => setLocation(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </header>
      {[0, 1].map((row) => (
        <section
          className="movie-catalog__grid"
          aria-label={`Movies row ${row + 1}`}
          key={row}
        >
          {locationMovies.map((movie) => (
            <MovieBox key={movie.id} {...movie} />
          ))}
        </section>
      ))}
    </main>
  )
}

export default HomePage
