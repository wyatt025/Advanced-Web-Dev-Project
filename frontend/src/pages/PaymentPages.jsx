import { useEffect, useState } from 'react';
import { getBooking } from '../api';

export function Success() {
  const id = new URLSearchParams(window.location.search).get('booking_id');
  const [booking, setBooking] = useState(null);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    async function refreshBooking() {
      try {
        const loadedBooking = await getBooking(id);
        if (!cancelled) setBooking(loadedBooking);
      } catch {
        // Keep polling; the webhook or booking record may not be ready yet.
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
  return <p>Confirming your payment...</p>;
}

export function Cancel() {
  return <p>Payment cancelled. Your seats will be released shortly.</p>;
}
