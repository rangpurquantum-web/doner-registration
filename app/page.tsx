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
      badge: "bg-red-100 text-red-700",
      card: "opacity-60",
    };
  }
  if (n <= LOW_LIMIT) {
    return {
      label: "কম আছে",
      badge: "bg-amber-100 text-amber-700",
      card: "",
    };
  }
  return {
    label: "পাওয়া যাচ্ছে",
    badge: "bg-green-100 text-green-700",
    card: "",
  };
}

export default function PublicStockPage() {
  const [data, setData] = useState<StockData | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE ?? ""}/api/public/stock`, {
        cache: "no-store",
      });
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
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Dhaka",
      })
    : null;

  return (
    <main className="mx-auto min-h-screen max-w-xl space-y-5 bg-white px-4 py-8">
      <header className="space-y-1 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Pragya Food</h1>
        <p className="text-base text-gray-600">আজকের পিঠার স্টক</p>
        <p className="flex items-center justify-center gap-2 text-xs text-gray-500">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
          </span>
          লাইভ{updated ? ` • আপডেট ${updated}` : ""}
        </p>
      </header>

      {!data && !failed && (
        <p className="text-center text-sm text-gray-500">লোড হচ্ছে...</p>
      )}

      {failed && !data && (
        <p className="text-center text-sm text-gray-500">
          স্টক আনা যায়নি। একটু পরে আবার চেষ্টা করুন।
        </p>
      )}

      {data && !data.open && (
        <div className="rounded-xl border bg-gray-50 p-4 text-center text-sm text-gray-700">
          এখন বিক্রি বন্ধ আছে।
        </div>
      )}

      {data && data.open && items.length === 0 && (
        <p className="text-center text-sm text-gray-500">
          আজকের জন্য কোনো পিঠা যোগ করা হয়নি।
        </p>
      )}

      {data && data.open && items.length > 0 && (
        <>
          <ul className="space-y-3">
            {items.map((p) => {
              const s = statusOf(p.remaining);
              return (
                <li
                  key={p.name}
                  className={`flex items-center justify-between rounded-xl border p-4 shadow-sm ${s.card}`}
                >
                  <div>
                    <p className="text-lg font-semibold text-gray-900">
                      {p.name}
                    </p>
                    <span
                      className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${s.badge}`}
                    >
                      {s.label}
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {bn(p.remaining)}{" "}
                    <span className="text-sm font-normal text-gray-500">টি</span>
                  </p>
                </li>
              );
            })}
          </ul>

          {items.every((p) => p.remaining <= 0) && (
            <p className="text-center text-sm font-medium text-red-600">
              আজকের জন্য সব পিঠা শেষ।
            </p>
          )}
        </>
      )}
    </main>
  );
}
