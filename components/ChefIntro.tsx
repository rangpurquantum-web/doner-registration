"use client";

import { useEffect } from "react";

type ChefIntroProps = {
  onClose: () => void;
};

export default function ChefIntro({ onClose }: ChefIntroProps) {
  const chef = {
    name: "রুপালি বেগম",
    role: " রন্ধনশিল্পী।",
    years: "২৫+",
    bio: "আসসালামু আলাইকুম। আপনার উপর শান্তি বর্ষিত হোক। আমি প্রাজ্ঞ ফুড এর রন্ধনশিল্পী। রন্ধনশিল্পে যার কোনো প্রাতিষ্ঠানিক শিক্ষা নেই, কিন্তু রান্নার প্রতি রয়েছে অসীম এক রকম ভালোবাসা। যত্ন, ভালোবাসা আর অভিজ্ঞতাই আমার রান্নার মূল শক্তি। মানুষের তৃপ্তিই আমার সবচেয়ে বড় প্রাপ্তি।",
    stats: [
      { value: "২৫+", label: "বছর" },
      { value: "৩০+", label: "রেসিপি" },
    ],
  };

  // Esc চাপলে বন্ধ, আর খোলা থাকলে পেছনের পেজ স্ক্রল বন্ধ
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="আমাদের রন্ধনশিল্পী"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 420,
          maxHeight: "90vh",
          overflowY: "auto",
          background: "#fff",
          border: "1px solid #eadfd3",
          borderRadius: 16,
          padding: 24,
          textAlign: "center",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="বন্ধ করুন"
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            width: 32,
            height: 32,
            borderRadius: "50%",
            border: "none",
            background: "#f3e3cf",
            color: "#3b2a1a",
            fontSize: 16,
            cursor: "pointer",
          }}
        >
          ✕
        </button>

        <p style={{ fontSize: 13, color: "#8a7a6a", margin: "0 0 14px" }}>
          আমাদের রন্ধনশিল্পী
        </p>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/chef-portrait.jpg"
          alt={chef.name}
          style={{
            width: 112,
            height: 112,
            borderRadius: "50%",
            objectFit: "cover",
            objectPosition: "top",
            border: "3px solid #f3e3cf",
            margin: "0 auto 14px",
            display: "block",
          }}
        />

        <h3 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 4px", color: "#3b2a1a" }}>
          {chef.name}
        </h3>
        <p style={{ fontSize: 14, color: "#8a7a6a", margin: "0 0 14px" }}>
          {chef.role} · {chef.years} বছরের অভিজ্ঞতা
        </p>

        <p style={{ fontSize: 14, lineHeight: 1.8, color: "#4a3b2c", margin: "0 0 18px" }}>
          {chef.bio}
        </p>

        <div
          style={{
            borderTop: "1px solid #eadfd3",
            paddingTop: 14,
            display: "flex",
            justifyContent: "space-around",
          }}
        >
          {chef.stats.map((s) => (
            <div key={s.label}>
              <p style={{ fontSize: 20, fontWeight: 600, margin: 0, color: "#3b2a1a" }}>
                {s.value}
              </p>
              <p style={{ fontSize: 12, color: "#8a7a6a", margin: 0 }}>{s.label}</p>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          style={{
            marginTop: 18,
            width: "100%",
            padding: "12px 0",
            borderRadius: 14,
            border: "none",
            background: "#F58220",
            color: "#fff",
            fontSize: 15,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          বন্ধ করুন
        </button>
      </div>
    </div>
  );
}