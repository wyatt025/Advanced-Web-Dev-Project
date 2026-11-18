const API_URL = import.meta.env.VITE_API_URL || '';

export async function getScreenings() {
  const res = await fetch(API_URL + '/api/screenings');
  if (!res.ok) throw new Error('Could not load screenings.');
  return res.json();
}

export async function startCheckout(payload) {
  const res = await fetch(API_URL + '/api/checkout-sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Could not start checkout.');
  return data;
}

export async function getBooking(id) {
  const res = await fetch(API_URL + '/api/bookings/' + id);
  if (!res.ok) throw new Error('Booking not found.');
  return res.json();
}