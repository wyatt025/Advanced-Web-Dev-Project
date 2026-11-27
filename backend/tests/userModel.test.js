const { test } = require('node:test');
const assert = require('node:assert/strict');

const calls = [];
const registeredRows = {
    profile: [{ id: 17, username: 'moviegoer', email: 'moviegoer@example.com' }],
    tickets: [
        {
            id: 'booking-1',
            totalAmountCents: 2500,
            movieTitle: 'Example Movie',
            screeningDate: '2026-12-01T18:30:00.000Z',
            cinemaName: 'Rio Cinema',
            auditoriumName: 'Auditorium 1',
            seatNumber: 1,
        },
        {
            id: 'booking-1',
            totalAmountCents: 2500,
            movieTitle: 'Example Movie',
            screeningDate: '2026-12-01T18:30:00.000Z',
            cinemaName: 'Rio Cinema',
            auditoriumName: 'Auditorium 1',
            seatNumber: 2,
        },
    ],
};
const dbPath = require.resolve('../helpers/db');
require.cache[dbPath] = {
    id: dbPath,
    filename: dbPath,
    loaded: true,
    exports: {
        registered: {
            async execute(sql, params) {
                calls.push({ sql, params });
                return [sql.includes('FROM ticket_bookings')
                    ? registeredRows.tickets
                    : registeredRows.profile];
            },
        },
    },
};

const userModel = require('../models/user_model');

test("returns the account email and groups only that account's paid ticket seats", async () => {
    calls.length = 0;
    const profile = await userModel.getRegisteredProfile(17);

    assert.deepEqual(profile, {
        id: 17,
        username: 'moviegoer',
        email: 'moviegoer@example.com',
        tickets: [{
            id: 'booking-1',
            totalAmountCents: 2500,
            movieTitle: 'Example Movie',
            screeningDate: '2026-12-01T18:30:00.000Z',
            cinemaName: 'Rio Cinema',
            auditoriumName: 'Auditorium 1',
            seatIds: [1, 2],
        }],
    });
    assert.deepEqual(calls.map((call) => call.params), [[17], [17]]);
    assert.match(calls[1].sql, /b\.user_id = \? AND b\.status = 'paid'/);
});

test('returns no profile when the authenticated account is missing', async () => {
    registeredRows.profile = [];
    calls.length = 0;

    assert.equal(await userModel.getRegisteredProfile(17), null);
    assert.equal(calls.length, 1);
});
