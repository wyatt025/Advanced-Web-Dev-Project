import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatScreeningDate, screeningLocalInput } from '../src/pages/screeningDates.js'

test('displays and edits screening times in Finland with day before month', () => {
  assert.equal(formatScreeningDate('2035-01-15T12:05:00Z'), '15/01/2035, 14:05')
  assert.equal(screeningLocalInput('2035-01-15T12:05:00Z'), '2035-01-15T14:05')
  assert.equal(formatScreeningDate('2035-06-15T12:05:00Z'), '15/06/2035, 15:05')
})
