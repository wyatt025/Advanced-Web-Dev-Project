const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const Stripe = require('stripe');
const {
    emailAddress,
    normalizeSeatIds,
    priceToCents,
    regularSeatNumbers,
} = require('../helpers/paymentSeats');

let modelQueryHandler = async () => [[]];
const modelCalls = [];
const modelConnection = {
    async beginTransaction() { modelCalls.push('begin'); },
    async commit() { modelCalls.push('commit'); },
    async rollback() { modelCalls.push('rollback'); },
    release() { modelCalls.push('release'); },
    async execute(sql, params) {
        modelCalls.push({ sql, params });
        return modelQueryHandler(sql, params);
    },
};
const dbPath = require.resolve('../helpers/db');
require.cache[dbPath] = {
    id: dbPath,
    filename: dbPath,
    loaded: true,
    exports: {
        auth: {
            async getConnection() { return modelConnection; },
            async execute(sql, params) {
                modelCalls.push({ sql, params });
                return [{ affectedRows: 1 }];
            },
        },
    },
};
const paymentModelDb = require('../models/paymentModel');

process.env.STRIPE_SECRET_KEY = 'sk_test_placeholder';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_placeholder';
process.env.PUBLIC_URL = 'https://rio.example';
process.env.FRONTEND_ORIGIN = 'https://rio.example';

const signatureStripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const checkoutCalls = [];
const processedEvents = [];
const paymentModel = {
    async createPendingBooking(booking) {
        return {
            id: booking.id,
            title: 'Example Movie',
            seatIds: booking.seatIds,
            amountCents: 1250,
        };
    },
    async attachCheckoutSession(bookingId, sessionId) {
        checkoutCalls.push({ bookingId, sessionId });
    },
    async cancelBooking() {},
    async getBooking(id) {
        return { id, status: 'paid', seatIds: [1, 2] };
    },
    async processStripeEvent(event) {
        const duplicate = processedEvents.includes(event.id);
        processedEvents.push(event.id);
        return { duplicate };
    },
};
const stripeClient = {
    checkout: {
        sessions: {
            async create(params) {
                checkoutCalls.push(params);
                return {
                    id: 'cs_test_checkout',
                    status: 'open',
                    url: 'https://checkout.stripe.test/session',
                };
            },
            async expire() {},
        },
    },
    webhooks: {
        constructEvent: (...args) => signatureStripe.webhooks.constructEvent(...args),
    },
};
const stripeRouter = require('../routes/stripeRoutes').createStripeRouter({
    model: paymentModel,
    stripeClient,
});
const app = express();
app.use(stripeRouter);
app.use(express.json());
app.post('/other', (req, res) => res.json(req.body));

test('validates seat layout, checkout email, and integer Stripe prices', () => {
    assert.deepEqual(regularSeatNumbers(18, 2), [
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 16, 17,
    ]);
    assert.deepEqual(normalizeSeatIds([14, 2], 18, 2), [2, 14]);
    assert.throws(() => normalizeSeatIds([13], 18, 2), { code: 'INVALID_SEATS' });
    assert.throws(() => normalizeSeatIds([2, 2], 18, 2), { code: 'INVALID_SEATS' });
    assert.equal(emailAddress(' buyer@example.com '), 'buyer@example.com');
    assert.equal(emailAddress('invalid'), null);
    assert.equal(priceToCents('12.50'), 1250);
    assert.throws(() => priceToCents('1.234'), { code: 'INVALID_PRICE' });
});

test('creates a temporary database hold under a screening lock before checkout', async () => {
    modelCalls.length = 0;
    modelQueryHandler = async (sql) => {
        if (sql.includes('SELECT s.id, s.auditorium_id')) {
            return [[{
                id: 8,
                auditoriumId: 4,
                title: 'Example Movie',
                price: '12.50',
                seatCapacity: 18,
                accessibleSeatCount: 2,
            }]];
        }
        if (sql.includes('SELECT seatNumber FROM reservations')) return [[]];
        return [{ affectedRows: 1 }];
    };

    const booking = await paymentModelDb.createPendingBooking({
        id: 'a7e4f8e1-0ab3-4f90-b8d2-70a6e45111e8',
        screeningId: 8,
        seatIds: [1, 2],
        email: 'buyer@example.com',
        checkoutExpiresAt: 1800000000,
    });

    assert.equal(booking.amountCents, 1250);
    assert.deepEqual(booking.seatIds, [1, 2]);
    assert.ok(modelCalls[1].sql.includes('FOR UPDATE'));
    assert.equal(modelCalls.filter((call) => call.sql?.includes('INSERT INTO reservations')).length, 2);
    assert.ok(modelCalls.includes('commit'));
    assert.ok(modelCalls.includes('release'));
});

test('rolls back a booking when a requested seat is already reserved', async () => {
    modelCalls.length = 0;
    modelQueryHandler = async (sql) => {
        if (sql.includes('SELECT s.id, s.auditorium_id')) {
            return [[{
                id: 8,
                auditoriumId: 4,
                title: 'Example Movie',
                price: '12.50',
                seatCapacity: 18,
                accessibleSeatCount: 2,
            }]];
        }
        if (sql.includes('SELECT seatNumber FROM reservations')) return [[{ seatNumber: 1 }]];
        return [{ affectedRows: 1 }];
    };

    await assert.rejects(
        paymentModelDb.createPendingBooking({
            id: 'a7e4f8e1-0ab3-4f90-b8d2-70a6e45111e8',
            screeningId: 8,
            seatIds: [1],
            email: 'buyer@example.com',
            checkoutExpiresAt: 1800000000,
        }),
        { code: 'SEAT_UNAVAILABLE' }
    );
    assert.ok(modelCalls.includes('rollback'));
    assert.equal(modelCalls.some((call) => call.sql?.includes('INSERT INTO ticket_bookings')), false);
});

test('marks reservations paid only while processing a paid webhook event', async () => {
    modelCalls.length = 0;
    modelQueryHandler = async (sql) => {
        if (sql.includes('INSERT IGNORE INTO stripe_webhook_events')) return [{ affectedRows: 1 }];
        if (sql.startsWith('SELECT status FROM ticket_bookings')) return [[{ status: 'pending_payment' }]];
        if (sql.includes('UPDATE reservations SET isPaid')) return [{ affectedRows: 2 }];
        return [{ affectedRows: 1 }];
    };

    const result = await paymentModelDb.processStripeEvent({
        id: 'evt_paid_test',
        type: 'checkout.session.completed',
        data: {
            object: {
                metadata: { bookingId: 'a7e4f8e1-0ab3-4f90-b8d2-70a6e45111e8' },
                payment_status: 'paid',
                payment_intent: 'pi_test',
            },
        },
    });

    assert.deepEqual(result, { duplicate: false });
    assert.ok(modelCalls.some((call) => call.sql?.includes('UPDATE reservations SET isPaid = TRUE')));
    assert.ok(modelCalls.some((call) => call.sql?.includes("status = 'paid'")));
    assert.ok(modelCalls.includes('commit'));
});

test('starts checkout from a real screening id and persists the generated session reference', async (t) => {
    const server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    t.after(() => new Promise((resolve, reject) => {
        server.close((error) => error ? reject(error) : resolve());
    }));
    const base = `http://127.0.0.1:${server.address().port}`;

    const invalid = await fetch(`${base}/checkout-sessions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Origin: process.env.FRONTEND_ORIGIN,
        },
        body: JSON.stringify({ screeningId: 1, seatIds: [], email: 'buyer@example.com' }),
    });
    assert.equal(invalid.status, 400);

    const checkout = await fetch(`${base}/checkout-sessions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Origin: process.env.FRONTEND_ORIGIN,
        },
        body: JSON.stringify({ screeningId: 8, seatIds: [1, 2], email: 'buyer@example.com' }),
    });
    assert.equal(checkout.status, 201);
    const result = await checkout.json();
    assert.equal(result.url, 'https://checkout.stripe.test/session');
    assert.equal(checkoutCalls[0].line_items[0].price_data.unit_amount, 1250);
    assert.equal(checkoutCalls[0].line_items[0].quantity, 2);
    assert.equal(checkoutCalls[0].success_url.startsWith('https://rio.example/success?booking_id='), true);

    const booking = await fetch(`${base}/bookings/${result.bookingId}`);
    assert.deepEqual(await booking.json(), {
        id: result.bookingId,
        status: 'paid',
        seatIds: [1, 2],
    });

    const other = await fetch(`${base}/other`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: 42 }),
    });
    assert.deepEqual(await other.json(), { value: 42 });
});

test('verifies raw webhook signatures and delegates event idempotency', async (t) => {
    const server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    t.after(() => new Promise((resolve, reject) => {
        server.close((error) => error ? reject(error) : resolve());
    }));
    const base = `http://127.0.0.1:${server.address().port}`;

    const payload = JSON.stringify({
        id: 'evt_test_checkout',
        type: 'checkout.session.completed',
        data: { object: { metadata: { bookingId: 'booking' }, payment_status: 'paid' } },
    });
    const signature = signatureStripe.webhooks.generateTestHeaderString({
        payload,
        secret: process.env.STRIPE_WEBHOOK_SECRET,
    });
    const sendWebhook = () => fetch(`${base}/stripe/webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Stripe-Signature': signature },
        body: payload,
    });

    const webhook = await sendWebhook();
    assert.equal(webhook.status, 200);
    assert.deepEqual(await webhook.json(), { received: true });
    const duplicate = await sendWebhook();
    assert.deepEqual(await duplicate.json(), { received: true, duplicate: true });
});
