import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { StoreProvider } from "@/lib/store-context";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CartDrawer } from "@/components/cart-drawer";
import { ToastContainer } from "@/components/toast";

export const metadata: Metadata = {
  title: "Hakujina Ceramic Studio — Shaped by Hand",
  description:
    "Timeless ceramic objects, made slowly in our studio. Rooted in nature, designed for everyday life and everyday rituals.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,400;1,500&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <StoreProvider>
          <div className="studio-app-shell">
            <Suspense fallback={<header className="site-header-nav" />}>
              <SiteHeader />
            </Suspense>
            <main className="studio-main-content">{children}</main>
            <SiteFooter />
            <CartDrawer />
            <ToastContainer />
          </div>
        </StoreProvider>
      </body>
    </html>
  );
}
