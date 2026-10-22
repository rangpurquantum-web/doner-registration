"use client";

import { useCallback, useEffect, useState } from "react";

type StockItem = { name: string; remaining: number };
type StockData = { open: boolean; items: StockItem[]; updatedAt: string };

const LOW_LIMIT = 5;
const REFRESH_MS = 30_000;

const bn = (n: number) => n.toLocaleString("bn-BD");

function statusOf(n: number) {
if (n <= 0) {
return {
label: "শেষ",
badge: "border-red-100 bg-red-50 text-red-700",
dot: "bg-red-500",
card: "border-gray-100 bg-gray-50/80",
number: "text-gray-400",
};
}

if (n <= LOW_LIMIT) {
return {
label: "কম আছে",
badge: "border-amber-100 bg-amber-50 text-amber-800",
dot: "bg-amber-500",
card: "border-amber-100 bg-white hover:border-amber-300",
number: "text-amber-700",
};
}

return {
label: "পাওয়া যাচ্ছে",
badge: "border-emerald-100 bg-emerald-50 text-emerald-800",
dot: "bg-emerald-500",
card: "border-gray-100 bg-white hover:border-emerald-200",
number: "text-[#12462F]",
};
}

export default function PublicStockPage() {
const [data, setData] = useState<StockData | null>(null);
const [failed, setFailed] = useState(false);

const load = useCallback(async () => {
try {
const res = await fetch(
"${process.env.NEXT_PUBLIC_API_BASE ?? ""}/api/public/stock",
{ cache: "no-store" }
);

  if (!res.ok) throw new Error("Stock request failed");

  const json = (await res.json()) as StockData;

  if (
    typeof json.open !== "boolean" ||
    !Array.isArray(json.items) ||
    typeof json.updatedAt !== "string"
  ) {
    throw new Error("Invalid stock response");
  }

  setData(json);
  setFailed(false);
} catch {
  setFailed(true);
}

}, []);

useEffect(() => {
void load();

const timer = window.setInterval(() => {
  if (document.visibilityState === "visible") void load();
}, REFRESH_MS);

const onVisible = () => {
  if (document.visibilityState === "visible") void load();
};

document.addEventListener("visibilitychange", onVisible);

return () => {
  window.clearInterval(timer);
  document.removeEventListener("visibilitychange", onVisible);
};

}, [load]);

const items = data
? [...data.items].sort((a, b) => {
const aEnd = a.remaining <= 0 ? 1 : 0;
const bEnd = b.remaining <= 0 ? 1 : 0;
return aEnd - bEnd || a.name.localeCompare(b.name, "bn");
})
: [];

const availableCount = items.filter((p) => p.remaining > 0).length;
const totalRemaining = items.reduce(
(sum, p) => sum + Math.max(0, p.remaining),
0
);

const updatedDate = data ? new Date(data.updatedAt) : null;
const updated =
updatedDate && !Number.isNaN(updatedDate.getTime())
? updatedDate.toLocaleTimeString("bn-BD", {
hour: "numeric",
minute: "2-digit",
hour12: true,
timeZone: "Asia/Dhaka",
})
: null;

return (
<main className="min-h-screen overflow-hidden bg-[#F7F7F2] text-gray-900">
<div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-[#12462F]/10 to-transparent" />

  <div className="relative mx-auto max-w-2xl space-y-5 px-4 py-5 sm:px-6 sm:py-8">
    {/* Brand header */}
    <header className="relative overflow-hidden rounded-[28px] bg-[#12462F] text-white shadow-xl shadow-[#12462F]/15">
      <div className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full border border-white/10" />
      <div className="pointer-events-none absolute -right-3 -top-7 h-32 w-32 rounded-full border border-[#B8923F]/40" />

      <div className="relative px-5 pb-7 pt-6 sm:px-8 sm:pb-8 sm:pt-8">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#DCC58A]/40 bg-white/10 text-2xl font-bold text-[#DCC58A]">
            প
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#DCC58A]">
              Authentic Bengali Taste
            </p>
            <h1 className="text-2xl font-extrabold tracking-wide sm:text-3xl">
              Pragya Food
            </h1>
          </div>
        </div>

        <div className="mt-8">
          <p className="text-sm font-medium text-white/70">
            আজকের মেনু ও স্টক
          </p>
          <h2 className="mt-2 text-3xl font-extrabold leading-snug sm:text-4xl">
            ঘরোয়া পিঠা,
            <br />
            পছন্দের স্বাদ।
          </h2>
          <p className="mt-3 max-w-sm text-sm leading-6 text-white/75">
            আপনার পছন্দের পিঠা পাওয়া যাচ্ছে কি না, দেখে নিন এখানেই।
          </p>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs font-medium">
            <span
              className={`h-2 w-2 rounded-full ${
                !data
                  ? "bg-gray-300"
                  : data.open
                    ? "animate-pulse bg-emerald-300"
                    : "bg-amber-300"
              }`}
            />
            {!data
              ? "স্ট্যাটাস যাচাই হচ্ছে"
              : data.open
                ? "বিক্রি চলছে"
                : "বিক্রি বন্ধ"}
          </span>

          <span className="rounded-full border border-[#DCC58A]/30 bg-[#DCC58A]/10 px-3 py-2 text-xs text-[#F0DCA7]">
            লাইভ স্টক
            {updated ? ` · ${updated}` : ""}
          </span>
        </div>
      </div>

      <div className="h-1 bg-gradient-to-r from-transparent via-[#DCC58A] to-transparent" />
    </header>

    {/* Stock summary */}
    {data?.open && (
      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-[#12462F]">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5z" strokeLinejoin="round" />
              <path d="m4.5 7.5 7.5 4.3 7.5-4.3M12 12v8.5" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="mt-3 text-xs text-gray-500">পাওয়া যাচ্ছে</p>
          <p className="mt-1 text-3xl font-extrabold text-[#12462F]">
            {bn(availableCount)}
            <span className="ml-1 text-sm font-medium text-gray-500">
              ধরন
            </span>
          </p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F8F0DB] text-[#92712C]">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M5 7h14l-1 13H6L5 7Z" strokeLinejoin="round" />
              <path d="M9 7a3 3 0 0 1 6 0" strokeLinecap="round" />
            </svg>
          </div>
          <p className="mt-3 text-xs text-gray-500">মোট অবশিষ্ট</p>
          <p className="mt-1 text-3xl font-extrabold text-[#12462F]">
            {bn(totalRemaining)}
            <span className="ml-1 text-sm font-medium text-gray-500">
              টি
            </span>
          </p>
        </div>
      </section>
    )}

    {/* Menu section */}
    <section>
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#A48137]">
            Today&apos;s Collection
          </p>
          <h2 className="mt-1 text-xl font-extrabold text-gray-900 sm:text-2xl">
            আজকের পিঠার তালিকা
          </h2>
        </div>
        {data?.open && (
          <span className="shrink-0 rounded-full border border-gray-100 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600">
            {bn(items.length)} আইটেম
          </span>
        )}
      </div>

      {!data && !failed && (
        <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-[3px] border-[#12462F]/15 border-t-[#12462F]" />
          <p className="mt-4 text-sm font-semibold text-gray-700">
            স্টক লোড হচ্ছে...
          </p>
          <p className="mt-1 text-xs text-gray-400">
            একটু অপেক্ষা করুন
          </p>
        </div>
      )}

      {failed && !data && (
        <div className="rounded-2xl border border-red-100 bg-white p-7 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-xl font-bold text-red-600">
            !
          </div>
          <h3 className="mt-3 font-bold text-gray-900">
            স্টক আনা যায়নি
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            ইন্টারনেট সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।
          </p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-4 rounded-xl bg-[#12462F] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0D3623] focus:outline-none focus:ring-2 focus:ring-[#12462F]/30 focus:ring-offset-2"
          >
            আবার চেষ্টা করুন
          </button>
        </div>
      )}

      {data && !data.open && (
        <div className="rounded-2xl border border-amber-100 bg-white px-5 py-9 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-2xl">
            <svg viewBox="0 0 24 24" className="h-7 w-7 text-amber-700" fill="none" stroke="currentColor" strokeWidth="1.7">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" strokeLinecap="round" />
            </svg>
          </div>
          <h3 className="mt-4 text-lg font-bold text-gray-900">
            আজকের বিক্রি আপাতত বন্ধ
          </h3>
          <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-gray-500">
            বিক্রি আবার শুরু হলে এখানে পিঠার স্টক দেখা যাবে।
          </p>
        </div>
      )}

      {data && data.open && items.length === 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white px-5 py-9 text-center shadow-sm">
          <div className="text-3xl">🍚</div>
          <h3 className="mt-3 font-bold text-gray-800">
            এখনো কোনো পিঠা যোগ করা হয়নি
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            স্টক যোগ হলে এখানে তালিকা দেখা যাবে।
          </p>
        </div>
      )}

      {data && data.open && items.length > 0 && (
        <ul className="space-y-3">
          {items.map((p, index) => {
            const s = statusOf(p.remaining);

            return (
              <li
                key={p.name}
                className={`group flex items-center justify-between gap-3 rounded-2xl border p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-5 ${s.card}`}
              >
                <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F4F1E7] text-[#12462F] transition group-hover:bg-[#E8EDDF]">
                    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6">
                      <path d="M4 12c0-4 3.5-7 8-7s8 3 8 7H4Z" strokeLinejoin="round" />
                      <path d="M3 15h18M5 18h14" strokeLinecap="round" />
                      <path d="M8 9h.01M12 7.5h.01M16 9h.01" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                  </div>

                  <div className="min-w-0">
                    <p className="break-words text-base font-bold leading-6 text-gray-900 sm:text-lg">
                      {p.name}
                    </p>
                    <span
                      className={`mt-1.5 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${s.badge}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                      {s.label}
                    </span>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <p className={`text-2xl font-extrabold tabular-nums sm:text-3xl ${s.number}`}>
                    {bn(Math.max(0, p.remaining))}
                  </p>
                  <p className="mt-0.5 text-xs font-medium text-gray-400">
                    টি পিঠা
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {data &&
        data.open &&
        items.length > 0 &&
        items.every((p) => p.remaining <= 0) && (
          <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 p-4 text-center">
            <p className="text-sm font-bold text-red-700">
              আজকের জন্য সব পিঠা শেষ!
            </p>
            <p className="mt-1 text-xs text-red-600/80">
              নতুন স্টক যোগ হলে এই তালিকা আপডেট হবে।
            </p>
          </div>
        )}
    </section>

    {/* Footer */}
    <footer className="border-t border-[#12462F]/10 pt-5 text-center">
      <div className="mx-auto mb-3 h-px w-12 bg-[#B8923F]" />
      <p className="text-sm font-bold tracking-wide text-[#12462F]">
        Pragya Food
      </p>
      <p className="mt-1 text-xs text-gray-500">
        ঘরোয়া স্বাদ, যত্নের সঙ্গে।
      </p>
      <p className="mt-3 text-[10px] text-gray-400">
        স্টক প্রতি ৩০ সেকেন্ডে আপডেট হয়
      </p>
    </footer>
  </div>
</main>

);
}