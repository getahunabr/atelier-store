/**
 * A same-site path to send the user back to after signing in, or the fallback.
 * Rejects absolute URLs and protocol-relative/backslash tricks ("//evil.com", "/\\evil.com") so
 * `?next=` can't be used as an open redirect.
 */
export function safeRedirectPath(value: unknown, fallback = "/account") {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return fallback;
  }
  // Never bounce back to the auth pages themselves.
  if (value.startsWith("/account/sign-in") || value.startsWith("/account/register")) return fallback;
  return value;
}

export function signInPath(returnTo?: string) {
  const next = returnTo ? safeRedirectPath(returnTo, "") : "";
  return next ? `/account/sign-in?next=${encodeURIComponent(next)}` : "/account/sign-in";
}
