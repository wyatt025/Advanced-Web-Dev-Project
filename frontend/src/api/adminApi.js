export async function searchExternalMovieDatabase(title, page = 1) {
    const params = new URLSearchParams({ title, page: String(page) });

    const response = await fetch(`/api/admin/movies/search?${params}`);

    if (!response.ok) {
        await movieRequestError(response, 'search');
    }

    return response.json();
}
export async function getExternalMovieDetails(imdbID) {
    const response = await fetch(
        `/api/admin/movies/details/${encodeURIComponent(imdbID)}`
    );

    if (!response.ok) {
        await movieRequestError(response, 'lookup');
    }

    return response.json();
}
export async function addMovieManually(movieData) {
    const response = await fetch('/api/admin/movies', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(movieData)
    });
    if (!response.ok) {
        await movieRequestError(response, 'save');
    }
    return response.json();
}

async function movieRequestError(response, operation) {
    if (response.status === 401) throw new Error('Your session has expired. Please log in again.');
    if (response.status === 403) throw new Error('Admin access is required, or the request origin is not allowed.');
    if (response.status === 404 && operation === 'search') throw new Error('No movies found.');
    if (response.status === 404 && operation === 'lookup') throw new Error('Movie not found in OMDb.');
    if (response.status === 409) throw new Error('A movie with this IMDb ID has already been added.');
    if (response.status === 400) {
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
            const body = await response.json();
            if (typeof body.error === 'string') throw new Error(body.error);
        }
        throw new Error('Please check the movie information and try again.');
    }
    if (response.status === 504) throw new Error('The movie service timed out. Please try again.');
    throw new Error(`Could not ${operation} movie data (HTTP ${response.status}).`);
}
export async function getMovies() {
    const response = await fetch('/api/admin/movies');
    if (!response.ok) {
        throw new Error(`Fetching movies failed: ${response.statusText}`);
    }
    return response.json();
}
export async function deleteMovie(movieId) {
    const response = await fetch(`/api/admin/movies/${movieId}`, {
        method: 'DELETE',
    });
    if (!response.ok) {
        throw new Error(`Deleting movie failed: ${response.statusText}`);
    }
    return response.json();
}