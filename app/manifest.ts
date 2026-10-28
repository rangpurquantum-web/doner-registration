import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "প্রাজ্ঞ ফুড",
    short_name: "প্রাজ্ঞ ফুড",
    description: "আজকের  লাইভ স্টক ও অর্ডার",
    start_url: "/",
    display: "standalone",
    lang: "bn",
    background_color: "#14372b",
    theme_color: "#14372b",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}