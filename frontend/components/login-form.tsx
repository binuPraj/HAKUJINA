"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AuthShell } from "@/components/auth-shell";
import { getRequestError, postAuth } from "@/lib/auth";

type LoginResponse = { access: string; refresh: string };

export function LoginForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showResend, setShowResend] = useState(false);
  const [resendEmail, setResendEmail] = useState("");
  const [resendMessage, setResendMessage] = useState("");
  const [resending, setResending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const formData = new FormData(event.currentTarget);

    try {
      const result = await postAuth<LoginResponse>("login", {
        email: String(formData.get("email") ?? "").trim(),
        password: String(formData.get("password") ?? ""),
      });
      window.localStorage.setItem("hakujina.access", result.access);
      window.localStorage.setItem("hakujina.refresh", result.refresh);
      router.push("/products");
    } catch (requestError) {
      setError(getRequestError(requestError));
    } finally {
      setBusy(false);
    }
  }

  async function handleResend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResendMessage("");
    setResending(true);
    try {
      const result = await postAuth<{ detail: string }>("resend-verification", {
        email: resendEmail.trim(),
      });
      setResendMessage(result.detail);
    } catch (requestError) {
      setResendMessage(getRequestError(requestError));
    } finally {
      setResending(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Come on in."
      description="A familiar favourite is just around the corner."
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <label className="field">
          <span>Email address</span>
          <input autoComplete="email" name="email" type="email" placeholder="you@example.com" required />
        </label>
        <label className="field">
          <span>Password</span>
          <input autoComplete="current-password" name="password" type="password" placeholder="Your password" required />
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="button button-full" type="submit" disabled={busy}>
          {busy ? "Logging you in…" : "Log in"}
          {!busy && <span aria-hidden="true">↗</span>}
        </button>
        <p className="form-footnote">
          New here? <Link href="/register">Create an account</Link>
        </p>
      </form>
      <div className="resend-block">
        <button className="text-button" type="button" onClick={() => setShowResend(!showResend)}>
          Need a new verification email?
        </button>
        {showResend && (
          <form className="resend-form" onSubmit={handleResend}>
            <label className="field">
              <span>Email address</span>
              <input autoComplete="email" type="email" value={resendEmail} onChange={(event) => setResendEmail(event.target.value)} placeholder="you@example.com" required />
            </label>
            <button className="button button-outline button-full" type="submit" disabled={resending}>
              {resending ? "Sending…" : "Resend verification link"}
            </button>
            {resendMessage && <p className="form-footnote" role="status">{resendMessage}</p>}
          </form>
        )}
      </div>
      <p className="switch-auth">New to Hakujina? <Link href="/register">Join us</Link></p>
    </AuthShell>
  );
}
