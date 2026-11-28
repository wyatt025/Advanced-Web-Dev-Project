const { test } = require('node:test');
const assert = require('node:assert/strict');
const { normalizeUsername } = require('../helpers/validation/username');
const { emailAddress } = require('../helpers/validation/emailAddress');

test('username validation trims input and preserves character and length rules', () => {
    assert.equal(normalizeUsername('  Ab9._-  '), 'Ab9._-');
    assert.equal(normalizeUsername('a'.repeat(3)), 'aaa');
    assert.equal(normalizeUsername('a'.repeat(32)), 'a'.repeat(32));
    for (const value of [null, 123, '', 'ab', 'a'.repeat(33), 'a b', 'abc@', 'äbc']) {
        assert.equal(normalizeUsername(value), null);
    }
});

test('email validation trims input and preserves format and length rules', () => {
    assert.equal(emailAddress('  buyer@example.com  '), 'buyer@example.com');
    const longest = `${'a'.repeat(248)}@b.com`;
    assert.equal(longest.length, 254);
    assert.equal(emailAddress(longest), longest);
    for (const value of [null, 123, '', 'invalid', 'a@@b.com', 'a@b', 'a b@c.com', `${longest}x`]) {
        assert.equal(emailAddress(value), null);
    }
});
