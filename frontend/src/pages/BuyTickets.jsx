export default function BuyTickets({
  screening,
  ticketPrice,
  seatCount,
  canCheckout,
  email,
  onEmailChange,
  onCheckout,
  isCheckingOut,
  error,
}) {
  const unitPrice = Number(ticketPrice);
  const totalPrice = unitPrice * seatCount;
  const validPrice = Number.isFinite(totalPrice) && totalPrice > 0;
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  return (
    <div className="ticket-summary__purchase">
      <label className="ticket-purchase__email">
        Email for your tickets
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => onEmailChange(event.target.value)}
        />
      </label>
      <p className="ticket-purchase__total">
        {seatCount > 0 && validPrice
          ? `Total: ${new Intl.NumberFormat(undefined, { style: 'currency', currency: 'EUR' }).format(totalPrice)}`
          : 'Select seats to see the total.'}
      </p>
      <button
        className="ticket-summary__continue"
        type="button"
        disabled={!canCheckout || !screening || seatCount === 0 || !validEmail || !validPrice || isCheckingOut}
        onClick={onCheckout}
      >
        {isCheckingOut ? 'Opening checkout...' : 'Continue to payment'}
      </button>
      {error && <p className="ticket-purchase__error" role="alert">{error}</p>}
    </div>
  );
}
