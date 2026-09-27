"use client";

import Image from "next/image";
import { useActionState, useEffect, useId, useRef, useState, type ReactNode } from "react";

import type { ProductFormState } from "@/app/admin/products/actions";
import { Spinner } from "@/components/ui/spinner";
import type { ProductField } from "@/lib/admin-product-input";

export type ProductFormValues = {
  name: string;
  slug: string;
  category: string;
  price: string;
  styleCode: string;
  releasedAt: string;
  tag: string;
  description: string;
  details: string;
  care: string;
  images: { src: string; alt: string }[];
  /** Create mode only; stock is managed separately once a product exists. */
  sizes: { size: string; quantity: string }[];
};

type Props = {
  mode: "create" | "edit";
  initial: ProductFormValues;
  categories: { slug: string; name: string }[];
  action: (state: ProductFormState, form: FormData) => Promise<ProductFormState>;
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);

const timeFormat = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });
const textareaClass = "field min-h-28 py-3 leading-relaxed";

/**
 * Create / edit a product. Inputs are controlled so a failed submit keeps what the admin typed
 * (React resets uncontrolled fields after a form action). All validation that matters happens in
 * the server action; errors come back per field and the first one is focused.
 */
export function ProductForm({ mode, initial, categories, action }: Props) {
  const [state, formAction, pending] = useActionState(action, { status: "idle" } as ProductFormState);
  const [values, setValues] = useState(initial);
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const formRef = useRef<HTMLFormElement>(null);
  const id = useId();
  const errors = state.errors ?? {};

  const set = <K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) => setValues((v) => ({ ...v, [key]: value }));

  useEffect(() => {
    if (state.status !== "invalid") return;
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [state]);

  const err = (field: ProductField) => errors[field] ?? null;
  const fieldId = (field: string) => `${id}-${field}`;

  return (
    <form ref={formRef} action={formAction} noValidate className="mt-10 max-w-3xl">
      <fieldset disabled={pending} className="space-y-10">
        <Section title="Basics">
          <Field id={fieldId("name")} label="Name" error={err("name")}>
            {(props) => (
              <input
                {...props}
                name="name"
                value={values.name}
                maxLength={120}
                onChange={(e) => {
                  set("name", e.target.value);
                  if (!slugTouched) set("slug", slugify(e.target.value));
                }}
                className="field"
              />
            )}
          </Field>
          {mode === "create" ? (
            <Field id={fieldId("slug")} label="URL slug" error={err("slug")} hint="Used in the product's address, /products/…. It can't be changed later.">
              {(props) => (
                <input
                  {...props}
                  name="slug"
                  value={values.slug}
                  maxLength={100}
                  onChange={(e) => {
                    setSlugTouched(true);
                    set("slug", e.target.value.toLowerCase());
                  }}
                  className="field"
                />
              )}
            </Field>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="eyebrow text-ink-muted">URL</p>
              <p className="text-body-sm">/products/{values.slug}</p>
            </div>
          )}
          <div className="grid gap-6 sm:grid-cols-2">
            <Field id={fieldId("category")} label="Category" error={err("category")}>
              {(props) => (
                <select {...props} name="category" value={values.category} onChange={(e) => set("category", e.target.value)} className="field">
                  <option value="">Choose a category</option>
                  {categories.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <Field id={fieldId("price")} label="Price (USD)" error={err("price")} hint="Whole dollars. Existing orders keep the price they were placed at.">
              {(props) => (
                <div className="relative">
                  <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-body-sm text-ink-muted">
                    $
                  </span>
                  <input {...props} name="price" inputMode="decimal" value={values.price} onChange={(e) => set("price", e.target.value)} className="field pl-8" />
                </div>
              )}
            </Field>
            <Field id={fieldId("styleCode")} label="Style code" error={err("styleCode")}>
              {(props) => (
                <input {...props} name="styleCode" value={values.styleCode} maxLength={30} onChange={(e) => set("styleCode", e.target.value.toUpperCase())} className="field" />
              )}
            </Field>
            <Field id={fieldId("releasedAt")} label="Release date" error={err("releasedAt")} hint="Drives “Newest” sorting and New In.">
              {(props) => <input {...props} type="date" name="releasedAt" value={values.releasedAt} onChange={(e) => set("releasedAt", e.target.value)} className="field" />}
            </Field>
            <Field id={fieldId("tag")} label="Tag (optional)" error={err("tag")} hint="Shown on the product card, e.g. New.">
              {(props) => <input {...props} name="tag" value={values.tag} maxLength={24} onChange={(e) => set("tag", e.target.value)} className="field" />}
            </Field>
          </div>
        </Section>

        <Section title="Description">
          <Field id={fieldId("description")} label="Description" error={err("description")}>
            {(props) => <textarea {...props} name="description" rows={4} value={values.description} maxLength={2000} onChange={(e) => set("description", e.target.value)} className={textareaClass} />}
          </Field>
          <div className="grid gap-6 sm:grid-cols-2">
            <Field id={fieldId("details")} label="Details" error={err("details")} hint="One per line.">
              {(props) => <textarea {...props} name="details" rows={5} value={values.details} onChange={(e) => set("details", e.target.value)} className={textareaClass} />}
            </Field>
            <Field id={fieldId("care")} label="Care" error={err("care")} hint="One per line.">
              {(props) => <textarea {...props} name="care" rows={5} value={values.care} onChange={(e) => set("care", e.target.value)} className={textareaClass} />}
            </Field>
          </div>
        </Section>

        <Section title="Images" error={err("images")} errorId={fieldId("images-error")}>
          <p className="text-caption text-ink-muted">The first image is the card and listing image. Use https:// URLs.</p>
          <ol className="space-y-4">
            {values.images.map((image, i) => (
              <li key={i} className="grid grid-cols-[3rem_minmax(0,1fr)] gap-4 border-b border-line pb-4 sm:grid-cols-[3rem_minmax(0,1fr)_auto]">
                <div className="media-frame aspect-product w-12">
                  {/^https:\/\/\S+$/.test(image.src) && <Image src={image.src} alt="" fill sizes="48px" />}
                </div>
                <div className="grid gap-3">
                  <label className="sr-only" htmlFor={fieldId(`img-src-${i}`)}>
                    Image {i + 1} URL
                  </label>
                  <input
                    id={fieldId(`img-src-${i}`)}
                    name="imageSrc"
                    placeholder="https://images.unsplash.com/photo-…"
                    value={image.src}
                    aria-invalid={!!err("images")}
                    aria-describedby={err("images") ? fieldId("images-error") : undefined}
                    onChange={(e) => set("images", values.images.map((img, j) => (j === i ? { ...img, src: e.target.value } : img)))}
                    className="field"
                  />
                  <label className="sr-only" htmlFor={fieldId(`img-alt-${i}`)}>
                    Image {i + 1} description
                  </label>
                  <input
                    id={fieldId(`img-alt-${i}`)}
                    name="imageAlt"
                    placeholder="Describe the image"
                    value={image.alt}
                    maxLength={200}
                    onChange={(e) => set("images", values.images.map((img, j) => (j === i ? { ...img, alt: e.target.value } : img)))}
                    className="field"
                  />
                </div>
                <div className="col-span-2 flex gap-4 sm:col-span-1 sm:flex-col sm:items-end">
                  <button
                    type="button"
                    disabled={i === 0}
                    onClick={() => set("images", [values.images[i], ...values.images.filter((_, j) => j !== i)])}
                    className="eyebrow link-reveal disabled:text-ink-subtle"
                  >
                    Make first
                  </button>
                  <button
                    type="button"
                    disabled={values.images.length === 1}
                    onClick={() => set("images", values.images.filter((_, j) => j !== i))}
                    aria-label={`Remove image ${i + 1}`}
                    className="eyebrow link-reveal disabled:text-ink-subtle"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ol>
          {values.images.length < 8 && (
            <button type="button" onClick={() => set("images", [...values.images, { src: "", alt: "" }])} className="btn btn-secondary btn-sm">
              Add image
            </button>
          )}
        </Section>

        {mode === "create" && (
          <Section title="Sizes and stock" error={err("sizes")} errorId={fieldId("sizes-error")}>
            <p className="text-caption text-ink-muted">Use “One size” for bags and jewelry. Stock can be changed any time after creating the product.</p>
            <ul className="space-y-3">
              {values.sizes.map((row, i) => (
                <li key={i} className="grid grid-cols-[minmax(0,1fr)_7rem_auto] items-center gap-3">
                  <label className="sr-only" htmlFor={fieldId(`size-${i}`)}>
                    Size {i + 1}
                  </label>
                  <input
                    id={fieldId(`size-${i}`)}
                    name="size"
                    placeholder="Size, e.g. M or 42"
                    value={row.size}
                    maxLength={40}
                    aria-invalid={!!err("sizes")}
                    aria-describedby={err("sizes") ? fieldId("sizes-error") : undefined}
                    onChange={(e) => set("sizes", values.sizes.map((s, j) => (j === i ? { ...s, size: e.target.value } : s)))}
                    className="field"
                  />
                  <label className="sr-only" htmlFor={fieldId(`qty-${i}`)}>
                    Units in stock for size {i + 1}
                  </label>
                  <input
                    id={fieldId(`qty-${i}`)}
                    name="quantity"
                    inputMode="numeric"
                    value={row.quantity}
                    onChange={(e) => set("sizes", values.sizes.map((s, j) => (j === i ? { ...s, quantity: e.target.value } : s)))}
                    className="field"
                  />
                  <button
                    type="button"
                    disabled={values.sizes.length === 1}
                    onClick={() => set("sizes", values.sizes.filter((_, j) => j !== i))}
                    aria-label={`Remove size ${i + 1}`}
                    className="eyebrow link-reveal disabled:text-ink-subtle"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" onClick={() => set("sizes", [...values.sizes, { size: "", quantity: "0" }])} className="btn btn-secondary btn-sm">
              Add size
            </button>
          </Section>
        )}
      </fieldset>

      <div className="sticky bottom-0 mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-line bg-canvas py-4">
        <button type="submit" disabled={pending} aria-busy={pending} className={`btn btn-primary ${pending ? "disabled:opacity-100" : ""}`}>
          {pending && <Spinner />}
          {mode === "create" ? (pending ? "Creating…" : "Create product") : pending ? "Saving…" : "Save changes"}
        </button>
        <p aria-live="polite" className="text-body-sm">
          {state.status === "saved" && state.at && <span className="text-success">Saved at {timeFormat.format(new Date(state.at))}. The store is updated.</span>}
          {state.status === "invalid" && <span className="text-critical">{state.message ?? "Check the highlighted fields."}</span>}
          {state.status === "error" && <span className="text-critical">{state.message ?? "Something went wrong. Try again."}</span>}
          {state.status === "forbidden" && <span className="text-critical">You don&apos;t have permission to do that.</span>}
        </p>
      </div>
    </form>
  );
}

function Section({ title, children, error, errorId }: { title: string; children: ReactNode; error?: string | null; errorId?: string }) {
  return (
    <section className="space-y-6 border-t border-line pt-6">
      <h2 className="eyebrow">{title}</h2>
      {error && (
        <p id={errorId} className="text-caption text-critical">
          {error}
        </p>
      )}
      {children}
    </section>
  );
}

type ControlProps = { id: string; "aria-invalid": boolean; "aria-describedby"?: string };

function Field({ id, label, error, hint, children }: { id: string; label: string; error: string | null; hint?: string; children: (props: ControlProps) => ReactNode }) {
  const described = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="eyebrow text-ink-muted">
        {label}
      </label>
      {children({ id, "aria-invalid": error !== null, "aria-describedby": described })}
      {hint && (
        <p id={`${id}-hint`} className="text-caption text-ink-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-caption text-critical">
          {error}
        </p>
      )}
    </div>
  );
}
