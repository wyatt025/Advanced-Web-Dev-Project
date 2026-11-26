USE riocinemadb;

ALTER TABLE ticket_bookings
  ADD COLUMN customer_name VARCHAR(255) NULL AFTER email,
  ADD COLUMN customer_phone VARCHAR(50) NULL AFTER customer_name,
  MODIFY COLUMN status ENUM('pending_payment','paid','expired','cancelled','unpaid') NOT NULL;

CREATE OR REPLACE VIEW v_taken_seats AS
SELECT r.screening_id, r.seatNumber
FROM reservations r
LEFT JOIN ticket_bookings b ON b.id = r.booking_id
WHERE r.booking_id IS NULL
   OR r.isPaid = TRUE
   OR b.status = 'unpaid'
   OR (b.status = 'pending_payment' AND b.hold_expires_at > UTC_TIMESTAMP());

GRANT SELECT, INSERT, DELETE ON riocinemadb.ticket_bookings TO 'role_admin';
GRANT UPDATE (status) ON riocinemadb.ticket_bookings TO 'role_admin';
