const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function formatPrice(amount: number) {
  return currency.format(amount);
}

const monthYear = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" });

/** "September 2026" — when a customer's account was created. */
export function memberSince(date: Date | string) {
  return monthYear.format(new Date(date));
}

const longDate = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" });

/** "September 27, 2026" — order and payment dates. */
export function formatDate(date: Date | string) {
  return longDate.format(new Date(date));
}
