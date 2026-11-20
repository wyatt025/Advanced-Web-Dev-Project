import { useEffect, useState } from 'react';
import { getBooking } from '../api';

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
    return <p>Payment received. Seats: {booking.seatIds.join(', ')}.</p>;
  }
  if (booking?.status === 'expired' || booking?.status === 'cancelled') {
    return <p>Payment was not completed. The seat hold has been released.</p>;
  }
  if (loadError) return <p role="status">{loadError} Retrying payment confirmation...</p>;
  return <p>Confirming your payment...</p>;
}

export function Cancel() {
  return <p>Checkout was not completed. Any seat hold will release when the checkout session expires.</p>;
}
