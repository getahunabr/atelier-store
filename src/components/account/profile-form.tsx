"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useId, useRef, useState } from "react";

import { updateProfile, type ProfileState } from "@/app/account/actions";

// Edit the display name. Email is shown read-only: changing it needs a verification flow that
// isn't built yet. States: inline validation, saving (locked), saved confirmation, server error.
export function ProfileForm({ name, email }: { name: string; email: string }) {
  const router = useRouter();
  const id = useId();
  const nameRef = useRef<HTMLInputElement>(null);
  const [state, action, pending] = useActionState<ProfileState, FormData>(updateProfile, { status: "idle" });
  const [value, setValue] = useState(name);
  const [clientError, setClientError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const fieldError = clientError ?? (state.status === "invalid" && !dirty ? state.fieldError : null);
  const unchanged = value.trim() === name;

  useEffect(() => {
    if (state.status === "invalid") nameRef.current?.focus();
    // Re-render the account shell (menu, greeting) with the refreshed session cookie.
    if (state.status === "saved") router.refresh();
  }, [state, router]);

  const check = (next: string) => {
    const trimmed = next.trim();
    if (!trimmed) return "Enter your name.";
    if (trimmed.length > 100) return "Use 100 characters or fewer.";
    return null;
  };

  return (
    <form
      action={action}
      noValidate
      aria-busy={pending}
      onSubmit={(event) => {
        const error = check(value);
        setClientError(error);
        setDirty(false);
        if (error) {
          event.preventDefault();
          nameRef.current?.focus();
        }
      }}
      className="flex max-w-md flex-col gap-6"
    >
      <fieldset disabled={pending} className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <label htmlFor={`${id}-name`} className="eyebrow text-ink-muted">
            Name
          </label>
          <input
            ref={nameRef}
            id={`${id}-name`}
            name="name"
            autoComplete="name"
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              setDirty(true);
              if (clientError) setClientError(check(event.target.value));
            }}
            onBlur={() => setClientError(check(value))}
            aria-invalid={fieldError !== null}
            aria-describedby={fieldError ? `${id}-name-error` : undefined}
            className="field disabled:bg-surface disabled:text-ink-muted"
          />
          {fieldError && (
            <p id={`${id}-name-error`} className="text-caption text-critical">
              {fieldError}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor={`${id}-email`} className="eyebrow text-ink-muted">
            Email
          </label>
          <input
            id={`${id}-email`}
            value={email}
            readOnly
            aria-describedby={`${id}-email-hint`}
            className="field bg-surface text-ink-muted"
          />
          <p id={`${id}-email-hint`} className="text-caption text-ink-muted">
            Changing your email isn&apos;t available yet.
          </p>
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <button type="submit" disabled={pending || unchanged} className="btn btn-primary">
          {pending ? "Saving…" : "Save changes"}
        </button>
        <p aria-live="polite" className="text-body-sm">
          {!pending && state.status === "saved" && !dirty && <span className="text-success">Your details are saved.</span>}
          {!pending && state.status === "error" && (
            <span className="text-critical">
              {state.message}{" "}
              {state.signIn && (
                <Link href="/account/sign-in?next=%2Faccount%2Fdetails" className="link">
                  Sign in again
                </Link>
              )}
            </span>
          )}
        </p>
      </div>
    </form>
  );
}
