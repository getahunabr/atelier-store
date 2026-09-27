"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { StockStatus } from "@/components/product/stock-status";
import { Spinner } from "@/components/ui/spinner";
import {
  beginCheckout,
  reduceToStock,
  removeFromCart,
  requestQuote,
  setCartQuantity,
  useCart,
  useCartAdjustments,
  type CartLine,
  type CheckoutResult,
} from "@/lib/cart";
import type { CartQuote, QuoteLine } from "@/lib/cart-types";
import { ONE_SIZE } from "@/lib/catalog-types";
import { formatPrice } from "@/lib/format";
import { signInPath } from "@/lib/safe-redirect";

const money = (cents: number) => formatPrice(cents / 100);

// The bag stores only slugs, sizes and quantities. Every price, stock limit and total shown here
// comes from the server quote (POST /api/cart/quote), refreshed whenever the bag changes.
function useCartQuote(lines: CartLine[]) {
  const key = useMemo(() => JSON.stringify(lines), [lines]);
  const [quote, setQuote] = useState<CartQuote | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const current: CartLine[] = JSON.parse(key);
    if (current.length === 0) return;
    const controller = new AbortController();
    requestQuote(current, controller.signal)
      .then((next) => {
        setQuote(next);
        setStatus("ready");
      })
      .catch((error: Error) => {
        if (error.name !== "AbortError") setStatus("failed");
      });
    return () => controller.abort();
  }, [key, attempt]);

  const inSync = quote !== null && JSON.stringify(quote.lines.map((l) => [l.slug, l.size, l.requestedQuantity])) === JSON.stringify(lines.map((l) => [l.slug, l.size, l.quantity]));
  const retry = () => {
    setStatus(quote ? "ready" : "loading");
    setAttempt((n) => n + 1);
  };
  return { quote, status, updating: status === "ready" && !inSync, retry };
}

type Removed = { lines: CartLine[]; label: string };

/** Shown after returning from Stripe without paying: the bag is intact and the hold released. */
function CanceledNotice({ empty }: { empty: boolean }) {
  // Show it once: drop ?checkout=canceled so a reload or shared link doesn't repeat it.
  useEffect(() => {
    window.history.replaceState(window.history.state, "", "/bag");
  }, []);
  return (
    <p role="status" className="mt-6 border-l-2 border-ink/40 bg-surface px-4 py-3 text-body-sm">
      Checkout was canceled and you haven&apos;t been charged.{" "}
      {empty ? "Your bag is now empty." : "Your bag is just as you left it — check out whenever you're ready."}
    </p>
  );
}

export function BagView({ canceled = false, signedIn }: { canceled?: boolean; signedIn: boolean }) {
  const lines = useCart();
  const { quote, status, updating, retry } = useCartQuote(lines);
  // Lines lowered to match stock stay explained until the customer changes them.
  const adjustments = useCartAdjustments();
  // Last removal, so it can be undone (re-adding goes back through the server quote).
  const [removed, setRemoved] = useState<Removed | null>(null);

  const remove = (toRemove: CartLine[], label: string) => {
    for (const line of toRemove) removeFromCart(line.slug, line.size);
    setRemoved({ lines: toRemove, label });
  };
  const undo = () => {
    if (!removed) return;
    for (const line of removed.lines) setCartQuantity(line.slug, line.size, line.quantity);
    setRemoved(null);
  };

  // Persist the server's stock limits: if fewer are in stock than the bag holds, lower the bag.
  useEffect(() => {
    if (!quote || updating) return;
    for (const line of quote.lines) {
      if (line.status === "reduced") reduceToStock(line.slug, line.size, line.quantity);
    }
  }, [quote, updating]);

  const removedNotice = removed && (
    <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-body-sm">
      Removed {removed.label}.
      <button type="button" onClick={undo} className="eyebrow link-reveal">
        Undo
      </button>
    </p>
  );

  if (lines.length === 0) {
    return (
      <div className="container-page border-t border-line pb-section">
        {canceled && <CanceledNotice empty />}
        <div aria-live="polite" className="pt-6 empty:hidden">
          {removedNotice}
        </div>
        <div className="mx-auto max-w-md py-section text-center">
          <h2 className="font-serif text-title">Your bag is empty</h2>
          <p className="mt-3 text-body-sm text-ink-muted">Pieces you add will be kept here while you browse.</p>
          <div className="mt-8 flex flex-col items-center gap-5 sm:flex-row sm:justify-center sm:gap-8">
            <Link href="/new-in" className="btn btn-primary">
              Shop new arrivals
            </Link>
            <Link href="/collections" className="eyebrow link-reveal">
              Explore all categories
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const byKey = new Map(quote?.lines.map((line) => [`${line.slug}\u0000${line.size}`, line]));
  // Lines that can't be bought right now (only judged against an up-to-date quote).
  const blocked = updating ? [] : (quote?.lines ?? []).filter((l) => l.status === "sold_out" || l.status === "unavailable");
  const needsAttention = blocked.length > 0;
  const blockedLines = blocked.map((q) => lines.find((l) => l.slug === q.slug && l.size === q.size)).filter((l): l is CartLine => !!l);

  return (
    <div className="container-page border-t border-line pb-section lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-start lg:gap-x-16">
      <section aria-labelledby="bag-items-title">
        <h2 id="bag-items-title" className="sr-only">
          Items in your bag
        </h2>
        {canceled && <CanceledNotice empty={false} />}
        {status === "failed" && (
          <div role="alert" className="mt-6 flex flex-wrap items-center justify-between gap-3 border-l-2 border-critical bg-critical/5 px-4 py-3 text-body-sm">
            <span>We couldn&apos;t load the latest prices and stock. Check your connection.</span>
            <button type="button" onClick={retry} className="eyebrow link-reveal">
              Try again
            </button>
          </div>
        )}
        {needsAttention && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-l-2 border-ink/40 bg-surface px-4 py-3 text-body-sm">
            <span>
              {blocked.length === 1 ? "1 item" : `${blocked.length} items`} in your bag can&apos;t be bought right now.
            </span>
            <button
              type="button"
              onClick={() => remove(blockedLines, blocked.length === 1 ? "1 unavailable item" : `${blocked.length} unavailable items`)}
              className="eyebrow link-reveal"
            >
              {blocked.length === 1 ? "Remove it" : "Remove them"}
            </button>
          </div>
        )}
        <div aria-live="polite" className="mt-6 empty:hidden">
          {removedNotice}
        </div>
        <ul className="divide-y divide-line">
          {lines.map((line) => (
            <BagLine
              key={`${line.slug}:${line.size}`}
              line={line}
              quoted={byKey.get(`${line.slug}\u0000${line.size}`)}
              reduced={adjustments[`${line.slug}\u0000${line.size}`] !== undefined}
              loading={!quote && status !== "failed"}
              onRemove={(label) => remove([line], label)}
              onQuantity={(next) => {
                setRemoved(null);
                setCartQuantity(line.slug, line.size, next);
              }}
            />
          ))}
        </ul>
      </section>

      <aside
        aria-labelledby="bag-summary-title"
        aria-busy={updating || status === "loading"}
        className="mt-2 border-t border-line pt-8 lg:sticky lg:top-[calc(var(--header-height)+2rem)] lg:mt-8 lg:border lg:p-8"
      >
        <h2 id="bag-summary-title" className="eyebrow">
          Order summary
        </h2>
        <div className={`transition-opacity duration-300 ${updating ? "opacity-50" : ""}`}>
          <dl className="mt-6 space-y-3 text-body-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">
                Subtotal{quote ? ` (${quote.itemCount} ${quote.itemCount === 1 ? "item" : "items"})` : ""}
              </dt>
              <dd data-testid="subtotal">{quote ? money(quote.subtotalCents) : "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">Delivery</dt>
              <dd>Complimentary</dd>
            </div>
          </dl>
          <div className="mt-6 flex justify-between gap-4 border-t border-line pt-6">
            <span className="eyebrow">Total</span>
            <span className="text-title" data-testid="total">
              {quote ? money(quote.subtotalCents) : "—"}
            </span>
          </div>
        </div>
        {needsAttention && (
          <p className="mt-4 text-caption text-ink-muted">Items that are sold out or no longer available aren&apos;t included.</p>
        )}
        <CheckoutButton
          lines={lines}
          signedIn={signedIn}
          ready={status === "ready" && !updating && !needsAttention}
          blocked={needsAttention}
          onChanged={retry}
        />
        <Link href="/new-in" className="eyebrow link-reveal mt-6 inline-block">
          Continue shopping
        </Link>
      </aside>
    </div>
  );
}

type CheckoutProblem = "changed" | "network" | "unavailable";

/**
 * The summary's checkout action. The server re-prices the bag, reserves stock and hands back
 * Stripe's hosted checkout page; if stock moved in the meantime the bag re-quotes and explains.
 * Signed-out customers sign in first and come straight back here.
 */
function CheckoutButton({
  lines,
  signedIn,
  ready,
  blocked,
  onChanged,
}: {
  lines: CartLine[];
  signedIn: boolean;
  /** Up-to-date quote with nothing blocking. */
  ready: boolean;
  /** Some lines are sold out or unavailable. */
  blocked: boolean;
  onChanged: () => void;
}) {
  const [state, setState] = useState<"idle" | "submitting" | "redirecting">("idle");
  const [problem, setProblem] = useState<CheckoutProblem | null>(null);
  // The server's real reason for an "unavailable" response — only present outside production.
  const [detail, setDetail] = useState<string | null>(null);

  // Coming back with the browser's back button can restore this page from cache mid-redirect.
  useEffect(() => {
    const onShow = (event: PageTransitionEvent) => {
      if (event.persisted) setState("idle");
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  const checkout = async () => {
    setState("submitting");
    setProblem(null);
    setDetail(null);
    let result: CheckoutResult | "network";
    try {
      result = await beginCheckout(lines);
    } catch {
      result = "network";
    }
    if (result !== "network" && (result.outcome === "redirect" || result.outcome === "sign-in")) {
      setState("redirecting");
      window.location.assign(result.url);
      return;
    }
    setState("idle");
    setProblem(result === "network" ? "network" : result.outcome);
    if (result !== "network" && result.outcome === "unavailable") setDetail(result.detail ?? null);
    if (result !== "network" && result.outcome === "changed") onChanged();
  };

  const busy = state !== "idle";
  const label = state === "redirecting" ? "Redirecting to secure checkout…" : state === "submitting" ? "Reserving your pieces…" : "Checkout";

  return (
    <div className="mt-8">
      {signedIn ? (
        <button
          type="button"
          onClick={checkout}
          disabled={!ready || busy}
          aria-busy={busy}
          // Busy isn't unavailable: keep full strength while reserving/redirecting.
          className={`btn btn-primary w-full ${busy ? "disabled:opacity-100" : ""}`}
        >
          {busy && <Spinner />}
          {label}
        </button>
      ) : (
        <Link href={signInPath("/bag")} aria-disabled={!ready} tabIndex={ready ? undefined : -1} className="btn btn-primary w-full">
          Sign in to checkout
        </Link>
      )}

      <div aria-live="polite" className="empty:hidden">
        {problem === "changed" && (
          <p className="mt-4 border-l-2 border-ink/40 bg-surface px-4 py-3 text-body-sm">
            Something in your bag changed while you were checking out. We&apos;ve updated it — please review and try again.
          </p>
        )}
        {(problem === "network" || problem === "unavailable") && (
          <div role="alert" className="mt-4 border-l-2 border-critical bg-critical/5 px-4 py-3 text-body-sm">
            <p>
              {problem === "network"
                ? "We couldn't reach the store. Check your connection and try again."
                : "Checkout isn't available right now. Your bag is saved — please try again in a few minutes."}
            </p>
            {detail && (
              <p className="mt-2 font-mono text-caption break-words text-ink-muted" data-testid="checkout-debug">
                Development only: {detail}
              </p>
            )}
            <button type="button" onClick={checkout} className="eyebrow link-reveal mt-2">
              Try again
            </button>
          </div>
        )}
      </div>

      <p className="mt-4 text-caption text-ink-muted">
        {blocked
          ? "Remove the items that can't be bought to continue."
          : signedIn
            ? "You'll pay securely with Stripe. Your pieces are held for 30 minutes while you do."
            : "You'll come straight back to your bag after signing in."}
      </p>
    </div>
  );
}

function BagLine({
  line,
  quoted,
  loading,
  reduced,
  onRemove,
  onQuantity,
}: {
  line: CartLine;
  quoted?: QuoteLine;
  loading: boolean;
  reduced: boolean;
  /** Receives a short description of what was removed, for the undo notice. */
  onRemove: (label: string) => void;
  onQuantity: (quantity: number) => void;
}) {
  if (loading || !quoted) {
    // Waiting for the first quote, or for a line that was just added to be quoted.
    return (
      <li className="flex gap-4 py-6 md:gap-6" aria-busy="true">
        <div className="media-frame aspect-product w-24 shrink-0 animate-pulse md:w-32" />
        <div className="flex-1 space-y-3 pt-1">
          <div className="h-4 w-2/3 animate-pulse bg-surface" />
          <div className="h-4 w-1/3 animate-pulse bg-surface" />
        </div>
      </li>
    );
  }

  if (!quoted.product || quoted.status === "unavailable") {
    const name = quoted.product ? `${quoted.product.name}, size ${line.size}` : "This piece";
    return (
      <li className="flex items-center justify-between gap-4 py-6" data-slug={line.slug} data-size={line.size}>
        <p className="text-body-sm text-ink-muted">{name} is no longer available.</p>
        <button
          type="button"
          onClick={() => onRemove(quoted.product?.name ?? "an unavailable item")}
          aria-label={`Remove ${quoted.product?.name ?? "unavailable item"}`}
          className="eyebrow link-reveal"
        >
          Remove
        </button>
      </li>
    );
  }

  const { product } = quoted;
  const soldOut = quoted.status === "sold_out";
  const quantity = Math.min(line.quantity, quoted.available);
  // The quote lags the bag briefly after a change; show the old total dimmed until it catches up.
  const repricing = quoted.requestedQuantity !== line.quantity && quoted.status !== "reduced";
  const atStockLimit = !soldOut && quantity >= quoted.available;
  const showReducedNote = (reduced || quoted.status === "reduced") && !soldOut;

  return (
    <li className="flex gap-4 py-6 md:gap-6" data-slug={line.slug} data-size={line.size}>
      <Link href={product.href} className="w-24 shrink-0 md:w-32" tabIndex={-1} aria-hidden="true">
        <div className="media-frame aspect-product">
          <Image src={product.image.src} alt="" fill sizes="128px" className={soldOut ? "opacity-60" : undefined} />
        </div>
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-body-sm">
              <Link href={product.href} className="link-reveal">
                {product.name}
              </Link>
            </h3>
            <p className="mt-1 text-body-sm text-ink-muted">
              {line.size === ONE_SIZE ? ONE_SIZE : `Size ${line.size}`}
              {quantity > 1 && ` · ${money(quoted.unitPriceCents)} each`}
            </p>
          </div>
          <p
            className={`shrink-0 text-body-sm transition-opacity duration-300 ${repricing ? "opacity-40" : ""}`}
            aria-busy={repricing}
            data-testid="line-total"
          >
            {soldOut ? (
              <span className="text-ink-muted line-through">{money(quoted.unitPriceCents)}</span>
            ) : (
              money(quoted.lineTotalCents)
            )}
          </p>
        </div>

        <StockStatus units={quoted.available} />
        {showReducedNote && (
          <p className="text-caption text-ink-muted">
            Only {quoted.available} available — we&apos;ve updated the quantity.
          </p>
        )}

        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          {soldOut ? (
            <p className="text-body-sm text-ink-muted">This size has sold out.</p>
          ) : (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <QuantityStepper label={product.name} value={quantity} max={quoted.available} onChange={onQuantity} />
              {atStockLimit && !showReducedNote && (
                <span className="text-caption text-ink-muted">That&apos;s all we have in stock.</span>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={() => onRemove(product.name)}
            aria-label={`Remove ${product.name}`}
            className="eyebrow link-reveal"
          >
            Remove
          </button>
        </div>
      </div>
    </li>
  );
}

function QuantityStepper({
  label,
  value,
  max,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const buttonClass =
    "inline-flex size-10 items-center justify-center text-body transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:text-ink-subtle disabled:hover:bg-transparent";
  return (
    <div className="inline-flex items-center border border-line" role="group" aria-label={`Quantity of ${label}`}>
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        disabled={value <= 1}
        className={buttonClass}
        aria-label={`Decrease quantity of ${label}`}
      >
        −
      </button>
      <span className="min-w-8 text-center text-body-sm" aria-live="polite" aria-atomic="true">
        <span className="sr-only">Quantity </span>
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        className={buttonClass}
        aria-label={value >= max ? `Increase quantity of ${label} (maximum in stock)` : `Increase quantity of ${label}`}
      >
        +
      </button>
    </div>
  );
}
