import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hakujina — Pottery for everyday rituals",
  description: "Thoughtful pottery, shaped slowly by hand.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
