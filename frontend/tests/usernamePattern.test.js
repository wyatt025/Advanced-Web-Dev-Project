import { test } from 'node:test'
import assert from 'node:assert/strict'
import { usernamePattern } from '../src/pages/usernamePattern.js'

test('username pattern is valid in HTML Unicode-set mode and matches complete usernames', () => {
  const pattern = new RegExp(`^(?:${usernamePattern})$`, 'v')
  for (const username of ['abc', 'User.1_-', 'a'.repeat(32)]) assert.equal(pattern.test(username), true)
  for (const username of ['ab', 'a'.repeat(33), 'user name', 'user@name', 'éclair']) assert.equal(pattern.test(username), false)
})
