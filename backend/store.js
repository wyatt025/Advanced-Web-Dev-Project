const screenings = [
  {
    id: 'screening_01',
    title: 'example film',
    startsAt: '2026-12-01T18:30:00',
    ticketPriceCents: 1000,
    currency: 'eur',
    seats: ['1', '2', '3', '11', '12', '14'],
  },
];

const bookings = new Map();
const processedEvents = new Set();
const HOLD_MS = 31 * 60 * 1000;

function seatsTaken(screeningId) {
  const now = Date.now();
  return [...bookings.values()]
    .filter((b) => b.screeningId === screeningId)
    .filter((b) => b.status === 'paid' || (b.status === 'pending_payment' && b.holdUntil > now))
    .flatMap((b) => b.seatIds);
}

function createBooking({ id, screeningId, seatIds, email }) {
  const booking = {
    id, screeningId, seatIds, email,
    status: 'pending_payment',
    createdAt: Date.now(),
    holdUntil: Date.now() + HOLD_MS,
  };
  bookings.set(id, booking);
  return booking;
}

module.exports = { screenings, bookings, processedEvents, seatsTaken, createBooking };