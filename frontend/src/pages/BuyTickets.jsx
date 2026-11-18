import { useEffect, useState } from 'react';
import { getScreenings, startCheckout } from '../api';

export default function BuyTickets() {
  const [screening, setScreening] = useState(null);
  const [selected, setSelected] = useState([]);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const load = () =>
    getScreenings().then((items) => setScreening(items[0])).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  if (!screening) return <p>Loading... {error}</p>;
  const unavailable = new Set(screening.unavailableSeatIds);

  function toggle(seat) {
    if (unavailable.has(seat)) return;
    setSelected((cur) => cur.includes(seat) ? cur.filter((s) => s !== seat) : [...cur, seat]);
  }

  async function pay() {
    try {
      setError('');
      const { url } = await startCheckout({ screeningId: screening.id, seatIds: selected, email });
      window.location.assign(url); // go to Stripe's payment page
    } catch (e) {
      setError(e.message);
      load(); // a seat may have just been taken, so refresh
      setSelected([]);
    }
  }

  return (
    <section>
      <h2>{screening.title}</h2>
      <p>{new Date(screening.startsAt).toLocaleString()}</p>
      <div>
        {screening.seats.map((seat) => (
          <button key={seat} disabled={unavailable.has(seat)} onClick={() => toggle(seat)}>
            {seat} {selected.includes(seat) ? '✓' : ''}
          </button>
        ))}
      </div>
      <p>Selected: {selected.join(', ') || 'none'}</p>
      <label>Email <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
      <button disabled={!selected.length || !email} onClick={pay}>Proceed to payment</button>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
