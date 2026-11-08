"use client";

// স্টক রিপো: page.tsx (পুরো ফাইল বদলে দিন)
// Checkout.tsx একই ফোল্ডারে থাকতে হবে

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";

const Checkout = dynamic(() => import("./Checkout"), {
  ssr: false,
  loading: () => (
    <div className="h-40 animate-pulse rounded-2xl bg-gray-100" />
  ),
});

type Tier = "student" | "regular" | "special";
type MenuItem = { name: string; prices: Record<Tier, number> };
type Day = { date: string; weekday: number; items: MenuItem[] };
type Menu = { open: boolean; minQty: number; days: Day[] };
type Profile = { details: string; ingredients: string; image: string };
type Notice = {
  text: string;
  active: boolean;
  until: string | null;
  link?: string;
  linkLabel?: string;
};

const API = process.env.NEXT_PUBLIC_API_BASE ?? "";
const TOUR_KEY = "pf-tour-done";

const TIERS: { key: Tier; label: string; desc: string; bg: string }[] = [
  {
    key: "student",
    label: "স্টুডেন্ট বাজেট",
    desc: "কম দামে, বাজেটের মধ্যে",
    bg: "bg-[#FDE6D3]",
  },
  {
    key: "regular",
    label: "রেগুলার",
    desc: "রোজকার সাধারণ পিঠা",
    bg: "bg-[#DDEFD9]",
  },
  {
    key: "special",
    label: "স্পেশাল",
    desc: "দামী ও বিশেষ পিঠা",
    bg: "bg-[#E6E1F5]",
  },
];

const WEEK_SHORT = ["রবি", "সোম", "মঙ্গল", "বুধ", "বৃহস্পতি", "শুক্র", "শনি"];
const WEEK_FULL = [
  "রবিবার",
  "সোমবার",
  "মঙ্গলবার",
  "বুধবার",
  "বৃহস্পতিবার",
  "শুক্রবার",
  "শনিবার",
];

const bn = (n: number) => n.toLocaleString("bn-BD");

function dateLong(iso: string) {
  return new Date(`${iso}T00:00:00+06:00`).toLocaleDateString("bn-BD", {
    day: "numeric",
    month: "long",
    timeZone: "Asia/Dhaka",
  });
}
function dateShort(iso: string) {
  return new Date(`${iso}T00:00:00+06:00`).toLocaleDateString("bn-BD", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Dhaka",
  });
}

// ─── গাইডেড ট্যুর (পুরো পেজ ঝাপসা, শুধু একটা জায়গা উজ্জ্বল) ─────────────────
const STEP_MS = 4000; // প্রতিটি ধাপ কত মিলিসেকেন্ড থাকবে, তারপর নিজে পরের ধাপে যায়

type TourDef = { id: string; title: string; text: (minQty: number) => string };

const TOUR: TourDef[] = [
  {
    id: "tour-days",
    title: "দিন নির্বাচন",
    text: () => "কোন দিনের পিঠা চান, বেছে নিন।",
  },
  {
    id: "tour-tiers",
    title: "ক্যাটাগরি নির্বাচন",
    text: () => "রেগুলার, স্পেশাল বা স্টুডেন্ট বাজেট বেছে নিন।",
  },
  {
    id: "tour-first-add",
    title: "পিঠা যোগ করুন",
    text: (minQty) =>
      `পছন্দের পিঠা যোগ করুন। কমপক্ষে ${bn(minQty)}টি নিতে হবে।`,
  },
  {
    id: "tour-cart",
    title: "কার্ট ও অর্ডার",
    text: () => "কার্টে গিয়ে তথ্য পূরণ করে অর্ডার সম্পন্ন করুন।",
  },
];

const tourExists = (i: number) => !!document.getElementById(TOUR[i].id);

type Rect = { top: number; left: number; width: number; height: number };

function Tour({
  index,
  minQty,
  onGo,
  onEnd,
}: {
  index: number;
  minQty: number;
  onGo: (i: number) => void;
  onEnd: () => void;
}) {
  const def = TOUR[index];
  const [rect, setRect] = useState<Rect | null>(null);
  const [vp, setVp] = useState({ w: 0, h: 0 });

  const measure = useCallback(() => {
    const el = document.getElementById(def.id);
    setVp({ w: window.innerWidth, h: window.innerHeight });
    if (!el) {
      setRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [def.id]);

  useEffect(() => {
    // এই ধাপের জায়গাটা পেজে না থাকলে (যেমন মেনু খালি) পরের ধাপে চলে যায়
    if (!tourExists(index)) {
      let j = index + 1;
      while (j < TOUR.length && !tourExists(j)) j++;
      if (j >= TOUR.length) onEnd();
      else onGo(j);
      return;
    }

    const el = document.getElementById(TOUR[index].id);
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
    measure();
    const t1 = window.setTimeout(measure, 300);
    const t2 = window.setTimeout(measure, 700);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
      document.body.style.overflow = prev;
    };
  }, [index, measure, onGo, onEnd]);

  function next() {
    let j = index + 1;
    while (j < TOUR.length && !tourExists(j)) j++;
    if (j >= TOUR.length) return onEnd();
    onGo(j);
  }

  // জায়গাটা পর্দায় এসে গেলে ৪ সেকেন্ড পর নিজে নিজে পরের ধাপে যায়
  const ready = rect !== null;
  useEffect(() => {
    if (!ready) return;
    const t = window.setTimeout(next, STEP_MS);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, ready]);

  // এক ক্লিকে ট্যুর বাদ দেওয়ার বাটন: প্রতিটি ধাপে পর্দার উপরের কোণায় থাকে
  const skipPill = (
    <button
      type="button"
      onClick={onEnd}
      className="fixed left-4 top-4 z-[73] rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#1d1d1f] shadow-lg"
    >
      বাদ দিন
    </button>
  );

  if (!rect) {
    return (
      <>
        <div className="fixed inset-0 z-[70] bg-black/45 backdrop-blur-[3px]" />
        {skipPill}
      </>
    );
  }

  const pad = 8;
  const hTop = Math.max(0, rect.top - pad);
  const hLeft = Math.max(0, rect.left - pad);
  const hBottom = Math.min(vp.h, rect.top + rect.height + pad);
  const hRight = Math.min(vp.w, rect.left + rect.width + pad);
  const dim = "fixed z-[70] bg-black/45 backdrop-blur-[3px]";

  const avail = TOUR.map((_, i) => (tourExists(i) ? i : -1)).filter(
    (i) => i >= 0,
  );
  const pos = avail.indexOf(index) + 1;

  // উপরে ফাঁকা জায়গা থাকলে কমেন্ট বক্স উপরে বসে, না থাকলে নিচে
  const above = hTop > 190;
  const w = Math.min(320, vp.w - 32);
  const left = Math.min(
    Math.max(16, (hLeft + hRight) / 2 - w / 2),
    Math.max(16, vp.w - w - 16),
  );
  const tailX = Math.min(Math.max((hLeft + hRight) / 2 - left, 28), w - 28);
  const tipStyle = above
    ? { bottom: vp.h - hTop + 26, left, width: w }
    : { top: hBottom + 26, left, width: w };

  return (
    <>
      <style>{"@keyframes pf-tour-bar{from{width:0}to{width:100%}}"}</style>
      {skipPill}

      {/* চারপাশ ঝাপসা */}
      <div className={dim} style={{ top: 0, left: 0, right: 0, height: hTop }} />
      <div
        className={dim}
        style={{ top: hBottom, left: 0, right: 0, bottom: 0 }}
      />
      <div
        className={dim}
        style={{ top: hTop, left: 0, width: hLeft, height: hBottom - hTop }}
      />
      <div
        className={dim}
        style={{ top: hTop, left: hRight, right: 0, height: hBottom - hTop }}
      />
      {/* উজ্জ্বল জায়গার ওপর ক্লিক আটকানো, আর কমলা ফ্রেম */}
      <div
        className="fixed z-[70]"
        style={{
          top: hTop,
          left: hLeft,
          width: hRight - hLeft,
          height: hBottom - hTop,
        }}
      />
      <div
        className="pointer-events-none fixed z-[71] rounded-2xl border-2 border-[#F58220]"
        style={{
          top: hTop,
          left: hLeft,
          width: hRight - hLeft,
          height: hBottom - hTop,
        }}
      />

      {/* কমেন্ট বক্স */}
      <div className="fixed z-[72]" style={tipStyle}>
        <div className="relative rounded-md border-2 border-[#1d1d1f] bg-white p-4 text-[#1d1d1f] shadow-[4px_4px_0_0_rgba(0,0,0,0.85)] outline outline-1 outline-offset-[3px] outline-[#1d1d1f]">
          <p className="text-base font-bold">
            ধাপ {bn(pos)} / {bn(avail.length)} — {def.title}
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-gray-700">
            {def.text(minQty)}
          </p>
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-gray-200">
            <div
              key={index}
              className="h-full bg-[#F58220]"
              style={{ animation: `pf-tour-bar ${STEP_MS}ms linear forwards` }}
            />
          </div>

          {/* কমেন্ট বক্সের লেজ, যেটা জায়গাটার দিকে ইশারা করে */}
          {above ? (
            <svg
              width="34"
              height="22"
              viewBox="0 0 34 22"
              className="absolute"
              style={{ left: tailX - 17, bottom: -22 }}
              aria-hidden
            >
              <path
                d="M2 0 L17 20 L32 0 Z"
                fill="white"
                stroke="#1d1d1f"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <path
                d="M2 -1 L33 -1"
                stroke="white"
                strokeWidth="4"
              />
              <path
                d="M8 3 L14 12 M13 2 L17 9 M20 3 L19 9"
                stroke="#1d1d1f"
                strokeWidth="1.4"
              />
            </svg>
          ) : (
            <svg
              width="34"
              height="22"
              viewBox="0 0 34 22"
              className="absolute"
              style={{ left: tailX - 17, top: -22 }}
              aria-hidden
            >
              <path
                d="M2 22 L17 2 L32 22 Z"
                fill="white"
                stroke="#1d1d1f"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <path
                d="M2 23 L33 23"
                stroke="white"
                strokeWidth="4"
              />
              <path
                d="M8 19 L14 10 M13 20 L17 13 M20 19 L19 13"
                stroke="#1d1d1f"
                strokeWidth="1.4"
              />
            </svg>
          )}
        </div>
      </div>
    </>
  );
}

export default function OrderHome() {
  const [menu, setMenu] = useState<Menu | null>(null);
  const [failed, setFailed] = useState(false);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [notice, setNotice] = useState<Notice | null>(null);

  const [selDate, setSelDate] = useState<string | null>(null);
  const [tier, setTier] = useState<Tier | null>(null);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [viewing, setViewing] = useState<string | null>(null);
  const [hint, setHint] = useState("");

  const [tourStep, setTourStep] = useState<number | null>(null);
  const [tourChecked, setTourChecked] = useState(false);

  const load = useCallback(async () => {
    fetch("/api/notice")
      .then((r) => r.json())
      .then((n: Notice) => setNotice(n))
      .catch(() => {});
    try {
      const res = await fetch(`${API}/api/public/preorder-menu`);
      if (!res.ok) throw new Error("failed");
      setMenu((await res.json()) as Menu);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    load();
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [load]);

  useEffect(() => {
    fetch("/api/profiles")
      .then((r) => r.json())
      .then(setProfiles)
      .catch(() => {});
  }, []);

  // মেনু আসার পর একবার দেখা হয়: প্রথমবার হলে ট্যুর আগে চলে, নইলে সোজা ধরন বাছাই।
  // ট্যুর শেষ বা বাদ হলে তারপর ধরন বাছাইয়ের পপআপ আসে।
  useEffect(() => {
    if (tourChecked || !menu) return;
    let seen = false;
    try {
      seen = localStorage.getItem(TOUR_KEY) === "1";
    } catch {}
    setTourChecked(true);
    if (!seen) setTourStep(0);
  }, [menu, tourChecked]);

  // শেষ হলে বা বাদ দিলে ফোনে মনে রাখা হয়, আর নিজে থেকে আসে না
  const endTour = useCallback(() => {
    setTourStep(null);
    try {
      localStorage.setItem(TOUR_KEY, "1");
    } catch {}
  }, []);

  const day: Day | null = menu
    ? (menu.days.find((d) => d.date === selDate) ??
      menu.days.find((d) => d.items.length > 0) ??
      menu.days[0] ??
      null)
    : null;

  const tierInfo = TIERS.find((t) => t.key === tier) ?? null;
  const items = day?.items ?? [];

  const lines =
    tier === null
      ? []
      : items
          .filter((it) => (qty[it.name] ?? 0) > 0)
          .map((it) => ({
            name: it.name,
            qty: qty[it.name],
            price: it.prices[tier],
          }));
  const totalQty = lines.reduce((s, l) => s + l.qty, 0);
  const subtotal = lines.reduce((s, l) => s + l.qty * l.price, 0);
  const minQty = menu?.minQty ?? 5;

  const shownNotice =
    notice &&
    notice.active &&
    notice.text.trim() &&
    (!notice.until || Date.now() < new Date(notice.until).getTime())
      ? notice
      : null;

  function pickDay(date: string) {
    setSelDate(date);
    setQty({});
    setHint("");
  }

  function setQ(name: string, v: number) {
    setHint("");
    setQty((s) => ({ ...s, [name]: Math.max(0, Math.min(v, 100)) }));
  }

  function openCart() {
    if (!menu?.open) return setHint("এখন অনলাইন অর্ডার বন্ধ আছে");
    if (totalQty === 0) return setHint("আগে কিছু পিঠা যোগ করুন");
    if (totalQty < minQty)
      return setHint(
        `একটি অর্ডারে কমপক্ষে ${bn(minQty)}টি পিঠা নিতে হবে (আরও ${bn(
          minQty - totalQty,
        )}টি যোগ করুন)`,
      );
    setHint("");
    setCartOpen(true);
  }

  // কার্ট খোলা থাকলে পেছনের পেজ স্ক্রল বন্ধ, Esc চাপলে কার্ট বন্ধ
  useEffect(() => {
    if (!cartOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCartOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [cartOpen]);

  return (
    <main className="mx-auto min-h-screen max-w-md bg-white pb-32 text-[#1d1d1f]">
      {/* উপরের বার */}
      <header className="flex items-center justify-between px-5 pb-2 pt-6">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-gray-400">
            প্রাজ্ঞ ফুড
          </p>
          <h1 className="text-2xl font-bold leading-tight">পিঠা অর্ডার</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTourStep(0)}
            aria-label="সাহায্য: কীভাবে অর্ডার করবেন"
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F4F5F7] text-lg font-bold text-gray-500"
          >
            ?
          </button>
          <button
            id="tour-cart"
            type="button"
            onClick={openCart}
            aria-label="কার্ট"
            className="flex items-center gap-2 rounded-2xl bg-[#F58220] px-4 py-2.5 text-white shadow-md"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <circle cx="9" cy="20" r="1.5" />
              <circle cx="18" cy="20" r="1.5" />
              <path d="M2 3h3l2.7 12.4a1 1 0 0 0 1 .8h9.6a1 1 0 0 0 1-.8L21 7H6" />
            </svg>
            <span className="text-base font-bold tabular-nums">
              {bn(totalQty)}
            </span>
          </button>
        </div>
      </header>

      {/* নোটিশ */}
      {shownNotice && (
        <section className="mx-5 mt-3 rounded-2xl bg-[#FFF3E6] p-4">
          <p className="text-xs font-semibold text-[#F58220]">নোটিশ</p>
          <p className="mt-1 whitespace-pre-line text-base leading-relaxed">
            {shownNotice.text}
          </p>
          {shownNotice.link && (
            <a
              href={shownNotice.link}
              target={
                shownNotice.link.startsWith("tel:") ? undefined : "_blank"
              }
              rel="noopener noreferrer"
              className="mt-3 block w-full rounded-xl bg-[#F58220] px-4 py-3 text-center text-base font-semibold text-white"
            >
              {shownNotice.linkLabel?.trim() || "লিংক খুলুন"}
            </a>
          )}
        </section>
      )}

      {failed && !menu && (
        <section className="mx-5 mt-6 rounded-2xl bg-[#F4F5F7] p-6">
          <p className="text-xl font-semibold">মেনু আনা যায়নি</p>
          <p className="mt-2 text-sm text-gray-500">
            ইন্টারনেট ঠিক আছে কি না দেখে পেজটা আবার খুলুন।
          </p>
        </section>
      )}

      {!menu && !failed && (
        <div className="mx-5 mt-6 space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-3xl bg-gray-100"
            />
          ))}
        </div>
      )}

      {menu && !menu.open && (
        <section className="mx-5 mt-4 rounded-2xl bg-[#F4F5F7] p-4">
          <p className="text-base font-semibold">
            এখন অনলাইন অর্ডার বন্ধ আছে
          </p>
          <p className="mt-1 text-sm text-gray-500">
            মেনু দেখতে পারেন, অর্ডার খুললে এখান থেকেই করতে পারবেন।
          </p>
        </section>
      )}

      {menu && (
        <>
          {/* দিন বাছাই (আজ বাদে) */}
          <section className="mt-5">
            <p className="px-5 text-lg font-bold">কোন দিনের জন্য?</p>
            <div
              id="tour-days"
              className="mx-3 mt-3 flex gap-2.5 overflow-x-auto px-2 pb-1"
            >
              {menu.days.map((d, i) => {
                const on = day?.date === d.date;
                const closed = d.items.length === 0;
                return (
                  <button
                    key={d.date}
                    type="button"
                    onClick={() => pickDay(d.date)}
                    className={`flex w-[72px] shrink-0 flex-col items-center rounded-2xl px-2 py-2.5 ${
                      on
                        ? "bg-[#F58220] text-white shadow-md"
                        : "bg-[#F4F5F7] text-[#1d1d1f]"
                    } ${closed && !on ? "opacity-50" : ""}`}
                  >
                    <span className="text-sm font-semibold">
                      {i === 0 ? "কাল" : WEEK_SHORT[d.weekday]}
                    </span>
                    <span
                      className={`mt-0.5 text-xs ${
                        on ? "text-white/90" : "text-gray-500"
                      }`}
                    >
                      {dateShort(d.date)}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* ধরনের ট্যাব */}
          <section className="mt-5 px-5">
            <div
              id="tour-tiers"
              className="flex gap-5 border-b border-gray-100"
            >
              {TIERS.map((t) => {
                const on = tier === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setTier(t.key)}
                    className={`-mb-px border-b-2 pb-2.5 text-[15px] ${
                      on
                        ? "border-[#F58220] font-bold text-[#1d1d1f]"
                        : "border-transparent text-gray-400"
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </section>

          {/* পিঠার তালিকা */}
          <section className="mt-5 px-5">
            {day && (
              <p className="mb-3 text-sm text-gray-500">
                {WEEK_FULL[day.weekday]}, {dateLong(day.date)} তারিখের পিঠা
              </p>
            )}

            {items.length === 0 ? (
              <div className="rounded-2xl bg-[#F4F5F7] p-5">
                <p className="text-base font-semibold">
                  এই দিনে প্রি-অর্ডার নেওয়া হচ্ছে না
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  অন্য একটি দিন বেছে নিন।
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {items.map((it, idx) => {
                  const q = qty[it.name] ?? 0;
                  const img = profiles[it.name]?.image;
                  const price = tier ? it.prices[tier] : null;
                  return (
                    <li
                      key={it.name}
                      className="flex items-center gap-4 rounded-3xl bg-white p-3 shadow-[0_4px_20px_rgba(0,0,0,0.07)]"
                    >
                      <button
                        type="button"
                        onClick={() => profiles[it.name] && setViewing(it.name)}
                        className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-[#FDE6D3]"
                        aria-label={`${it.name} এর ছবি`}
                      >
                        {img ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={img}
                            alt={it.name}
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-4xl font-bold text-[#F58220]/50">
                            {it.name.charAt(0)}
                          </span>
                        )}
                      </button>

                      <div className="min-w-0 flex-1">
                        <p className="text-lg font-semibold leading-snug">
                          {it.name}
                        </p>
                        {price !== null ? (
                          <p className="mt-0.5 text-xl font-bold text-[#F58220]">
                            {bn(price)}
                            <span className="ml-1 text-sm font-medium">
                              টাকা
                            </span>
                          </p>
                        ) : (
                          <p className="mt-0.5 text-sm text-gray-400">
                            ধরন বেছে নিন
                          </p>
                        )}

                        <div
                          id={idx === 0 ? "tour-first-add" : undefined}
                          className="mt-2 inline-block"
                        >
                          {q === 0 ? (
                            <button
                              type="button"
                              disabled={tier === null}
                              onClick={() => setQ(it.name, 1)}
                              className="rounded-full bg-[#F58220] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                            >
                              + যোগ করুন
                            </button>
                          ) : (
                            <div className="inline-flex items-center gap-3 rounded-full bg-[#F4F5F7] px-2 py-1">
                              <button
                                type="button"
                                onClick={() => setQ(it.name, q - 1)}
                                className="h-8 w-8 rounded-full bg-white text-xl shadow-sm"
                                aria-label="কমান"
                              >
                                −
                              </button>
                              <span className="min-w-[1.5rem] text-center text-lg font-bold tabular-nums">
                                {bn(q)}
                              </span>
                              <button
                                type="button"
                                onClick={() => setQ(it.name, q + 1)}
                                className="h-8 w-8 rounded-full bg-[#F58220] text-xl text-white"
                                aria-label="বাড়ান"
                              >
                                +
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}

      {/* নিচের কার্ট বার */}
      {menu && (totalQty > 0 || hint) && (
        <div className="fixed inset-x-0 bottom-0 z-30 bg-gradient-to-t from-white via-white to-transparent px-4 pb-4 pt-6">
          <div className="mx-auto max-w-md">
            {hint && (
              <p className="mb-2 rounded-xl bg-red-50 px-3 py-2 text-center text-sm text-red-700">
                {hint}
              </p>
            )}
            {totalQty > 0 && (
              <button
                type="button"
                onClick={openCart}
                className="flex w-full items-center justify-between rounded-2xl bg-[#F58220] px-5 py-4 text-white shadow-lg"
              >
                <span className="text-base font-semibold">
                  {bn(totalQty)} টি পিঠা
                </span>
                <span className="text-base font-bold">
                  {bn(subtotal)} টাকা · কার্ট দেখুন →
                </span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ধরন বাছাইয়ের পপআপ (সাইট খুললেই আসে) */}
      {menu && tourChecked && tourStep === null && tier === null && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4">
          <div className="w-full max-w-md rounded-t-3xl bg-white p-5 sm:rounded-3xl">
            <p className="text-2xl font-bold">আপনার পছন্দ বাছুন</p>
            <p className="mt-1 text-sm text-gray-500">
              কেমন পিঠা নিতে চান?
            </p>
            <div className="mt-4 space-y-3">
              {TIERS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTier(t.key)}
                  className={`flex w-full items-center justify-between gap-4 rounded-3xl p-5 text-left ${t.bg}`}
                >
                  <span>
                    <span className="block text-xl font-bold">{t.label}</span>
                    <span className="block text-sm text-gray-600">
                      {t.desc}
                    </span>
                  </span>
                  <span className="text-xl text-gray-500" aria-hidden>
                    →
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* কার্ট / চেকআউট */}
      {cartOpen && menu && tier && day && tierInfo && (
        <div
          onClick={() => setCartOpen(false)}
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-[92vh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-3xl bg-white sm:rounded-3xl"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-5 py-3">
              <span className="text-base font-semibold">আপনার কার্ট</span>
              <button
                type="button"
                onClick={() => setCartOpen(false)}
                aria-label="কার্ট বন্ধ করুন"
                className="px-2 text-xl leading-none text-gray-400"
              >
                ✕
              </button>
            </div>
            <div className="p-4">
              <Checkout
                lines={lines}
                date={day.date}
                dateText={`${WEEK_FULL[day.weekday]}, ${dateLong(day.date)}`}
                tier={tier}
                tierLabel={tierInfo.label}
                minQty={minQty}
                onClose={() => setCartOpen(false)}
                onSubmitted={() => setQty({})}
              />
            </div>
          </div>
        </div>
      )}

      {/* পিঠার ছবি ও বিবরণ */}
      {viewing && profiles[viewing] && (
        <div
          onClick={() => setViewing(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white"
          >
            {profiles[viewing].image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profiles[viewing].image}
                alt={viewing}
                className="w-full"
              />
            )}
            <div className="p-5">
              <h3 className="text-2xl font-bold">{viewing}</h3>
              {profiles[viewing].details && (
                <p className="mt-2 text-sm leading-relaxed">
                  {profiles[viewing].details}
                </p>
              )}
              {profiles[viewing].ingredients && (
                <p className="mt-3 text-sm text-gray-500">
                  উপকরণ: {profiles[viewing].ingredients}
                </p>
              )}
              <button
                type="button"
                onClick={() => setViewing(null)}
                className="mt-5 w-full rounded-2xl bg-[#F58220] py-3 font-semibold text-white"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* গাইডেড ট্যুর */}
      {tourStep !== null && menu && !cartOpen && (
        <Tour
          index={tourStep}
          minQty={minQty}
          onGo={setTourStep}
          onEnd={endTour}
        />
      )}
    </main>
  );
}
