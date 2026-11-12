export async function adminLogin(email, password) {
    const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
    });
    if (!response.ok) {
        throw new Error(`Login failed: ${response.statusText}`);
    }
    return response.json();
}
export async function searchExternalMovieDatabase(token, title, page = 1) {
    const params = new URLSearchParams({ title, page: String(page) });

    const response = await fetch(`/api/admin/movies/search?${params}`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        throw new Error(`Movie search failed: ${response.status}`);
    }

    return response.json();
}
export async function addMovieAutomatically(token, movieData) {
    const response = await fetch('/api/admin/movies/import', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(movieData)
    });
    if (!response.ok) {
        throw new Error(`Adding movie failed: ${response.statusText}`);
    }
    return response.json();
}
export async function addMovieManually(token, movieData) {
    const response = await fetch('/api/admin/movies', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(movieData)
    });
    if (!response.ok) {
        throw new Error(`Adding movie failed: ${response.statusText}`);
    }
    return response.json();
}
export async function getMovies(token) {
    const response = await fetch('/api/admin/movies', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    if (!response.ok) {
        throw new Error(`Fetching movies failed: ${response.statusText}`);
    }
    return response.json();
}
export async function deleteMovie(token, movieId) {
    const response = await fetch(`/api/admin/movies/${movieId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    if (!response.ok) {
        throw new Error(`Deleting movie failed: ${response.statusText}`);
    }
    return response.json();
}