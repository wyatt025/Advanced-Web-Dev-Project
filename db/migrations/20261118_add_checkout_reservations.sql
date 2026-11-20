USE riocinemadb;

CREATE TABLE ticket_bookings (
  id CHAR(36) PRIMARY KEY,
  screening_id INT NOT NULL,
  user_id INT NULL,
  email VARCHAR(254) NOT NULL,
  status ENUM('pending_payment','paid','expired','cancelled') NOT NULL,
  hold_expires_at DATETIME NOT NULL,
  stripe_checkout_session_id VARCHAR(255) NULL UNIQUE,
  stripe_payment_intent_id VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  paid_at DATETIME NULL,
  INDEX idx_booking_screening_expiry (screening_id, status, hold_expires_at),
  CONSTRAINT fk_ticket_booking_screening FOREIGN KEY (screening_id)
    REFERENCES screenings(id) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT fk_ticket_booking_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE SET NULL ON UPDATE NO ACTION
) ENGINE=InnoDB;

CREATE TABLE stripe_webhook_events (
  event_id VARCHAR(255) PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL,
  received_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

ALTER TABLE reservations
  ADD COLUMN booking_id CHAR(36) NULL,
  ADD KEY idx_reservation_booking (booking_id),
  ADD CONSTRAINT fk_res_booking FOREIGN KEY (booking_id)
    REFERENCES ticket_bookings(id) ON DELETE CASCADE ON UPDATE NO ACTION;

CREATE OR REPLACE VIEW v_taken_seats AS
SELECT r.screening_id, r.seatNumber
FROM reservations r
LEFT JOIN ticket_bookings b ON b.id = r.booking_id
WHERE r.booking_id IS NULL
   OR r.isPaid = TRUE
   OR (b.status = 'pending_payment' AND b.hold_expires_at > UTC_TIMESTAMP());

GRANT 'role_public' TO 'role_auth';
GRANT SELECT (id, auditorium_id, screening_id, seatNumber, isPaid, booking_id)
  ON riocinemadb.reservations TO 'role_auth';
GRANT INSERT (seatNumber, auditorium_id, user_id, screening_id, isPaid, booking_id)
  ON riocinemadb.reservations TO 'role_auth';
GRANT UPDATE (isPaid) ON riocinemadb.reservations TO 'role_auth';
GRANT DELETE ON riocinemadb.reservations TO 'role_auth';
GRANT SELECT, INSERT, UPDATE ON riocinemadb.ticket_bookings TO 'role_auth';
GRANT SELECT, INSERT ON riocinemadb.stripe_webhook_events TO 'role_auth';