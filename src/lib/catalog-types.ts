// Catalog domain types shared by server and client code. Must never import the database.

export type Img = { src: string; alt: string };

/** Size label used for products sold in a single size (bags, jewelry, ...). */
export const ONE_SIZE = "One size";

/** Units available in one size. */
export type StockLevel = { size: string; stock: number };

export type Category = {
  slug: string;
  name: string;
  href: string;
  description: string;
};

export type Product = {
  slug: string;
  name: string;
  /** Major currency units (USD). Stored as cents in the database. */
  price: number;
  category: Category;
  styleCode: string;
  /** ISO date the product went on sale; drives "Newest" sorting. */
  releasedAt: string;
  tag?: string;
  description: string;
  details: string[];
  care: string[];
  images: Img[];
  /** Per-size stock, in display order. */
  stock: StockLevel[];
};
