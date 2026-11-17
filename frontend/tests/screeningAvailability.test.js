import { test } from 'node:test'
import assert from 'node:assert/strict'
import { hasAvailableRegularSeat, regularSeats } from '../src/pages/screeningAvailability.js'

test('regular seat numbers exclude accessible spaces and skip seat 13', () => {
  const screening = { seatCapacity: 25, accessibleSeatCount: 10 }
  assert.deepEqual(regularSeats(screening), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 16])
})

test('screenings are available only when a regular seat is unreserved', () => {
  const screening = { seatCapacity: 13, accessibleSeatCount: 10, takenSeats: [1, 2] }
  assert.equal(hasAvailableRegularSeat(screening), true)
  assert.equal(hasAvailableRegularSeat({ ...screening, takenSeats: [1, 2, 3] }), false)
  assert.equal(hasAvailableRegularSeat({ ...screening, takenSeats: [1, 2, 99] }), true)
  assert.equal(hasAvailableRegularSeat({ ...screening, seatCapacity: 10, takenSeats: [] }), false)
})
