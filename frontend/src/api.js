const API_URL = import.meta.env.VITE_API_URL || '';

export async function startCheckout(payload) {
  const res = await fetch(API_URL + '/api/checkout-sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const error = new Error(data?.error || 'Could not start checkout.');
    error.status = res.status;
    throw error;
  }
  if (typeof data?.url !== 'string' || !data.url) {
    throw new Error('The server did not return a checkout link.');
  }
  return data;
}

export async function getBooking(id) {
  const res = await fetch(API_URL + '/api/bookings/' + encodeURIComponent(id));
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || 'Booking not found.');
  return data;
}