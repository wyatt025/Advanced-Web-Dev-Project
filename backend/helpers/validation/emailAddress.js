function emailAddress(value) {
    if (typeof value !== 'string') return null;
    const email = value.trim();
    // Require non-whitespace text around one @ and a dot in the domain.
    return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        ? email
        : null;
}

module.exports = { emailAddress };
