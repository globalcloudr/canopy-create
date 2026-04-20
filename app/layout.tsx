import "./globals.css";
import type { Metadata } from "next";
import { canopyFontVariables } from "@canopy/ui";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Canopy Product",
  description: "A Canopy product",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={canopyFontVariables}>
      <body className="product-create">
        <Suspense>{children}</Suspense>
      </body>
    </html>
  );
}
