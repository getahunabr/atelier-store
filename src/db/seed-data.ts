// Seed content for the catalog tables, loaded by `npm run db:seed` (src/db/seed.ts).
// Array order becomes each row's sort_order: categories as listed, products in "Featured" order.

import { unsplash, unsplashDetail } from "@/data/images";
import { ONE_SIZE, type Img, type StockLevel } from "@/lib/catalog-types";

export type SeedCategory = { slug: string; name: string; description: string };

export type SeedProduct = {
  slug: string;
  name: string;
  /** USD, whole units. Stored as cents. */
  price: number;
  /** Category slug. */
  category: string;
  styleCode: string;
  releasedAt: string;
  tag?: string;
  description: string;
  details: string[];
  care: string[];
  images: Img[];
  /** Per-size stock, in display order. */
  variants: StockLevel[];
};

export const categories: SeedCategory[] = [
  {
    slug: "women",
    name: "Women",
    description: "Fluid silks, soft knits and easy dresses, cut to move and made to be worn for years.",
  },
  {
    slug: "men",
    name: "Men",
    description: "Leather outerwear, sharp tailoring and everyday essentials in considered fabrics.",
  },
  {
    slug: "handbags",
    name: "Handbags",
    description: "Structured and slouchy shapes in hand-finished leather, from day totes to evening bags.",
  },
  {
    slug: "shoes",
    name: "Shoes",
    description: "Hand-burnished leather shoes and statement heels, built on lasts refined over decades.",
  },
  {
    slug: "jewelry",
    name: "Jewelry",
    description: "Pearls, stones and fine chains, finished by hand in small batches.",
  },
  {
    slug: "accessories",
    name: "Accessories",
    description: "Watches and eyewear designed to be quietly worn every day.",
  },
];

const oneSize = (stock: number): StockLevel[] => [{ size: ONE_SIZE, stock }];

const sized = (stock: Record<string, number>): StockLevel[] =>
  Object.entries(stock).map(([size, units]) => ({ size, stock: units }));

export const products: SeedProduct[] = [
  {
    slug: "lambskin-biker-jacket",
    name: "Lambskin Biker Jacket",
    price: 2450,
    category: "men",
    styleCode: "AT-24017",
    releasedAt: "2026-09-02",
    tag: "New",
    description:
      "A close-cut biker in butter-soft lambskin with an asymmetric zip, notched lapels and quilted shoulders. Lined in cupro so it layers easily over knitwear.",
    details: ["100% lambskin leather", "Cupro lining", "Silver-tone hardware", "Two zip pockets", "Made in Italy"],
    care: ["Specialist leather clean only", "Store on a wide hanger", "Keep away from direct heat"],
    // Detail crop leads: the full flat-lay shot shows a third-party label in the collar.
    images: [
      unsplashDetail("1551028719-00167b16eac5", "Black lambskin biker jacket, zip and pocket detail", { x: 0.3, y: 0.78, zoom: 2 }),
      unsplash("1520975954732-35dd22299614", "Man wearing a black leather biker jacket against a brick wall"),
    ],
    variants: sized({ XS: 4, S: 2, M: 6, L: 0, XL: 1 }),
  },
  {
    slug: "woven-leather-tote",
    name: "Woven Leather Tote",
    price: 1890,
    category: "handbags",
    styleCode: "AT-31102",
    releasedAt: "2026-07-14",
    description:
      "A slouchy tote in wide bands of hand-woven calfskin, carried on a polished gold-tone chain. Unlined for a soft, relaxed shape that fits a laptop.",
    details: ["Hand-woven calfskin", "Gold-tone chain handle", "Detachable inner pouch", "W 40 × H 30 × D 12 cm", "Made in Italy"],
    care: ["Wipe with a soft dry cloth", "Stuff with tissue when not in use", "Store in the dust bag provided"],
    images: [
      unsplash("1598532163257-ae3c6b2524b6", "Tan woven leather tote with a gold chain handle"),
      unsplashDetail("1598532163257-ae3c6b2524b6", "Close-up of the woven leather and chain", { x: 0.4, y: 0.6, zoom: 2 }),
    ],
    variants: oneSize(8),
  },
  {
    slug: "tapered-silk-trousers",
    name: "Tapered Silk Trousers",
    price: 980,
    category: "women",
    styleCode: "AT-12045",
    releasedAt: "2026-06-20",
    description:
      "Fluid silk crepe trousers with a soft pleated waist and a tapered, cuffed ankle. Relaxed through the hip, clean at the hem.",
    details: ["100% silk crepe", "Elasticated back waist", "Side pockets", "Made in Italy"],
    care: ["Dry clean only", "Cool iron on reverse"],
    images: [
      unsplash("1594633312681-425c7b97ccd1", "Blush pink tapered trousers"),
      unsplashDetail("1594633312681-425c7b97ccd1", "Close-up of the pleated waist", { x: 0.5, y: 0.25, zoom: 2 }),
    ],
    variants: sized({ XS: 0, S: 3, M: 5, L: 2, XL: 0 }),
  },
  {
    slug: "double-monk-shoes",
    name: "Double Monk Shoes",
    price: 1150,
    category: "shoes",
    styleCode: "AT-45210",
    releasedAt: "2026-03-11",
    description:
      "Double monk straps in burnished calf, hand-finished to bring out depth in the leather. Blake-stitched leather sole for a slim, flexible profile.",
    details: ["Calfskin upper and lining", "Leather sole", "Brass buckles", "Made in Italy"],
    care: ["Use shoe trees between wears", "Polish with neutral cream", "Resole through our aftercare service"],
    images: [
      unsplash("1533867617858-e7b97e060509", "Brown leather double monk strap shoes"),
      unsplashDetail("1533867617858-e7b97e060509", "Close-up of the buckles", { x: 0.62, y: 0.42, zoom: 1.7 }),
    ],
    variants: sized({ "40": 0, "41": 2, "42": 5, "43": 4, "44": 1, "45": 0 }),
  },
  {
    slug: "technical-bomber",
    name: "Technical Bomber",
    price: 1620,
    category: "men",
    styleCode: "AT-24031",
    releasedAt: "2026-09-10",
    tag: "New",
    description:
      "A lightweight bomber in water-repellent technical twill, with rib-knit trims and a two-way zip. Packs down small for travel.",
    details: ["Recycled polyamide twill", "Water-repellent finish", "Rib-knit collar, cuffs and hem", "Made in Portugal"],
    care: ["Machine wash cold, delicate cycle", "Do not tumble dry"],
    images: [
      unsplash("1591047139829-d91aecb6caea", "Rust technical bomber jacket held on a hanger"),
      unsplashDetail("1591047139829-d91aecb6caea", "Close-up of the collar and zip", { x: 0.45, y: 0.35, zoom: 2.2 }),
    ],
    variants: sized({ S: 5, M: 7, L: 3, XL: 2 }),
  },
  {
    slug: "chevron-chain-bag",
    name: "Chevron Chain Bag",
    price: 1340,
    category: "handbags",
    styleCode: "AT-31118",
    releasedAt: "2026-05-04",
    description:
      "A compact shoulder bag in smooth calfskin with a painted chevron panel and a slim chain strap that can be doubled for a shorter drop.",
    details: ["Calfskin leather", "Magnetic flap closure", "Removable chain strap", "W 22 × H 14 × D 6 cm", "Made in Italy"],
    care: ["Wipe with a soft dry cloth", "Store in the dust bag provided"],
    images: [
      unsplash("1566150905458-1bf1fc113f0d", "Pink leather shoulder bag with chevron detail"),
      unsplashDetail("1566150905458-1bf1fc113f0d", "Close-up of the chevron panel", { x: 0.35, y: 0.38, zoom: 2.2 }),
    ],
    variants: oneSize(1),
  },
  {
    slug: "fringed-knit-poncho",
    name: "Fringed Knit Poncho",
    price: 860,
    category: "women",
    styleCode: "AT-12077",
    releasedAt: "2026-04-18",
    description:
      "An open-knit poncho in undyed cotton and linen, finished with a hand-knotted fringe. Light enough for summer evenings, easy over a coat in autumn.",
    details: ["60% cotton, 40% linen", "Hand-knotted fringe", "Made in Italy"],
    care: ["Hand wash cold", "Dry flat"],
    images: [
      unsplash("1434389677669-e08b4cac3105", "Cream knitted poncho with fringe on a hanger"),
      unsplashDetail("1434389677669-e08b4cac3105", "Close-up of the knit and fringe", { x: 0.5, y: 0.72, zoom: 2 }),
    ],
    variants: oneSize(12),
  },
  {
    slug: "floral-stiletto-pumps",
    name: "Floral Stiletto Pumps",
    price: 890,
    category: "shoes",
    styleCode: "AT-45233",
    releasedAt: "2026-02-27",
    description:
      "Pointed pumps in a painterly floral jacquard on a slender 100mm heel. Leather-lined with a cushioned insole.",
    details: ["Silk-blend jacquard upper", "Leather lining and sole", "100mm heel", "Made in Italy"],
    care: ["Brush gently to remove dust", "Store in the dust bags provided"],
    // Cropped: the full frame shows a third-party logo on the upper shoe's insole.
    images: [
      unsplashDetail("1543163521-1bf539c55dd2", "Floral print stiletto pump on a pale blue set", { x: 0.4, y: 0.72, zoom: 1.5 }),
      unsplashDetail("1543163521-1bf539c55dd2", "Close-up of the floral jacquard", { x: 0.5, y: 0.55, zoom: 1.8 }),
    ],
    variants: sized({ "36": 0, "37": 0, "38": 0, "39": 0, "40": 0 }),
  },
  {
    slug: "pendant-chain-necklace",
    name: "Pendant Chain Necklace",
    price: 720,
    category: "jewelry",
    styleCode: "AT-52006",
    releasedAt: "2026-08-05",
    description:
      "A fine gold-plated chain with a faceted teal stone and a crescent charm. Adjustable length so it sits at the collarbone or lower.",
    details: ["18k gold-plated sterling silver", "Faceted glass stone", "Adjustable 40–45 cm", "Made in Italy"],
    care: ["Avoid contact with water and perfume", "Store in the pouch provided"],
    images: [
      unsplash("1599643478518-a784e5dc4c8f", "Gold chain necklace with a teal stone pendant"),
      unsplashDetail("1599643478518-a784e5dc4c8f", "Close-up of the pendant", { x: 0.5, y: 0.35, zoom: 2 }),
    ],
    variants: oneSize(6),
  },
  {
    slug: "minimal-leather-watch",
    name: "Minimal Leather Watch",
    price: 1280,
    category: "accessories",
    styleCode: "AT-61014",
    releasedAt: "2026-01-15",
    description:
      "A slim 36mm case with a sunray white dial and a soft taupe calfskin strap. Swiss quartz movement, sapphire crystal.",
    details: ["Stainless steel case, 36mm", "Sapphire crystal", "Swiss quartz movement", "Calfskin strap", "Water-resistant to 30m"],
    care: ["Keep the strap dry", "Battery service every 2–3 years"],
    images: [
      unsplash("1524592094714-0f0654e20314", "Watch with a white dial and taupe leather strap"),
      unsplashDetail("1524592094714-0f0654e20314", "Close-up of the watch dial", { x: 0.55, y: 0.42, zoom: 2 }),
    ],
    variants: oneSize(9),
  },
  {
    slug: "round-metal-sunglasses",
    name: "Round Metal Sunglasses",
    price: 460,
    category: "accessories",
    styleCode: "AT-61027",
    releasedAt: "2026-05-30",
    description: "Round sunglasses with a fine gold-tone metal frame and bottle-green lenses offering full UV protection.",
    details: ["Metal frame", "Category 3 lenses, 100% UV protection", "Lens width 49mm", "Made in Italy"],
    care: ["Clean with the microfibre cloth provided", "Store in the case when not worn"],
    images: [
      unsplash("1511499767150-a48a237f0083", "Round gold-frame sunglasses on white"),
      unsplashDetail("1511499767150-a48a237f0083", "Close-up of the frame hinge", { x: 0.55, y: 0.5, zoom: 2 }),
    ],
    variants: oneSize(14),
  },
  {
    slug: "freshwater-pearl-strand",
    name: "Freshwater Pearl Strand",
    price: 940,
    category: "jewelry",
    styleCode: "AT-52019",
    releasedAt: "2026-07-01",
    description: "Hand-knotted freshwater pearls with a silver box clasp. Each strand is matched by eye, so no two are identical.",
    details: ["Freshwater pearls, 7–8mm", "Sterling silver clasp", "Length 45 cm", "Hand-knotted on silk"],
    care: ["Put on after perfume and make-up", "Wipe with a soft cloth after wearing", "Store flat"],
    images: [
      unsplash("1515562141207-7a88fb7ce338", "Pearl necklace in an open jewelry box"),
      unsplashDetail("1515562141207-7a88fb7ce338", "Close-up of the pearls", { x: 0.55, y: 0.6, zoom: 2 }),
    ],
    variants: oneSize(2),
  },
  {
    slug: "cap-toe-derby",
    name: "Cap-Toe Derby",
    price: 990,
    category: "shoes",
    styleCode: "AT-45247",
    releasedAt: "2026-02-09",
    description: "A cap-toe derby in hand-burnished calf with open lacing for an easy fit. Goodyear-welted so it can be resoled for years.",
    details: ["Calfskin upper", "Goodyear-welted leather sole", "Made in Spain"],
    care: ["Use shoe trees between wears", "Polish with neutral cream"],
    images: [
      unsplash("1614252235316-8c857d38b5f4", "Close-up of brown leather derby shoes"),
      unsplashDetail("1614252235316-8c857d38b5f4", "Detail of the broguing", { x: 0.5, y: 0.5, zoom: 1.6 }),
    ],
    variants: sized({ "40": 3, "41": 6, "42": 0, "43": 5, "44": 2, "45": 4 }),
  },
  {
    slug: "cotton-jersey-tee",
    name: "Cotton Jersey Tee",
    price: 390,
    category: "men",
    styleCode: "AT-24052",
    releasedAt: "2026-08-21",
    description: "A heavyweight tee in long-staple cotton jersey with a close crew neck. Garment-washed for a soft hand from the first wear.",
    details: ["100% long-staple cotton", "Regular fit", "Made in Portugal"],
    care: ["Machine wash at 30°C", "Dry flat"],
    images: [
      unsplash("1521572163474-6864f9cf17ab", "Man wearing a plain white cotton t-shirt"),
      unsplashDetail("1521572163474-6864f9cf17ab", "Close-up of the crew neck", { x: 0.5, y: 0.3, zoom: 1.8 }),
    ],
    variants: sized({ XS: 8, S: 12, M: 15, L: 10, XL: 6 }),
  },
  {
    slug: "wool-two-piece-suit",
    name: "Wool Two-Piece Suit",
    price: 3200,
    category: "men",
    styleCode: "AT-24060",
    releasedAt: "2026-09-18",
    tag: "New",
    description:
      "A single-breasted suit in midnight Super 120s wool with a soft, half-canvassed shoulder and flat-front trousers. Sized in EU jacket sizes.",
    details: ["100% Super 120s wool", "Half-canvassed construction", "Horn buttons", "Made in Italy"],
    care: ["Dry clean only", "Rest between wears on a shaped hanger"],
    images: [
      unsplash("1507679799987-c73779587ccf", "Man buttoning a navy suit jacket over a striped tie"),
      unsplashDetail("1507679799987-c73779587ccf", "Close-up of the lapel and buttons", { x: 0.5, y: 0.45, zoom: 1.8 }),
    ],
    variants: sized({ "46": 2, "48": 4, "50": 0, "52": 3, "54": 1 }),
  },
  {
    slug: "leather-moto-jacket",
    name: "Leather Moto Jacket",
    price: 2150,
    category: "men",
    styleCode: "AT-24066",
    releasedAt: "2026-04-02",
    description:
      "A cognac moto jacket in vegetable-tanned lambskin with an off-centre zip and epaulettes. Waxed finish that darkens beautifully with wear.",
    details: ["100% lambskin leather", "Viscose lining", "Antique brass zips", "Made in Italy"],
    care: ["Specialist leather clean only", "Condition twice a year"],
    // Cropped below the face: the full frame shows a third-party mark on the sunglasses.
    images: [
      unsplashDetail("1487222477894-8943e31ef7b2", "Man wearing a cognac leather moto jacket", { x: 0.55, y: 0.72, zoom: 1.5 }),
      unsplashDetail("1487222477894-8943e31ef7b2", "Close-up of the jacket's zips", { x: 0.62, y: 0.78, zoom: 2.4 }),
    ],
    variants: sized({ S: 0, M: 0, L: 2, XL: 1 }),
  },
  {
    slug: "floral-wrap-dress",
    name: "Floral Wrap Dress",
    price: 1350,
    category: "women",
    styleCode: "AT-12090",
    releasedAt: "2026-08-12",
    description:
      "A maxi wrap dress in printed silk crepe de chine with flutter sleeves and a tie waist. The skirt opens to a deep split as you walk.",
    details: ["100% silk crepe de chine", "Self-tie waist", "Unlined", "Made in Italy"],
    care: ["Dry clean only", "Cool iron on reverse"],
    images: [
      unsplash("1496747611176-843222e1e57c", "Woman in a cream floral wrap dress by the sea"),
      unsplashDetail("1496747611176-843222e1e57c", "Close-up of the floral print", { x: 0.3, y: 0.45, zoom: 2 }),
    ],
    variants: sized({ XS: 3, S: 6, M: 4, L: 0 }),
  },
  {
    slug: "pebbled-leather-satchel",
    name: "Pebbled Leather Satchel",
    price: 1150,
    category: "handbags",
    styleCode: "AT-31130",
    releasedAt: "2026-06-03",
    description:
      "A compact satchel in dove-grey pebbled calfskin with twin buckle straps, a top handle and a detachable shoulder strap.",
    details: ["Pebbled calfskin", "Gold-tone buckles", "Detachable strap", "W 24 × H 18 × D 8 cm", "Made in Italy"],
    care: ["Wipe with a soft dry cloth", "Store in the dust bag provided"],
    images: [
      unsplash("1605733513597-a8f8341084e6", "Dove-grey pebbled leather satchel with buckle straps"),
      unsplashDetail("1605733513597-a8f8341084e6", "Close-up of the buckle", { x: 0.3, y: 0.62, zoom: 2.2 }),
    ],
    variants: oneSize(7),
  },
  {
    slug: "top-handle-flap-bag",
    name: "Top-Handle Flap Bag",
    price: 1480,
    category: "handbags",
    styleCode: "AT-31141",
    releasedAt: "2026-08-28",
    tag: "New",
    description:
      "A neat flap bag in deep teal grained leather with a rolled top handle and a gold-tone push-lock. Small enough for evening, sturdy enough for every day.",
    details: ["Grained calfskin", "Push-lock closure", "Rolled leather handle", "W 23 × H 17 × D 9 cm", "Made in Italy"],
    care: ["Wipe with a soft dry cloth", "Store in the dust bag provided"],
    images: [
      unsplash("1594223274512-ad4803739b7c", "Teal leather top-handle bag beside reading glasses and a plant"),
      unsplashDetail("1594223274512-ad4803739b7c", "Close-up of the push-lock", { x: 0.6, y: 0.66, zoom: 2.2 }),
    ],
    variants: oneSize(3),
  },
  {
    slug: "crystal-drop-earrings",
    name: "Crystal Drop Earrings",
    price: 580,
    category: "jewelry",
    styleCode: "AT-52031",
    releasedAt: "2026-09-06",
    description:
      "Statement drop earrings set with baguette crystals around a sapphire-blue pear stone. Lightweight enough for an evening of wear.",
    details: ["Rhodium-plated brass", "Glass crystals", "Post fastening", "Drop 6 cm"],
    care: ["Avoid contact with water and perfume", "Store in the pouch provided"],
    images: [
      unsplash("1535632066927-ab7c9ab60908", "Sapphire and crystal drop earrings resting on a green leaf"),
      unsplashDetail("1535632066927-ab7c9ab60908", "Close-up of the pear-cut stone", { x: 0.6, y: 0.4, zoom: 2.2 }),
    ],
    variants: oneSize(4),
  },
];
