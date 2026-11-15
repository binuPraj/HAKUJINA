"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import ReservationsPage from "../reservations/page";

export default function WorkshopsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // Gracefully push to the direct reservation interface
    router.replace("/reservations");
  }, [router]);

  // Fallback direct render if client has not redirected yet
  return <ReservationsPage />;
}
