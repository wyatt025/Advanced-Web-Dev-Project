import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getBooking } from '../api';
import { formatScreeningDate } from './screeningDates.js';
import './PaymentPages.css';

function formatAmount(cents) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

export function Success() {
  const id = new URLSearchParams(window.location.search).get('booking_id');
  const [booking, setBooking] = useState(null);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    async function refreshBooking() {
      try {
        const loadedBooking = await getBooking(id);
        if (!cancelled) {
          setBooking(loadedBooking);
          setLoadError('');
        }
      } catch (error) {
        if (!cancelled) setLoadError(error.message || 'Could not check payment status.');
      }
    }

    refreshBooking();
    const timer = setInterval(refreshBooking, 2000);
    return () => {
      cancelled = true; 
      clearInterval(timer);
    };
  }, [id]);

  if (!id) return <p>Missing booking information.</p>;
  if (booking?.status === 'paid') {
    return (
      <section className="payment-page">
        <article className="payment-receipt" aria-labelledby="payment-receipt-title">
          <p className="payment-receipt__status __success">
            <span aria-hidden="true">✓</span>
            Payment confirmed
          </p>
          <h1 id="payment-receipt-title">Ticket receipt</h1>
          <p className="payment-receipt__intro">Your booking is confirmed. Keep this receipt for your visit.</p>

          <dl className="payment-receipt__details">
            <div>
              <dt>Movie</dt>
              <dd>{booking.movieTitle}</dd>
            </div>
            <div>
              <dt>Screening</dt>
              <dd>{formatScreeningDate(booking.screeningDate)}</dd>
            </div>
            <div>
              <dt>Cinema</dt>
              <dd>{booking.cinemaName}</dd>
            </div>
            <div>
              <dt>Auditorium</dt>
              <dd>{booking.auditoriumName || 'Details unavailable'}</dd>
            </div>
            <div>
              <dt>Seats</dt>
              <dd className="payment-receipt__seats">
                {booking.seatIds.map((seat) => <span key={seat}>{seat}</span>)}
              </dd>
            </div>
            <div>
              <dt>Booking reference</dt>
              <dd><code>{booking.id}</code></dd>
            </div>
            <div className="payment-receipt__total">
              <dt>Total paid</dt>
              <dd>{booking.totalAmountCents == null ? 'Unavailable' : formatAmount(booking.totalAmountCents)}</dd>
            </div>
          </dl>

          <div className="payment-receipt__actions">
            <Link to="/">Back to movies</Link>
          </div>
        </article>
      </section>
    );
  }
   if (booking?.status === 'expired') {
    return (
      <section className="payment-page">
        <article className="payment-receipt" aria-labelledby="payment-receipt-title">
          <p className="payment-receipt__status __error">
            <span aria-hidden="true">✗</span>
            Payment Expired
          </p>
          <h1 id="payment-receipt-title">Ticket receipt</h1>
          <p className="payment-receipt__intro">Your booking has expired.</p>

          <dl className="payment-receipt__details">
            <div>
              <dt>Movie</dt>
              <dd>{booking.movieTitle}</dd>
            </div>
            <div>
              <dt>Screening</dt>
              <dd>{formatScreeningDate(booking.screeningDate)}</dd>
            </div>
            <div>
              <dt>Cinema</dt>
              <dd>{booking.cinemaName}</dd>
            </div>
            <div>
              <dt>Auditorium</dt>
              <dd>{booking.auditoriumName || 'Details unavailable'}</dd>
            </div>
            <div>
              <dt>Seats</dt>
              <dd className="payment-receipt__seats">
                {booking.seatIds.map((seat) => <span key={seat}>{seat}</span>)}
              </dd>
            </div>
            <div>
              <dt>Booking reference</dt>
              <dd><code>{booking.id}</code></dd>
            </div>
            <div className="payment-receipt__total">
              <dt>Total paid</dt>
              <dd>{booking.totalAmountCents == null ? 'Unavailable' : formatAmount(booking.totalAmountCents)}</dd>
            </div>
          </dl>

          <div className="payment-receipt__actions">
            <Link to="/">Back to movies</Link>
          </div>
        </article>
      </section>
    );
  }
  if(booking?.status === 'cancelled') {
    return (
      <section className="payment-page">
        <article className="payment-receipt" aria-labelledby="payment-receipt-title">
          <p className="payment-receipt__status __error">
            <span aria-hidden="true">✗</span>
            Payment Cancelled
          </p>
          <h1 id="payment-receipt-title">Ticket receipt</h1>
          <p className="payment-receipt__intro">Your booking has been cancelled.</p>

          <dl className="payment-receipt__details">
            <div>
              <dt>Movie</dt>
              <dd>{booking.movieTitle}</dd>
            </div>
            <div>
              <dt>Screening</dt>
              <dd>{formatScreeningDate(booking.screeningDate)}</dd>
            </div>
            <div>
              <dt>Cinema</dt>
              <dd>{booking.cinemaName}</dd>
            </div>
            <div>
              <dt>Auditorium</dt>
              <dd>{booking.auditoriumName || 'Details unavailable'}</dd>
            </div>
            <div>
              <dt>Seats</dt>
              <dd className="payment-receipt__seats">
                {booking.seatIds.map((seat) => <span key={seat}>{seat}</span>)}
              </dd>
            </div>
            <div>
              <dt>Booking reference</dt>
              <dd><code>{booking.id}</code></dd>
            </div>
            <div className="payment-receipt__total">
              <dt>Total paid</dt>
              <dd>{booking.totalAmountCents == null ? 'Unavailable' : formatAmount(booking.totalAmountCents)}</dd>
            </div>
          </dl>

          <div className="payment-receipt__actions">
            <Link to="/">Back to movies</Link>
          </div>
        </article>
      </section>
    );
  }
  if (loadError) return <p role="status">{loadError} Retrying payment confirmation...</p>;

  return (
      <section className="payment-page">
        <article className="payment-receipt" aria-labelledby="payment-receipt-title">
          <p className="payment-receipt__status __pending">
            <span aria-hidden="true">◑</span>
            Confirming your payment
          </p>
          <h1 id="payment-receipt-title">Ticket receipt</h1>
          <p className="payment-receipt__intro">Your booking is being processed.</p>

          <div className="payment-receipt__actions">
            <Link to="/">Back to movies</Link>
          </div>
        </article>
      </section>
    );
}

export function Cancel() {
  return <p>Checkout was not completed. Any seat hold will release when the checkout session expires.</p>;
}
