// Home page content. Curated products are listed by slug and loaded from the database.

import type { Img } from "@/lib/catalog-types";

import { unsplash } from "./images";

export type NavItem = { label: string; href: string };

export type Collection = { name: string; href: string; image: Img };

export const navigation: NavItem[] = [
  { label: "Women", href: "/women" },
  { label: "Men", href: "/men" },
  { label: "Handbags", href: "/handbags" },
  { label: "Shoes", href: "/shoes" },
  { label: "Jewelry", href: "/jewelry" },
];

export const hero = {
  eyebrow: "Autumn–Winter 2026",
  title: "Quiet Structure",
  body: "Tailored wool, soft shoulders and a palette drawn from the city at dusk.",
  primary: { label: "Shop the collection", href: "/collections/autumn-winter-2026" },
  secondary: { label: "Discover the story", href: "/stories/quiet-structure" },
  image: unsplash("1485968579580-b6d095142e6e", "Woman in a tartan wool coat walking along a city street"),
};

export const collections: Collection[] = [
  {
    name: "Women",
    href: "/women",
    image: unsplash("1539109136881-3be0616acf4b", "Woman in a pale blue coat in a cathedral square"),
  },
  {
    name: "Men",
    href: "/men",
    image: unsplash("1617137968427-85924c800a22", "Man in a navy suit walking past glass architecture"),
  },
  {
    name: "Handbags",
    href: "/handbags",
    image: unsplash("1594223274512-ad4803739b7c", "Teal leather top-handle bag beside reading glasses and a plant"),
  },
  {
    name: "Jewelry",
    href: "/jewelry",
    image: unsplash("1535632066927-ab7c9ab60908", "Sapphire drop earrings resting on a green leaf"),
  },
];

export const editorial = {
  eyebrow: "The Leather Edit",
  title: "Worn in, never worn out",
  body: "Supple lambskin jackets cut close to the body, finished by hand and made to soften with every season.",
  cta: { label: "Explore leather", href: "/collections/leather" },
  image: unsplash("1520975954732-35dd22299614", "Man in a black leather jacket crouching against a brick wall"),
};

export const featuredSlugs = [
  "lambskin-biker-jacket",
  "woven-leather-tote",
  "tapered-silk-trousers",
  "double-monk-shoes",
  "technical-bomber",
  "chevron-chain-bag",
  "fringed-knit-poncho",
  "floral-stiletto-pumps",
];

export const craft = {
  eyebrow: "The Atelier",
  title: "Made slowly, by hand",
  body: "Every piece begins in our workshop, where knitwear is finished by hand and tailoring is shaped over days rather than hours. Fewer pieces, made to last.",
  cta: { label: "Our craft", href: "/the-atelier" },
  image: unsplash("1558769132-cb1aea458c5e", "Neutral knitwear hanging on a rail beside dried grasses"),
};

export const giftSlugs = [
  "pendant-chain-necklace",
  "minimal-leather-watch",
  "round-metal-sunglasses",
  "freshwater-pearl-strand",
  "cap-toe-derby",
  "cotton-jersey-tee",
];

export const services = [
  {
    title: "Complimentary delivery",
    body: "Free express shipping on every order, wrapped in our signature box.",
  },
  {
    title: "Returns within 30 days",
    body: "Changed your mind? Send it back free of charge.",
  },
  {
    title: "Book an appointment",
    body: "Shop in person or by video with a personal advisor.",
  },
];

export const footerColumns: { title: string; links: NavItem[] }[] = [
  {
    title: "Client Services",
    links: [
      { label: "Contact us", href: "/help/contact" },
      { label: "Shipping", href: "/help/shipping" },
      { label: "Returns", href: "/help/returns" },
      { label: "FAQ", href: "/help" },
    ],
  },
  {
    title: "The House",
    links: [
      { label: "Our craft", href: "/the-atelier" },
      { label: "Stories", href: "/stories" },
      { label: "Careers", href: "/careers" },
      { label: "Store locator", href: "/stores" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy policy", href: "/legal/privacy" },
      { label: "Terms of sale", href: "/legal/terms" },
      { label: "Cookie settings", href: "/legal/cookies" },
    ],
  },
];
