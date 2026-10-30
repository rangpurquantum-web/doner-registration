"use client";

// স্টক রিপোতে নতুন ফাইল: page.tsx যে ফোল্ডারে আছে সেখানেই PreorderSection.tsx

import { useState } from "react";

type MenuItem = { name: string; price: number };
type Menu = {
  days: Record<string, MenuItem[]>;
  dates: Record<string, string>;
  minQty: number;
  serviceFee: number;
};
type Bill = { subtotal: number; serviceFee: number; total: number };
type OrderType = "booking" | "delivery";

const API = process.env.NEXT_PUBLIC_API_BASE ?? "";

const DAY_NAMES = [
  "রবিবার",
  "সোমবার",
  "মঙ্গলবার",
  "বুধবার",
  "বৃহস্পতিবার",
  "শুক্রবার",
  "শনিবার",
];
// শনিবার থেকে শুরু করে দেখানো হবে
const DAY_ORDER = [6, 0, 1, 2, 3, 4, 5];

const bn = (n: number) => n.toLocaleString("bn-BD");
const toEn = (s: string) =>
  s.replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d)));
const toBnDigits = (s: string) =>
  s.replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)]);
function normPhone(s: string) {
  return toEn(s).replace(/[\s-]/g, "").replace(/^\+?880/, "0");
}
const PHONE_RE = /^01[3-9]\d{8}$/;

function dateLabel(iso: string) {
  return new Date(`${iso}T00:00:00+06:00`).toLocaleDateString("bn-BD", {
    day: "numeric",
    month: "long",
    timeZone: "Asia/Dhaka",
  });
}

const field =
  "w-full rounded-xl border border-[#f3f1e8]/15 bg-[#f3f1e8]/[0.04] px-4 py-3 text-base text-[#f3f1e8] placeholder:text-[#9db8aa] outline-none focus:border-[#9ad6b0]/60";
const stepBtn =
  "h-10 w-10 rounded-full border border-[#f3f1e8]/20 text-xl text-[#f3f1e8] active:bg-[#f3f1e8]/10";
const primaryBtn =
  "w-full rounded-xl bg-[#9ad6b0] px-4 py-3 text-lg font-medium text-[#14372b] disabled:opacity-60";
const ghostBtn =
  "w-full rounded-xl border border-[#f3f1e8]/20 px-4 py-3 text-lg text-[#f3f1e8]";

export default function PreorderSection() {
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState<Menu | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadErr, setLoadErr] = useState("");

  const [step, setStep] = useState<1 | 2>(1);
  const [day, setDay] = useState<number | null>(null);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [type, setType] = useState<OrderType | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [phone2, setPhone2] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ bill: Bill; date: string } | null>(null);

  async function openSheet() {
    setOpen(true);
    if (menu || loading) return;
    setLoading(true);
    setLoadErr("");
    try {
      const res = await fetch(`${API}/api/public/preorder`);
      if (!res.ok) throw new Error("failed");
      setMenu((await res.json()) as Menu);
    } catch {
      setLoadErr("মেনু আনা যায়নি, ইন্টারনেট দেখে আবার চেষ্টা করুন");
    } finally {
      setLoading(false);
    }
  }

  const minQty = menu?.minQty ?? 5;
  const serviceFee = menu?.serviceFee ?? 5;
  const items = day !== null && menu ? (menu.days[String(day)] ?? []) : [];
  const chosen = items
    .filter((i) => (qty[i.name] ?? 0) > 0)
    .map((i) => ({ name: i.name, qty: qty[i.name], price: i.price }));
  const totalQty = chosen.reduce((s, c) => s + c.qty, 0);
  const subtotal = chosen.reduce((s, c) => s + c.price * c.qty, 0);

  const p = normPhone(phone);
  const phoneOk = PHONE_RE.test(p);
  const phoneMatch = normPhone(phone2) === p;

  function pickDay(d: number) {
    setDay(d);
    setQty({});
    setError("");
  }

  function setQ(n: string, v: number) {
    setQty((s) => ({ ...s, [n]: Math.max(0, Math.min(v, 100)) }));
  }

  function next() {
    setError("");
    if (day === null) return setError("কোন বারের জন্য অর্ডার করবেন, বেছে নিন");
    if (totalQty < minQty)
      return setError(`একটি অর্ডারে কমপক্ষে ${bn(minQty)}টি পিঠা নিতে হবে`);
    setStep(2);
  }

  async function submit() {
    setError("");
    if (day === null) return;
    if (!type) return setError("বুকিং না ডেলিভারি, একটি বেছে নিন");
    if (type === "delivery" && !address.trim())
      return setError("ডেলিভারির ঠিকানা লিখুন");
    if (!name.trim()) return setError("আপনার নাম লিখুন");
    if (!phoneOk) return setError("সঠিক মোবাইল নম্বর দিন (যেমন ০১৭১২৩৪৫৬৭৮)");
    if (!phoneMatch) return setError("দুটি নম্বর মেলেনি, আবার দেখুন");

    setBusy(true);
    try {
      const res = await fetch(`${API}/api/public/preorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekday: day,
          type,
          name: name.trim(),
          phone: p,
          address: type === "delivery" ? address.trim() : "",
          note: note.trim(),
          items: chosen.map((c) => ({ name: c.name, qty: c.qty })),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "প্রি-অর্ডার পাঠানো যায়নি");
      setDone({ bill: json.bill as Bill, date: json.targetDate as string });
    } catch (e) {
      setError(e instanceof Error ? e.message : "প্রি-অর্ডার পাঠানো যায়নি");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setDone(null);
    setStep(1);
    setDay(null);
    setQty({});
    setType(null);
    setPhone2("");
    setNote("");
    setError("");
  }

  const availableDays = menu
    ? DAY_ORDER.filter((d) => (menu.days[String(d)] ?? []).length > 0)
    : [];

  return (
    <>
      <button
        type="button"
        onClick={openSheet}
        className="mt-3 w-full rounded-xl border border-[#9ad6b0]/50 bg-[#9ad6b0]/10 px-4 py-3 text-lg font-medium text-[#9ad6b0]"
      >
        📅 প্রি-অর্ডার করুন
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 sm:items-center sm:p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-[92vh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-2xl border border-[#f3f1e8]/15 bg-[#14372b] sm:rounded-2xl"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#f3f1e8]/10 bg-[#14372b] px-5 py-3">
              <span className="text-base text-[#f3f1e8]">📅 প্রি-অর্ডার</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="বন্ধ করুন"
                className="px-2 text-xl leading-none text-[#9db8aa]"
              >
                ✕
              </button>
            </div>

            <div className="space-y-5 p-4 text-[#f3f1e8]">
              {loading && (
                <p className="text-sm text-[#9db8aa]">মেনু আনা হচ্ছে…</p>
              )}
              {loadErr && <p className="text-sm text-[#e3a83f]">{loadErr}</p>}

              {menu && availableDays.length === 0 && (
                <p className="text-sm text-[#9db8aa]">
                  এখন কোনো প্রি-অর্ডার মেনু নেই।
                </p>
              )}

              {/* সফল হলে */}
              {menu && done && (
                <div className="space-y-2 rounded-2xl border border-[#9ad6b0]/25 bg-[#9ad6b0]/[0.06] p-5">
                  <p className="text-xl">প্রি-অর্ডারের আবেদন পাঠানো হয়েছে</p>
                  <p className="text-base">
                    {dateLabel(done.date)} তারিখের জন্য · মোট বিল{" "}
                    <span className="font-medium">
                      {bn(done.bill.total)} টাকা
                    </span>
                  </p>
                  <p className="text-sm text-[#9db8aa]">
                    অ্যাপ্রুভ হলে আপনার WhatsApp-এ জানিয়ে দেওয়া হবে।
                    {type === "delivery" &&
                      " ডেলিভারি চার্জ অ্যাপ্রুভের সময় জানানো হবে।"}
                  </p>
                  <button
                    type="button"
                    onClick={reset}
                    className="pt-1 text-sm text-[#9ad6b0] underline"
                  >
                    আরেকটি প্রি-অর্ডার করুন
                  </button>
                </div>
              )}

              {/* ধাপ ১: বার ও পিঠা */}
              {menu && !done && availableDays.length > 0 && step === 1 && (
                <>
                  <div>
                    <p className="mb-2 text-lg">কোন বারের জন্য?</p>
                    <div className="grid grid-cols-3 gap-2">
                      {availableDays.map((d) => {
                        const on = day === d;
                        return (
                          <button
                            key={d}
                            type="button"
                            onClick={() => pickDay(d)}
                            className={`rounded-xl border px-2 py-2.5 text-base ${
                              on
                                ? "border-[#9ad6b0]/70 bg-[#9ad6b0]/10 text-[#f3f1e8]"
                                : "border-[#f3f1e8]/15 text-[#9db8aa]"
                            }`}
                          >
                            {DAY_NAMES[d]}
                          </button>
                        );
                      })}
                    </div>
                    {day !== null && menu.dates[String(day)] && (
                      <p className="mt-2 text-sm text-[#9db8aa]">
                        {DAY_NAMES[day]}, {dateLabel(menu.dates[String(day)])}{" "}
                        তারিখের জন্য
                      </p>
                    )}
                  </div>

                  {day !== null && (
                    <div className="space-y-3">
                      {items.map((it) => {
                        const q = qty[it.name] ?? 0;
                        return (
                          <div
                            key={it.name}
                            className="flex items-center justify-between gap-3"
                          >
                            <div>
                              <span className="text-lg">{it.name}</span>
                              <span className="ml-2 text-sm text-[#9db8aa]">
                                {bn(it.price)} টাকা
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                className={stepBtn}
                                onClick={() => setQ(it.name, q - 1)}
                              >
                                −
                              </button>
                              <span className="w-8 text-center text-lg tabular-nums">
                                {bn(q)}
                              </span>
                              <button
                                type="button"
                                className={stepBtn}
                                onClick={() => setQ(it.name, q + 1)}
                              >
                                +
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      {chosen.length > 0 && (
                        <div className="space-y-1 rounded-xl border border-[#f3f1e8]/15 p-3 text-sm text-[#9db8aa]">
                          <div className="flex items-center justify-between">
                            <span>মোট পিঠা</span>
                            <span className="tabular-nums text-[#f3f1e8]">
                              {bn(totalQty)} টি
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>পিঠার দাম</span>
                            <span className="tabular-nums text-[#f3f1e8]">
                              {bn(subtotal)} টাকা
                            </span>
                          </div>
                        </div>
                      )}

                      <p
                        className={`text-xs ${
                          totalQty >= minQty
                            ? "text-[#9db8aa]"
                            : "text-[#e3a83f]"
                        }`}
                      >
                        একটি অর্ডারে কমপক্ষে {bn(minQty)}টি পিঠা নিতে হবে।
                      </p>
                    </div>
                  )}

                  {error && <p className="text-sm text-[#e3a83f]">{error}</p>}

                  <button type="button" onClick={next} className={primaryBtn}>
                    পরের ধাপ →
                  </button>
                </>
              )}

              {/* ধাপ ২: নেওয়ার ধরন ও আপনার তথ্য */}
              {menu && !done && step === 2 && day !== null && (
                <>
                  <div className="space-y-1 rounded-xl border border-[#f3f1e8]/15 p-4 text-sm">
                    <p className="text-[#9db8aa]">
                      {DAY_NAMES[day]}, {dateLabel(menu.dates[String(day)])}
                    </p>
                    {chosen.map((c) => (
                      <div
                        key={c.name}
                        className="flex items-center justify-between"
                      >
                        <span>{c.name}</span>
                        <span className="tabular-nums">{bn(c.qty)} টি</span>
                      </div>
                    ))}
                    <div className="mt-2 flex items-center justify-between border-t border-[#f3f1e8]/15 pt-2">
                      <span>পিঠার দাম</span>
                      <span className="tabular-nums">{bn(subtotal)} টাকা</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>ওয়েবসাইট অপারেশন্স চার্জ</span>
                      <span className="tabular-nums">
                        {bn(serviceFee)} টাকা
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-base font-medium">
                      <span>মোট বিল</span>
                      <span className="tabular-nums">
                        {bn(subtotal + serviceFee)} টাকা
                      </span>
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-lg">পিঠা কীভাবে নিতে চান?</p>
                    <div className="grid grid-cols-2 gap-2">
                      {(
                        [
                          ["booking", "🏪 বুকিং", "দোকান থেকে নেবেন"],
                          ["delivery", "🛵 ডেলিভারি", "ঠিকানায় পৌঁছাবে"],
                        ] as const
                      ).map(([t, title, sub]) => {
                        const on = type === t;
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => {
                              setType(t);
                              setError("");
                            }}
                            className={`rounded-2xl border p-3 text-left ${
                              on
                                ? "border-[#9ad6b0]/70 bg-[#9ad6b0]/10"
                                : "border-[#f3f1e8]/15 bg-[#f3f1e8]/[0.03]"
                            }`}
                          >
                            <span className="block text-lg">{title}</span>
                            <span className="block text-xs text-[#9db8aa]">
                              {sub}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {type === "delivery" && (
                    <div className="space-y-2">
                      <textarea
                        className={field}
                        rows={2}
                        placeholder="ডেলিভারির ঠিকানা"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                      />
                      <p className="text-xs text-[#9db8aa]">
                        ডেলিভারি চার্জ অ্যাপ্রুভের সময় জানানো হবে।
                      </p>
                    </div>
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
                      <p className="text-xs text-[#e3a83f]">
                        দুটি নম্বর মিলছে না
                      </p>
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

                  <p className="text-xs text-[#9db8aa]">
                    টাকা দেবেন পিঠা নেওয়ার সময়, নগদে।
                  </p>

                  {error && <p className="text-sm text-[#e3a83f]">{error}</p>}

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setError("");
                        setStep(1);
                      }}
                      className={ghostBtn}
                    >
                      ← পিছনে
                    </button>
                    <button
                      type="button"
                      onClick={submit}
                      disabled={busy}
                      className={primaryBtn}
                    >
                      {busy ? "পাঠানো হচ্ছে…" : "প্রি-অর্ডার করুন"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
