"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthShell } from "@/components/auth-shell";
import { getRequestError, postAuth } from "@/lib/auth";

type VerificationState =
  | { status: "loading" }
  | { status: "success" }
  | { status: "error"; message: string };

export function VerifyEmail() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [state, setState] = useState<VerificationState>(
    token ? { status: "loading" } : { status: "error", message: "This verification link is missing its token." },
  );

  useEffect(() => {
    if (!token) return;
    let active = true;
    postAuth<{ detail: string }>("verify-email", { token })
      .then(() => {
        if (active) setState({ status: "success" });
      })
      .catch((requestError: unknown) => {
        if (active) setState({ status: "error", message: getRequestError(requestError) });
      });
    return () => {
      active = false;
    };
  }, [token]);

  if (state.status === "loading") {
    return (
      <AuthShell eyebrow="Just a moment" title="Confirming your email." description="We’re making sure everything is in order.">
        <div className="notice"><span className="spinner" aria-hidden="true" /> Checking your verification link…</div>
      </AuthShell>
    );
  }

  if (state.status === "success") {
    return (
      <AuthShell eyebrow="All set" title="You’re part of the studio." description="Your email is verified and your account is ready.">
        <div className="notice notice-success" role="status">
          <span className="notice-icon" aria-hidden="true">✳</span>
          <div><strong>Email verified</strong><p>You can now log in and explore Hakujina.</p></div>
        </div>
        <Link className="button button-full" href="/login">Go to log in <span aria-hidden="true">↗</span></Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell eyebrow="A small hiccup" title="We couldn’t verify that link." description={state.message}>
      <div className="notice notice-error" role="alert">
        <span className="notice-icon" aria-hidden="true">!</span>
        <p>Verification links expire after 24 hours. You can request a fresh one from the log in page.</p>
      </div>
      <Link className="button button-full" href="/login">Go to log in <span aria-hidden="true">↗</span></Link>
    </AuthShell>
  );
}
