"use client";

// স্টক রিপো: page.tsx (পুরো ফাইল বদলে দিন)
// Checkout.tsx একই ফোল্ডারে থাকতে হবে

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Tour, { type TourStepDef } from "./Tour";

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
const MESSENGER_LINK = "https://m.me/pragyafood";
const LOGO_SRC = "/logo.png"; // public/logo.png

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

// পিঠার নাম মেলানোর জন্য: "পিঠা" শব্দ, নারকেল/নারিকেল বানান ও বাড়তি স্পেস বাদ
const norm = (s: string) =>
  s
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/নারকেল/g, "নারিকেল")
    .replace(/পিঠা/g, "")
    .replace(/\s+/g, " ")
    .trim();

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
  const [logoOk, setLogoOk] = useState(true);

  const [tourOn, setTourOn] = useState(false);
  const [fromLink, setFromLink] = useState(false);
  const [linkNote, setLinkNote] = useState("");
  const linkApplied = useRef(false);
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
      .then((p: Record<string, Profile>) => {
        const m: Record<string, Profile> = {};
        for (const [k, v] of Object.entries(p)) m[norm(k)] = v;
        setProfiles(m);
      })
      .catch(() => {});
  }, []);

  // রূপকথা এজেন্টের লিংক: ?date=YYYY-MM-DD&tier=regular&items=নাম~সংখ্যা|নাম~সংখ্যা
  // লিংকে ঢুকলে তারিখ, ক্যাটাগরি ও পিঠা কার্টে সাজানো থাকে, আর কার্ট খুলে যায়
  useEffect(() => {
    if (!menu || linkApplied.current) return;
    linkApplied.current = true;

    const q = new URLSearchParams(window.location.search);
    const rawItems = q.get("items");
    if (!rawItems) return;

    const date = q.get("date") ?? "";
    const t = q.get("tier") ?? "";
    const tierKey = (["student", "regular", "special"] as const).find(
      (k) => k === t,
    );
    const dayHit = menu.days.find(
      (d) => d.date === date && d.items.length > 0,
    );
    if (!dayHit || !tierKey) {
      setLinkNote("লিংকের তারিখ বা ক্যাটাগরি ঠিক নেই, নিচ থেকে নিজে বেছে নিন।");
      return;
    }

    const wanted: Record<string, number> = {};
    const missing: string[] = [];
    for (const part of rawItems.split("|")) {
      const i = part.lastIndexOf("~");
      if (i < 1) continue;
      const name = part.slice(0, i).trim();
      const n = Math.floor(Number(part.slice(i + 1)));
      if (!name || !(n >= 1 && n <= 100)) continue;
      if (dayHit.items.some((it) => it.name === name)) {
        wanted[name] = Math.min(100, (wanted[name] ?? 0) + n);
      } else {
        missing.push(name);
      }
    }

    setSelDate(dayHit.date);
    setTier(tierKey);
    setQty(wanted);
    setFromLink(true);
    if (missing.length > 0) {
      setLinkNote(`${missing.join(", ")} ওই দিনের মেনুতে নেই, তাই বাদ গেছে।`);
    }

    const total = Object.values(wanted).reduce((a, b) => a + b, 0);
    if (total > 0 && total < menu.minQty) {
      setHint(
        `একটি অর্ডারে কমপক্ষে ${bn(menu.minQty)}টি পিঠা নিতে হবে (আরও ${bn(
          menu.minQty - total,
        )}টি যোগ করুন)`,
      );
    } else if (total > 0 && menu.open) {
      setCartOpen(true);
    }
  }, [menu]);

  // মেনু আসার পর একবার দেখা হয়: প্রথমবার হলে ট্যুর আগে চলে, নইলে সোজা ধরন বাছাই।
  // ট্যুর শেষ বা বাদ হলে তারপর ধরন বাছাইয়ের পপআপ আসে।
  useEffect(() => {
    if (tourChecked || !menu) return;
    let seen = false;
    try {
      seen = localStorage.getItem(TOUR_KEY) === "1";
    } catch {}
    setTourChecked(true);
    const fromAgent = new URLSearchParams(window.location.search).has("items");
    if (!seen && !fromAgent) setTourOn(true);
  }, [menu, tourChecked]);

  // শেষ হলে বা বাদ দিলে ফোনে মনে রাখা হয়, আর নিজে থেকে আসে না
  const endTour = useCallback(() => {
    setTourOn(false);
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

  const homeTour: TourStepDef[] = [
    {
      id: "tour-days",
      title: "দিন নির্বাচন",
      text: "কোন দিনের পিঠা চান, বেছে নিন।",
    },
    {
      id: "tour-tiers",
      title: "ক্যাটাগরি নির্বাচন",
      text: "রেগুলার, স্পেশাল বা স্টুডেন্ট বাজেট বেছে নিন।",
    },
    {
      id: "tour-first-add",
      title: "পিঠা যোগ করুন",
      text: `পছন্দের পিঠা যোগ করুন। কমপক্ষে ${bn(minQty)}টি নিতে হবে।`,
    },
    {
      id: "tour-cart",
      title: "কার্ট ও অর্ডার",
      text: "কার্টে গিয়ে তথ্য পূরণ করে অর্ডার সম্পন্ন করুন।",
    },
  ];

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
          <div className="flex items-center gap-1.5">
            {logoOk ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={LOGO_SRC}
                alt=""
                className="h-7 w-7 rounded-lg object-contain"
                onError={() => setLogoOk(false)}
              />
            ) : (
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F58220] text-sm font-bold text-white">
                প্র
              </span>
            )}
            <p className="text-sm font-bold text-gray-500">প্রাজ্ঞ ফুড</p>
          </div>
          <h1 className="text-2xl font-bold leading-tight">পিঠা অর্ডার</h1>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={MESSENGER_LINK}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="মেসেঞ্জারে চ্যাট করুন"
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F4F5F7] text-[#0084ff]"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-6 w-6"
              fill="currentColor"
              aria-hidden
            >
              <path d="M12 2C6.36 2 2 6.13 2 11.7c0 2.91 1.19 5.43 3.14 7.17.16.15.26.36.27.58l.05 1.78c.02.57.6.94 1.12.71l1.98-.87c.17-.07.35-.09.52-.05.91.25 1.87.38 2.92.38 5.64 0 10-4.13 10-9.7S17.64 2 12 2zm6 7.46l-2.94 4.66c-.47.74-1.47.93-2.17.4l-2.34-1.75a.6.6 0 0 0-.72 0l-3.16 2.4c-.42.32-.97-.18-.69-.63l2.94-4.66c.47-.74 1.47-.93 2.17-.4l2.34 1.75c.21.16.5.16.72 0l3.16-2.4c.42-.32.97.18.69.63z" />
            </svg>
          </a>
          <button
            type="button"
            onClick={() => setTourOn(true)}
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

      {/* রূপকথার লিংকে এলে */}
      {(fromLink || linkNote) && (
        <section className="mx-5 mt-3 rounded-2xl bg-[#E4F1E1] p-4">
          {fromLink && (
            <>
              <p className="text-sm font-bold text-green-800">
                রূপকথা আপনার জন্য কার্ট সাজিয়ে দিয়েছে
              </p>
              <p className="mt-1 text-sm text-gray-700">
                পিঠা ও সংখ্যা দেখে নিন, দরকার হলে বদলান, তারপর অর্ডার করুন।
              </p>
            </>
          )}
          {linkNote && (
            <p className="mt-1 text-sm text-amber-800">{linkNote}</p>
          )}
        </section>
      )}

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
          {/* দিন নির্বাচন (আজ বাদে): সব কার্ড সমান আকারের, বড় */}
          <section className="mt-6">
            <p className="px-5 text-lg font-bold">কোন দিনের জন্য?</p>
            <div
              id="tour-days"
              className="mx-3 mt-3 flex gap-3 overflow-x-auto px-2 py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {menu.days.map((d, i) => {
                const on = day?.date === d.date;
                const closed = d.items.length === 0;
                return (
                  <button
                    key={d.date}
                    type="button"
                    onClick={() => pickDay(d.date)}
                    className={`flex h-[88px] w-[88px] shrink-0 flex-col items-center justify-center gap-1 rounded-2xl ${
                      on
                        ? "bg-[#F58220] text-white shadow-md"
                        : "bg-[#F4F5F7] text-[#1d1d1f]"
                    } ${closed && !on ? "opacity-50" : ""}`}
                  >
                    <span className="text-base font-bold leading-tight">
                      {i === 0 ? "কাল" : WEEK_SHORT[d.weekday]}
                    </span>
                    <span
                      className={`text-sm leading-tight ${
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

          {/* ক্যাটাগরি: ছোট ও মিনিমাল, একই লাইনে তিনটি */}
          <section className="mt-9 px-5">
            <div
              id="tour-tiers"
              className="grid grid-cols-3 border-b border-gray-200"
            >
              {TIERS.map((t, i) => {
                const on = tier === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setTier(t.key)}
                    className={`relative whitespace-nowrap px-1 py-3 text-center text-[14px] ${
                      on
                        ? "font-bold text-[#1d1d1f]"
                        : "font-medium text-gray-500"
                    }`}
                  >
                    {i > 0 && (
                      <span
                        aria-hidden
                        className="absolute left-0 top-1/4 h-1/2 w-px bg-gray-200"
                      />
                    )}
                    {t.label}
                    {on && (
                      <span
                        aria-hidden
                        className="absolute inset-x-2 -bottom-px h-[3px] rounded-full bg-[#F58220]"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          {/* পিঠার তালিকা */}
          <section className="mt-6 px-5">
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
                  const img = profiles[norm(it.name)]?.image;
                  const price = tier ? it.prices[tier] : null;
                  return (
                    <li
                      key={it.name}
                      className="flex items-center gap-4 rounded-3xl bg-white p-3 shadow-[0_4px_20px_rgba(0,0,0,0.07)]"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          profiles[norm(it.name)] && setViewing(norm(it.name))
                        }
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
      {menu && tourChecked && !tourOn && tier === null && (
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

      {/* কার্ট / চেকআউট: নিচ থেকে ওঠা বটম শিট, পর্দার প্রায় ৯০% */}
      {cartOpen && menu && tier && day && tierInfo && (
        <div
          onClick={() => setCartOpen(false)}
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex h-[90dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white sm:h-[85dvh] sm:rounded-3xl"
          >
            <Checkout
              lines={lines}
              date={day.date}
              dateText={`${WEEK_FULL[day.weekday]}, ${dateLong(day.date)}`}
              tier={tier}
              tierLabel={tierInfo.label}
              minQty={minQty}
              onClose={() => setCartOpen(false)}
              onSubmitted={() => {
                setQty({});
                setFromLink(false);
              }}
            />
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
              <h3 className="text-2xl font-bold">
                {items.find((i) => norm(i.name) === viewing)?.name ?? viewing}
              </h3>
              {profiles[viewing].details && (
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">
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
      {tourOn && menu && !cartOpen && (
        <Tour steps={homeTour} onEnd={endTour} />
      )}
    </main>
  );
}