"use client";

// স্টক রিপো: LocationPicker.tsx (পুরো ফাইল বদলে দিন)

import { useCallback, useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import type { Map as LMap, Marker } from "leaflet";

export type Coords = { lat: number; lng: number; accuracy?: number };

// দোকানের লোকেশন (ম্যাপ প্রথমে এখান থেকে খুলবে)
const SHOP = { lat: 25.759388, lng: 89.244539 };

// ম্যাপের পিন: কমলা আঁকা পিন (ইমোজি নয়)
const PIN_HTML =
  '<svg width="34" height="42" viewBox="0 0 24 30" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))"><path d="M12 29s-9-8.2-9-16a9 9 0 1 1 18 0c0 7.8-9 16-9 16z" fill="#F58220" stroke="#ffffff" stroke-width="1.6"/><circle cx="12" cy="13" r="3.6" fill="#ffffff"/></svg>';

function GpsIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className={className}
      aria-hidden
    >
      <circle cx="12" cy="12" r="7" />
      <circle cx="12" cy="12" r="2.5" fill="currentColor" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </svg>
  );
}

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      className={`animate-spin ${className ?? ""}`}
      aria-hidden
    >
      <path d="M12 3a9 9 0 1 0 9 9" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

export default function LocationPicker({
  value,
  onChange,
}: {
  value: Coords | null;
  onChange: (c: Coords | null) => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const libRef = useRef<typeof import("leaflet") | null>(null);
  const cbRef = useRef(onChange);
  const valueRef = useRef(value);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    cbRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const place = useCallback(
    (lat: number, lng: number, accuracy?: number, notify = true) => {
      const L = libRef.current;
      const map = mapRef.current;
      if (!L || !map) return;
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        const icon = L.divIcon({
          html: PIN_HTML,
          className: "",
          iconSize: [34, 42],
          iconAnchor: [17, 40],
        });
        const m = L.marker([lat, lng], { icon, draggable: true }).addTo(map);
        m.on("dragend", () => {
          const p = m.getLatLng();
          cbRef.current({ lat: p.lat, lng: p.lng });
        });
        markerRef.current = m;
      }
      if (notify) cbRef.current({ lat, lng, accuracy });
    },
    [],
  );

  useEffect(() => {
    let dead = false;
    (async () => {
      const mod = await import("leaflet");
      const L: typeof import("leaflet") =
        (mod as unknown as { default?: typeof import("leaflet") }).default ??
        mod;
      if (dead || !boxRef.current || mapRef.current) return;
      libRef.current = L;
      const map = L.map(boxRef.current).setView([SHOP.lat, SHOP.lng], 14);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap",
      }).addTo(map);
      map.on("click", (e) => place(e.latlng.lat, e.latlng.lng));
      mapRef.current = map;

      // আগে পিন দেওয়া থাকলে কার্ট আবার খুললে সেটা ম্যাপে বসিয়ে দেওয়া হয়
      const v = valueRef.current;
      if (v) {
        place(v.lat, v.lng, v.accuracy, false);
        map.setView([v.lat, v.lng], 17);
      }

      // পপআপের ভেতরে ম্যাপ খুললে সাইজ আবার হিসাব করা দরকার
      setTimeout(() => {
        if (mapRef.current === map) map.invalidateSize();
      }, 200);
    })();
    return () => {
      dead = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [place]);

  useEffect(() => {
    if (!value && markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
  }, [value]);

  function locate() {
    if (!navigator.geolocation) {
      setErr("এই ব্রাউজারে লোকেশন সাপোর্ট নেই। ম্যাপে ট্যাপ করে পিন দিন।");
      return;
    }
    setBusy(true);
    setErr("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        place(latitude, longitude, accuracy);
        mapRef.current?.setView([latitude, longitude], 17);
        setBusy(false);
      },
      (e) => {
        setBusy(false);
        setErr(
          e.code === 1
            ? "লোকেশনের অনুমতি দেওয়া হয়নি। ম্যাপে ট্যাপ করে পিন দিন।"
            : "লোকেশন পাওয়া যায়নি। ম্যাপে ট্যাপ করে পিন দিন।",
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">
        ম্যাপে ট্যাপ করে আপনার বাসার জায়গায় পিন দিন। পিন ধরে টেনে ঠিক করতে
        পারবেন।
      </p>

      <div
        id="loc-mapbox"
        className="relative z-0 overflow-hidden rounded-2xl border border-gray-200"
      >
        <div ref={boxRef} className="h-64 w-full" />
      </div>

      <button
        id="loc-gps"
        type="button"
        onClick={locate}
        disabled={busy}
        className="flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-[#F58220] bg-[#FFF3E6] px-4 py-4 text-lg font-bold text-[#C65F00] active:bg-[#FFE6CC] disabled:opacity-70"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F58220] text-white">
          {busy ? (
            <SpinnerIcon className="h-5 w-5" />
          ) : (
            <GpsIcon className="h-5 w-5" />
          )}
        </span>
        {busy ? "লোকেশন খোঁজা হচ্ছে…" : "লোকেশন দিতে ক্লিক করুন"}
      </button>

      {err && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          {err}
        </p>
      )}

      {value ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-[#E4F1E1] px-4 py-3">
          <span className="flex items-center gap-2 text-sm font-bold text-green-800">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-600 text-white">
              <CheckIcon className="h-4 w-4" />
            </span>
            পিন দেওয়া হয়েছে
          </span>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-sm font-semibold text-gray-600 underline"
          >
            মুছুন
          </button>
        </div>
      ) : (
        <p className="rounded-xl bg-[#FFF3E6] px-3 py-2 text-sm text-[#C65F00]">
          এখনো পিন দেওয়া হয়নি
        </p>
      )}
    </div>
  );
}
