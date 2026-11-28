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

# Customer accounts

The app authenticates accounts by username. Registration inserts only
`username`, email, and a bcrypt password hash through the backend's `app_auth`
connection; MySQL supplies the default `user` role. For an existing CSC Rahti
database, apply `migrations/20261126_customer_accounts.sql` and then
`migrations/20261127_account_email_tickets.sql` once as a database administrator
before deploying the account and ticket-history update. The latter grants the
registered role access to its account email and paid bookings, and lets the
auth role read the email and save it at registration. It expects the
`users.email` and ticket-booking columns from `init.sql` and the existing
checkout migrations.

Set `APP_REGISTERED_PASS` in the backend deployment to the database password
for `app_registered`. Login and registration continue to use the existing
`APP_AUTH_PASS` connection; the frontend never connects directly to MySQL.
Registered accounts use their saved email for checkout, and paid ticket bookings
are associated with their account and shown on the account page.

# Admin reservations deployment

For existing databases, apply `migrations/20261126_admin_reservations.sql`
once as a database administrator after the checkout migrations and before
deploying the admin reservations feature. This adds customer contact fields
and an unpaid booking status, updates the taken-seat view, and grants the
admin role the booking permissions required by the feature.

The reservation list and customer search use `users.username` as the account
name and require the admin database role to have SELECT access to that column.

Admin-created reservations hold seats as unpaid bookings. Pending-payment
bookings cannot be deleted from the admin interface. Deleting a paid booking
does not issue a refund or notify the customer.

# Admin locations

Location management uses the existing `role_admin` cinema and auditorium
permissions and the admin reservation permissions. It lists open and closed
locations. A theater's cinema cannot be changed after creation, and seat counts
cannot change while the theater has reservations. Location deletion removes
associated screenings and bookings without issuing refunds or notifications;
it is blocked if a pending-payment booking exists.

# Admin user management

For an existing database, apply `migrations/20261127_admin_users.sql` as a
database administrator before deploying the user-management update. It grants
the admin role user-management permissions; existing admin-reservation booking
permissions are also required. Fresh databases receive the grants in `init.sql`.

Admin-created registered accounts have no usable password until a future email
verification and password-setup flow is implemented. The database stores the
marker `!pending-password-setup`, not a password; login rejects that marker.
Employee and admin passwords are generated and displayed once after creation;
securely pass them to the account holder. Password changes are not implemented
yet. Deleting a user can cascade-delete reservations, and does not refund paid
bookings or notify customers. Deletion is blocked for pending-payment bookings
and for the admin's own account.

Configure these backend environment variables in Rahti:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `PUBLIC_URL` (the public frontend origin)
- `FRONTEND_ORIGIN` (the same public frontend origin)
- `APP_AUTH_PASS`, `APP_REGISTERED_PASS`, and the existing database connection variables

Register the Stripe webhook at
`https://<frontend-origin>/api/stripe/webhook` for Checkout events
`checkout.session.completed`, `checkout.session.expired`,
`checkout.session.async_payment_succeeded`, and
`checkout.session.async_payment_failed`.

The frontend should leave `VITE_API_URL` unset when using its same-origin
Nginx API proxy. Nginx continues to listen on port 8080; the `/api/` proxy
removes that prefix before forwarding to the backend routes.