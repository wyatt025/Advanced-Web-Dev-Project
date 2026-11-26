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
export async function getOpenAuditoriums(signal) {
    const response = await fetch('/api/admin/auditoriums', { cache: 'no-store', signal});
    if (response.status === 401) throw new Error('Your session has expired. Please log in again.');
    if (response.status === 403) throw new Error('Admin access is required, or the request origin is not allowed.');
    if (!response.ok) throw new Error('Could not load auditoriums.');

    const auditoriums = await response.json();
    if (!Array.isArray(auditoriums)) throw new Error('The server returned an invalid auditorium list.');
    return auditoriums;
}
async function movieRequestError(response, operation) {
    if (response.status === 401) throw new Error('Your session has expired. Please log in again.');
    if (response.status === 403) throw new Error('Admin access is required, or the request origin is not allowed.');
    if (response.status === 404 && operation === 'search') throw new Error('No movies found.');
    if (response.status === 404 && operation === 'lookup') throw new Error('Movie not found in OMDb.');
    if (response.status === 400 || response.status === 409) {
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
    const response = await fetch('/api/admin/movies', { cache: 'no-store' });
    if (!response.ok) {
        await movieRequestError(response, 'load');
    }
    return response.json();
}
export async function getDashboardMetrics(signal) {
    const response = await fetch('/api/admin/metrics', { cache: 'no-store', signal });
    if (!response.ok) await movieRequestError(response, 'load dashboard metrics');
    return response.json();
}
export async function updateMovie(movieId, movieData) {
    const response = await fetch(`/api/admin/movies/${encodeURIComponent(movieId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(movieData),
    });
    if (!response.ok) await movieRequestError(response, 'update');
    return response.json();
}
export async function deleteMovie(movieId) {
    const response = await fetch(`/api/admin/movies/${encodeURIComponent(movieId)}`, {
        method: 'DELETE',
    });
    if (!response.ok) {
        await movieRequestError(response, 'delete');
    }
    return response.json();
}

async function screeningRequest(path, options = {}) {
    const response = await fetch(`/api/admin/screenings${path}`, {
        cache: 'no-store',
        ...options,
    });
    if (!response.ok) {
        if (response.status === 401) throw new Error('Your session has expired. Please log in again.');
        if (response.status === 403) throw new Error('Admin access is required, or the request origin is not allowed.');
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
            const body = await response.json();
            if (typeof body.error === 'string') throw new Error(body.error);
        }
        throw new Error(`Could not manage screenings (HTTP ${response.status}).`);
    }
    return response.json();
}

export const getAdminScreenings = () => screeningRequest('');
export const getAdminScreening = (id) => screeningRequest(`/${encodeURIComponent(id)}`);
export const checkAdminScreenings = (screenings, excludeId) => screeningRequest('/check', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ screenings, ...(excludeId ? { excludeId } : {}) }),
});
export const createAdminScreenings = (screenings) => screeningRequest('', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ screenings }),
});
export const updateAdminScreening = (id, screening) => screeningRequest(`/${encodeURIComponent(id)}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(screening),
});
export const deleteAdminScreening = (id) => screeningRequest(`/${encodeURIComponent(id)}`, { method: 'DELETE' });

async function reservationRequest(path = '', options = {}) {
    const response = await fetch(`/api/admin/reservations${path}`, { cache: 'no-store', ...options });
    if (!response.ok) {
        if (response.status === 401) throw new Error('Your session has expired. Please log in again.');
        if (response.status === 403) throw new Error('Admin access is required, or the request origin is not allowed.');
        if ((response.headers.get('content-type') || '').includes('application/json')) {
            const body = await response.json();
            if (typeof body.error === 'string') throw new Error(body.error);
        }
        throw new Error(`Could not manage reservations (HTTP ${response.status}).`);
    }
    return response.json();
}
export const getAdminReservations = () => reservationRequest();
export const searchReservationUsers = (query) => reservationRequest(`/users?q=${encodeURIComponent(query)}`);
export const createAdminReservation = (booking) => reservationRequest('', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(booking),
});
export const deleteAdminReservation = (booking) => reservationRequest(`/${booking.kind}/${encodeURIComponent(booking.id)}`, {
    method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: booking.status }),
});