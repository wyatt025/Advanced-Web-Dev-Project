USE riocinemadb;

GRANT SELECT (email) ON riocinemadb.users TO 'role_auth';
GRANT SELECT (id, username, email)
  ON riocinemadb.users TO 'role_registered';
GRANT SELECT (id, screening_id, user_id, total_amount_cents, status, paid_at)
  ON riocinemadb.ticket_bookings TO 'role_registered';
GRANT SELECT (booking_id, seatNumber, isPaid)
  ON riocinemadb.reservations TO 'role_registered';

GRANT SELECT (id, username, password, role, email)
  ON riocinemadb.users TO 'role_auth';
GRANT INSERT (username, email, password)
  ON riocinemadb.users TO 'role_auth';
