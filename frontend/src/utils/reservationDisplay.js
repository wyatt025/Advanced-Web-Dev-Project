export function summarizeReservationSeats(seats) {
  if (!seats.length) return 'None'
  return `${seats.slice(0, 3).join(', ')}${seats.length > 3 ? ' ...' : ''}`
}
