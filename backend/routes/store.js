const crypto = require('crypto');
const express = require('express');
const Stripe = require('stripe');
const pools = require('../helpers/db');
const { checkOrigin } = require('../middleware/checkOrigin');

const storeRouter = express.Router();
const bookings = new Map();
const processedEvents = new Set();
const HOLD_MS = 31 * 60 * 1000;

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY is not configured');
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

function seatsTaken(screeningId) {
  const now = Date.now();
  return [...bookings.values()]
    .filter((booking) => String(booking.screeningId) === String(screeningId))
    .filter((booking) => booking.status === 'paid'
      || (booking.status === 'pending_payment' && booking.holdUntil > now))
    .flatMap((booking) => booking.seatIds);
}

async function getScreening(screeningId) {
  const [rows] = await pools.public.execute(
    `SELECT s.id, s.date, m.title, m.price,
            a.maxSeats, c.id AS cinemaId, c.name AS cinema
     FROM screenings s
     JOIN movies m ON m.id = s.movie_id
     JOIN auditoriums a ON a.id = s.auditorium_id
     JOIN cinemas c ON c.id = a.cinema_id
     WHERE s.id = ? AND s.date >= UTC_TIMESTAMP()
       AND a.isOpen = TRUE AND c.isOpen = TRUE`,
    [screeningId]
  );
  if (!rows.length) return null;

  const [takenRows] = await pools.public.execute(
    'SELECT seatNumber FROM v_taken_seats WHERE screening_id = ?',
    [screeningId]
  );
  return {
    ...rows[0],
    takenSeatNumbers: takenRows.map((row) => String(row.seatNumber)),
  };
}

storeRouter.post(['/stripe/webhook', '/api/stripe/webhook'], express.raw({ type: 'application/json' }), (req, res) => {
  let event;
  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
    event = getStripe().webhooks.constructEvent(
      req.body,
      req.headers['stripe-signature'],
      webhookSecret
    );
  } catch (error) {
    console.error('Webhook signature check failed:', error.message);
    return res.status(400).send('Invalid signature');
  }

  if (processedEvents.has(event.id)) {
    return res.json({ received: true, duplicate: true });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const booking = bookings.get(session.metadata.bookingId);
    if (booking && booking.status === 'pending_payment' && session.payment_status === 'paid') {
      booking.status = 'paid';
      booking.paidAt = Date.now();
      booking.stripePaymentIntentId = session.payment_intent;
    }
  }

  if (event.type === 'checkout.session.expired') {
    const booking = bookings.get(event.data.object.metadata.bookingId);
    if (booking && booking.status === 'pending_payment') booking.status = 'expired';
  }

  processedEvents.add(event.id);
  return res.json({ received: true });
});

  storeRouter.use(['/checkout-sessions', '/api/checkout-sessions'], express.json(), checkOrigin);
storeRouter.post(['/checkout-sessions', '/api/checkout-sessions'], async (req, res) => {
  let booking;
  try {
    const { screeningId, seatIds, email } = req.body;
    if (!Number.isSafeInteger(Number(screeningId))) {
      return res.status(400).json({ error: 'Invalid screening.' });
    }
    if (!Array.isArray(seatIds) || seatIds.length === 0 || !email) {
      return res.status(400).json({ error: 'Choose at least one seat and give an email.' });
    }

    const screening = await getScreening(Number(screeningId));
    if (!screening) return res.status(404).json({ error: 'Screening not found.' });

    const seats = [...new Set(seatIds.map((seat) => String(seat)))];
    const dbTaken = new Set(screening.takenSeatNumbers);
    const heldTaken = new Set(seatsTaken(screeningId));
    const invalidSeat = seats.some((seat) => {
      const seatNumber = Number(seat);
      return !Number.isSafeInteger(seatNumber)
        || seatNumber < 1
        || seatNumber > screening.maxSeats
        || dbTaken.has(seat)
        || heldTaken.has(seat);
    });
    if (invalidSeat) {
      return res.status(409).json({ error: 'One or more seats are no longer available.' });
    }

    booking = {
      id: crypto.randomUUID(),
      screeningId: Number(screeningId),
      seatIds: seats,
      email,
      status: 'pending_payment',
      createdAt: Date.now(),
      holdUntil: Date.now() + HOLD_MS,
    };
    bookings.set(booking.id, booking);

    const unitAmount = Math.round(Number(screening.price) * 100);
    if (!Number.isFinite(unitAmount) || unitAmount < 1) {
      booking.status = 'cancelled';
      return res.status(500).json({ error: 'Screening price is not configured.' });
    }

    const publicUrl = process.env.PUBLIC_URL;
    if (!publicUrl) {
      booking.status = 'cancelled';
      return res.status(500).json({ error: 'PUBLIC_URL is not configured.' });
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: email,
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: { name: `${screening.title} - cinema ticket` },
          unit_amount: unitAmount,
        },
        quantity: seats.length,
      }],
      metadata: { bookingId: booking.id },
      expires_at: Math.floor(booking.holdUntil / 1000),
      success_url: `${publicUrl}/success?booking_id=${booking.id}`,
      cancel_url: `${publicUrl}/cancel?booking_id=${booking.id}`,
    });

    booking.stripeCheckoutSessionId = session.id;
    return res.status(201).json({ url: session.url, bookingId: booking.id });
  } catch (error) {
    if (booking) booking.status = 'cancelled';
    console.error('Could not create Checkout Session:', error.message);
    return res.status(500).json({ error: 'Could not start checkout.' });
  }
});

storeRouter.get(['/bookings/:id', '/api/bookings/:id'], (req, res) => {
  const booking = bookings.get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found.' });
  return res.json({
    id: booking.id,
    status: booking.status,
    seatIds: booking.seatIds,
  });
});

module.exports = storeRouter;