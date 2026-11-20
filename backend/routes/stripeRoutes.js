const crypto = require('crypto');
const express = require('express');
const Stripe = require('stripe');
const { checkOrigin } = require('../middleware/checkOrigin');
const { HOLD_SECONDS, emailAddress } = require('../helpers/paymentSeats');

function createStripeRouter({
    model,
    originCheck = checkOrigin,
    stripeClient,
} = {}) {
    const router = express.Router();
    let client = stripeClient;
    let activeModel = model;

    function getPaymentModel() {
        if (!activeModel) activeModel = require('../models/paymentModel');
        return activeModel;
    }

    function getStripeClient() {
        if (client) return client;
        if (!process.env.STRIPE_SECRET_KEY) {
            const error = new Error('Stripe is not configured.');
            error.code = 'STRIPE_NOT_CONFIGURED';
            throw error;
        }
        client = new Stripe(process.env.STRIPE_SECRET_KEY);
        return client;
    }

    router.post('/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
        if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
            return res.status(503).send('Stripe webhook is not configured.');
        }

        let event;
        try {
            event = getStripeClient().webhooks.constructEvent(
                req.body,
                req.headers['stripe-signature'],
                process.env.STRIPE_WEBHOOK_SECRET
            );
        } catch (error) {
            console.error('Webhook signature check failed:', error.message);
            return res.status(400).send('Invalid signature');
        }

        try {
            const result = await getPaymentModel().processStripeEvent(event);
            return res.json({ received: true, ...(result.duplicate ? { duplicate: true } : {}) });
        } catch (error) {
            console.error('Stripe webhook processing failed:', error.code || error.message);
            return res.status(500).json({ error: 'Could not process Stripe event.' });
        }
    });

    router.post('/checkout-sessions', originCheck, express.json(), async (req, res) => {
        const { screeningId, seatIds } = req.body || {};
        const email = emailAddress(req.body && req.body.email);
        if (!Number.isSafeInteger(screeningId) || screeningId < 1 ||
            !Array.isArray(seatIds) || seatIds.length === 0 || !email) {
            return res.status(400).json({ error: 'Choose seats and enter a valid email address.' });
        }

        let checkoutUrl;
        let booking;
        let stripe;
        let checkoutSession;
        try {
            stripe = getStripeClient();
            if (!process.env.PUBLIC_URL) {
                return res.status(503).json({ error: 'Ticket checkout is not configured.' });
            }
            let publicUrl;
            try {
                publicUrl = new URL(process.env.PUBLIC_URL);
            } catch {
                return res.status(503).json({ error: 'Ticket checkout is not configured.' });
            }
            if (!['http:', 'https:'].includes(publicUrl.protocol) ||
                publicUrl.username || publicUrl.password || publicUrl.pathname !== '/' ||
                publicUrl.search || publicUrl.hash) {
                return res.status(503).json({ error: 'Ticket checkout is not configured.' });
            }
            const bookingId = crypto.randomUUID();
            const checkoutExpiresAt = Math.floor(Date.now() / 1000) + HOLD_SECONDS;
            booking = await getPaymentModel().createPendingBooking({
                id: bookingId,
                screeningId,
                seatIds,
                email,
                checkoutExpiresAt,
            });

            checkoutSession = await stripe.checkout.sessions.create({
                mode: 'payment',
                customer_email: email,
                client_reference_id: booking.id,
                line_items: [{
                    price_data: {
                        currency: 'eur',
                        product_data: { name: `${booking.title} - cinema ticket` },
                        unit_amount: booking.amountCents,
                    },
                    quantity: booking.seatIds.length,
                }],
                metadata: { bookingId: booking.id },
                expires_at: checkoutExpiresAt,
                success_url: `${publicUrl.origin}/success?booking_id=${encodeURIComponent(booking.id)}`,
                cancel_url: `${publicUrl.origin}/cancel?booking_id=${encodeURIComponent(booking.id)}`,
            });

            if (typeof checkoutSession.url !== 'string' || !checkoutSession.url) {
                throw new Error('Stripe did not return a Checkout URL.');
            }
            checkoutUrl = checkoutSession.url;
            await getPaymentModel().attachCheckoutSession(booking.id, checkoutSession.id);
            return res.status(201).json({ url: checkoutUrl, bookingId: booking.id });
        } catch (error) {
            if (booking) {
                let canReleaseHold = !checkoutSession;
                if (stripe && checkoutSession && checkoutSession.status === 'open') {
                    try {
                        await stripe.checkout.sessions.expire(checkoutSession.id);
                        canReleaseHold = true;
                    } catch (expireError) {
                        console.error('Could not expire failed Checkout Session:', expireError.code || 'UNKNOWN_ERROR');
                    }
                }
                if (canReleaseHold) {
                    try {
                        await getPaymentModel().cancelBooking(booking.id);
                    } catch (cleanupError) {
                        console.error('Could not release failed checkout hold:', cleanupError.code || 'UNKNOWN_ERROR');
                    }
                }
            }

            if (error.code === 'SCREENING_UNAVAILABLE') {
                return res.status(404).json({ error: error.message });
            }
            if (error.code === 'SEAT_UNAVAILABLE') {
                return res.status(409).json({ error: error.message });
            }
            if (error.code === 'INVALID_SEATS') {
                return res.status(400).json({ error: error.message });
            }
            if (error.code === 'INVALID_PRICE' || error.code === 'INVALID_SEAT_LAYOUT') {
                console.error('Ticket configuration error:', error.code);
                return res.status(500).json({ error: 'Tickets are not configured correctly.' });
            }
            if (error.code === 'STRIPE_NOT_CONFIGURED') {
                return res.status(503).json({ error: 'Ticket checkout is not configured.' });
            }

            console.error('Could not create Checkout Session:', error.code || error.message);
            return res.status(502).json({ error: 'Could not start checkout. Please try again.' });
        }
    });

    router.get('/bookings/:id', async (req, res) => {
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(req.params.id)) {
            return res.status(404).json({ error: 'Booking not found.' });
        }
        try {
            const booking = await getPaymentModel().getBooking(req.params.id);
            if (!booking) return res.status(404).json({ error: 'Booking not found.' });
            return res.json(booking);
        } catch (error) {
            console.error('Could not load booking:', error.code || 'UNKNOWN_ERROR');
            return res.status(500).json({ error: 'Could not load booking.' });
        }
    });

    return router;
}

const stripeRouter = createStripeRouter();
stripeRouter.createStripeRouter = createStripeRouter;

module.exports = stripeRouter;
