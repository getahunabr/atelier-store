import { BrandStatement } from "@/components/home/brand-statement";
import { CollectionGrid } from "@/components/home/collection-grid";
import { EditorialSplit } from "@/components/home/editorial-split";
import { Hero } from "@/components/home/hero";
import { SectionHeading } from "@/components/home/section-heading";
import { ProductCard } from "@/components/product/product-card";
import { ProductRail } from "@/components/product/product-rail";
import {
  collections,
  craft,
  editorial,
  featuredSlugs,
  giftSlugs,
  hero,
  services,
} from "@/data/storefront";
import { getProductsBySlugs } from "@/db/queries/catalog";

// Rendered at build, then refreshed from the database at most every 5 minutes.
export const revalidate = 300;

export default async function HomePage() {
  const [featuredProducts, gifts, [lookProduct]] = await Promise.all([
    getProductsBySlugs(featuredSlugs),
    getProductsBySlugs(giftSlugs),
    getProductsBySlugs([editorial.productSlug]),
  ]);

  return (
    <>
      <Hero content={hero} />

      <section aria-labelledby="collections-title" className="section-y container-page">
        <SectionHeading
          id="collections-title"
          eyebrow="Collections"
          title="Shop by category"
          link={{ label: "View all", href: "/collections" }}
        />
        <div className="mt-8 md:mt-10">
          <CollectionGrid collections={collections} />
        </div>
      </section>

      <EditorialSplit id="editorial-title" content={editorial} product={lookProduct} />

      <section aria-labelledby="featured-title" className="section-y container-page">
        <SectionHeading
          id="featured-title"
          eyebrow="New in"
          title="The season's edit"
          link={{ label: "View all", href: "/new-in" }}
        />
        {/* Editorial grid: the first piece leads as a large tile (full width on mobile, 2×2 on desktop). */}
        <ul className="product-grid mt-8 md:mt-10">
          {featuredProducts.map((product, index) => (
            <li key={product.slug} className={index === 0 ? "col-span-2 lg:row-span-2" : undefined}>
              <ProductCard
                product={product}
                variant={index === 0 ? "feature" : "default"}
                sizes={index === 0 ? "(min-width: 64rem) 50vw, 100vw" : undefined}
              />
            </li>
          ))}
        </ul>
      </section>

      <BrandStatement id="craft-title" content={craft} />

      <section aria-labelledby="gifts-title" className="section-y border-t border-line">
        <ProductRail
          products={gifts}
          label="Gift ideas"
          heading={<SectionHeading id="gifts-title" eyebrow="Gifting" title="Small things, kept for years" />}
        />
      </section>

      {/* Same panel treatment as the account overview: hairline, eyebrow, short copy. */}
      <section aria-label="Client services" className="container-page pb-section">
        <ul className="grid gap-8 md:grid-cols-3">
          {services.map((service) => (
            <li key={service.title} className="border-t border-line pt-6">
              <h2 className="eyebrow">{service.title}</h2>
              <p className="mt-3 max-w-xs text-body-sm text-ink-muted">{service.body}</p>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
