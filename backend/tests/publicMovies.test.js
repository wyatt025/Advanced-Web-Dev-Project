const { test } = require('node:test');
const assert = require('node:assert/strict');

const dbPath = require.resolve('../config/database');
let queryRows = [];
let lastQuery;
let profileRows = [];
let profileQuery;
let ticketQuery;
require.cache[dbPath] = {
    id: dbPath,
    filename: dbPath,
    loaded: true,
    exports: {
        public: {
            execute: async (sql, params) => {
                lastQuery = { sql, params };
                return [queryRows];
            },
        },
        registered: {
            execute: async (sql, params) => {
                if (sql.includes('FROM ticket_bookings')) {
                    ticketQuery = { sql, params };
                    return [[]];
                }
                profileQuery = { sql, params };
                return [profileRows];
            },
        },
    },
};

const userModel = require('../models/user/publicUserModel');
const registeredUserModel = require('../models/user/registeredUserModel');

test('groups screenings by movie and includes only public taken-seat data', async () => {
    const movie = {
        id: 3, title: 'Movie', genre: 'Action', rating: 'PG',
        comingSoon: 0, screeningId: 10, screeningDate: '2027-01-15T16:30:00.000Z',
        cinemaId: 1, cinema: 'Oulu', auditoriumId: 2, auditorium: 'Theater 1',
        seatCapacity: 110, accessibleSeatCount: 10,
    };
    queryRows = [
        { ...movie, takenSeat: 1 },
        { ...movie, takenSeat: 2 },
        { ...movie, screeningId: 11, auditoriumId: 3, auditorium: 'Theater 2', takenSeat: null },
        { ...movie, id: 4, title: 'Coming soon', comingSoon: 1, screeningId: null, takenSeat: null },
    ];

    const movies = await userModel.getPublicMovies();
    assert.equal(movies.length, 2);
    assert.equal(movies[0].screenings.length, 2);
    assert.deepEqual(movies[0].screenings[0].takenSeats, [1, 2]);
    assert.deepEqual(movies[0].screenings[1].takenSeats, []);
    assert.equal(movies[1].comingSoon, true);
    assert.deepEqual(movies[1].screenings, []);
    assert.match(lastQuery.sql, /v_taken_seats/);
    assert.doesNotMatch(lastQuery.sql, /user_id|isPaid/);

    queryRows = queryRows.slice(0, 3);
    const details = await userModel.getPublicMovie(3);
    assert.equal(details.length, 1);
    assert.deepEqual(lastQuery.params, [3]);
});

test('loads only the authenticated customer profile through the registered pool', async () => {
    profileRows = [{ id: 8, username: 'customer8', email: 'customer8@example.com' }];

    assert.deepEqual(await registeredUserModel.getRegisteredProfile(8), {
        ...profileRows[0],
        tickets: [],
    });
    assert.equal(profileQuery.sql, 'SELECT id, username, email FROM users WHERE id = ?');
    assert.deepEqual(profileQuery.params, [8]);
    assert.match(ticketQuery.sql, /b\.user_id = \? AND b\.status = 'paid'/);
    assert.deepEqual(ticketQuery.params, [8]);

    profileRows = [];
    assert.equal(await registeredUserModel.getRegisteredProfile(99), null);
});
