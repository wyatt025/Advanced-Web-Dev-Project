export function regularSeats(screening) {
  const count = screening.seatCapacity - screening.accessibleSeatCount
  return Array.from({ length: Math.max(0, count) }, (_, index) =>
    index >= 12 ? index + 2 : index + 1
  )
}

export function hasAvailableRegularSeat(screening) {
  const takenSeats = new Set(screening.takenSeats)
  return regularSeats(screening).some((seat) => !takenSeats.has(seat))
}

export function reservedRegularSeatCount(screening) {
  const takenSeats = new Set(screening.takenSeats)
  return regularSeats(screening).filter((seat) => takenSeats.has(seat)).length
}
