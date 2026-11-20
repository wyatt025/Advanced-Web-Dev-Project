const HOLD_SECONDS = 31 * 60;
const HOLD_GRACE_SECONDS = 2 * 60;

function paymentError(code, message) {
    const error = new Error(message);
    error.code = code;
    return error;
}

function regularSeatNumbers(seatCapacity, accessibleSeatCount) {
    if (!Number.isSafeInteger(seatCapacity) || seatCapacity < 1 ||
        !Number.isSafeInteger(accessibleSeatCount) || accessibleSeatCount < 0 ||
        accessibleSeatCount > seatCapacity) {
        throw paymentError('INVALID_SEAT_LAYOUT', 'The screening has an invalid seat layout.');
    }

    return Array.from({ length: seatCapacity - accessibleSeatCount }, (_, index) =>
        index >= 12 ? index + 2 : index + 1
    );
}

function normalizeSeatIds(seatIds, seatCapacity, accessibleSeatCount) {
    if (!Array.isArray(seatIds) || seatIds.length === 0) {
        throw paymentError('INVALID_SEATS', 'Choose at least one seat.');
    }
    if (seatIds.some((seatId) => !Number.isSafeInteger(seatId) || seatId < 1)) {
        throw paymentError('INVALID_SEATS', 'Seat selections are invalid. Reload the page and try again.');
    }

    const uniqueSeats = new Set(seatIds);
    if (uniqueSeats.size !== seatIds.length) {
        throw paymentError('INVALID_SEATS', 'Each seat can only be selected once.');
    }

    const availableSeatNumbers = new Set(regularSeatNumbers(seatCapacity, accessibleSeatCount));
    if (seatIds.some((seatId) => !availableSeatNumbers.has(seatId))) {
        throw paymentError('INVALID_SEATS', 'One or more selected seats are not available for booking.');
    }

    return [...seatIds].sort((first, second) => first - second);
}

function emailAddress(value) {
    if (typeof value !== 'string') return null;
    const email = value.trim();
    return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        ? email
        : null;
}

function priceToCents(value) {
    const text = String(value ?? '').trim();
    const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(text);
    if (!match) {
        throw paymentError('INVALID_PRICE', 'The ticket price is not configured correctly.');
    }

    const cents = BigInt(match[1]) * 100n + BigInt((match[2] || '').padEnd(2, '0') || '0');
    if (cents <= 0n || cents > BigInt(Number.MAX_SAFE_INTEGER)) {
        throw paymentError('INVALID_PRICE', 'The ticket price is not configured correctly.');
    }
    return Number(cents);
}

module.exports = {
    HOLD_SECONDS,
    HOLD_GRACE_SECONDS,
    emailAddress,
    normalizeSeatIds,
    priceToCents,
    regularSeatNumbers,
};