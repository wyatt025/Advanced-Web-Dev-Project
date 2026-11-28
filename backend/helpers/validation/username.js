function normalizeUsername(value) {
    const username = typeof value === 'string' ? value.trim() : '';
    // Allow 3 to 32 ASCII letters, digits, dots, underscores, or hyphens.
    return /^[A-Za-z0-9._-]{3,32}$/.test(username) ? username : null;
}

module.exports = { normalizeUsername };
