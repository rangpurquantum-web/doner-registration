"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import type { Map as LMap, Marker } from "leaflet";

export type Coords = { lat: number; lng: number; accuracy?: number };

// দোকানের লোকেশন (ম্যাপ প্রথমে এখান থেকে খুলবে)
const SHOP = { lat: 25.759388, lng: 89.244539 };

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
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    cbRef.current = onChange;
  }, [onChange]);

  const place = useCallback((lat: number, lng: number, accuracy?: number) => {
    const L = libRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      const icon = L.divIcon({
        html: '<div style="font-size:30px;line-height:1">📍</div>',
        className: "",
        iconSize: [30, 30],
        iconAnchor: [15, 28],
      });
      const m = L.marker([lat, lng], { icon, draggable: true }).addTo(map);
      m.on("dragend", () => {
        const p = m.getLatLng();
        cbRef.current({ lat: p.lat, lng: p.lng });
      });
      markerRef.current = m;
    }
    cbRef.current({ lat, lng, accuracy });
  }, []);

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
    <div className="space-y-2">
      <p className="text-sm text-[#9db8aa]">
        ম্যাপে ট্যাপ করে আপনার বাসার জায়গায় পিন দিন। পিন ধরে টেনে ঠিক করতে
        পারবেন।
      </p>

      <div className="relative z-0 overflow-hidden rounded-xl border border-[#f3f1e8]/15">
        <div ref={boxRef} className="h-64 w-full" />
      </div>

      <button
        type="button"
        onClick={locate}
        disabled={busy}
        className="w-full rounded-xl border border-[#9ad6b0]/40 bg-[#9ad6b0]/10 py-3 text-[#9ad6b0] disabled:opacity-50"
      >
        {busy ? "লোকেশন খোঁজা হচ্ছে…" : "📍 আমার বর্তমান লোকেশন নিন"}
      </button>

      {err && <p className="text-sm text-[#e3a83f]">{err}</p>}

      {value ? (
        <p className="text-xs text-[#9db8aa]">
          ✅ পিন দেওয়া হয়েছে।{" "}
          <button
            type="button"
            onClick={() => onChange(null)}
            className="underline"
          >
            মুছুন
          </button>
        </p>
      ) : (
        <p className="text-xs text-[#e3a83f]">এখনো পিন দেওয়া হয়নি</p>
      )}
    </div>
  );
}