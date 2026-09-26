import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SectionHeading } from "@/components/home/section-heading";
import { ProductAccordion } from "@/components/product/product-accordion";
import { ProductGallery } from "@/components/product/product-gallery";
import { ProductRail } from "@/components/product/product-rail";
import { PurchasePanel } from "@/components/product/purchase-panel";
import { categories, getProduct, getRelatedProducts, products } from "@/data/products";
import { services } from "@/data/storefront";
import { formatPrice } from "@/lib/format";

export function generateStaticParams() {
  return products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: PageProps<"/products/[slug]">): Promise<Metadata> {
  const product = getProduct((await params).slug);
  if (!product) return {};
  return {
    title: product.name,
    description: product.description,
    openGraph: { images: [{ url: product.images[0].src, alt: product.images[0].alt }] },
  };
}

export default async function ProductPage({ params }: PageProps<"/products/[slug]">) {
  const product = getProduct((await params).slug);
  if (!product) notFound();

  const category = categories[product.category];
  const related = getRelatedProducts(product);

  return (
    <>
      <nav aria-label="Breadcrumb" className="container-page py-4 md:py-6">
        <ol className="flex flex-wrap items-center gap-2 text-caption tracking-label text-ink-muted uppercase">
          <li>
            <Link href="/" className="link-reveal">
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href={category.href} className="link-reveal">
              {category.name}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-ink">
            {product.name}
          </li>
        </ol>
      </nav>

      <article className="lg:container-page lg:grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-start lg:gap-x-12 xl:gap-x-20">
        <ProductGallery images={product.images} name={product.name} />

        <div className="container-page pt-8 pb-section lg:sticky lg:top-[calc(var(--header-height)+2rem)] lg:px-0 lg:pt-0 lg:pb-0">
          <div className="max-w-md">
            <Link href={category.href} className="eyebrow link-reveal text-ink-muted">
              {category.name}
            </Link>
            <h1 className="mt-3 font-serif text-heading">{product.name}</h1>
            <p className="mt-3 text-title">{formatPrice(product.price)}</p>
            <p className="mt-1 text-caption text-ink-subtle">Style {product.styleCode}</p>

            <p className="mt-6 text-ink-muted">{product.description}</p>

            <div className="mt-8">
              <PurchasePanel variants={product.variants} />
            </div>

            <div className="mt-10">
              <ProductAccordion
                sections={[
                  {
                    title: "Details",
                    content: (
                      <ul className="list-disc space-y-1 pl-4">
                        {product.details.map((detail) => (
                          <li key={detail}>{detail}</li>
                        ))}
                      </ul>
                    ),
                  },
                  {
                    title: "Care",
                    content: (
                      <ul className="list-disc space-y-1 pl-4">
                        {product.care.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    ),
                  },
                  {
                    title: "Delivery & returns",
                    content: (
                      <ul className="space-y-3">
                        {services.map((service) => (
                          <li key={service.title}>
                            <span className="text-ink">{service.title}.</span> {service.body}
                          </li>
                        ))}
                      </ul>
                    ),
                  },
                ]}
              />
            </div>
          </div>
        </div>
      </article>

      <section aria-labelledby="related-title" className="section-y mt-section border-t border-line max-lg:mt-0">
        <ProductRail
          products={related}
          label="Related products"
          heading={<SectionHeading id="related-title" eyebrow={category.name} title="You may also like" />}
        />
      </section>
    </>
  );
}
