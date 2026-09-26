import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CatalogView } from "@/components/catalog/catalog-view";
import { ProductCard } from "@/components/product/product-card";
import { categories, isCategoryKey, products } from "@/data/products";
import { applyFilters, parseFilters, sizeOptions } from "@/lib/catalog-filters";

// Only known categories resolve; anything else at the top level (e.g. /bag) is a 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(categories).map((category) => ({ category }));
}

export async function generateMetadata({ params }: PageProps<"/[category]">): Promise<Metadata> {
  const { category: key } = await params;
  if (!isCategoryKey(key)) return {};
  const category = categories[key];
  return { title: category.name, description: category.description };
}

export default async function CategoryPage({ params, searchParams }: PageProps<"/[category]">) {
  const { category: key } = await params;
  if (!isCategoryKey(key)) notFound();

  const category = categories[key];
  const inCategory = products.filter((product) => product.category === key);
  const sizes = sizeOptions(inCategory);
  const filters = parseFilters(await searchParams, sizes);
  const results = applyFilters(inCategory, filters);

  return (
    <>
      <header className="container-page pt-4 pb-8 md:pt-6 md:pb-12">
        <nav aria-label="Breadcrumb">
          <ol className="flex items-center gap-2 text-caption tracking-label text-ink-muted uppercase">
            <li>
              <Link href="/" className="link-reveal">
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-ink">
              {category.name}
            </li>
          </ol>
        </nav>
        <h1 className="mt-8 font-serif text-display md:mt-12">{category.name}</h1>
        <p className="mt-4 max-w-xl text-ink-muted">{category.description}</p>
      </header>

      <CatalogView basePath={category.href} filters={filters} sizes={sizes} resultCount={results.length}>
        <div className="container-page pt-8 pb-section md:pt-10">
          {results.length > 0 ? (
            <ul className="product-grid">
              {results.map((product) => (
                <li key={product.slug}>
                  <ProductCard product={product} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="mx-auto max-w-md py-section text-center">
              <h2 className="font-serif text-title">No pieces match these filters</h2>
              <p className="mt-3 text-body-sm text-ink-muted">
                Try a different size or price, or clear the filters to see everything in {category.name}.
              </p>
              <Link href={category.href} scroll={false} className="btn btn-secondary mt-8">
                Clear filters
              </Link>
            </div>
          )}
        </div>
      </CatalogView>
    </>
  );
}
