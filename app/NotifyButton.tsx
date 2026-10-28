"use client";

import { useEffect, useState } from "react";

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const MUTED = "text-[#9db8aa]";

type State = "loading" | "unsupported" | "ios-install" | "off" | "on" | "denied";

function urlBase64ToUint8Array(b64: string) {
  const padding = "=".repeat((4 - (b64.length % 4)) % 4);
  const base64 = (b64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export default function NotifyButton() {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      if (!PUBLIC_KEY) return setState("unsupported");
      const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as unknown as { standalone?: boolean }).standalone === true;
      if (
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        return setState(isIos && !standalone ? "ios-install" : "unsupported");
      }
      if (Notification.permission === "denied") return setState("denied");
      try {
        await navigator.serviceWorker.register("/sw.js");
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        setState(sub && Notification.permission === "granted" ? "on" : "off");
      } catch {
        setState("unsupported");
      }
    })();
  }, []);

  async function enable() {
    setBusy(true);
    setMsg("");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setState(perm === "denied" ? "denied" : "off");
        return;
      }
      await navigator.serviceWorker.register("/sw.js");
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(PUBLIC_KEY),
        });
      }
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      if (!res.ok) throw new Error("চালু করা যায়নি, একটু পরে আবার চেষ্টা করুন");
      setState("on");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "চালু করা যায়নি");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setMsg("");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        }).catch(() => {});
        await sub.unsubscribe();
      }
      setState("off");
    } catch {
      setMsg("বন্ধ করা যায়নি");
    } finally {
      setBusy(false);
    }
  }

  if (state === "loading" || state === "unsupported") return null;

  return (
    <div className="mb-6">
      {state === "off" && (
        <button
          type="button"
          onClick={enable}
          disabled={busy}
          className="w-full rounded-xl border border-[#9ad6b0]/40 bg-[#9ad6b0]/10 px-4 py-3 text-base text-[#f3f1e8] disabled:opacity-60"
        >
          {busy ? "চালু হচ্ছে…" : "🔔 বিক্রি শুরু হলে জানান"}
        </button>
      )}
      {state === "on" && (
        <p className={`flex items-center justify-between gap-3 text-sm ${MUTED}`}>
          <span>🔔 নোটিফিকেশন চালু আছে</span>
          <button
            type="button"
            onClick={disable}
            disabled={busy}
            className="text-xs underline disabled:opacity-60"
          >
            বন্ধ করুন
          </button>
        </p>
      )}
      {state === "denied" && (
        <p className={`text-xs leading-relaxed ${MUTED}`}>
          নোটিফিকেশন ব্লক করা আছে। চালু করতে ব্রাউজারের সাইট সেটিংসে
          Notifications অনুমতি দিন।
        </p>
      )}
      {state === "ios-install" && (
        <p className={`text-xs leading-relaxed ${MUTED}`}>
          🔔 iPhone-এ নোটিফিকেশন পেতে আগে Share (⬆️) চেপে “Add to Home Screen”
          দিন, তারপর হোম স্ক্রিনের অ্যাপ থেকে খুলুন।
        </p>
      )}
      {msg && <p className="mt-2 text-xs text-[#e3a83f]">{msg}</p>}
    </div>
  );
}