USE riocinemadb;

ALTER TABLE ticket_bookings
  ADD COLUMN total_amount_cents INT NULL AFTER email;
