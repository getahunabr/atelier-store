import type { Metadata } from "next";

import { CatalogView } from "@/components/catalog/catalog-view";
import { ListingHeader } from "@/components/catalog/listing-header";
import { ListingResults } from "@/components/catalog/listing-results";
import { listNewArrivals } from "@/db/queries/catalog";
import { applyFilters, parseFilters, sizeOptions } from "@/lib/catalog-filters";

/** How many of the latest releases the page shows. */
const NEW_ARRIVALS_LIMIT = 12;

const title = "New In";
const description = "The latest arrivals across the house, newest first — just landed from the atelier.";

export const metadata: Metadata = { title, description };

// Same listing pattern as the category pages. Products arrive newest first, so the default
// ("Featured") order on this page is release order; filters and other sorts apply on top.
export default async function NewInPage({ searchParams }: PageProps<"/new-in">) {
  const latest = await listNewArrivals(NEW_ARRIVALS_LIMIT);
  const sizes = sizeOptions(latest);
  const filters = parseFilters(await searchParams, sizes);
  const results = applyFilters(latest, filters);

  return (
    <>
      <ListingHeader title={title} description={description} />
      <CatalogView basePath="/new-in" filters={filters} sizes={sizes} resultCount={results.length}>
        <ListingResults products={results} clearHref="/new-in" scopeName={title} />
      </CatalogView>
    </>
  );
}
