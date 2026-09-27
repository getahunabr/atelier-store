// DB-free order types for UI code. src/db/queries/orders.ts maps rows to these; components never
// see database shapes. (The schema imports ShippingAddress from here.)

export type OrderStatus = "pending_payment" | "processing" | "paid" | "payment_failed" | "expired" | "needs_review";

/**
 * A shipping address as collected by Stripe Checkout, for any supported country. Only the first
 * line and the country (ISO 3166-1 alpha-2, e.g. "ET") are always present; postal code, state and
 * city depend on the country's address format.
 */
export type ShippingAddress = {
  name?: string;
  line1: string;
  line2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country: string;
};

export type OrderLine = {
  id: number;
  slug: string;
  name: string;
  size: string;
  imageSrc: string | null;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
};

export type OrderView = {
  /** Unguessable id used in URLs. */
  publicId: string;
  /** Short customer-facing reference, e.g. "F1872C68". */
  reference: string;
  status: OrderStatus;
  createdAt: Date;
  paidAt: Date | null;
  subtotalCents: number;
  totalCents: number;
  amountPaidCents: number | null;
  email: string | null;
  shippingAddress: ShippingAddress | null;
  items: OrderLine[];
};

export type OrderListItem = Pick<OrderView, "publicId" | "reference" | "status" | "createdAt" | "totalCents"> & {
  itemCount: number;
  /** Up to three item images for the row's preview. */
  images: { src: string; alt: string }[];
  /** e.g. "Woven Leather Tote and 1 more". */
  summary: string;
};

export const orderReference = (publicId: string) => publicId.slice(0, 8).toUpperCase();

export const orderHref = (publicId: string) => `/account/orders/${publicId}`;
