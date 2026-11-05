import MovieBox from '../components/MovieBox.jsx'

const movies = [
  { title: 'movie 1', genre: 'action', rating: 'PG 13' },
  { title: 'movie 2', genre: 'drama', rating: 'PG 13' },
  { title: 'movie 3', genre: 'thriller', rating: 'R' },
  { title: 'movie 4', genre: 'tomance', rating: 'PG' },
]

function HomePage() {
  return (
    <main className="movie-catalog">
      <h1>Now Showing</h1>
      {[0, 1].map((row) => (
        <section
          className="movie-catalog__grid"
          aria-label={`Movies row ${row + 1}`}
          key={row}
        >
          {movies.map((movie) => (
            <MovieBox key={movie.title} {...movie} />
          ))}
        </section>
      ))}
    </main>
  )
}

export default HomePage
