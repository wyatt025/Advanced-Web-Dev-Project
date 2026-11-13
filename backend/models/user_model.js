const pools = require('../helpers/db');

const publicMoviesQuery = `
    SELECT
        m.id,
        m.title,
        m.genre,
        m.rated AS rating,
        m.poster_url AS posterUrl,
        m.plot,
        m.actors,
        m.director,
        m.runtime_minutes AS runtimeMinutes,
        m.price,
        s.id AS screeningId,
        s.date AS screeningDate,
        a.id AS auditoriumId,
        a.name AS auditorium,
        a.maxSeats AS seatCapacity,
        c.id AS cinemaId,
        c.name AS cinema,
        c.address AS cinemaAddress
    FROM screenings s
    JOIN movies m ON m.id = s.movie_id
    JOIN auditoriums a ON a.id = s.auditorium_id AND a.isOpen = TRUE
    JOIN cinemas c ON c.id = a.cinema_id AND c.isOpen = TRUE
    WHERE s.date >= CURRENT_TIMESTAMP
`;

function groupPublicMovieRows(rows) {
    const moviesByLocation = new Map();

    for (const row of rows) {
        const key = `${row.id}:${row.cinemaId}:${row.auditoriumId}`;
        let movie = moviesByLocation.get(key);
        if (!movie) {
            movie = {
                id: row.id,
                title: row.title,
                genre: row.genre,
                rating: row.rating,
                posterUrl: row.posterUrl,
                plot: row.plot,
                actors: row.actors,
                director: row.director,
                runtimeMinutes: row.runtimeMinutes,
                price: row.price,
                auditoriumId: row.auditoriumId,
                auditorium: row.auditorium,
                seatCapacity: row.seatCapacity,
                cinemaId: row.cinemaId,
                cinema: row.cinema,
                cinemaAddress: row.cinemaAddress,
                screenings: [],
            };
            moviesByLocation.set(key, movie);
        }

        movie.screenings.push({
            id: row.screeningId,
            date: row.screeningDate,
        });
    }

    return [...moviesByLocation.values()];
}


const userModel = {
    getPublicMovies: async () => {
        const [rows] = await pools.public.execute(
            `${publicMoviesQuery} ORDER BY m.title, c.name, a.id, s.date`
        );
        return groupPublicMovieRows(rows);
    },
    getPublicMovie: async (id) => {
        const [rows] = await pools.public.execute(
            `${publicMoviesQuery} AND m.id = ? ORDER BY c.name, a.id, s.date`,
            [id]
        );
        return groupPublicMovieRows(rows);
    },
    createUser: async (userData) => {
        const { name, email, password } = userData;
        const query = 'INSERT INTO users (name, email, password) VALUES (?, ?, ?)';
        const [result] = await pools.auth.execute(query, [name, email, password]);
        return { id: result.insertId, name, email };
    },
};

module.exports = userModel;