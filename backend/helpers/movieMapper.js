const omdbContentFilter = (content) => {
    const invalid = (field) => {
        const error = new Error(`Invalid OMDb movie field: ${field}`);
        error.code = 'PROVIDER_ERROR';
        throw error;
    };
    if (!content || typeof content !== 'object' || Array.isArray(content)) {
        invalid('movie');
    }

    const text = (value, field, maxLength) => {
        if (value === undefined || value === null || value === 'N/A') return null;
        if (typeof value !== 'string' || !value.trim()) invalid(field);
        const result = value.trim();
        if (result === 'N/A') return null;
        if (maxLength && Array.from(result).length > maxLength) invalid(field);
        return result;
    };

    const imdbId = text(content.imdbID, 'imdbID', 20);
    const title = text(content.Title, 'Title', 255);
    // IMDb IDs start with tt followed by at least seven digits.
    if (!imdbId || !/^tt\d{7,}$/.test(imdbId)) invalid('imdbID');
    if (!title) invalid('Title');
    if (content.Type !== undefined && content.Type !== 'movie') invalid('Type');

    const year = text(content.Year, 'Year');
    // A movie release year must contain exactly four digits.
    if (year && !/^\d{4}$/.test(year)) invalid('Year');

    const runtime = text(content.Runtime, 'Runtime');
    // Match a positive, up-to-seven-digit minute count followed by " min".
    if (runtime && !/^[1-9]\d{0,6} min$/.test(runtime)) invalid('Runtime');

    let releasedDate = null;
    const released = text(content.Released, 'Released');
    if (released) {
        // Capture the day, abbreviated month, and year (e.g. 31 Mar 1999).
        const match = /^(\d{2}) ([A-Z][a-z]{2}) (\d{4})$/.exec(released);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = match ? months.indexOf(match[2]) + 1 : 0;
        if (!match || !month || Number(match[3]) < 1000) invalid('Released');
        const date = new Date(Date.UTC(Number(match[3]), month - 1, Number(match[1])));
        if (date.getUTCFullYear() !== Number(match[3]) ||
            date.getUTCMonth() !== month - 1 || date.getUTCDate() !== Number(match[1])) {
            invalid('Released');
        }
        releasedDate = `${match[3]}-${String(month).padStart(2, '0')}-${match[1]}`;
    }

    if (content.Ratings != null && !Array.isArray(content.Ratings)) invalid('Ratings');
    const rating = (source) => {
        const item = (content.Ratings || []).find(entry => entry && entry.Source === source);
        return text(item && item.Value, `Ratings.${source}`, 20);
    };

    return {
        imdb_id: imdbId,
        title,
        release_year: year ? Number(year) : null,
        rated: text(content.Rated, 'Rated', 20),
        released_date: releasedDate,
        runtime_minutes: runtime ? Number(runtime.split(' ')[0]) : null,
        genre: text(content.Genre, 'Genre', 255),
        director: text(content.Director, 'Director', 255),
        writer: text(content.Writer, 'Writer'),
        actors: text(content.Actors, 'Actors'),
        plot: text(content.Plot, 'Plot'),
        languages: text(content.Language, 'Language', 255),
        poster_url: text(content.Poster, 'Poster'),
        rating_imdb: text(content.imdbRating, 'imdbRating', 20),
        rating_rotten_tomatoes: rating('Rotten Tomatoes'),
        rating_metacritic: rating('Metacritic'),
    };
};

module.exports = { omdbContentFilter };