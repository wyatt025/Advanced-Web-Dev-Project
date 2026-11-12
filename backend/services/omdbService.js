class OmdbError extends Error {
    constructor(code, message) {
        super(message);
        this.name = 'OmdbError';
        this.code = code;
    }
}

async function requestOmdb(params) {
    const apiKey = process.env.OMDB_API_KEY;
    if (!apiKey) {
        throw new OmdbError('CONFIG_ERROR', 'OMDB_API_KEY is not defined');
    }
    const url = new URL('https://www.omdbapi.com/');
    Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
    });
    url.searchParams.set('apikey', apiKey);
    const signal = AbortSignal.timeout(5000);
    let response;
    try {
        response = await fetch(url, { signal });
    } catch (error) {
        if (signal.aborted || error.name === 'TimeoutError' || error.name === 'AbortError') {
            throw new OmdbError('TIMEOUT', 'OMDB API request timed out');
        }
        throw new OmdbError('NETWORK_ERROR', 'Could not reach OMDb');
    }
    if (!response.ok) {
        throw new OmdbError('PROVIDER_ERROR', `OMDB API request failed with status ${response.status}`);
    }
    let data;
    try {
        data = await response.json();
    } catch (error) {
        if (signal.aborted || error.name === 'TimeoutError' || error.name === 'AbortError') {
            throw new OmdbError('TIMEOUT', 'OMDB API request timed out');
        }
        if (error instanceof SyntaxError) {
            throw new OmdbError('PROVIDER_ERROR', 'OMDB returned invalid JSON');
        }
        throw new OmdbError('NETWORK_ERROR', 'Could not read the OMDb response');
    }
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw new OmdbError('PROVIDER_ERROR', 'OMDb returned an unexpected response');
    }
    if (data.Response === 'False') {
        if (data.Error === 'Movie not found!') {
            throw new OmdbError('NOT_FOUND', 'Movie not found');
        }
        throw new OmdbError('PROVIDER_ERROR', 'OMDb could not complete the request');
    }
    if (data.Response !== 'True') {
        throw new OmdbError('PROVIDER_ERROR', 'OMDb returned an unexpected response');
    }
    return data;
}

const movieSearcher = {
    searchMovie: async (title, page = 1) => {
        if (typeof title !== 'string' || title.trim() === '') {
            throw new OmdbError('INVALID_INPUT', 'Title must be a non-empty string');
        }
        if (!Number.isInteger(page) || page < 1 || page > 100) {
            throw new OmdbError('INVALID_INPUT', 'Page must be an integer between 1 and 100');
        }
        return requestOmdb({ s: title.trim(), type: 'movie', page });
    },
    getMovieById: async (imdbID) => {
        // IMDb IDs start with tt followed by at least seven digits.
        if (typeof imdbID !== 'string' || !/^tt\d{7,}$/.test(imdbID)) {
            throw new OmdbError('INVALID_INPUT', 'A valid IMDb ID is required');
        }
        return requestOmdb({ i: imdbID });
    },
};

module.exports = { movieSearcher };