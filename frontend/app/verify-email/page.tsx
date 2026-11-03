"use client";

import { Suspense } from "react";
import { AuthShell } from "@/components/auth-shell";
import { VerifyEmail } from "@/components/verify-email";

function VerifyEmailFallback() {
  return (
    <AuthShell eyebrow="Just a moment" title="Confirming your email." description="We’re making sure everything is in order.">
      <div className="notice"><span className="spinner" aria-hidden="true" /> Checking your verification link…</div>
    </AuthShell>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<VerifyEmailFallback />}>
      <VerifyEmail />
    </Suspense>
  );
}
