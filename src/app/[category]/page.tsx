import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CatalogView } from "@/components/catalog/catalog-view";
import { ListingHeader } from "@/components/catalog/listing-header";
import { ListingResults } from "@/components/catalog/listing-results";
import { getCategory, listProductsByCategory } from "@/db/queries/catalog";
import { applyFilters, parseFilters, sizeOptions } from "@/lib/catalog-filters";

// Rendered per request (filters come from searchParams), so stock is always live. Only slugs in
// the categories table resolve; anything else at the top level (e.g. /bag) is a 404.

export async function generateMetadata({ params }: PageProps<"/[category]">): Promise<Metadata> {
  const category = await getCategory((await params).category);
  if (!category) return {};
  return { title: category.name, description: category.description };
}

export default async function CategoryPage({ params, searchParams }: PageProps<"/[category]">) {
  const category = await getCategory((await params).category);
  if (!category) notFound();

  const inCategory = await listProductsByCategory(category.slug);
  const sizes = sizeOptions(inCategory);
  const filters = parseFilters(await searchParams, sizes);
  const results = applyFilters(inCategory, filters);

  return (
    <>
      <ListingHeader title={category.name} description={category.description} />
      <CatalogView basePath={category.href} filters={filters} sizes={sizes} resultCount={results.length}>
        <ListingResults products={results} clearHref={category.href} scopeName={category.name} />
      </CatalogView>
    </>
  );
}
