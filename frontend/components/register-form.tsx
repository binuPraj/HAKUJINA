"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { AuthShell } from "@/components/auth-shell";
import { getRequestError, postAuth } from "@/lib/auth";

type RegisterResponse = { detail: string; email: string };

export function RegisterForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);

    const formData = new FormData(event.currentTarget);
    const phone = String(formData.get("phone") ?? "").trim();
    const payload: Record<string, string> = {
      name: String(formData.get("name") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim(),
      password: String(formData.get("password") ?? ""),
    };
    if (phone) payload.phone = phone;

    try {
      const result = await postAuth<RegisterResponse>("register", payload);
      setPendingEmail(result.email);
    } catch (requestError) {
      setError(getRequestError(requestError));
    } finally {
      setBusy(false);
    }
  }

  if (pendingEmail) {
    return (
      <AuthShell
        eyebrow="One last little step"
        title="Check your inbox."
        description="We’ve sent you a link to verify your email and finish setting up your account."
      >
        <div className="notice notice-success" role="status">
          <span className="notice-icon" aria-hidden="true">✉</span>
          <div>
            <strong>Verification email sent</strong>
            <p>We sent a confirmation link to <b>{pendingEmail}</b>. Your account will be ready after you verify your email.</p>
          </div>
        </div>
        <Link className="button button-full" href="/login">Back to log in <span aria-hidden="true">↗</span></Link>
        <p className="form-footnote">Can’t find it? Have a look in your spam folder.</p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Come on in"
      title="Make yourself at home."
      description="Create an account to find the pieces you’ll keep reaching for."
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <label className="field">
          <span>Full name</span>
          <input autoComplete="name" name="name" placeholder="How should we call you?" required maxLength={150} />
        </label>
        <label className="field">
          <span>Email address</span>
          <input autoComplete="email" name="email" type="email" placeholder="you@example.com" required />
        </label>
        <label className="field">
          <span>Password</span>
          <input autoComplete="new-password" name="password" type="password" placeholder="At least 8 characters" minLength={8} required />
          <span className="field-hint">Choose a password that’s at least 8 characters long.</span>
        </label>
        <label className="field">
          <span>Phone number <span className="optional-label">Optional</span></span>
          <input autoComplete="tel" name="phone" type="tel" placeholder="+9779800000000" pattern="\+?[0-9]{7,15}" title="Use 7 to 15 digits, with an optional leading +. Spaces are not accepted." />
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="button button-full" type="submit" disabled={busy}>
          {busy ? "Creating your account…" : "Create account"}
          {!busy && <span aria-hidden="true">↗</span>}
        </button>
        <p className="form-footnote">We’ll email you a verification link before your account is activated.</p>
      </form>
      <p className="switch-auth">Already have an account? <Link href="/login">Log in</Link></p>
    </AuthShell>
  );
}
