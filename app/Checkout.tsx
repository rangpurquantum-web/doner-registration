"use client";

// স্টক রিপোতে নতুন ফাইল: page.tsx যে ফোল্ডারে আছে সেখানেই Checkout.tsx

import { useEffect, useState } from "react";
import LocationPicker, { type Coords } from "./LocationPicker";

type Tier = "student" | "regular" | "special";
type Line = { name: string; qty: number; price: number };
type Bill = {
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  total: number;
  km: number | null;
};
type OrderType = "booking" | "delivery";
type PayMethod = "cod" | "online";

type Props = {
  lines: Line[];
  date: string; // YYYY-MM-DD
  dateText: string; // যেমন "রবিবার, ১৫ নভেম্বর"
  tier: Tier;
  tierLabel: string;
  minQty: number;
  onClose: () => void;
  onSubmitted: () => void;
};

const API = process.env.NEXT_PUBLIC_API_BASE ?? "";

const bn = (n: number) => n.toLocaleString("bn-BD");
const toEn = (s: string) =>
  s.replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d)));
const toBnDigits = (s: string) =>
  s.replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)]);
function normPhone(s: string) {
  return toEn(s).replace(/[\s-]/g, "").replace(/^\+?880/, "0");
}
const PHONE_RE = /^01[3-9]\d{8}$/;

const field =
  "w-full rounded-2xl border border-gray-200 bg-[#F4F5F7] px-4 py-3 text-base text-[#1d1d1f] placeholder:text-gray-400 outline-none focus:border-[#F58220]";
const primaryBtn =
  "w-full rounded-2xl bg-[#F58220] px-4 py-3.5 text-lg font-semibold text-white disabled:opacity-60";
const ghostBtn =
  "w-full rounded-2xl border border-gray-300 px-4 py-3.5 text-lg text-[#1d1d1f]";

function Steps({ step }: { step: 1 | 2 | 3 }) {
  const labels = ["নেওয়ার ধরন", "আপনার তথ্য", "বিল ও আবেদন"];
  return (
    <ol className="flex items-start gap-2">
      {labels.map((l, i) => {
        const n = i + 1;
        const on = n <= step;
        return (
          <li key={l} className="flex flex-1 flex-col gap-1.5">
            <span
              className={`h-1.5 rounded-full ${on ? "bg-[#F58220]" : "bg-gray-200"}`}
            />
            <span
              className={`text-[11px] leading-tight ${
                n === step ? "font-semibold text-[#1d1d1f]" : "text-gray-400"
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
    <div className="space-y-1.5 rounded-2xl bg-[#FFF3E6] p-4 text-[#1d1d1f]">
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
      <div className="mt-1 border-t border-orange-200 pt-2">
        <div className={`${row} text-lg font-bold`}>
          <span>মোট বিল</span>
          <span className="tabular-nums text-[#F58220]">
            {bn(bill.total)} টাকা
          </span>
        </div>
      </div>
      {type === "delivery" && bill.km != null && (
        <p className="pt-1 text-xs text-gray-500">
          দোকান থেকে দূরত্ব প্রায় {bn(bill.km)} কিমি
        </p>
      )}
    </div>
  );
}

export default function Checkout({
  lines,
  date,
  dateText,
  tier,
  tierLabel,
  minQty,
  onClose,
  onSubmitted,
}: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [type, setType] = useState<OrderType | null>(null);
  const [payMethod, setPayMethod] = useState<PayMethod | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [phone2, setPhone2] = useState("");
  const [landmark, setLandmark] = useState("");
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

  const chosen = lines.map((l) => ({ name: l.name, qty: l.qty }));
  const totalQty = lines.reduce((s, l) => s + l.qty, 0);

  const p = normPhone(phone);
  const phoneOk = PHONE_RE.test(p);
  const phoneMatch = normPhone(phone2) === p;

  function goStep(n: 1 | 2 | 3) {
    setError("");
    setStep(n);
    setTimeout(() => {
      document
        .getElementById("checkout-top")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }

  function openLoc() {
    setLocErr("");
    setLocOpen(true);
  }

  function confirmLoc() {
    setLocErr("");
    if (!loc) return setLocErr("ম্যাপে আপনার ডেলিভারির জায়গায় পিন দিন");
    if (billBusy)
      return setLocErr("ডেলিভারি চার্জ হিসাব হচ্ছে, একটু অপেক্ষা করুন");
    if (billErr) return setLocErr(billErr);
    setError("");
    setLocOpen(false);
  }

  // বিল আসে সার্ভার থেকে। পিঠা, ধরন, পিন, তারিখ বা পিঠার ধরন বদলালে নতুন করে আনা হয়।
  const quoteKey = JSON.stringify({
    type,
    chosen,
    date,
    tier,
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
            preorder: { date, tier },
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
    if (!type) return setError("বুকিং না ডেলিভারি, একটি বেছে নিন");
    if (type === "delivery") {
      if (!loc) return setError("ডেলিভারি লোকেশন দিন");
      if (billErr) return setError(billErr);
    }
    goStep(2);
  }

  function next2() {
    setError("");
    if (!name.trim()) return setError("আপনার নাম লিখুন");
    if (!phoneOk) return setError("সঠিক মোবাইল নম্বর দিন (যেমন ০১৭১২৩৪৫৬৭৮)");
    if (!phoneMatch) return setError("দুটি নম্বর মেলেনি, আবার দেখুন");
    goStep(3);
  }

  async function submit() {
    setError("");
    if (lines.length === 0 || totalQty < minQty)
      return setError(`একটি অর্ডারে কমপক্ষে ${bn(minQty)}টি পিঠা নিতে হবে`);
    if (!type) {
      setStep(1);
      return setError("বুকিং না ডেলিভারি, একটি বেছে নিন");
    }
    if (type === "delivery" && !loc) {
      setStep(1);
      return setError("ডেলিভারি লোকেশন দিন");
    }
    if (!name.trim() || !phoneOk) {
      setStep(2);
      return setError("নাম ও সঠিক মোবাইল নম্বর দিন");
    }
    if (billErr) return setError(billErr);
    if (!payMethod) return setError("টাকা কীভাবে দেবেন, একটি বেছে নিন");

    setBusy(true);
    try {
      const res = await fetch(`${API}/api/public/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          payMethod,
          name: name.trim(),
          phone: p,
          address: type === "delivery" ? landmark.trim() : "",
          lat: type === "delivery" ? loc?.lat : undefined,
          lng: type === "delivery" ? loc?.lng : undefined,
          note: note.trim(),
          items: chosen,
          preorder: { date, tier },
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "অর্ডার পাঠানো যায়নি");
      setDone((json.bill as Bill) ?? null);
      onSubmitted();
    } catch (e) {
      setError(e instanceof Error ? e.message : "অর্ডার পাঠানো যায়নি");
    } finally {
      setBusy(false);
    }
  }

  // ── আবেদন পাঠানো হয়ে গেলে ──
  if (done !== false) {
    return (
      <section id="checkout-top" className="space-y-3 text-[#1d1d1f]">
        <div className="rounded-3xl bg-[#FFF3E6] p-5">
          <p className="text-2xl font-bold">✅ আবেদন পাঠানো হয়েছে</p>
          <p className="mt-2 text-base">
            {dateText} তারিখের জন্য · {tierLabel}
          </p>
          {done && (
            <p className="mt-1 text-base">
              মোট বিল:{" "}
              <span className="font-bold text-[#F58220]">
                {bn(done.total)} টাকা
              </span>
            </p>
          )}
          <p className="mt-2 text-sm text-gray-600">
            {payMethod === "online"
              ? "অ্যাপ্রুভ হলে আপনার WhatsApp-এ পেমেন্টের লিংক পাঠানো হবে। লিংকে গিয়ে পুরো বিলের টাকা একবারে দিন।"
              : "অ্যাপ্রুভ হলে আপনার WhatsApp-এ জানিয়ে দেওয়া হবে।"}
          </p>
        </div>
        <button type="button" onClick={onClose} className={primaryBtn}>
          ঠিক আছে
        </button>
      </section>
    );
  }

  return (
    <>
      <section id="checkout-top" className="space-y-5 text-[#1d1d1f]">
        <div className="rounded-2xl bg-[#F4F5F7] px-4 py-3 text-sm">
          <p className="font-semibold">📅 {dateText} তারিখের জন্য</p>
          <p className="text-gray-500">
            {tierLabel} · {bn(totalQty)} টি পিঠা
          </p>
        </div>

        <Steps step={step} />

        {/* ধাপ ১: নেওয়ার ধরন */}
        {step === 1 && (
          <>
            <p className="text-lg font-semibold">পিঠা কীভাবে নিতে চান?</p>

            <div className="space-y-3">
              {(
                [
                  {
                    t: "booking",
                    title: "🏪 বুকিং",
                    sub: "দোকানে এসে নিজে নিয়ে যাব",
                    note: "ডেলিভারি চার্জ লাগবে না।",
                  },
                  {
                    t: "delivery",
                    title: "🛵 ডেলিভারি",
                    sub: "আমার জায়গায় পৌঁছে দিন",
                    note: "দূরত্ব অনুযায়ী ডেলিভারি চার্জ যোগ হবে।",
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
                    }}
                    className={`w-full rounded-2xl border-2 p-4 text-left ${
                      on
                        ? "border-[#F58220] bg-[#FFF3E6]"
                        : "border-gray-200 bg-white"
                    }`}
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="text-xl font-semibold">{o.title}</span>
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-full border text-[11px] ${
                          on
                            ? "border-[#F58220] bg-[#F58220] text-white"
                            : "border-gray-300 text-transparent"
                        }`}
                        aria-hidden
                      >
                        ✓
                      </span>
                    </span>
                    <span className="mt-1 block text-base">{o.sub}</span>
                    <span className="mt-0.5 block text-xs text-gray-500">
                      {o.note}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* ডেলিভারিতে শুধু একটা বাটন। ম্যাপ খোলে বাটন চাপলে */}
            {type === "delivery" &&
              (loc ? (
                <div className="rounded-2xl bg-[#E8F5E9] p-4">
                  <p className="text-sm font-semibold text-green-800">
                    ✅ ডেলিভারি লোকেশন দেওয়া হয়েছে
                  </p>
                  {landmark.trim() && (
                    <p className="mt-1 text-sm">{landmark.trim()}</p>
                  )}
                  <button
                    type="button"
                    onClick={openLoc}
                    className="mt-2 text-sm font-medium text-[#F58220] underline"
                  >
                    বদলান
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={openLoc}
                  className="w-full rounded-2xl border-2 border-[#F58220] bg-white px-4 py-3.5 text-lg font-semibold text-[#F58220]"
                >
                  📍 ডেলিভারি লোকেশন দিন
                </button>
              ))}

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button type="button" onClick={next1} className={primaryBtn}>
              পরের ধাপ →
            </button>
          </>
        )}

        {/* ধাপ ২: আপনার তথ্য */}
        {step === 2 && (
          <>
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
                <p className="text-xs text-red-600">
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
                <p className="text-xs text-red-600">দুটি নম্বর মিলছে না</p>
              )}
              {phoneOk && phoneMatch && (
                <p className="text-xs text-gray-500">
                  নম্বর: {toBnDigits(p)} ·{" "}
                  <a
                    href={`https://wa.me/88${p}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-[#F58220] underline"
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

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => goStep(1)} className={ghostBtn}>
                ← পিছনে
              </button>
              <button type="button" onClick={next2} className={primaryBtn}>
                পরের ধাপ →
              </button>
            </div>
          </>
        )}

        {/* ধাপ ৩: বিল, টাকা দেওয়ার ধরন ও আবেদন */}
        {step === 3 && (
          <>
            <div className="space-y-2 rounded-2xl border border-gray-200 p-4 text-sm">
              {lines.length > 0
                ? lines.map((l) => (
                    <div
                      key={l.name}
                      className="flex items-center justify-between"
                    >
                      <span>{l.name}</span>
                      <span className="tabular-nums">{bn(l.qty)} টি</span>
                    </div>
                  ))
                : null}
              <div className="mt-2 space-y-1 border-t border-gray-100 pt-2 text-gray-500">
                <p>
                  {name.trim()} · {toBnDigits(p)}
                </p>
                <p>
                  {type === "delivery" ? "🛵 ডেলিভারি" : "🏪 বুকিং"}
                  {type === "delivery" && landmark.trim()
                    ? ` · ${landmark.trim()}`
                    : ""}
                </p>
                {note.trim() && <p>নোট: {note.trim()}</p>}
              </div>
            </div>

            {type && bill ? (
              <div className={billBusy ? "opacity-60" : ""}>
                <BillBox bill={bill} type={type} />
              </div>
            ) : billErr ? (
              <p className="text-sm text-red-600">{billErr}</p>
            ) : (
              <p className="text-sm text-gray-500">বিল হিসাব হচ্ছে…</p>
            )}

            <div className="space-y-3">
              <p className="text-lg font-semibold">টাকা কীভাবে দেবেন?</p>
              {(
                [
                  {
                    m: "cod",
                    title: "💵 নগদে",
                    sub:
                      type === "delivery"
                        ? "ডেলিভারির সময় হাতে হাতে দেবেন"
                        : "দোকান থেকে নেওয়ার সময় দেবেন",
                  },
                  {
                    m: "online",
                    title: "📱 অনলাইনে (বিকাশ/নগদ/রকেট)",
                    sub: "অ্যাপ্রুভ হলে WhatsApp-এ পেমেন্ট লিংক যাবে। পুরো বিলের টাকা একবারে দিতে হবে।",
                  },
                ] as const
              ).map((o) => {
                const on = payMethod === o.m;
                return (
                  <button
                    key={o.m}
                    type="button"
                    onClick={() => {
                      setPayMethod(o.m);
                      setError("");
                    }}
                    className={`w-full rounded-2xl border-2 p-4 text-left ${
                      on
                        ? "border-[#F58220] bg-[#FFF3E6]"
                        : "border-gray-200 bg-white"
                    }`}
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="text-lg font-semibold">{o.title}</span>
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-full border text-[11px] ${
                          on
                            ? "border-[#F58220] bg-[#F58220] text-white"
                            : "border-gray-300 text-transparent"
                        }`}
                        aria-hidden
                      >
                        ✓
                      </span>
                    </span>
                    <span className="mt-1 block text-xs text-gray-500">
                      {o.sub}
                    </span>
                  </button>
                );
              })}
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => goStep(2)} className={ghostBtn}>
                ← পিছনে
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={busy || billBusy}
                className={primaryBtn}
              >
                {busy ? "পাঠানো হচ্ছে…" : "অর্ডার করুন"}
              </button>
            </div>
          </>
        )}
      </section>

      {/* ডেলিভারি লোকেশন: বাটন চাপলে তবেই ম্যাপ খোলে */}
      {locOpen && (
        <div
          onClick={() => setLocOpen(false)}
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-[92vh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-3xl bg-white text-[#1d1d1f] sm:rounded-3xl"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-5 py-3">
              <span className="text-base font-semibold">
                📍 ডেলিভারি লোকেশন
              </span>
              <button
                type="button"
                onClick={() => setLocOpen(false)}
                aria-label="বন্ধ করুন"
                className="px-2 text-xl leading-none text-gray-400"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 p-4">
              <LocationPicker value={loc} onChange={setLoc} />

              <input
                className={field}
                placeholder="বাড়ির নাম বা ল্যান্ডমার্ক (ঐচ্ছিক)"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
              />

              {billErr && (
                <div className="rounded-2xl bg-red-50 p-3">
                  <p className="text-sm text-red-700">
                    {billErr}
                    {billErr.includes("ডেলিভারি দেওয়া হয় না") &&
                      " বুকিং দিয়ে দোকান থেকে নিতে পারেন।"}
                  </p>
                </div>
              )}

              {locErr && <p className="text-sm text-red-600">{locErr}</p>}

              <p className="text-xs text-gray-500">
                লোকেশন শুধু ডেলিভারির কাজে ব্যবহার করা হবে।
              </p>

              <button type="button" onClick={confirmLoc} className={primaryBtn}>
                নিশ্চিত করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}