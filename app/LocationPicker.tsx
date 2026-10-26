"use client";

import { useState } from "react";

export type Coords = { lat: number; lng: number; accuracy?: number };

export default function LocationPicker({
  value,
  onChange,
}: {
  value: Coords | null;
  onChange: (c: Coords | null) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  function locate() {
    if (!navigator.geolocation) {
      setErr("এই ব্রাউজারে লোকেশন সাপোর্ট নেই। ঠিকানা লিখে দিন।");
      return;
    }
    setBusy(true);
    setErr("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setBusy(false);
      },
      (e) => {
        setBusy(false);
        setErr(
          e.code === 1
            ? "লোকেশনের অনুমতি দেওয়া হয়নি। ব্রাউজারে অনুমতি দিন, অথবা ঠিকানা লিখে দিন।"
            : "লোকেশন পাওয়া যায়নি। আবার চেষ্টা করুন, অথবা ঠিকানা লিখে দিন।",
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }

  const d = 0.004;
  const mapSrc = value
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${value.lng - d},${value.lat - d},${value.lng + d},${value.lat + d}&layer=mapnik&marker=${value.lat},${value.lng}`
    : "";

  return (
    <div>
      <button
        type="button"
        onClick={locate}
        disabled={busy}
        className="w-full rounded-xl border border-[#9ad6b0]/40 bg-[#9ad6b0]/10 py-3 text-[#9ad6b0] disabled:opacity-50"
      >
        {busy
          ? "লোকেশন খোঁজা হচ্ছে…"
          : value
            ? "📍 আবার লোকেশন নিন"
            : "📍 আমার লোকেশন দিন"}
      </button>

      {err && <p className="mt-2 text-sm text-[#e3a83f]">{err}</p>}

      {value && (
        <div className="mt-3">
          <iframe
            title="ডেলিভারি লোকেশন"
            src={mapSrc}
            className="h-48 w-full rounded-xl border-0"
          />
          <p className="mt-2 text-xs text-[#9db8aa]">
            লোকেশন নেওয়া হয়েছে
            {value.accuracy
              ? ` (প্রায় ${Math.round(value.accuracy)} মিটার সঠিকতা)`
              : ""}
            । ম্যাপে ঠিক না দেখালে আবার চাপুন এবং নিচে ঠিকানা লিখুন।
          </p>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="mt-1 text-xs text-[#9db8aa] underline"
          >
            লোকেশন মুছুন
          </button>
        </div>
      )}
    </div>
  );
}