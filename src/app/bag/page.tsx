import type { Metadata } from "next";

import { BagView } from "@/components/cart/bag-view";
import { ListingHeader } from "@/components/catalog/listing-header";
import { getSession } from "@/lib/session";

const title = "Shopping bag";

export const metadata: Metadata = { title, robots: { index: false } };

export default async function BagPage({ searchParams }: PageProps<"/bag">) {
  // Set by /checkout/cancel when the customer returns from Stripe without paying.
  const { checkout } = await searchParams;
  // Only chooses the button (checkout vs. sign in first); the checkout API checks the session itself.
  const session = await getSession();
  return (
    <>
      <ListingHeader title={title} description="Prices and availability are confirmed when you check out." />
      <BagView canceled={checkout === "canceled"} signedIn={!!session} />
    </>
  );
}
