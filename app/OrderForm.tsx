"use client";

import { useState } from "react";
import LocationPicker, { type Coords } from "./LocationPicker";

type Item = { name: string; remaining: number };

const bn = (n: number) => n.toLocaleString("bn-BD");
const toEn = (s: string) =>
  s.replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d)));

const field =
  "w-full rounded-xl border border-[#f3f1e8]/15 bg-[#f3f1e8]/[0.04] px-4 py-3 text-base text-[#f3f1e8] placeholder:text-[#9db8aa] outline-none focus:border-[#9ad6b0]/60";
const stepBtn =
  "h-10 w-10 rounded-full border border-[#f3f1e8]/20 text-xl text-[#f3f1e8] active:bg-[#f3f1e8]/10";

export default function OrderForm({ items }: { items: Item[] }) {
  const [qty, setQty] = useState<Record<string, number>>({});
  const [type, setType] = useState<"booking" | "delivery">("booking");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [loc, setLoc] = useState<Coords | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const available = items.filter((i) => i.remaining > 0);
  const chosen = available
    .filter((i) => (qty[i.name] ?? 0) > 0)
    .map((i) => ({ name: i.name, qty: Math.min(qty[i.name], i.remaining) }));

  const setQ = (n: string, v: number, max: number) =>
    setQty((s) => ({ ...s, [n]: Math.max(0, Math.min(v, max)) }));

  async function submit() {
    setError("");
    const p = toEn(phone).replace(/\s|-/g, "");
    if (chosen.length === 0) return setError("কমপক্ষে একটি পিঠা বাছাই করুন");
    if (!name.trim()) return setError("আপনার নাম লিখুন");
    if (!/^01\d{9}$/.test(p)) return setError("সঠিক মোবাইল নম্বর দিন");
    if (type === "delivery" && !address.trim())
      return setError("ডেলিভারির ঠিকানা লিখুন");

    setBusy(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE ?? ""}/api/public/orders`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type,
            name: name.trim(),
            phone: p,
            address: type === "delivery" ? address.trim() : "",
            lat: type === "delivery" ? loc?.lat : undefined,
            lng: type === "delivery" ? loc?.lng : undefined,
            note: note.trim(),
            items: chosen,
          }),
        },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "অর্ডার পাঠানো যায়নি");
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "অর্ডার পাঠানো যায়নি");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <section
        id="order-form"
        className="mt-8 scroll-mt-6 rounded-2xl border border-[#9ad6b0]/25 bg-[#9ad6b0]/[0.06] p-5"
      >
        <p className="text-xl text-[#f3f1e8]">আবেদন পাঠানো হয়েছে</p>
        <p className="mt-1 text-sm text-[#9db8aa]">
          অ্যাপ্রুভ হলে আপনার WhatsApp-এ জানিয়ে দেওয়া হবে।
        </p>
        <button
          onClick={() => {
            setDone(false);
            setQty({});
          }}
          className="mt-4 text-sm text-[#9ad6b0] underline"
        >
          আরেকটি অর্ডার করুন
        </button>
      </section>
    );
  }

  return (
    <section
      id="order-form"
      className="mt-8 scroll-mt-6 space-y-5 rounded-2xl border border-[#f3f1e8]/15 bg-[#f3f1e8]/[0.03] p-5"
    >
      <p className="text-2xl text-[#f3f1e8]">অর্ডার করুন</p>

      <div className="space-y-3">
        {available.map((p) => {
          const q = qty[p.name] ?? 0;
          return (
            <div
              key={p.name}
              className="flex items-center justify-between gap-3"
            >
              <span className="text-lg text-[#f3f1e8]">{p.name}</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className={stepBtn}
                  onClick={() => setQ(p.name, q - 1, p.remaining)}
                >
                  −
                </button>
                <span className="w-8 text-center text-lg tabular-nums text-[#f3f1e8]">
                  {bn(q)}
                </span>
                <button
                  type="button"
                  className={stepBtn}
                  onClick={() => setQ(p.name, q + 1, p.remaining)}
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {(["booking", "delivery"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={`rounded-xl border px-3 py-3 text-base ${
              type === t
                ? "border-[#9ad6b0]/60 bg-[#9ad6b0]/10 text-[#f3f1e8]"
                : "border-[#f3f1e8]/15 text-[#9db8aa]"
            }`}
          >
            {t === "booking" ? "বুকিং (দোকান থেকে নেব)" : "ডেলিভারি"}
          </button>
        ))}
      </div>

      <input
        className={field}
        placeholder="আপনার নাম"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        className={field}
        placeholder="মোবাইল নম্বর (WhatsApp আছে এমন)"
        inputMode="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />
      {type === "delivery" && (
        <>
          <textarea
            className={field}
            rows={2}
            placeholder="ডেলিভারির ঠিকানা"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          <LocationPicker value={loc} onChange={setLoc} />
          <p className="-mt-2 text-xs text-[#9db8aa]">
            লোকেশন শুধু ডেলিভারির কাজে ব্যবহার করা হবে।
          </p>
        </>
      )}
      <input
        className={field}
        placeholder="কিছু জানাতে চাইলে (ঐচ্ছিক)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />

      {error && <p className="text-sm text-[#e3a83f]">{error}</p>}

      <button
        type="button"
        onClick={submit}
        disabled={busy}
        className="w-full rounded-xl bg-[#9ad6b0] px-4 py-3 text-lg font-medium text-[#14372b] disabled:opacity-60"
      >
        {busy ? "পাঠানো হচ্ছে…" : "অর্ডারের আবেদন করুন"}
      </button>
    </section>
  );
}