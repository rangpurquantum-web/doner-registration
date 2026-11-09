"use client";

// স্টক রিপো: নতুন ফাইল Tour.tsx (page.tsx যে ফোল্ডারে আছে সেখানে)
// সব ট্যুর (হোম পেজ, চেকআউট, লোকেশন) এই একটা কম্পোনেন্ট দিয়েই চলে

import { useCallback, useEffect, useRef, useState } from "react";

export type TourStepDef = { id: string; title: string; text: string };

type Rect = { top: number; left: number; width: number; height: number };

const bn = (n: number) => n.toLocaleString("bn-BD");

const stepExists = (steps: TourStepDef[], i: number) =>
  !!document.getElementById(steps[i].id);

export default function Tour({
  steps,
  onEnd,
  stepMs = 4000,
}: {
  steps: TourStepDef[];
  onEnd: () => void;
  stepMs?: number; // প্রতিটি ধাপ কত মিলিসেকেন্ড থাকবে, তারপর নিজে পরের ধাপে যায়
}) {
  // ট্যুর চলার সময় ধাপগুলো বদলায় না, তাই শুরুর মানটাই ধরে রাখা হয়
  const stepsRef = useRef(steps);
  const endRef = useRef(onEnd);
  endRef.current = onEnd;

  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [vp, setVp] = useState({ w: 0, h: 0 });

  const def = stepsRef.current[index];

  const measure = useCallback(() => {
    const el = document.getElementById(stepsRef.current[index].id);
    setVp({ w: window.innerWidth, h: window.innerHeight });
    if (!el) {
      setRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [index]);

  // পরের যে ধাপের জায়গা পেজে আছে সেখানে যায়; না থাকলে ট্যুর শেষ
  const goNext = useCallback(() => {
    const list = stepsRef.current;
    let j = index + 1;
    while (j < list.length && !stepExists(list, j)) j++;
    if (j >= list.length) endRef.current();
    else setIndex(j);
  }, [index]);

  useEffect(() => {
    // এই ধাপের জায়গাটা পেজে না থাকলে সরাসরি পরের ধাপে চলে যায়
    if (!stepExists(stepsRef.current, index)) {
      goNext();
      return;
    }

    const el = document.getElementById(stepsRef.current[index].id);
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
  }, [index, measure, goNext]);

  // জায়গাটা পর্দায় এসে গেলে নির্দিষ্ট সময় পর নিজে নিজে পরের ধাপে যায়
  const ready = rect !== null;
  useEffect(() => {
    if (!ready) return;
    const t = window.setTimeout(goNext, stepMs);
    return () => window.clearTimeout(t);
  }, [index, ready, goNext, stepMs]);

  // এক ক্লিকে ট্যুর বাদ দেওয়ার বাটন: প্রতিটি ধাপে পর্দার উপরের বাম কোণায় থাকে
  const skipPill = (
    <button
      type="button"
      onClick={() => endRef.current()}
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

  const list = stepsRef.current;
  const avail = list.map((_, i) => (stepExists(list, i) ? i : -1)).filter(
    (i) => i >= 0,
  );
  const pos = avail.indexOf(index) + 1;

  // জায়গাটা পর্দার প্রায় অর্ধেকের বেশি বড় হলে কমেন্ট বক্স পর্দার নিচে বসে (লেজ ছাড়া)
  const tall = hBottom - hTop > vp.h * 0.55;
  // উপরে ফাঁকা জায়গা থাকলে কমেন্ট বক্স উপরে বসে, না থাকলে নিচে
  const above = hTop > 190;
  const w = Math.min(320, vp.w - 32);
  const left = Math.min(
    Math.max(16, (hLeft + hRight) / 2 - w / 2),
    Math.max(16, vp.w - w - 16),
  );
  const tailX = Math.min(Math.max((hLeft + hRight) / 2 - left, 28), w - 28);
  const tipStyle = tall
    ? { bottom: 20, left: Math.max(16, (vp.w - w) / 2), width: w }
    : above
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
            {def.text}
          </p>
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-gray-200">
            <div
              key={index}
              className="h-full bg-[#F58220]"
              style={{ animation: `pf-tour-bar ${stepMs}ms linear forwards` }}
            />
          </div>

          {/* কমেন্ট বক্সের লেজ, যেটা জায়গাটার দিকে ইশারা করে */}
          {!tall &&
            (above ? (
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
                <path d="M2 -1 L33 -1" stroke="white" strokeWidth="4" />
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
                <path d="M2 23 L33 23" stroke="white" strokeWidth="4" />
                <path
                  d="M8 19 L14 10 M13 20 L17 13 M20 19 L19 13"
                  stroke="#1d1d1f"
                  strokeWidth="1.4"
                />
              </svg>
            ))}
        </div>
      </div>
    </>
  );
}
