# We need to have multiple accounts in the database for separate permissions:
Admins account only for highest required actions: adding, deleting, modifying movies and screenings.
Employees account secure required actions: adding, deleting, modifying reservations
Registered account required actions: reading user data (preferably only own), changing own user data, view own reservations.
Public account required actions: view screenings, cinemas, seats... etc.

Authentication user: password lookup, corfirming users' data, payment confirmation, OTP auth... etc.

# Some ranks above can access same properties and modify ranks' below.
# All ranks should only have access to only their required permissions.