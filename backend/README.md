# Backend organization

- `app.js` starts the server and mounts the routers.
- `routes/admin/adminRouter.js` applies authentication and admin-role checks
  before mounting the admin feature routers. Admin routers must be mounted
  through this parent rather than directly in the application.
- `models/admin/` contains admin-specific database operations; other models
  remain in `models/`.
- `routes/user/userRouter.js` mounts public user routes before authentication
  and registered-user routes after authentication and role checks. Their
  corresponding models are separated under `models/user/`.
- `routes/auth/authRoutes.js` groups the login, registration, logout, and
  authenticated account endpoints under `/auth`.
- Payment and unfinished employee routes and models have their own subfolders
  within their respective layers.
- `controllers/auth/` contains the login and registration route handlers.
- `config/database.js` provides database pools, and `middleware/` contains
  shared request authentication and origin checks.
- `helpers/` groups reusable logic by domain. Sharing a helper does not grant
  access to an endpoint or replace authorization checks.
- `helpers/validation/` contains shared username and email validation;
  callers retain their own error responses and authorization checks.
- `helpers/database/transaction.js` manages transaction lifecycle for admin
  locations, reservations, and screenings. Callers explicitly choose the pool;
  the helper does not grant access or replace authorization checks.
- `tests/` contains backend tests. Run them with `npm test` from this folder.

The employee routes and model are unfinished and are not mounted by `app.js`.
Account management for all roles uses the admin users routes.
