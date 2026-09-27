import { CartInputError, parseCartLines, quoteCart } from "@/lib/cart-quote";

// POST /api/cart/quote  { lines: [{ slug, size, quantity }] }
// → current prices, stock-limited quantities, line totals and subtotal (integer cents), all from the
// database. The bag itself lives in the browser; this is the only place its prices are decided.
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  try {
    const quote = await quoteCart(parseCartLines(body));
    return Response.json(quote, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof CartInputError) return Response.json({ error: error.message }, { status: 400 });
    throw error;
  }
}
