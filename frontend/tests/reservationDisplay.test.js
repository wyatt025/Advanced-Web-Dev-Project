import { test } from 'node:test'
import assert from 'node:assert/strict'
import { summarizeReservationSeats } from '../src/pages/reservationDisplay.js'

test('reservation list shows at most three seats and an overflow indicator', () => {
  assert.equal(summarizeReservationSeats([]), 'None')
  assert.equal(summarizeReservationSeats([1, 2, 3]), '1, 2, 3')
  assert.equal(summarizeReservationSeats([1, 2, 3, 4]), '1, 2, 3 ...')
})
