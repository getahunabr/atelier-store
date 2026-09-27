import Image from "next/image";
import Link from "next/link";

import { ONE_SIZE } from "@/lib/catalog-types";
import { formatPrice } from "@/lib/format";
import type { OrderView } from "@/lib/order-types";

const money = (cents: number) => formatPrice(cents / 100);

/** An order's items (as snapshotted at checkout) with subtotal, delivery and total. */
export function OrderItems({ order }: { order: OrderView }) {
  const count = order.items.reduce((sum, item) => sum + item.quantity, 0);
  return (
    <section aria-labelledby="order-items-title">
      <h2 id="order-items-title" className="eyebrow pt-8">
        {count === 1 ? "1 item" : `${count} items`}
      </h2>
      <ul className="mt-2 divide-y divide-line">
        {order.items.map((item) => (
          <li key={item.id} className="flex gap-4 py-6 md:gap-6">
            <div className="media-frame aspect-product w-20 shrink-0 md:w-24">
              {item.imageSrc && <Image src={item.imageSrc} alt="" fill sizes="96px" />}
            </div>
            <div className="flex min-w-0 flex-1 items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="text-body-sm">
                  <Link href={`/products/${item.slug}`} className="link-reveal">
                    {item.name}
                  </Link>
                </h3>
                <p className="mt-1 text-body-sm text-ink-muted">
                  {item.size === ONE_SIZE ? ONE_SIZE : `Size ${item.size}`} · Qty {item.quantity}
                </p>
                {item.quantity > 1 && <p className="mt-1 text-caption text-ink-muted">{money(item.unitPriceCents)} each</p>}
              </div>
              <p className="shrink-0 text-body-sm">{money(item.lineTotalCents)}</p>
            </div>
          </li>
        ))}
      </ul>
      <dl className="space-y-3 border-t border-line pt-6 text-body-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-ink-muted">Subtotal</dt>
          <dd>{money(order.subtotalCents)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-ink-muted">Delivery</dt>
          <dd>Complimentary</dd>
        </div>
        <div className="flex justify-between gap-4 border-t border-line pt-6">
          <dt className="eyebrow">Total</dt>
          <dd className="text-title" data-testid="order-total">
            {money(order.totalCents)}
          </dd>
        </div>
      </dl>
    </section>
  );
}
