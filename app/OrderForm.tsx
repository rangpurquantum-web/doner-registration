"use client";

import { useEffect, useState } from "react";
import LocationPicker, { type Coords } from "./LocationPicker";

type Item = { name: string; remaining: number; price?: number };
type Bill = {
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  total: number;
  km: number | null;
};
type OrderType = "booking" | "delivery";

const MIN_QTY = 5;

const bn = (n: number) => n.toLocaleString("bn-BD");
const toEn = (s: string) =>
  s.replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d)));
const toBnDigits = (s: string) =>
  s.replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)]);

// +৮৮০ / ৮৮০ / স্পেস / ড্যাশ সরিয়ে ০১XXXXXXXXX বানায়
function normPhone(s: string) {
  return toEn(s).replace(/[\s-]/g, "").replace(/^\+?880/, "0");
}
const PHONE_RE = /^01[3-9]\d{8}$/;

const API = process.env.NEXT_PUBLIC_API_BASE ?? "";

const field =
  "w-full rounded-xl border border-[#f3f1e8]/15 bg-[#f3f1e8]/[0.04] px-4 py-3 text-base text-[#f3f1e8] placeholder:text-[#9db8aa] outline-none focus:border-[#9ad6b0]/60";
const stepBtn =
  "h-10 w-10 rounded-full border border-[#f3f1e8]/20 text-xl text-[#f3f1e8] active:bg-[#f3f1e8]/10";
const primaryBtn =
  "w-full rounded-xl bg-[#9ad6b0] px-4 py-3 text-lg font-medium text-[#14372b] disabled:opacity-60";
const ghostBtn =
  "w-full rounded-xl border border-[#f3f1e8]/20 px-4 py-3 text-lg text-[#f3f1e8]";

const TYPE_LABEL: Record<OrderType, string> = {
  booking: "🏪 বুকিং (দোকান থেকে নেবেন)",
  delivery: "🛵 ডেলিভারি",
};

function Steps({ step }: { step: 1 | 2 | 3 | 4 }) {
  const labels = ["পিঠা বাছাই", "নেওয়ার ধরন", "আপনার তথ্য", "বিল ও আবেদন"];
  return (
    <ol className="flex items-start gap-2">
      {labels.map((l, i) => {
        const n = i + 1;
        const active = n === step;
        const passed = n < step;
        return (
          <li key={l} className="flex flex-1 flex-col gap-1.5">
            <span
              className={`h-1 rounded-full ${
                active || passed ? "bg-[#9ad6b0]" : "bg-[#f3f1e8]/15"
              }`}
            />
            <span
              className={`text-[11px] leading-tight ${
                active ? "text-[#f3f1e8]" : "text-[#9db8aa]"
              }`}
            >
              {bn(n)}. {l}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function BillBox({ bill, type }: { bill: Bill; type: OrderType }) {
  const row = "flex items-center justify-between gap-3 text-base";
  return (
    <div className="space-y-1.5 rounded-xl border border-[#9ad6b0]/30 bg-[#9ad6b0]/[0.08] p-4 text-[#f3f1e8]">
      <div className={row}>
        <span>পিঠার দাম</span>
        <span className="tabular-nums">{bn(bill.subtotal)} টাকা</span>
      </div>
      {type === "delivery" && (
        <div className={row}>
          <span>ডেলিভারি চার্জ</span>
          <span className="tabular-nums">{bn(bill.deliveryFee)} টাকা</span>
        </div>
      )}
      <div className={row}>
        <span>ওয়েবসাইট অপারেশন্স চার্জ</span>
        <span className="tabular-nums">{bn(bill.serviceFee)} টাকা</span>
      </div>
      <div className="mt-1 border-t border-[#f3f1e8]/15 pt-2">
        <div className={`${row} text-lg font-medium`}>
          <span>মোট বিল</span>
          <span className="tabular-nums">{bn(bill.total)} টাকা</span>
        </div>
      </div>
      {type === "delivery" && bill.km != null && (
        <p className="pt-1 text-xs text-[#9db8aa]">
          দোকান থেকে দূরত্ব প্রায় {bn(bill.km)} কিমি
        </p>
      )}
    </div>
  );
}

export default function OrderForm({ items }: { items: Item[] }) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [qty, setQty] = useState<Record<string, number>>({});
  // শুরুতে কিছুই বাছাই করা থাকে না, কাস্টমারকে নিজে বেছে নিতে হয়
  const [type, setType] = useState<OrderType | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [phone2, setPhone2] = useState("");
  const [address, setAddress] = useState("");
  const [loc, setLoc] = useState<Coords | null>(null);
  const [locOpen, setLocOpen] = useState(false);
  const [locErr, setLocErr] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<Bill | null | false>(false);

  const [bill, setBill] = useState<Bill | null>(null);
  const [billErr, setBillErr] = useState("");
  const [billBusy, setBillBusy] = useState(false);

  const available = items.filter((i) => i.remaining > 0);
  const chosen = available
    .filter((i) => (qty[i.name] ?? 0) > 0)
    .map((i) => ({ name: i.name, qty: Math.min(qty[i.name], i.remaining) }));
  const totalQty = chosen.reduce((s, c) => s + c.qty, 0);

  const priceOf = new Map(
    available
      .filter((i) => i.price != null)
      .map((i) => [i.name, i.price as number]),
  );
  const allPriced =
    chosen.length > 0 && chosen.every((c) => priceOf.has(c.name));
  const subtotalLocal = chosen.reduce(
    (s, c) => s + (priceOf.get(c.name) ?? 0) * c.qty,
    0,
  );

  const p = normPhone(phone);
  const phoneOk = PHONE_RE.test(p);
  const phoneMatch = normPhone(phone2) === p;

  const locDone = Boolean(address.trim()) && Boolean(loc);

  const setQ = (n: string, v: number, max: number) =>
    setQty((s) => ({ ...s, [n]: Math.max(0, Math.min(v, max)) }));

  function goStep(n: 1 | 2 | 3 | 4) {
    setError("");
    setStep(n);
    setTimeout(() => {
      document
        .getElementById("order-form")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }

  function openLoc() {
    setLocErr("");
    setLocOpen(true);
  }

  function confirmLoc() {
    setLocErr("");
    if (!address.trim()) return setLocErr("ডেলিভারির ঠিকানা লিখুন");
    if (!loc) return setLocErr("ম্যাপে আপনার ডেলিভারির জায়গায় পিন দিন");
    if (billBusy) return setLocErr("ডেলিভারি চার্জ হিসাব হচ্ছে, একটু অপেক্ষা করুন");
    if (billErr) return setLocErr(billErr);
    setError("");
    setLocOpen(false);
  }

  // বিল আসে শপ ম্যানেজারের সার্ভার থেকে। পিঠা, ধরন বা পিন বদলালে নতুন করে আনা হয়।
  const quoteKey = JSON.stringify({
    type,
    chosen,
    lat: type === "delivery" ? loc?.lat : null,
    lng: type === "delivery" ? loc?.lng : null,
  });

  useEffect(() => {
    if (!type || chosen.length === 0 || (type === "delivery" && !loc)) {
      setBill(null);
      setBillErr("");
      setBillBusy(false);
      return;
    }
    let dead = false;
    setBillBusy(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${API}/api/public/quote`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type,
            items: chosen,
            lat: type === "delivery" ? loc?.lat : undefined,
            lng: type === "delivery" ? loc?.lng : undefined,
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (dead) return;
        if (!res.ok) {
          setBill(null);
          setBillErr(json.error ?? "বিল হিসাব করা যায়নি");
        } else {
          setBill(json.bill as Bill);
          setBillErr("");
        }
      } catch {
        if (!dead) {
          setBill(null);
          setBillErr("বিল হিসাব করা যায়নি");
        }
      } finally {
        if (!dead) setBillBusy(false);
      }
    }, 300);
    return () => {
      dead = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteKey]);

  function next1() {
    setError("");
    if (chosen.length === 0) return setError("কমপক্ষে একটি পিঠা বাছাই করুন");
    if (totalQty < MIN_QTY)
      return setError(`একটি অর্ডারে কমপক্ষে ${bn(MIN_QTY)}টি পিঠা নিতে হবে`);
    goStep(2);
  }

  function next2() {
    setError("");
    if (!type) return setError("বুকিং না ডেলিভারি, একটি বেছে নিন");
    if (type === "delivery") {
      if (!locDone)
        return setError("ডেলিভারির ঠিকানা ও লোকেশন দিন");
      if (billErr) return setError(billErr);
    }
    goStep(3);
  }

  function next3() {
    setError("");
    if (!name.trim()) return setError("আপনার নাম লিখুন");
    if (!phoneOk)
      return setError("সঠিক মোবাইল নম্বর দিন (যেমন ০১৭১২৩৪৫৬৭৮)");
    if (!phoneMatch) return setError("দুটি নম্বর মেলেনি, আবার দেখুন");
    goStep(4);
  }

  async function submit() {
    setError("");
    if (chosen.length === 0 || totalQty < MIN_QTY) {
      setStep(1);
      return setError(
        `একটি অর্ডারে কমপক্ষে ${bn(MIN_QTY)}টি পিঠা নিতে হবে (স্টক বদলে গেছে হতে পারে)`,
      );
    }
    if (!type) {
      setStep(2);
      return setError("বুকিং না ডেলিভারি, একটি বেছে নিন");
    }
    if (type === "delivery" && !locDone) {
      setStep(2);
      return setError("ডেলিভারির ঠিকানা ও লোকেশন দিন");
    }
    if (!name.trim()) {
      setStep(3);
      return setError("আপনার নাম লিখুন");
    }
    if (!phoneOk) {
      setStep(3);
      return setError("সঠিক মোবাইল নম্বর দিন");
    }
    if (billErr) return setError(billErr);

    setBusy(true);
    try {
      const res = await fetch(`${API}/api/public/orders`, {
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
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "অর্ডার পাঠানো যায়নি");
      setDone((json.bill as Bill) ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "অর্ডার পাঠানো যায়নি");
    } finally {
      setBusy(false);
    }
  }

  if (done !== false) {
    return (
      <section
        id="order-form"
        className="mt-8 scroll-mt-6 rounded-2xl border border-[#9ad6b0]/25 bg-[#9ad6b0]/[0.06] p-5"
      >
        <p className="text-xl text-[#f3f1e8]">আবেদন পাঠানো হয়েছে</p>
        {done && (
          <p className="mt-2 text-base text-[#f3f1e8]">
            মোট বিল:{" "}
            <span className="font-medium">{bn(done.total)} টাকা</span>
          </p>
        )}
        <p className="mt-1 text-sm text-[#9db8aa]">
          অ্যাপ্রুভ হলে আপনার WhatsApp-এ জানিয়ে দেওয়া হবে।
        </p>
        <button
          onClick={() => {
            setDone(false);
            setQty({});
            setType(null);
            setLoc(null);
            setLocOpen(false);
            setBill(null);
            setPhone2("");
            setStep(1);
          }}
          className="mt-4 text-sm text-[#9ad6b0] underline"
        >
          আরেকটি অর্ডার করুন
        </button>
      </section>
    );
  }

  return (
    <>
      <section
        id="order-form"
        className="mt-8 scroll-mt-6 space-y-5 rounded-2xl border border-[#f3f1e8]/15 bg-[#f3f1e8]/[0.03] p-5"
      >
        <p className="text-2xl text-[#f3f1e8]">অর্ডার করুন</p>
        <Steps step={step} />

        {/* ধাপ ১: পিঠা বাছাই */}
        {step === 1 && (
          <>
            <div className="space-y-3">
              {available.map((it) => {
                const q = qty[it.name] ?? 0;
                return (
                  <div
                    key={it.name}
                    className="flex items-center justify-between gap-3"
                  >
                    <div>
                      <span className="text-lg text-[#f3f1e8]">{it.name}</span>
                      {it.price != null && (
                        <span className="ml-2 text-sm text-[#9db8aa]">
                          {bn(it.price)} টাকা
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        className={stepBtn}
                        onClick={() => setQ(it.name, q - 1, it.remaining)}
                      >
                        −
                      </button>
                      <span className="w-8 text-center text-lg tabular-nums text-[#f3f1e8]">
                        {bn(q)}
                      </span>
                      <button
                        type="button"
                        className={stepBtn}
                        onClick={() => setQ(it.name, q + 1, it.remaining)}
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {chosen.length > 0 && (
              <div className="space-y-1 rounded-xl border border-[#f3f1e8]/15 p-3 text-sm text-[#9db8aa]">
                <div className="flex items-center justify-between">
                  <span>মোট পিঠা</span>
                  <span className="tabular-nums text-[#f3f1e8]">
                    {bn(totalQty)} টি
                  </span>
                </div>
                {allPriced && (
                  <div className="flex items-center justify-between">
                    <span>পিঠার দাম</span>
                    <span className="tabular-nums text-[#f3f1e8]">
                      {bn(subtotalLocal)} টাকা
                    </span>
                  </div>
                )}
              </div>
            )}

            <p
              className={`text-xs ${
                totalQty >= MIN_QTY ? "text-[#9db8aa]" : "text-[#e3a83f]"
              }`}
            >
              একটি অর্ডারে কমপক্ষে {bn(MIN_QTY)}টি পিঠা নিতে হবে।
            </p>

            {error && <p className="text-sm text-[#e3a83f]">{error}</p>}

            <button type="button" onClick={next1} className={primaryBtn}>
              পরের ধাপ →
            </button>
          </>
        )}

        {/* ধাপ ২: নেওয়ার ধরন (কোনটাই আগে থেকে বাছাই করা নেই) */}
        {step === 2 && (
          <>
            <p className="text-lg text-[#f3f1e8]">পিঠা কীভাবে নিতে চান?</p>

            <div className="space-y-3">
              {(
                [
                  {
                    t: "booking",
                    title: "🏪 বুকিং",
                    sub: "দোকানে এসে নিজে নিয়ে যাব",
                    note: "আপনাকে নিজে দোকানে এসে নিতে হবে। ডেলিভারি চার্জ লাগবে না।",
                  },
                  {
                    t: "delivery",
                    title: "🛵 ডেলিভারি",
                    sub: "আমার ঠিকানায় পৌঁছে দিন",
                    note: "ঠিকানা ও ম্যাপে পিন লাগবে। দূরত্ব অনুযায়ী ডেলিভারি চার্জ যোগ হবে।",
                  },
                ] as const
              ).map((o) => {
                const on = type === o.t;
                return (
                  <button
                    key={o.t}
                    type="button"
                    onClick={() => {
                      setType(o.t);
                      setError("");
                      if (o.t === "delivery") openLoc();
                      else setLocOpen(false);
                    }}
                    className={`w-full rounded-2xl border p-4 text-left ${
                      on
                        ? "border-[#9ad6b0]/70 bg-[#9ad6b0]/10"
                        : "border-[#f3f1e8]/15 bg-[#f3f1e8]/[0.03]"
                    }`}
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="text-xl text-[#f3f1e8]">{o.title}</span>
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-full border text-[11px] ${
                          on
                            ? "border-[#9ad6b0] bg-[#9ad6b0] text-[#14372b]"
                            : "border-[#f3f1e8]/30 text-transparent"
                        }`}
                        aria-hidden
                      >
                        ✓
                      </span>
                    </span>
                    <span className="mt-1 block text-base text-[#f3f1e8]">
                      {o.sub}
                    </span>
                    <span className="mt-1 block text-xs text-[#9db8aa]">
                      {o.note}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* ডেলিভারি বাছাই করলে লোকেশনের অবস্থা এখানে দেখায়, লোকেশন দেওয়া হয় আলাদা কার্টে */}
            {type === "delivery" && (
              <div
                className={`rounded-2xl border p-4 ${
                  locDone
                    ? "border-[#9ad6b0]/30 bg-[#9ad6b0]/[0.06]"
                    : "border-[#e3a83f]/30 bg-[#e3a83f]/[0.06]"
                }`}
              >
                {locDone ? (
                  <>
                    <p className="text-sm text-[#9ad6b0]">
                      ✅ ঠিকানা ও লোকেশন দেওয়া হয়েছে
                    </p>
                    <p className="mt-1 text-sm text-[#f3f1e8]">
                      {address.trim()}
                    </p>
                    <button
                      type="button"
                      onClick={openLoc}
                      className="mt-2 text-sm text-[#9ad6b0] underline"
                    >
                      বদলান
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-[#e3a83f]">
                      ডেলিভারির লোকেশন দেওয়া বাকি
                    </p>
                    <button
                      type="button"
                      onClick={openLoc}
                      className="mt-2 w-full rounded-xl border border-[#9ad6b0]/40 bg-[#9ad6b0]/10 py-3 text-[#9ad6b0]"
                    >
                      📍 লোকেশন দিতে ক্লিক করুন
                    </button>
                  </>
                )}
              </div>
            )}

            {error && <p className="text-sm text-[#e3a83f]">{error}</p>}

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => goStep(1)}
                className={ghostBtn}
              >
                ← পিছনে
              </button>
              <button type="button" onClick={next2} className={primaryBtn}>
                পরের ধাপ →
              </button>
            </div>
          </>
        )}

        {/* ধাপ ৩: আপনার তথ্য */}
        {step === 3 && (
          <>
            {type && (
              <p className="rounded-xl border border-[#f3f1e8]/15 px-3 py-2 text-sm text-[#9db8aa]">
                নেওয়ার ধরন:{" "}
                <span className="text-[#f3f1e8]">{TYPE_LABEL[type]}</span>
              </p>
            )}

            <input
              className={field}
              placeholder="আপনার নাম"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <div className="space-y-2">
              <input
                className={field}
                placeholder="মোবাইল নম্বর (WhatsApp আছে এমন)"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              {phone.trim() !== "" && !phoneOk && (
                <p className="text-xs text-[#e3a83f]">
                  নম্বর ১১ ডিজিটের হতে হবে, যেমন ০১৭১২৩৪৫৬৭৮
                </p>
              )}
              <input
                className={field}
                placeholder="নম্বরটি আবার লিখুন"
                inputMode="tel"
                value={phone2}
                onChange={(e) => setPhone2(e.target.value)}
              />
              {phone2.trim() !== "" && !phoneMatch && (
                <p className="text-xs text-[#e3a83f]">দুটি নম্বর মিলছে না</p>
              )}
              {phoneOk && phoneMatch && (
                <p className="text-xs text-[#9db8aa]">
                  নম্বর: {toBnDigits(p)} ·{" "}
                  <a
                    href={`https://wa.me/88${p}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#9ad6b0] underline"
                  >
                    WhatsApp-এ আছে কি না দেখুন ↗
                  </a>
                </p>
              )}
            </div>

            <input
              className={field}
              placeholder="কিছু জানাতে চাইলে (ঐচ্ছিক)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />

            {error && <p className="text-sm text-[#e3a83f]">{error}</p>}

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => goStep(2)}
                className={ghostBtn}
              >
                ← পিছনে
              </button>
              <button type="button" onClick={next3} className={primaryBtn}>
                পরের ধাপ →
              </button>
            </div>
          </>
        )}

        {/* ধাপ ৪: বিল ও আবেদন */}
        {step === 4 && (
          <>
            {type && (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-[#9ad6b0]/30 bg-[#9ad6b0]/[0.08] px-4 py-3">
                <span className="text-lg text-[#f3f1e8]">
                  {TYPE_LABEL[type]}
                </span>
                <button
                  type="button"
                  onClick={() => goStep(2)}
                  className="shrink-0 text-sm text-[#9ad6b0] underline"
                >
                  বদলান
                </button>
              </div>
            )}

            <div className="space-y-2 rounded-xl border border-[#f3f1e8]/15 p-4 text-sm text-[#f3f1e8]">
              {chosen.map((c) => (
                <div
                  key={c.name}
                  className="flex items-center justify-between"
                >
                  <span>{c.name}</span>
                  <span className="tabular-nums">{bn(c.qty)} টি</span>
                </div>
              ))}
              <div className="mt-2 space-y-1 border-t border-[#f3f1e8]/15 pt-2 text-[#9db8aa]">
                <p>
                  {name.trim()} · {toBnDigits(p)}
                </p>
                {type === "delivery" && address.trim() && (
                  <p>{address.trim()}</p>
                )}
                {note.trim() && <p>নোট: {note.trim()}</p>}
              </div>
            </div>

            {type && bill ? (
              <div className={billBusy ? "opacity-60" : ""}>
                <BillBox bill={bill} type={type} />
              </div>
            ) : billErr ? (
              <p className="text-sm text-[#e3a83f]">{billErr}</p>
            ) : (
              <p className="text-sm text-[#9db8aa]">বিল হিসাব হচ্ছে…</p>
            )}

            {error && <p className="text-sm text-[#e3a83f]">{error}</p>}

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => goStep(3)}
                className={ghostBtn}
              >
                ← পিছনে
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={busy || billBusy}
                className="w-full rounded-xl bg-[#9ad6b0] px-4 py-3 text-lg font-medium text-[#14372b] disabled:opacity-60"
              >
                {busy ? "পাঠানো হচ্ছে…" : "অর্ডারের আবেদন করুন"}
              </button>
            </div>
          </>
        )}
      </section>

      {/* ডেলিভারির লোকেশন দেওয়ার আলাদা কার্ট */}
      {locOpen && (
        <div
          onClick={() => setLocOpen(false)}
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 sm:items-center sm:p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-[92vh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-2xl border border-[#f3f1e8]/15 bg-[#14372b] sm:rounded-2xl"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#f3f1e8]/10 bg-[#14372b] px-5 py-3">
              <span className="text-base text-[#f3f1e8]">
                📍 ডেলিভারির লোকেশন
              </span>
              <button
                type="button"
                onClick={() => setLocOpen(false)}
                aria-label="বন্ধ করুন"
                className="px-2 text-xl leading-none text-[#9db8aa]"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 p-4">
              <textarea
                className={field}
                rows={2}
                placeholder="ডেলিভারির ঠিকানা"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />

              <LocationPicker value={loc} onChange={setLoc} />

              {billErr && (
                <div className="rounded-xl border border-[#e3a83f]/30 bg-[#e3a83f]/[0.08] p-3">
                  <p className="text-sm text-[#e3a83f]">
                    {billErr}
                    {billErr.includes("ডেলিভারি দেওয়া হয় না") &&
                      " বুকিং দিয়ে দোকান থেকে নিতে পারেন।"}
                  </p>
                </div>
              )}

              {locErr && <p className="text-sm text-[#e3a83f]">{locErr}</p>}

              <p className="text-xs text-[#9db8aa]">
                লোকেশন শুধু ডেলিভারির কাজে ব্যবহার করা হবে।
              </p>

              <button
                type="button"
                onClick={confirmLoc}
                className={primaryBtn}
              >
                নিশ্চিত করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}