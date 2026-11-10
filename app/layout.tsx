import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

// ফন্ট ফাইল: app/front/Siyamrupali.ttf
const siyam = localFont({
  src: "./front/Siyamrupali.ttf",
  weight: "400",
  variable: "--font-sans-bn",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Pragya Food ~ প্রাজ্ঞ ফুড",
  description: Homely | Motherly | Affordable",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#14372b",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="bn">
      <body className={`${siyam.variable} antialiased`}>{children}</body>
    </html>
  );
}
