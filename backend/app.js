const express = require('express');
const app = express();
const cookieParser = require('cookie-parser');
const { checkOrigin } = require('./middleware/checkOrigin');
const { adminRouter } = require('./routes/adminRoute');
const userRouter = require('./routes/userRoute');
const { login } = require('./middleware/login');
const { authCookieOptions } = require('./middleware/authCookie');
const { authenticate } = require('./middleware/token&roleAuth');

const port = process.env.PORT || 3001;

const crypto = require('crypto');
const Stripe = require('stripe');
const { screenings, bookings, processedEvents, seatsTaken, createBooking } = require('./store');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      req.headers['stripe-signature'],
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    console.error('Webhook signature check failed:', error.message);
    return res.status(400).send('Invalid signature');
  }

  if (processedEvents.has(event.id)) return res.json({ received: true, duplicate: true });

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const booking = bookings.get(session.metadata.bookingId);
    if (booking && booking.status === 'pending_payment' && session.payment_status === 'paid') {
      booking.status = 'paid';
      booking.paidAt = Date.now();
      booking.stripePaymentIntentId = session.payment_intent;
      console.log('Booking ' + booking.id + ' is paid.');
    }
  }

  if (event.type === 'checkout.session.expired') {
    const booking = bookings.get(event.data.object.metadata.bookingId);
    if (booking && booking.status === 'pending_payment') booking.status = 'expired';
  }

  processedEvents.add(event.id);
  res.json({ received: true });
});


app.use(express.json());


app.get('/api/screenings', (req, res) => {
  res.json(screenings.map((s) => ({ ...s, unavailableSeatIds: seatsTaken(s.id) })));
});


app.post('/api/checkout-sessions', async (req, res) => {
  let booking;
  try {
    const { screeningId, seatIds, email } = req.body;
    if (!Array.isArray(seatIds) || seatIds.length === 0 || !email) {
      return res.status(400).json({ error: 'Choose at least one seat and give an email.' });
    }
    const screening = screenings.find((s) => s.id === screeningId);
    if (!screening) return res.status(404).json({ error: 'Screening not found.' });

    const seats = [...new Set(seatIds)];
    const taken = new Set(seatsTaken(screeningId));
    const bad = seats.some((id) => !screening.seats.includes(id) || taken.has(id));
    if (bad) return res.status(409).json({ error: 'One or more seats are no longer available.' });

    booking = createBooking({ id: crypto.randomUUID(), screeningId, seatIds: seats, email });

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: email,
      line_items: [{
        price_data: {
          currency: screening.currency,
          product_data: { name: screening.title + ' - cinema ticket' },
          unit_amount: screening.ticketPriceCents,
        },
        quantity: seats.length,
      }],
      metadata: { bookingId: booking.id },
      expires_at: Math.floor(booking.holdUntil / 1000),
      success_url: process.env.PUBLIC_URL + '/success?booking_id=' + booking.id,
      cancel_url: process.env.PUBLIC_URL + '/cancel?booking_id=' + booking.id,
    });

    booking.stripeCheckoutSessionId = session.id;
    res.status(201).json({ url: session.url, bookingId: booking.id });
  } catch (error) {
    if (booking) booking.status = 'cancelled';
    console.error('Could not create Checkout Session:', error.message);
    res.status(500).json({ error: 'Could not start checkout.' });
  }
});


app.get('/api/bookings/:id', (req, res) => {
  const b = bookings.get(req.params.id);
  if (!b) return res.status(404).json({ error: 'Booking not found.' });
  res.json({ id: b.id, status: b.status, seatIds: b.seatIds });
});

app.use(cookieParser());
app.use(checkOrigin);

const pools = require('./helpers/db'); 



app.post('/auth/login', login);
app.post('/auth/logout', (req, res) => {
    res.clearCookie('authToken', authCookieOptions);
    return res.status(204).end();
});
app.get('/auth/me', authenticate, (req, res) => {
    return res.json({ role: req.user.role });
});

app.use('/admin', adminRouter);
app.use('/user', userRouter);


app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})