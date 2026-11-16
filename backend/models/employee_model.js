const pools = require('../config/db');

/*
employees should be able to check and view availability of seats and screening times.
employees should be able to create and update reservations for guests or users
employees should be able to manage reservations for guests or users such as seeing their bookings and details
employees should be able to see basic user info or guest info
*/

const employeeModel = {
    checkSeatAvailability: async (screeningId) => {
        try {
            const [rows] = await pools.query(
                'SELECT * FROM seats WHERE screening_id = ? AND available = 1',
                [screeningId]
            );
            return rows;
        } catch (error) {
            throw error;
        }
    },
    createReservation: async (reservationData) => {
        try {
            const [result] = await pools.query(
                'INSERT INTO reservations (user_id, screening_id, seat_id) VALUES (?, ?, ?)',
                [reservationData.userId, reservationData.screeningId, reservationData.seatId]
            );
            return result;
        } catch (error) {
            throw error;
        }
    },
    getReservations: async (userId) => {
        try {
            const [rows] = await pools.query(
                'SELECT * FROM reservations WHERE user_id = ?',
                [userId]
            );
            return rows;
        } catch (error) {
            throw error;
        }
    },
    updateReservation: async (reservationId, reservationData) => {
        try {
            const [result] = await pools.query(
                'UPDATE reservations SET user_id = ?, screening_id = ?, seat_id = ? WHERE id = ?',
                [reservationData.userId, reservationData.screeningId, reservationData.seatId, reservationId]
            );
            return result;
        } catch (error) {
            throw error;
        }
    },
    getUserInfo: async (userId) => {
        try {
            const [rows] = await pools.query(
                'SELECT id, name, email FROM users WHERE id = ?',
                [userId]
            );
            return rows[0];
        } catch (error) {
            throw error;
        }
    },
    getReservationDetails: async (reservationId) => {
        try {
            const [rows] = await pools.query(
                'SELECT * FROM reservations WHERE id = ?',
                [reservationId]
            );
            return rows[0];
        } catch (error) {
            throw error;
        }
    },
    cancelReservation: async (reservationId) => {
        try {
            const [result] = await pools.query(
                'DELETE FROM reservations WHERE id = ?',
                [reservationId]
            );
            return result;
        } catch (error) {
            throw error;
        }
    },
}; 

module.exports = employeeModel;