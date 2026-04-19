import "./globals.css";
import type { Metadata } from "next";
import { Maven_Pro } from "next/font/google";
import { Suspense } from "react";

const mavenPro = Maven_Pro({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-maven",
  display: "swap",
});

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
    <html lang="en" className={mavenPro.variable}>
      <body className="product-create">
        <Suspense>{children}</Suspense>
      </body>
    </html>
  );
}
