const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const Stripe = require('stripe');

process.env.STRIPE_SECRET_KEY = 'sk_test_placeholder';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_placeholder';

const stripeRouter = require('../routes/stripeRoutes');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const app = express();
app.use(stripeRouter);
app.use(express.json());
app.post('/other', (req, res) => res.json(req.body));

test('preserves Stripe routes, raw webhook verification, and other JSON routes', async (t) => {
    const server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    t.after(() => new Promise((resolve, reject) => {
        server.close((error) => error ? reject(error) : resolve());
    }));
    const base = `http://127.0.0.1:${server.address().port}`;

    const screenings = await fetch(`${base}/api/screenings`);
    assert.equal(screenings.status, 200);
    assert.equal((await screenings.json())[0].id, 'screening_01');

    const checkout = await fetch(`${base}/api/checkout-sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ screeningId: 'screening_01', seatIds: [], email: 'test@example.com' }),
    });
    assert.equal(checkout.status, 400);
    assert.equal((await checkout.json()).error, 'Choose at least one seat and give an email.');

    const payload = JSON.stringify({ id: 'evt_test', type: 'unhandled', data: { object: {} } });
    const signature = stripe.webhooks.generateTestHeaderString({
        payload,
        secret: process.env.STRIPE_WEBHOOK_SECRET,
    });
    const sendWebhook = () => fetch(`${base}/api/stripe/webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Stripe-Signature': signature },
        body: payload,
    });
    const webhook = await sendWebhook();
    assert.equal(webhook.status, 200);
    assert.deepEqual(await webhook.json(), { received: true });
    const duplicate = await sendWebhook();
    assert.deepEqual(await duplicate.json(), { received: true, duplicate: true });

    const other = await fetch(`${base}/other`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: 42 }),
    });
    assert.deepEqual(await other.json(), { value: 42 });
});
