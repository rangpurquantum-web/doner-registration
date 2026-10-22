import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

// ফন্ট ফাইলটা app/fonts/Siyamrupali.ttf নামে রাখতে হবে
const solaiman = localFont({
  src: "./fonts/Siyamrupali.ttf",
  weight: "400",
  variable: "--font-sans-bn",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Pragya Food — আজকের পিঠা",
  description: "আজ কোন পিঠা কতটি আছে, সরাসরি দেখুন।",
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
      <body className={`${solaiman.variable} antialiased`}>{children}</body>
    </html>
  );
}
