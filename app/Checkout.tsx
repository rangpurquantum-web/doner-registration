"use client";

// স্টক রিপো: Checkout.tsx (পুরো ফাইল বদলে দিন)
// page.tsx যে ফোল্ডারে আছে, সেখানেই থাকবে

import { useEffect, useRef, useState } from "react";
import LocationPicker, { type Coords } from "./LocationPicker";
import Tour, { type TourStepDef } from "./Tour";

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
  "w-full rounded-2xl border border-gray-200 bg-[#F4F5F7] px-4 py-3.5 text-base text-[#1d1d1f] placeholder:text-gray-400 outline-none focus:border-[#F58220]";
const cta =
  "h-14 w-full rounded-2xl bg-[#F58220] text-lg font-bold text-white shadow-lg shadow-orange-200 disabled:opacity-60";
const backBtn =
  "h-14 rounded-2xl border border-gray-300 px-5 text-base font-medium text-[#1d1d1f]";

// ─── চেকআউটের ট্যুর: প্রতিটি ধাপে প্রথমবার ঢুকলে চলে ─────────────────────────
const TOURS: Record<string, TourStepDef[]> = {
  "co-1": [
    {
      id: "co-type",
      title: "নেওয়ার ধরন",
      text: "বুকিং (দোকান থেকে নেওয়া) বা ডেলিভারি, একটি বেছে নিন।",
    },
    {
      id: "co-cta",
      title: "পরের ধাপ",
      text: "বাছাই শেষ হলে এই বাটন চেপে এগিয়ে যান।",
    },
  ],
  "co-2": [
    { id: "co-name", title: "আপনার নাম", text: "অর্ডারের নামটা এখানে লিখুন।" },
    {
      id: "co-phone",
      title: "মোবাইল নম্বর",
      text: "WhatsApp আছে এমন নম্বর দিন, নিচের ঘরে আবার লিখুন।",
    },
    {
      id: "co-cta",
      title: "পরের ধাপ",
      text: "তথ্য দেওয়া হলে এগিয়ে যান।",
    },
  ],
  "co-3": [
    {
      id: "co-bill",
      title: "বিল দেখুন",
      text: "পিঠার দাম ও চার্জসহ মোট বিল এখানে দেখুন।",
    },
    {
      id: "co-pay",
      title: "টাকা দেওয়ার ধরন",
      text: "নগদে নাকি অনলাইনে দেবেন, একটি বেছে নিন।",
    },
    {
      id: "co-cta",
      title: "অর্ডার করুন",
      text: "এই বাটন চাপলেই আপনার অর্ডারের আবেদন চলে যাবে।",
    },
  ],
  loc: [
    {
      id: "loc-mapbox",
      title: "ম্যাপে পিন দিন",
      text: "ম্যাপে চাপ দিয়ে আপনার বাসার জায়গায় পিন দিন। দরকার হলে পিন টেনে ঠিক করুন।",
    },
    {
      id: "loc-gps",
      title: "বর্তমান লোকেশন",
      text: "অথবা এই বাটন চাপুন, আপনার এখনকার জায়গা নিজে থেকে বসে যাবে।",
    },
    {
      id: "loc-landmark",
      title: "ল্যান্ডমার্ক (ঐচ্ছিক)",
      text: "চাইলে বাড়ির নাম বা পরিচিত কোনো জায়গা লিখুন।",
    },
    {
      id: "loc-confirm",
      title: "নিশ্চিত করুন",
      text: "পিন দেওয়া হলে এই বাটন চাপুন।",
    },
  ],
};

// ─── আইকন (ইমোজি নয়, আঁকা আইকন) ──────────────────────────────────────────────
type IconProps = { className?: string };
const svgBase = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function CartIcon({ className }: IconProps) {
  return (
    <svg {...svgBase} className={className}>
      <circle cx="9" cy="20" r="1.5" />
      <circle cx="18" cy="20" r="1.5" />
      <path d="M2 3h3l2.7 12.4a1 1 0 0 0 1 .8h9.6a1 1 0 0 0 1-.8L21 7H6" />
    </svg>
  );
}
function StoreIcon({ className }: IconProps) {
  return (
    <svg {...svgBase} className={className}>
      <path d="M3 9l1.5-5h15L21 9" />
      <path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0" />
      <path d="M5 12v8h14v-8" />
      <path d="M10 20v-5h4v5" />
    </svg>
  );
}
function TruckIcon({ className }: IconProps) {
  return (
    <svg {...svgBase} className={className}>
      <path d="M2 6h11v10H2z" />
      <path d="M13 9h4l3 3v4h-7z" />
      <circle cx="6.5" cy="17.5" r="1.8" />
      <circle cx="16.5" cy="17.5" r="1.8" />
    </svg>
  );
}
function PinIcon({ className }: IconProps) {
  return (
    <svg {...svgBase} className={className}>
      <path d="M12 21s-7-6.2-7-11a7 7 0 1 1 14 0c0 4.8-7 11-7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}
function CheckIcon({ className }: IconProps) {
  return (
    <svg {...svgBase} strokeWidth={2.6} className={className}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

// নির্বাচিত অপশনের রেডিও চিহ্ন
function Radio({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
        on ? "border-[#F58220]" : "border-gray-300"
      }`}
    >
      {on && <span className="h-3 w-3 rounded-full bg-[#F58220]" />}
    </span>
  );
}

// তিন ধাপ, নম্বরসহ। শেষ হওয়া ধাপে টিক চিহ্ন, চলতি ধাপে কমলা বৃত্ত
function Steps({ step }: { step: 1 | 2 | 3 }) {
  const labels = ["নেওয়ার ধরন", "আপনার তথ্য", "বিল ও অর্ডার"];
  return (
    <div className="relative">
      <div className="absolute left-[16.67%] right-[16.67%] top-[18px] h-1 -translate-y-1/2 rounded-full bg-gray-200" />
      <div
        className="absolute left-[16.67%] top-[18px] h-1 -translate-y-1/2 rounded-full bg-[#F58220] transition-all duration-300"
        style={{ width: `${((step - 1) / 2) * 66.67}%` }}
      />
      <ol className="relative grid grid-cols-3">
        {labels.map((l, i) => {
          const n = i + 1;
          const done = n < step;
          const on = n === step;
          return (
            <li key={l} className="flex flex-col items-center gap-2">
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-full text-base font-bold ${
                  done || on
                    ? "bg-[#F58220] text-white"
                    : "bg-gray-200 text-gray-500"
                } ${on ? "ring-4 ring-[#F58220]/25" : ""}`}
              >
                {done ? <CheckIcon className="h-5 w-5" /> : bn(n)}
              </span>
              <span
                className={`text-center text-xs leading-tight ${
                  on ? "font-bold text-[#1d1d1f]" : "text-gray-500"
                }`}
              >
                {l}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
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

  const bodyRef = useRef<HTMLDivElement>(null);

  // ট্যুর: প্রতিটি ধাপে প্রথমবার ঢুকলে নিজে থেকে চলে, পরে আর আসে না।
  // হেডারের "?" বাটনে যেকোনো সময় আবার দেখা যায়।
  const [tourKey, setTourKey] = useState<string | null>(null);

  function startTour(key: string, force = false) {
    if (!force) {
      try {
        if (localStorage.getItem(`pf-tour-${key}`) === "1") return;
      } catch {}
    }
    setTourKey(key);
  }

  function endCheckoutTour() {
    if (tourKey) {
      try {
        localStorage.setItem(`pf-tour-${tourKey}`, "1");
      } catch {}
    }
    setTourKey(null);
  }

  // কার্টের নতুন ধাপে গেলেই ওই ধাপের ট্যুর
  useEffect(() => {
    if (done !== false || locOpen) return;
    const t = window.setTimeout(() => startTour(`co-${step}`), 450);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, done, locOpen]);

  // লোকেশনের ম্যাপ খুললে লোকেশনের ট্যুর
  useEffect(() => {
    if (!locOpen) return;
    const t = window.setTimeout(() => startTour("loc"), 500);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locOpen]);

  const chosen = lines.map((l) => ({ name: l.name, qty: l.qty }));
  const totalQty = lines.reduce((s, l) => s + l.qty, 0);

  const p = normPhone(phone);
  const phoneOk = PHONE_RE.test(p);
  const phoneMatch = normPhone(phone2) === p;

  // "বুধবার, ১১ নভেম্বর" কে বার ও তারিখে ভাগ করা
  const [weekdayText, dayText] = dateText.includes(", ")
    ? (dateText.split(", ") as [string, string])
    : ["", dateText];

  function goStep(n: 1 | 2 | 3) {
    setError("");
    setStep(n);
    setTimeout(() => {
      bodyRef.current?.scrollTo({ top: 0, behavior: "smooth" });
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

  return (
    <>
      <div className="flex h-full min-h-0 flex-col text-[#1d1d1f]">
        {/* বটম শিটের ধরার দাগ ও হেডার */}
        <div className="shrink-0">
          <span
            aria-hidden
            className="mx-auto mt-2 block h-1 w-10 rounded-full bg-gray-300"
          />
          <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-3.5">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F58220] text-white shadow-sm">
                <CartIcon className="h-6 w-6" />
              </span>
              <div>
                <p className="text-lg font-bold leading-tight">আপনার কার্ট</p>
                <p className="text-xs text-gray-500">
                  {done !== false
                    ? "আবেদন পাঠানো হয়েছে"
                    : "অর্ডার সম্পন্ন করতে তিনটি ধাপ"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {done === false && (
                <button
                  type="button"
                  onClick={() => startTour(`co-${step}`, true)}
                  aria-label="সাহায্য: এই ধাপে কী করবেন"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F4F5F7] text-base font-bold text-gray-500"
                >
                  ?
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                aria-label="কার্ট বন্ধ করুন"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F4F5F7] text-lg text-gray-500"
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        {/* মাঝের অংশ: স্ক্রল হয় */}
        <div
          ref={bodyRef}
          className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 py-5"
        >
          {/* আবেদন পাঠানো হয়ে গেলে */}
          {done !== false ? (
            <div className="rounded-3xl bg-[#FFF3E6] p-5">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F58220] text-white">
                <CheckIcon className="h-7 w-7" />
              </span>
              <p className="mt-3 text-2xl font-bold">আবেদন পাঠানো হয়েছে</p>
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
              <p className="mt-3 text-sm text-gray-600">
                {payMethod === "online"
                  ? "অ্যাপ্রুভ হলে আপনার WhatsApp-এ পেমেন্টের লিংক পাঠানো হবে। লিংকে গিয়ে পুরো বিলের টাকা একবারে দিন।"
                  : "অ্যাপ্রুভ হলে আপনার WhatsApp-এ জানিয়ে দেওয়া হবে।"}
              </p>
            </div>
          ) : (
            <>
              {/* অর্ডারের সারাংশ: তিনটি আলাদা রঙের ঘর */}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-2xl bg-[#FFF3E6] px-2 py-3 text-center">
                  <p className="text-[11px] font-semibold text-[#C65F00]">
                    তারিখ
                  </p>
                  <p className="mt-1 text-sm font-bold leading-snug">
                    {dayText}
                  </p>
                  {weekdayText && (
                    <p className="text-xs text-gray-600">{weekdayText}</p>
                  )}
                </div>
                <div className="rounded-2xl bg-[#E4F1E1] px-2 py-3 text-center">
                  <p className="text-[11px] font-semibold text-green-800">
                    ক্যাটাগরি
                  </p>
                  <p className="mt-1 text-sm font-bold leading-snug">
                    {tierLabel}
                  </p>
                </div>
                <div className="rounded-2xl bg-[#E8E3F6] px-2 py-3 text-center">
                  <p className="text-[11px] font-semibold text-violet-800">
                    মোট পিঠা
                  </p>
                  <p className="mt-1 text-sm font-bold leading-snug">
                    {bn(totalQty)} টি
                  </p>
                </div>
              </div>

              <Steps step={step} />

              {/* ধাপ ১: নেওয়ার ধরন */}
              {step === 1 && (
                <>
                  <p className="text-lg font-bold">পিঠা কীভাবে নিতে চান?</p>

                  <div id="co-type" className="space-y-3">
                    {(
                      [
                        {
                          t: "booking",
                          title: "বুকিং",
                          sub: "দোকানে এসে নিজে নিয়ে যাব",
                          note: "ডেলিভারি চার্জ লাগবে না।",
                          Icon: StoreIcon,
                        },
                        {
                          t: "delivery",
                          title: "ডেলিভারি",
                          sub: "আমার জায়গায় পৌঁছে দিন",
                          note: "দূরত্ব অনুযায়ী ডেলিভারি চার্জ যোগ হবে।",
                          Icon: TruckIcon,
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
                          className={`flex w-full items-center gap-4 rounded-2xl border-2 p-4 text-left transition-colors ${
                            on
                              ? "border-[#F58220] bg-[#FFF8F0]"
                              : "border-gray-200 bg-white"
                          }`}
                        >
                          <span
                            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${
                              on
                                ? "bg-[#F58220] text-white"
                                : "bg-[#F4F5F7] text-gray-600"
                            }`}
                          >
                            <o.Icon className="h-7 w-7" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-lg font-bold">
                              {o.title}
                            </span>
                            <span className="block text-sm">{o.sub}</span>
                            <span className="mt-0.5 block text-xs text-gray-500">
                              {o.note}
                            </span>
                          </span>
                          <Radio on={on} />
                        </button>
                      );
                    })}
                  </div>

                  {/* ডেলিভারিতে শুধু একটা বাটন। ম্যাপ খোলে বাটন চাপলে */}
                  {type === "delivery" &&
                    (loc ? (
                      <div className="flex items-center gap-3 rounded-2xl bg-[#E4F1E1] p-4">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-600 text-white">
                          <CheckIcon className="h-5 w-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-green-800">
                            ডেলিভারি লোকেশন দেওয়া হয়েছে
                          </p>
                          {landmark.trim() && (
                            <p className="truncate text-sm">
                              {landmark.trim()}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={openLoc}
                          className="shrink-0 text-sm font-semibold text-[#F58220] underline"
                        >
                          বদলান
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={openLoc}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#F58220] bg-white px-4 py-4 text-lg font-bold text-[#F58220]"
                      >
                        <PinIcon className="h-6 w-6" />
                        ডেলিভারি লোকেশন দিন
                      </button>
                    ))}
                </>
              )}

              {/* ধাপ ২: আপনার তথ্য */}
              {step === 2 && (
                <>
                  <p className="text-lg font-bold">আপনার তথ্য</p>

                  <input
                    id="co-name"
                    className={field}
                    placeholder="আপনার নাম"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />

                  <div id="co-phone" className="space-y-2">
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
                      <p className="text-xs text-red-600">
                        দুটি নম্বর মিলছে না
                      </p>
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
                </>
              )}

              {/* ধাপ ৩: বিল, টাকা দেওয়ার ধরন ও আবেদন */}
              {step === 3 && (
                <>
                  <div className="space-y-2 rounded-2xl border border-gray-200 p-4 text-sm">
                    {lines.map((l) => (
                      <div
                        key={l.name}
                        className="flex items-center justify-between"
                      >
                        <span>{l.name}</span>
                        <span className="tabular-nums">{bn(l.qty)} টি</span>
                      </div>
                    ))}
                    <div className="mt-2 space-y-1 border-t border-gray-100 pt-2 text-gray-500">
                      <p>
                        {name.trim()} · {toBnDigits(p)}
                      </p>
                      <p>
                        {type === "delivery" ? "ডেলিভারি" : "বুকিং"}
                        {type === "delivery" && landmark.trim()
                          ? ` · ${landmark.trim()}`
                          : ""}
                      </p>
                      {note.trim() && <p>নোট: {note.trim()}</p>}
                    </div>
                  </div>

                  <div id="co-bill">
                    {type && bill ? (
                      <div className={billBusy ? "opacity-60" : ""}>
                        <BillBox bill={bill} type={type} />
                      </div>
                    ) : billErr ? (
                      <p className="text-sm text-red-600">{billErr}</p>
                    ) : (
                      <p className="text-sm text-gray-500">বিল হিসাব হচ্ছে…</p>
                    )}
                  </div>

                  <div id="co-pay" className="space-y-3">
                    <p className="text-lg font-bold">টাকা কীভাবে দেবেন?</p>
                    {(
                      [
                        {
                          m: "cod",
                          title: "নগদে",
                          sub:
                            type === "delivery"
                              ? "ডেলিভারির সময় হাতে হাতে দেবেন"
                              : "দোকান থেকে নেওয়ার সময় দেবেন",
                        },
                        {
                          m: "online",
                          title: "অনলাইনে (বিকাশ/নগদ/রকেট)",
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
                          className={`flex w-full items-center gap-4 rounded-2xl border-2 p-4 text-left transition-colors ${
                            on
                              ? "border-[#F58220] bg-[#FFF8F0]"
                              : "border-gray-200 bg-white"
                          }`}
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block text-lg font-bold">
                              {o.title}
                            </span>
                            <span className="mt-0.5 block text-xs text-gray-500">
                              {o.sub}
                            </span>
                          </span>
                          <Radio on={on} />
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* নিচের বাটন: সবসময় দেখা যায় */}
        <div
          id="co-cta"
          className="shrink-0 border-t border-gray-100 bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3"
        >
          {error && done === false && (
            <p className="mb-2 rounded-xl bg-red-50 px-3 py-2 text-center text-sm text-red-700">
              {error}
            </p>
          )}

          {done !== false ? (
            <button type="button" onClick={onClose} className={cta}>
              ঠিক আছে
            </button>
          ) : step === 1 ? (
            <button type="button" onClick={next1} className={cta}>
              পরের ধাপে যান →
            </button>
          ) : step === 2 ? (
            <div className="grid grid-cols-[auto_1fr] gap-2">
              <button type="button" onClick={() => goStep(1)} className={backBtn}>
                ← পিছনে
              </button>
              <button type="button" onClick={next2} className={cta}>
                পরের ধাপে যান →
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-[auto_1fr] gap-2">
              <button type="button" onClick={() => goStep(2)} className={backBtn}>
                ← পিছনে
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={busy || billBusy}
                className={cta}
              >
                {busy ? "পাঠানো হচ্ছে…" : "অর্ডার করুন"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ডেলিভারি লোকেশন: বাটন চাপলে তবেই ম্যাপ খোলে */}
      {locOpen && (
        <div
          onClick={() => setLocOpen(false)}
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-[92dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-3xl bg-white text-[#1d1d1f] sm:rounded-3xl"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-5 py-3">
              <span className="flex items-center gap-2 text-base font-bold">
                <PinIcon className="h-5 w-5 text-[#F58220]" />
                ডেলিভারি লোকেশন
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
                id="loc-landmark"
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

              <button
                id="loc-confirm"
                type="button"
                onClick={confirmLoc}
                className={cta}
              >
                নিশ্চিত করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ট্যুর */}
      {tourKey && (
        <Tour
          key={tourKey}
          steps={TOURS[tourKey]}
          onEnd={endCheckoutTour}
        />
      )}
    </>
  );
}
