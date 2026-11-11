export default function ChefIntro() {
  const chef = {
    name: "রুপালি বেগম",
    role: " রন্ধনশিল্পী।",
    years: "20+",
    bio: "আসসালামু আলাইকুম। আপনার উপর শান্তি বর্ষিত হোক। আমি প্রাজ্ঞ ফুড এর রন্ধনশিল্পী আমি একজন সাধারণ গৃহিণী, রন্ধনশিল্পে যার কোনো প্রাতিষ্ঠানিক শিক্ষা নেই। ভালোবাসা, যত্ন আর অভিজ্ঞতাই আমার রান্নার মূল শক্তি। মানুষের তৃপ্তিই আমার সবচেয়ে বড় প্রাপ্তি।",
    tags: ["ভাপা পিঠা", "পাটিসাপটা", "চিতই"],
    stats: [
      { value: "১৫+", label: "বছর" },
      { value: "৩০+", label: "রেসিপি" },
      { value: "১০k+", label: "খুশি গ্রাহক" },
    ],
  };

  return (
    <section style={{ padding: "24px 16px", display: "flex", justifyContent: "center" }}>
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "#fff",
          border: "1px solid #eadfd3",
          borderRadius: 16,
          padding: 24,
          textAlign: "center",
        }}
      >
        <p style={{ fontSize: 13, color: "#8a7a6a", margin: "0 0 14px" }}>আমাদের শেফ</p>

        <img
          src="/chef-square.jpg"
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

        <p style={{ fontSize: 14, lineHeight: 1.8, color: "#4a3b2c", margin: "0 0 16px" }}>
          {chef.bio}
        </p>

        <div
          style={{
            display: "flex",
            gap: 8,
            justifyContent: "center",
            flexWrap: "wrap",
            marginBottom: 18,
          }}
        >
          {chef.tags.map((t) => (
            <span
              key={t}
              style={{
                fontSize: 12,
                padding: "4px 12px",
                borderRadius: 8,
                background: "#fdf0dc",
                color: "#8a4b10",
              }}
            >
              {t}
            </span>
          ))}
        </div>

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
      </div>
    </section>
  );
}