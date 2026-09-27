import { CartInputError, parseCartLines } from "@/lib/cart-quote";
import { startCheckout } from "@/lib/checkout";
import { getSession } from "@/lib/session";
import { signInPath } from "@/lib/safe-redirect";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

// POST /api/checkout  { lines: [{ slug, size, quantity }] }
// Signed-in customers only. Revalidates the bag against the database, reserves stock, creates the
// order and returns the Stripe Checkout URL. Prices never come from the request.
//   200 { status: "redirect", url }            → send the browser to Stripe
//   409 { status: "changed" | "sold_out", quote } → the bag no longer matches stock; show the quote
//   401 { signIn }  403  400
//   503 { error, code, detail? }  checkout can't start (code: stripe_not_configured | stripe_error | server_error)
//
// Failures are always logged server-side with the real cause. Outside production the response also
// carries it as `detail`, which the bag prints to the browser console and under its message, so a
// misconfiguration isn't hidden behind the customer-facing text.

const noStore = { "Cache-Control": "no-store" };
const exposeDetail = process.env.NODE_ENV !== "production";

function unavailable(code: "stripe_not_configured" | "stripe_error" | "server_error", detail: string) {
  return Response.json(
    { error: "Checkout is unavailable right now.", code, ...(exposeDetail ? { detail } : {}) },
    { status: 503, headers: noStore },
  );
}

export async function POST(request: Request) {
  // Same-origin only: this starts a stock reservation with the customer's cookies.
  const origin = new URL(request.url).origin;
  if (request.headers.get("origin") !== origin) {
    return Response.json({ error: "Forbidden." }, { status: 403, headers: noStore });
  }

  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Sign in to check out.", signIn: signInPath("/bag") }, { status: 401, headers: noStore });
  }

  let lines;
  try {
    lines = parseCartLines(await request.json());
  } catch (error) {
    if (error instanceof CartInputError || error instanceof SyntaxError) {
      return Response.json({ error: error instanceof CartInputError ? error.message : "Expected a JSON body." }, { status: 400, headers: noStore });
    }
    throw error;
  }

  // Before reserving anything.
  if (!isStripeConfigured()) {
    const detail =
      "STRIPE_SECRET_KEY is not set, so checkout is disabled. Add a restricted test key (rk_test_…) to .env.local and restart the server.";
    console.error(`[checkout] ${detail}`);
    return unavailable("stripe_not_configured", detail);
  }

  try {
    const result = await startCheckout(
      { userId: session.user.id, email: session.user.email, lines, origin },
      getStripe(),
    );
    switch (result.status) {
      case "redirect":
        return Response.json({ status: "redirect", url: result.url }, { headers: noStore });
      case "changed":
      case "sold_out":
        return Response.json(result, { status: 409, headers: noStore });
      case "unavailable":
        // Already logged by startCheckout (stock was returned).
        return unavailable("stripe_error", result.reason);
    }
  } catch (error) {
    // Anything unexpected (database, network): log the whole error, stack and cause included.
    console.error("[checkout] unexpected failure starting checkout:", error);
    const { message, cause } = error as { message?: string; cause?: { message?: string } };
    return unavailable("server_error", `${message ?? String(error)}${cause?.message ? ` (cause: ${cause.message})` : ""}`);
  }
}
