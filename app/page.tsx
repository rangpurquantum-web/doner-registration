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

const TIERS: {
  key: Tier;
  label: string;
  emoji: string;
  desc: string;
  bg: string;
}[] = [
  {
    key: "student",
    label: "স্টুডেন্ট বাজেট",
    emoji: "🎓",
    desc: "কম দামে, বাজেটের মধ্যে",
    bg: "bg-[#FDE6D3]",
  },
  {
    key: "regular",
    label: "রেগুলার",
    emoji: "🍽️",
    desc: "রোজকার সাধারণ পিঠা",
    bg: "bg-[#DDEFD9]",
  },
  {
    key: "special",
    label: "স্পেশাল",
    emoji: "💎",
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
        <button
          type="button"
          onClick={openCart}
          aria-label="কার্ট"
          className="flex items-center gap-2 rounded-2xl bg-[#F58220] px-4 py-2.5 text-white shadow-md"
        >
          <span aria-hidden>🛒</span>
          <span className="text-base font-bold tabular-nums">
            {bn(totalQty)}
          </span>
        </button>
      </header>

      {/* নোটিশ */}
      {shownNotice && (
        <section className="mx-5 mt-3 rounded-2xl bg-[#FFF3E6] p-4">
          <p className="text-xs font-semibold text-[#F58220]">📢 নোটিশ</p>
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
            <div className="mt-3 flex gap-2.5 overflow-x-auto px-5 pb-1">
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
            <div className="flex gap-5 border-b border-gray-100">
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
                {items.map((it) => {
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
                          <span className="flex h-full w-full items-center justify-center text-4xl">
                            🥮
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

                        <div className="mt-2">
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
                  🛒 {bn(totalQty)} টি পিঠা
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
      {menu && tier === null && (
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
                  className={`flex w-full items-center gap-4 rounded-3xl p-4 text-left ${t.bg}`}
                >
                  <span className="text-4xl" aria-hidden>
                    {t.emoji}
                  </span>
                  <span>
                    <span className="block text-xl font-bold">{t.label}</span>
                    <span className="block text-sm text-gray-600">
                      {t.desc}
                    </span>
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
              <span className="text-base font-semibold">🛒 আপনার কার্ট</span>
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
                tierLabel={`${tierInfo.emoji} ${tierInfo.label}`}
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
    </main>
  );
}
