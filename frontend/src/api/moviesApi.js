export async function getMovies(signal) {
    const response = await fetch('/api/user/movies', {
        cache: 'no-store',
        signal,
    });

    return readMovieResponse(response);
}

export async function getMovie(movieId, signal) {
    const response = await fetch(`/api/user/movies/${encodeURIComponent(movieId)}`, {
        cache: 'no-store',
        signal,
    });
    const movies = await readMovieResponse(response);

    return movies[0] || null;
}

async function readMovieResponse(response) {
    if (!response.ok) {
        let message = `Could not load movies (HTTP ${response.status}).`;
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
            const body = await response.json();
            if (typeof body.error === 'string') message = body.error;
        }
        throw new Error(message);
    }

    const movies = await response.json();
    if (!Array.isArray(movies)) {
        throw new Error('The server returned an invalid movie list.');
    }
    return movies;
}