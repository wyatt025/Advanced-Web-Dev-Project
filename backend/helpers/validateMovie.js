class MovieValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'MovieValidationError';
    }
}

function validateMovie(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
        throw new MovieValidationError('Movie data must be an object');
    }

    if (typeof input.title !== 'string' || !input.title.trim()) {
        throw new MovieValidationError('Movie title is required');
    }

    if (Array.from(input.title.trim()).length > 255) {
        throw new MovieValidationError('Movie title must be at most 255 characters');
    }
    function optionalText(field, maxLength) {
        const value = input[field];

        if (value === undefined || value === null || value === '') {
            return null;
        }

        if (typeof value !== 'string') {
            throw new MovieValidationError(`${field} must be text`);
        }

        const trimmed = value.trim();

        if (!trimmed) {
            return null;
        }

        if (maxLength && Array.from(trimmed).length > maxLength) {
            throw new MovieValidationError(`${field} must be at most ${maxLength} characters`);
        }

        return trimmed;
    }
        const imdbId = optionalText('imdb_id', 20);

    // IMDb IDs start with tt followed by at least seven digits.
    if (imdbId && !/^tt\d{7,}$/.test(imdbId)) {
        throw new MovieValidationError('IMDb ID must start with tt followed by at least seven digits');
    }

    function optionalInteger(field, min, max) {
        const value = input[field];

        if (value === undefined || value === null || value === '') {
            return null;
        }

        // Accept whole numbers, including numbers entered as strings.
        if (
            (typeof value !== 'string' && typeof value !== 'number') ||
            !/^\d+$/.test(String(value))
        ) {
            throw new MovieValidationError(`${field} must be a whole number`);
        }

        const number = Number(value);

        if (!Number.isSafeInteger(number) || number < min || number > max) {
            throw new MovieValidationError(`${field} must be between ${min} and ${max}`);
        }

        return number;
    }
        function optionalDate(field) {
        const value = input[field];

        if (value === undefined || value === null || value === '') {
            return null;
        }

        // Match a date in the form YYYY-MM-DD.
        if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            throw new MovieValidationError(`${field} must be a date in YYYY-MM-DD format`);
        }

        const [year, month, day] = value.split('-').map(Number);
        const date = new Date(Date.UTC(year, month - 1, day));

        if (
            year < 1000 ||
            date.getUTCFullYear() !== year ||
            date.getUTCMonth() !== month - 1 ||
            date.getUTCDate() !== day
        ) {
            throw new MovieValidationError(`${field} must be a valid calendar date`);
        }

        return value;
    }

    // Accept up to six digits before the decimal and up to two after it.
    const priceFormat = /^\d{1,6}(\.\d{1,2})?$/;

    if (
        typeof input.price !== 'string' ||
        !priceFormat.test(input.price) ||
        Number(input.price) <= 0
    ) {
        throw new MovieValidationError('Price must be positive and have at most two decimal places');
    }
        return {
        title: input.title.trim(),
        imdb_id: imdbId,
        release_year: optionalInteger('release_year', 1000, 9999),
        runtime_minutes: optionalInteger('runtime_minutes', 1, 9999999),
        rated: optionalText('rated', 20),
        genre: optionalText('genre', 255),
        director: optionalText('director', 255),
        writer: optionalText('writer'),
        actors: optionalText('actors'),
        plot: optionalText('plot'),
        languages: optionalText('languages', 255),
        poster_url: optionalText('poster_url'),
        rating_imdb: optionalText('rating_imdb', 20),
        rating_rotten_tomatoes: optionalText('rating_rotten_tomatoes', 20),
        rating_metacritic: optionalText('rating_metacritic', 20),
        released_date: optionalDate('released_date'),
        price: input.price,
    };
}

module.exports = { validateMovie, MovieValidationError };