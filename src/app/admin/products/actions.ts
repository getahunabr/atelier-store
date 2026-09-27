"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { addProductSize, createProduct, setStockQuantity, updateProductDetails } from "@/lib/admin-catalog";
import { withAdmin } from "@/lib/admin-guard";
import {
  parseNewProduct,
  parseNewSize,
  parseProductDetails,
  parseStockUpdate,
  type FieldErrors,
  type ProductField,
} from "@/lib/admin-product-input";

// Admin product actions. Every export starts with `return withAdmin(...)` (checked by
// `npm run check:admin`): the role is verified before any input is read. Arguments bound in the
// browser (the product slug) are validated like any other input.

export type ProductFormState = {
  status: "idle" | "saved" | "invalid" | "error" | "forbidden";
  errors?: FieldErrors<ProductField>;
  message?: string;
  at?: string;
};

export type StockFormState = {
  status: "idle" | "saved" | "conflict" | "invalid" | "error" | "forbidden";
  /** The current quantity after the attempt (the new value, or what someone else changed it to). */
  quantity?: number;
  message?: string;
  at?: string;
};

export type AddSizeState = { status: "idle" | "saved" | "invalid" | "error" | "forbidden"; message?: string; at?: string };

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const isSlug = (value: unknown): value is string => typeof value === "string" && value.length <= 100 && SLUG.test(value);
/** Actions can be called directly with any payload; only a real form gets past this. */
const isForm = (value: unknown): value is FormData => value instanceof FormData;

/** Publish a product change: its page, listings that show it, and the admin pages. */
function revalidateProduct(slug: string, categorySlugs: string[]) {
  revalidatePath(`/products/${slug}`);
  for (const category of new Set(categorySlugs)) revalidatePath(`/${category}`);
  revalidatePath("/");
  revalidatePath("/new-in");
  revalidatePath("/collections");
  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${slug}`);
  revalidatePath("/admin/stock");
}

export async function createProductAction(_prev: ProductFormState, form: FormData): Promise<ProductFormState> {
  return withAdmin(async () => {
    if (!isForm(form)) return { status: "error" as const, message: "Invalid request." };
    const parsed = parseNewProduct(form);
    if (!parsed.ok) return { status: "invalid" as const, errors: parsed.errors };
    const result = await createProduct(parsed.value);
    if (!result.ok) return { status: "invalid" as const, errors: result.errors, message: result.message };
    revalidateProduct(result.value.slug, [parsed.value.categorySlug]);
    redirect(`/admin/products/${result.value.slug}?created=1`);
  });
}

export async function updateProductAction(slug: string, _prev: ProductFormState, form: FormData): Promise<ProductFormState> {
  return withAdmin(async () => {
    if (!isSlug(slug) || !isForm(form)) return { status: "error" as const, message: "Unknown product." };
    const parsed = parseProductDetails(form);
    if (!parsed.ok) return { status: "invalid" as const, errors: parsed.errors };
    const result = await updateProductDetails(slug, parsed.value);
    if (!result.ok) return { status: result.message ? ("error" as const) : ("invalid" as const), errors: result.errors, message: result.message };
    revalidateProduct(slug, [result.value.previousCategorySlug, parsed.value.categorySlug]);
    return { status: "saved" as const, at: new Date().toISOString() };
  });
}

/**
 * Sets one size's available units — only if it still holds the value the admin saw (checkout
 * reserves and releases stock on the same number). A conflict changes nothing and returns the
 * current value so the admin can decide again.
 */
export async function updateStockAction(slug: string, _prev: StockFormState, form: FormData): Promise<StockFormState> {
  return withAdmin(async () => {
    if (!isSlug(slug) || !isForm(form)) return { status: "error" as const, message: "Unknown product." };
    const parsed = parseStockUpdate(form);
    if (!parsed.ok) {
      return parsed.errors.form
        ? { status: "error" as const, message: parsed.errors.form }
        : { status: "invalid" as const, message: parsed.errors.quantity };
    }
    const { stockId, expected, quantity } = parsed.value;
    const result = await setStockQuantity(slug, stockId, expected, quantity);
    if (result.status === "not_found") return { status: "error" as const, message: "This size no longer exists. Reload the page." };
    if (result.status === "conflict") {
      return {
        status: "conflict" as const,
        quantity: result.quantity,
        message: `Stock changed to ${result.quantity} since you loaded this page — a customer may have checked out. Nothing was saved.`,
      };
    }
    revalidateProduct(slug, []);
    return { status: "saved" as const, quantity: result.quantity, at: new Date().toISOString() };
  });
}

export async function addSizeAction(slug: string, _prev: AddSizeState, form: FormData): Promise<AddSizeState> {
  return withAdmin(async () => {
    if (!isSlug(slug) || !isForm(form)) return { status: "error" as const, message: "Unknown product." };
    const parsed = parseNewSize(form);
    if (!parsed.ok) return { status: "invalid" as const, message: parsed.errors.size };
    const result = await addProductSize(slug, parsed.value);
    if (!result.ok) return { status: result.message ? ("error" as const) : ("invalid" as const), message: result.message ?? result.errors.size };
    revalidateProduct(slug, []);
    return { status: "saved" as const, at: new Date().toISOString() };
  });
}
