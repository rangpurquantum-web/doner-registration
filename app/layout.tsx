import type { Metadata, Viewport } from "next";
import { Hind_Siliguri, Noto_Serif_Bengali } from "next/font/google";
import "./globals.css";

const sans = Hind_Siliguri({
  subsets: ["bengali", "latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans-bn",
  display: "swap",
});

const serif = Noto_Serif_Bengali({
  subsets: ["bengali", "latin"],
  weight: ["400", "600"],
  variable: "--font-serif-bn",
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
      <body className={`${sans.variable} ${serif.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
