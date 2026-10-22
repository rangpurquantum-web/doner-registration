"use client";

import { useCallback, useEffect, useState } from "react";

type StockItem = { name: string; remaining: number };
type StockData = { open: boolean; items: StockItem[]; updatedAt: string };
type Tone = "ok" | "low" | "out";

const LOW_LIMIT = 5;
const REFRESH_MS = 30_000;
const MAX_DOTS = 20;

const RICE = "text-[#f3f1e8]";
const MUTED = "text-[#9db8aa]";
const serif = "[font-family:var(--font-sans-bn),system-ui,sans-serif]";

const bn = (n: number) => n.toLocaleString("bn-BD");

function toneOf(n: number): Tone {
  if (n <= 0) return "out";
  if (n <= LOW_LIMIT) return "low";
  return "ok";
}

const TONE: Record<Tone, { label: string; text: string; dot: string }> = {
  ok: { label: "আছে", text: "text-[#9ad6b0]", dot: "bg-[#f3f1e8]" },
  low: { label: "কম আছে", text: "text-[#e3a83f]", dot: "bg-[#e3a83f]" },
  out: { label: "শেষ", text: "text-[#7f988b]", dot: "" },
};

export default function PublicStockPage() {
  const [data, setData] = useState<StockData | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE ?? ""}/api/public/stock`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error("failed");
      const json = (await res.json()) as StockData;
      setData(json);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  const items = data
    ? [...data.items].sort((a, b) => {
        const aEnd = a.remaining <= 0 ? 1 : 0;
        const bEnd = b.remaining <= 0 ? 1 : 0;
        return aEnd - bEnd || a.name.localeCompare(b.name);
      })
    : [];

  const updated = data
    ? new Date(data.updatedAt).toLocaleTimeString("bn-BD", {
        hour: "numeric",
        minute: "2-digit",
        timeZone: "Asia/Dhaka",
      })
    : null;

  const allGone = items.length > 0 && items.every((p) => p.remaining <= 0);

  return (
    <main className="mx-auto min-h-screen max-w-xl bg-[#14372b] px-6 pb-14 pt-12">
      <header className="pb-8">
        <p className={`text-sm ${MUTED}`}>প্রজ্ঞা ফুড</p>
        <h1
          className={`${serif} ${RICE} mt-1 text-5xl leading-[1.4]`}
        >
          আজকের পিঠা
        </h1>
        <p className={`mt-3 flex items-center gap-2 text-sm ${MUTED}`}>
          <span className="relative flex h-2 w-2" aria-hidden>
            <span className="absolute inline-flex h-full w-full rounded-full bg-[#9ad6b0] opacity-75 motion-safe:animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#9ad6b0]" />
          </span>
          {updated ? `${updated}-এ হালনাগাদ` : "হালনাগাদ হচ্ছে"}
        </p>
      </header>

      {!data && !failed && (
        <p className={`border-t border-[#f3f1e8]/15 py-8 text-sm ${MUTED}`}>
          লোড হচ্ছে…
        </p>
      )}

      {failed && !data && (
        <section className="border-t border-[#f3f1e8]/15 py-8">
          <p className={`${serif} ${RICE} text-2xl leading-snug`}>
            স্টক আনা যায়নি
          </p>
          <p className={`mt-2 text-sm leading-relaxed ${MUTED}`}>
            ইন্টারনেট ঠিক আছে কি না দেখুন। পেজ নিজে থেকেই আবার চেষ্টা করবে।
          </p>
        </section>
      )}

      {data && !data.open && (
        <section className="border-t border-[#f3f1e8]/15 py-8">
          <p className={`${serif} ${RICE} text-2xl leading-snug`}>
            এখন বিক্রি বন্ধ আছে
          </p>
          <p className={`mt-2 text-sm leading-relaxed ${MUTED}`}>
            বিক্রি শুরু হলে এখানেই পিঠার সংখ্যা দেখতে পাবেন।
          </p>
        </section>
      )}

      {data && data.open && items.length === 0 && (
        <section className="border-t border-[#f3f1e8]/15 py-8">
          <p className={`${serif} ${RICE} text-2xl leading-snug`}>
            আজকের পিঠা এখনও যোগ হয়নি
          </p>
          <p className={`mt-2 text-sm leading-relaxed ${MUTED}`}>
            একটু পরে আবার দেখুন।
          </p>
        </section>
      )}

      {data && data.open && items.length > 0 && (
        <>
          <ul className="border-t border-[#f3f1e8]/15">
            {items.map((p) => {
              const tone = toneOf(p.remaining);
              const t = TONE[tone];
              const out = tone === "out";
              const dots = Math.min(p.remaining, MAX_DOTS);

              return (
                <li
                  key={p.name}
                  className="flex items-center justify-between gap-4 border-b border-[#f3f1e8]/15 py-5"
                >
                  <div className="min-w-0 flex-1">
                    <p
                      className={`${serif} text-2xl leading-snug ${
                        out
                          ? "text-[#7f988b] line-through decoration-1"
                          : RICE
                      }`}
                    >
                      {p.name}
                    </p>
                    <p className={`mt-1 text-sm ${t.text}`}>{t.label}</p>
                    {!out && (
                      <div
                        className="mt-3 flex flex-wrap items-center gap-1.5"
                        aria-hidden
                      >
                        {Array.from({ length: dots }).map((_, i) => (
                          <span
                            key={i}
                            className={`h-2.5 w-2.5 rounded-full ${t.dot}`}
                          />
                        ))}
                        {p.remaining > MAX_DOTS && (
                          <span className={`text-xs ${MUTED}`}>
                            +{bn(p.remaining - MAX_DOTS)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <p
                    className={`${serif} shrink-0 text-right text-5xl leading-none tabular-nums ${
                      out ? "text-[#7f988b]" : RICE
                    }`}
                  >
                    {bn(p.remaining)}
                    <span
                      className={`ml-1 text-base font-normal ${MUTED}`}
                    >
                      টি
                    </span>
                  </p>
                </li>
              );
            })}
          </ul>

          {allGone && (
            <p className={`${serif} ${RICE} mt-8 text-xl leading-snug`}>
              আজকের সব পিঠা শেষ। কাল আবার দেখা হবে।
            </p>
          )}
        </>
      )}

      <p className={`mt-10 text-xs ${MUTED}`}>
        প্রতি ৩০ সেকেন্ডে নিজে থেকে হালনাগাদ হয়।
      </p>
    </main>
  );
}
