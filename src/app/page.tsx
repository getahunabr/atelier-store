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
  featuredProducts,
  gifts,
  hero,
  services,
} from "@/data/storefront";

export default function HomePage() {
  return (
    <>
      <Hero content={hero} />

      <section aria-labelledby="collections-title" className="section-y container-page">
        <SectionHeading id="collections-title" eyebrow="Collections" title="Shop by category" />
        <div className="mt-8 md:mt-10">
          <CollectionGrid collections={collections} />
        </div>
      </section>

      <EditorialSplit id="editorial-title" content={editorial} />

      <section aria-labelledby="featured-title" className="section-y container-page">
        <SectionHeading
          id="featured-title"
          eyebrow="New in"
          title="The season's edit"
          link={{ label: "View all", href: "/new-in" }}
        />
        <ul className="product-grid mt-8 md:mt-10">
          {featuredProducts.map((product) => (
            <li key={product.slug}>
              <ProductCard product={product} />
            </li>
          ))}
        </ul>
      </section>

      <EditorialSplit id="craft-title" content={craft} reverse tone="canvas" />

      <section aria-labelledby="gifts-title" className="section-y border-t border-line">
        <ProductRail
          products={gifts}
          label="Gift ideas"
          heading={<SectionHeading id="gifts-title" eyebrow="Gifting" title="Small things, kept for years" />}
        />
      </section>

      <section aria-label="Client services" className="border-t border-line">
        <ul className="container-page grid divide-y divide-line md:grid-cols-3 md:divide-x md:divide-y-0">
          {services.map((service) => (
            <li key={service.title} className="py-8 text-center md:px-8 md:py-14">
              <h2 className="eyebrow">{service.title}</h2>
              <p className="mx-auto mt-3 max-w-xs text-body-sm text-ink-muted">{service.body}</p>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
