// দোকানের লোকেশন
export const SHOP = { lat: 25.759388, lng: 89.244539 };

// সরলরেখার দূরত্বকে আসল রাস্তার কাছাকাছি আনতে গুণক
const ROAD_FACTOR = 1.3;

// upTo = কত কিমি পর্যন্ত, fee = টাকা। শেষ ধাপের বাইরে ডেলিভারি নেই।
export const TIERS = [
  { upTo: 1, fee: 20 },
  { upTo: 2, fee: 30 },
  { upTo: 3, fee: 40 },
  { upTo: 5, fee: 60 },
];

export function roadKm(lat: number, lng: number) {
  const R = 6371;
  const rad = (x: number) => (x * Math.PI) / 180;
  const dLat = rad(lat - SHOP.lat);
  const dLng = rad(lng - SHOP.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(SHOP.lat)) * Math.cos(rad(lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h)) * ROAD_FACTOR;
}

// ধাপে না পড়লে null (মানে ডেলিভারি নেই)
export function deliveryFee(km: number): number | null {
  const t = TIERS.find((x) => km <= x.upTo);
  return t ? t.fee : null;
}