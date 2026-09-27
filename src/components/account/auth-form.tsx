"use client";

import Link from "next/link";
import { useId, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode, type Ref } from "react";

import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";

type Mode = "sign-in" | "register";
type FieldName = "name" | "email" | "password";
type Values = Record<FieldName, string>;
type Status = "idle" | "submitting" | "redirecting";

// Keep in step with emailAndPassword in src/lib/auth.ts (Better Auth's default maximum is 128).
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 128;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(field: FieldName, values: Values, mode: Mode): string | null {
  const value = values[field];
  switch (field) {
    case "name":
      if (mode !== "register") return null;
      if (!value.trim()) return "Enter your name.";
      if (value.trim().length > 100) return "Use 100 characters or fewer.";
      return null;
    case "email":
      if (!value.trim()) return "Enter your email address.";
      if (!EMAIL.test(value.trim())) return "Enter an email address like name@example.com.";
      return null;
    case "password":
      if (!value) return mode === "sign-in" ? "Enter your password." : "Create a password.";
      if (mode === "register" && value.length < PASSWORD_MIN) return `Use at least ${PASSWORD_MIN} characters.`;
      if (value.length > PASSWORD_MAX) return `Use ${PASSWORD_MAX} characters or fewer.`;
      return null;
  }
}

type ServerError = { message: ReactNode; field?: FieldName };

/** Better Auth error → something a customer can act on. */
function describeError(error: { status?: number; code?: string; message?: string }, mode: Mode, email: string, redirectTo: string): ServerError {
  if (error.status === 429) {
    return { message: "Too many attempts. Please wait a minute, then try again." };
  }
  switch (error.code) {
    case "INVALID_EMAIL_OR_PASSWORD":
      return { message: "That email and password don't match an account. Check them and try again.", field: "password" };
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL": {
      const params = new URLSearchParams({ email });
      if (redirectTo !== "/account") params.set("next", redirectTo);
      return {
        field: "email",
        message: (
          <>
            An account with this email already exists.{" "}
            <Link href={`/account/sign-in?${params}`} className="link">
              Sign in instead
            </Link>
          </>
        ),
      };
    }
    case "INVALID_EMAIL":
      return { message: "Enter a valid email address.", field: "email" };
    case "PASSWORD_TOO_SHORT":
      return { message: `Use at least ${PASSWORD_MIN} characters.`, field: "password" };
    case "PASSWORD_TOO_LONG":
      return { message: `Use ${PASSWORD_MAX} characters or fewer.`, field: "password" };
    case "INVALID_ORIGIN":
      return { message: "This page is out of date. Refresh it and try again." };
  }
  return {
    message:
      mode === "sign-in"
        ? "We couldn't sign you in. Please try again."
        : "We couldn't create your account. Please try again.",
  };
}

type AuthFormProps = {
  mode: Mode;
  /** Where to go on success; already validated by the page with safeRedirectPath. */
  redirectTo?: string;
  defaultEmail?: string;
};

// Email + password form for Better Auth with inline validation (on blur and on submit), a locked
// form and spinner while submitting, and customer-facing server errors. On success it navigates to
// `redirectTo` with a full page load so the server sees the new session cookie.
export function AuthForm({ mode, redirectTo = "/account", defaultEmail = "" }: AuthFormProps) {
  const formId = useId();
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  // Only called from event handlers (refs must not be read during render).
  const focusField = (field: FieldName) => ({ name: nameRef, email: emailRef, password: passwordRef })[field].current?.focus();
  const [values, setValues] = useState<Values>({ name: "", email: defaultEmail, password: "" });
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [status, setStatus] = useState<Status>("idle");
  const [serverError, setServerError] = useState<ServerError | null>(null);

  const fields: FieldName[] = mode === "register" ? ["name", "email", "password"] : ["email", "password"];
  const errorFor = (field: FieldName) => (touched[field] ? validate(field, values, mode) : null) ?? (serverError?.field === field ? "" : null);
  const busy = status !== "idle";

  const update = (field: FieldName, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    if (serverError?.field === field) setServerError(null);
  };

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setTouched(Object.fromEntries(fields.map((f) => [f, true])));
    const firstInvalid = fields.find((field) => validate(field, values, mode));
    if (firstInvalid) {
      focusField(firstInvalid);
      return;
    }

    setStatus("submitting");
    setServerError(null);
    const email = values.email.trim();
    try {
      const { error } =
        mode === "sign-in"
          ? await authClient.signIn.email({ email, password: values.password })
          : await authClient.signUp.email({ name: values.name.trim(), email, password: values.password });
      if (error) {
        const described = describeError(error, mode, email, redirectTo);
        setServerError(described);
        setStatus("idle");
        if (error.code === "INVALID_EMAIL_OR_PASSWORD") {
          // Clear only the password and don't flag it as empty — the alert above explains what happened.
          setValues((current) => ({ ...current, password: "" }));
          setTouched((current) => ({ ...current, password: false }));
        }
        requestAnimationFrame(() => focusField(described.field ?? fields[0]));
        return;
      }
    } catch {
      setServerError({ message: "We couldn't reach the store. Check your connection and try again." });
      setStatus("idle");
      return;
    }

    setStatus("redirecting");
    // Full page load: every server component re-renders with the new session cookie, and nothing
    // cached by the client router from the signed-out state is reused (router.replace + refresh could
    // race and leave a blank page when the target route was already in the client cache).
    window.location.assign(redirectTo);
  }

  const submitLabel = {
    idle: mode === "sign-in" ? "Sign in" : "Create account",
    submitting: mode === "sign-in" ? "Signing in…" : "Creating account…",
    redirecting: "Redirecting…",
  }[status];

  return (
    <form onSubmit={onSubmit} noValidate aria-busy={busy} className="flex flex-col gap-6">
      {/* Server errors: announced, and tied to a field when there is one. */}
      {/* Always rendered so it's announced when filled; the negative margin cancels the gap while empty. */}
      <div aria-live="assertive" className="empty:-mb-6">
        {serverError && (
          <p role="alert" id={`${formId}-server-error`} className="border-l-2 border-critical bg-critical/5 px-4 py-3 text-body-sm text-ink">
            {serverError.message}
          </p>
        )}
      </div>

      <fieldset disabled={busy} className="flex flex-col gap-5">
        {mode === "register" && (
          <TextField
            ref={nameRef}
            id={`${formId}-name`}
            label="Name"
            name="name"
            autoComplete="name"
            value={values.name}
            error={errorFor("name")}
            onChange={(v) => update("name", v)}
            onBlur={() => setTouched((t) => ({ ...t, name: true }))}
          />
        )}
        <TextField
          ref={emailRef}
          id={`${formId}-email`}
          label="Email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          spellCheck={false}
          value={values.email}
          error={errorFor("email")}
          describedBy={serverError?.field === "email" ? `${formId}-server-error` : undefined}
          onChange={(v) => update("email", v)}
          onBlur={() => setTouched((t) => ({ ...t, email: true }))}
        />
        <PasswordField
          ref={passwordRef}
          id={`${formId}-password`}
          mode={mode}
          value={values.password}
          error={errorFor("password")}
          describedBy={serverError?.field === "password" ? `${formId}-server-error` : undefined}
          onChange={(v) => update("password", v)}
          onBlur={() => setTouched((t) => ({ ...t, password: true }))}
        />
      </fieldset>

      <button type="submit" disabled={busy} className="btn btn-primary w-full">
        {busy && <Spinner />}
        {submitLabel}
      </button>
    </form>
  );
}

type TextFieldProps = {
  ref: Ref<HTMLInputElement>;
  id: string;
  label: string;
  name: string;
  value: string;
  /** null = valid/untouched, "" = invalid with the message shown elsewhere (server error). */
  error: string | null;
  describedBy?: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  onKeyUp?: (event: KeyboardEvent<HTMLInputElement>) => void;
  type?: string;
  autoComplete?: string;
  inputMode?: "email";
  spellCheck?: boolean;
  trailing?: ReactNode;
  hint?: ReactNode;
};

function TextField({ ref, id, label, error, describedBy, onChange, trailing, hint, type = "text", ...input }: TextFieldProps) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const described = [hint ? hintId : null, error ? errorId : null, describedBy].filter(Boolean).join(" ") || undefined;
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="eyebrow text-ink-muted">
        {label}
      </label>
      <div className="relative">
        <input
          ref={ref}
          id={id}
          type={type}
          aria-invalid={error !== null}
          aria-describedby={described}
          onChange={(event) => onChange(event.target.value)}
          className={`field disabled:bg-surface disabled:text-ink-muted ${trailing ? "pr-20" : ""}`}
          {...input}
        />
        {trailing && <div className="absolute inset-y-0 right-0 flex items-center pr-3">{trailing}</div>}
      </div>
      {hint && (
        <div id={hintId} className="text-caption text-ink-muted">
          {hint}
        </div>
      )}
      {error && (
        <p id={errorId} className="text-caption text-critical">
          {error}
        </p>
      )}
    </div>
  );
}

function PasswordField({
  ref,
  id,
  mode,
  value,
  error,
  describedBy,
  onChange,
  onBlur,
}: Omit<TextFieldProps, "label" | "name"> & { mode: Mode }) {
  const [visible, setVisible] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const longEnough = value.length >= PASSWORD_MIN;

  return (
    <TextField
      ref={ref}
      id={id}
      label="Password"
      name="password"
      type={visible ? "text" : "password"}
      autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
      value={value}
      error={error}
      describedBy={describedBy}
      onChange={onChange}
      onBlur={() => {
        setCapsLock(false);
        onBlur();
      }}
      onKeyUp={(event) => setCapsLock(event.getModifierState("CapsLock"))}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          aria-controls={id}
          className="eyebrow px-1 py-2 text-ink-muted transition-colors hover:text-ink"
        >
          {visible ? "Hide" : "Show"}
          <span className="sr-only"> password</span>
        </button>
      }
      hint={
        mode === "register" || capsLock ? (
          <span className="flex flex-col gap-1">
            {mode === "register" && (
              <span className={longEnough ? "text-success" : undefined}>
                <span aria-hidden="true">{longEnough ? "✓ " : "· "}</span>
                At least {PASSWORD_MIN} characters
              </span>
            )}
            {capsLock && <span className="text-ink">Caps Lock is on.</span>}
          </span>
        ) : undefined
      }
    />
  );
}
