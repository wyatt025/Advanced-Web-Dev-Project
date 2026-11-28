// HTML patterns use Unicode-set syntax; escape the literal hyphen.
export const usernamePattern = String.raw`[A-Za-z0-9._\-]{3,32}`
