const { DateTime } = require('luxon');
const { MovieValidationError } = require('../movies/validateMovie');

function validateScreenings(screenings, comingSoon) {
    if (!Array.isArray(screenings)) {
        throw new MovieValidationError('Screenings must be a list');
    }
    if (comingSoon && screenings.length > 0) {
        throw new MovieValidationError('Coming soon movies cannot have screenings');
    }
    if (!comingSoon && screenings.length === 0) {
        throw new MovieValidationError('Add at least one screening or mark the movie as coming soon');
    }
    return screenings.map((screening) => {
        if (!screening || !Number.isSafeInteger(screening.auditoriumId) || screening.auditoriumId < 1) {
            throw new MovieValidationError('Select a valid auditorium')
        } 
        if (typeof screening.localStart !== 'string') {
            throw new MovieValidationError('Enter a screening date and time');
        }

        const start = DateTime.fromFormat(screening.localStart, "yyyy-MM-dd'T'HH:mm", { zone: 'Europe/Helsinki' });

        if (!start.isValid || start.toFormat("yyyy-MM-dd'T'HH:mm") !== screening.localStart || start.getPossibleOffsets().length !== 1) {
            throw new MovieValidationError('Enter a valid, unambiguous Finnish date and time');
        }
        if (start.toMillis() <= Date.now()) {
            throw new MovieValidationError('Screening time must be in the future');
        }
        return {
            auditoriumId: screening.auditoriumId,
            date: start.toUTC().toFormat('yyyy-MM-dd HH:mm:ss'),
        };
    });
}

module.exports = {
    validateScreenings,
};