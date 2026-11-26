# We need to have multiple accounts in the database for separate permissions:
Admins account only for highest required actions: adding, deleting, modifying movies and screenings.
Employees account secure required actions: adding, deleting, modifying reservations
Registered account required actions: reading user data (preferably only own), changing own user data, view own reservations.
Public account required actions: view screenings, cinemas, seats... etc.

Authentication user: password lookup, corfirming users' data, payment confirmation, OTP auth... etc.

# Some ranks above can access same properties and modify ranks' below.
# All ranks should only have access to only their required permissions.

# Ticket checkout deployment

New databases receive the ticket-booking tables and grants from `init.sql`.
For an existing CSC Rahti database, apply
`migrations/20261118_add_checkout_reservations.sql` once using a database
administrator before deploying the backend update. The migration extends the
existing `role_auth` account used by the backend; keep its password in the
Rahti secret/environment configuration as `APP_AUTH_PASS`. `role_auth` needs
`UPDATE` on `screenings` so checkout can lock a screening row while creating a
seat hold; the checkout flow does not update screening data.
For existing databases, apply `migrations/20261120_add_booking_receipt_total.sql`
once as a database administrator before deploying the receipt update. It stores
the charged total so the receipt reflects the amount paid at checkout.

# Admin reservations deployment

For existing databases, apply `migrations/20261126_admin_reservations.sql`
once as a database administrator after the checkout migrations and before
deploying the admin reservations feature. This adds customer contact fields
and an unpaid booking status, updates the taken-seat view, and grants the
admin role the booking permissions required by the feature.

The reservation list and customer search use `users.username` as the account
name and require the admin database role to have SELECT access to that column.
The deployed database uses `username`, but the `users` definition in `init.sql`
currently uses `name` instead. A fresh database created from that definition
therefore needs its user schema and privileges reconciled before using this
feature; do not apply the existing-database migration to a fresh database.

Admin-created reservations hold seats as unpaid bookings. Pending-payment
bookings cannot be deleted from the admin interface. Deleting a paid booking
does not issue a refund or notify the customer.

Configure these backend environment variables in Rahti:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `PUBLIC_URL` (the public frontend origin)
- `FRONTEND_ORIGIN` (the same public frontend origin)
- `APP_AUTH_PASS` and the existing database connection variables

Register the Stripe webhook at
`https://<frontend-origin>/api/stripe/webhook` for Checkout events
`checkout.session.completed`, `checkout.session.expired`,
`checkout.session.async_payment_succeeded`, and
`checkout.session.async_payment_failed`.

The frontend should leave `VITE_API_URL` unset when using its same-origin
Nginx API proxy. Nginx continues to listen on port 8080; the `/api/` proxy
removes that prefix before forwarding to the backend routes.