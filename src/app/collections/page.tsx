import type { Metadata } from "next";

import { ListingHeader } from "@/components/catalog/listing-header";
import { CollectionGrid } from "@/components/home/collection-grid";
import { listCategorySummaries } from "@/db/queries/catalog";

const title = "Collections";
const description = "Every category in the house, from tailoring and leather to jewelry and accessories.";

export const metadata: Metadata = { title, description };

// Built from the categories table; refreshed like the home page.
export const revalidate = 300;

export default async function CollectionsPage() {
  const summaries = await listCategorySummaries();

  return (
    <>
      <ListingHeader title={title} description={description} />
      <section aria-labelledby="all-categories" className="container-page border-t border-line pt-8 pb-section md:pt-10">
        <h2 id="all-categories" className="sr-only">
          All categories
        </h2>
        <CollectionGrid
          columns={3}
          collections={summaries.map((category) => ({
            name: category.name,
            href: category.href,
            image: category.image,
            meta: `${category.productCount} ${category.productCount === 1 ? "piece" : "pieces"}`,
          }))}
        />
      </section>
    </>
  );
}
