import { test } from 'node:test'
import assert from 'node:assert/strict'
import { filterLocations } from '../src/admin/locationFilter.js'

const locations = {
  cinemas: [{ id: 1, name: 'Oulu', address: 'Street 1' }, { id: 2, name: 'Tampere', address: 'Street 2' }],
  theaters: [{ id: 3, cinemaId: 1, cinemaName: 'Oulu', name: 'Theater 1' }, { id: 4, cinemaId: 2, cinemaName: 'Tampere', name: 'Theater 2' }],
}

test('shows every theater initially and filters by selected cinema', () => {
  assert.deepEqual(filterLocations(locations, '', null).theaters.map((item) => item.id), [3, 4])
  assert.deepEqual(filterLocations(locations, '', 1).theaters.map((item) => item.id), [3])
  assert.deepEqual(filterLocations(locations, '', 2).theaters.map((item) => item.id), [4])
})

test('search combines case-insensitive text with the selected cinema', () => {
  assert.deepEqual(filterLocations(locations, '  OULU ', null).theaters.map((item) => item.id), [3])
  assert.deepEqual(filterLocations(locations, 'theater 1', 2).theaters, [])
  assert.deepEqual(filterLocations(locations, 'street 2', null).cinemas.map((item) => item.id), [2])
})
