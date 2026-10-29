"use client";

import { useEffect, useState } from "react";

type Profile = { details: string; ingredients: string; image: string };
type Profiles = Record<string, Profile>;
type Notice = {
  text: string;
  active: boolean;
  until: string | null;
  link?: string;
  linkLabel?: string;
};

const toEn = (s: string) =>
  s.replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d)));

async function compress(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 800 / bmp.width);
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, w, h);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("ছবি ছোট করা যায়নি"))),
      "image/webp",
      0.8,
    ),
  );
}

function Editor({
  name,
  initial,
  adminKey,
  onSaved,
  onClose,
}: {
  name: string;
  initial?: Profile;
  adminKey: string;
  onSaved: (name: string, p: Profile) => void;
  onClose: () => void;
}) {
  const [details, setDetails] = useState(initial?.details ?? "");
  const [ingredients, setIngredients] = useState(initial?.ingredients ?? "");
  const [file, setFile] = useState<Blob | null>(null);
  const [preview, setPreview] = useState(initial?.image ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function pick(f: File | undefined) {
    if (!f) return;
    try {
      const b = await compress(f);
      setFile(b);
      setPreview(URL.createObjectURL(b));
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  async function save() {
    setBusy(true);
    setMsg("");
    const fd = new FormData();
    fd.set("key", adminKey);
    fd.set("name", name);
    fd.set("details", details);
    fd.set("ingredients", ingredients);
    if (file) fd.set("image", file, "photo.webp");
    try {
      const r = await fetch("/api/profiles", { method: "POST", body: fd });
      const text = await r.text();
      let j: { profile?: Profile; error?: string } = {};
      try {
        j = JSON.parse(text);
      } catch {}
      if (!r.ok) {
        throw new Error(j.error || `সেভ হয়নি (কোড ${r.status})`);
      }
      onSaved(name, j.profile as Profile);
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center">
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-[#14372b] p-5 text-[#f3f1e8] sm:rounded-2xl">
        <h2 className="text-2xl">{name}</h2>

        {preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt={name} className="mt-4 w-full rounded-xl" />
        )}
        <label className="mt-4 block rounded-xl border border-[#f3f1e8]/20 p-3 text-center text-sm">
          📷 {preview ? "ছবি বদলান" : "ছবি বেছে নিন"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => pick(e.target.files?.[0])}
          />
        </label>

        <label className="mt-4 block text-sm text-[#9db8aa]">বিবরণ</label>
        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          rows={4}
          className="mt-1 w-full rounded-xl bg-[#f3f1e8]/10 p-3 text-base outline-none"
        />

        <label className="mt-3 block text-sm text-[#9db8aa]">উপকরণ</label>
        <input
          value={ingredients}
          onChange={(e) => setIngredients(e.target.value)}
          className="mt-1 w-full rounded-xl bg-[#f3f1e8]/10 p-3 text-base outline-none"
        />

        {msg && <p className="mt-3 text-sm text-[#e3a83f]">{msg}</p>}

        <div className="mt-5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-[#f3f1e8]/20 py-3"
          >
            বাতিল
          </button>
          <button
            onClick={save}
            disabled={busy}
            className="flex-1 rounded-xl bg-[#9ad6b0] py-3 font-medium text-[#14372b] disabled:opacity-50"
          >
            {busy ? "সেভ হচ্ছে…" : "সেভ করুন"}
          </button>
        </div>
      </div>
    </div>
  );
}

function NoticeSection({ adminKey }: { adminKey: string }) {
  const [text, setText] = useState("");
  const [hours, setHours] = useState("");
  const [link, setLink] = useState("");
  const [linkLabel, setLinkLabel] = useState("");
  const [active, setActive] = useState(false);
  const [until, setUntil] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/notice", { cache: "no-store" })
      .then((r) => r.json())
      .then((n: Notice) => {
        setText(n.text ?? "");
        setActive(!!n.active);
        setUntil(n.until ?? null);
        setLink(n.link ?? "");
        setLinkLabel(n.linkLabel ?? "");
      })
      .catch(() => {});
  }, []);

  async function save(on: boolean) {
    setBusy(true);
    setMsg("");
    try {
      const r = await fetch("/api/notice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: adminKey,
          text,
          active: on,
          hours: hours ? Number(toEn(hours)) : 0,
          link,
          linkLabel,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || `সেভ হয়নি (কোড ${r.status})`);
      setActive(j.notice.active);
      setUntil(j.notice.until);
      setLink(j.notice.link ?? "");
      setLinkLabel(j.notice.linkLabel ?? "");
      setMsg(
        j.notice.active
          ? "নোটিশ লাইভ সাইটে চালু হয়েছে"
          : "নোটিশ বন্ধ করা হয়েছে",
      );
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const expired = !!until && new Date(until).getTime() < Date.now();
  const live = active && !expired;

  return (
    <section className="mt-8 rounded-2xl border border-[#f3f1e8]/15 bg-[#f3f1e8]/[0.04] p-5">
      <h2 className="text-2xl">📢 নোটিশ</h2>
      <p className="mt-1 text-sm text-[#9db8aa]">
        {live
          ? `এখন লাইভ সাইটে দেখানো হচ্ছে${
              until
                ? ` (${new Date(until).toLocaleString("bn-BD", {
                    timeZone: "Asia/Dhaka",
                    dateStyle: "medium",
                    timeStyle: "short",
                  })} পর্যন্ত)`
                : ""
            }`
          : expired
            ? "মেয়াদ শেষ হয়ে গেছে, এখন দেখানো হচ্ছে না"
            : "এখন দেখানো হচ্ছে না"}
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        maxLength={600}
        placeholder="নোটিশ লিখুন (যেমন: আজ বিকাল ৪টায় বিক্রি শুরু হবে)"
        className="mt-3 w-full rounded-xl bg-[#f3f1e8]/10 p-3 text-base outline-none"
      />
      <input
        value={hours}
        onChange={(e) => setHours(e.target.value)}
        inputMode="numeric"
        placeholder="কত ঘণ্টা দেখাবে? (ফাঁকা = আমি বন্ধ না করা পর্যন্ত)"
        className="mt-2 w-full rounded-xl bg-[#f3f1e8]/10 p-3 text-base outline-none"
      />
      <input
        value={link}
        onChange={(e) => setLink(e.target.value)}
        inputMode="url"
        autoCapitalize="none"
        maxLength={500}
        placeholder="বাটনের লিংক (ঐচ্ছিক, দিলে নোটিশের নিচে বাটন আসবে)"
        className="mt-2 w-full rounded-xl bg-[#f3f1e8]/10 p-3 text-base outline-none"
      />
      {link.trim() && (
        <input
          value={linkLabel}
          onChange={(e) => setLinkLabel(e.target.value)}
          maxLength={40}
          placeholder="বাটনের লেখা (ফাঁকা থাকলে “লিংক খুলুন”)"
          className="mt-2 w-full rounded-xl bg-[#f3f1e8]/10 p-3 text-base outline-none"
        />
      )}

      {msg && <p className="mt-3 text-sm text-[#e3a83f]">{msg}</p>}

      <div className="mt-4 flex gap-3">
        <button
          onClick={() => save(false)}
          disabled={busy}
          className="flex-1 rounded-xl border border-[#f3f1e8]/20 py-3 disabled:opacity-50"
        >
          বন্ধ করুন
        </button>
        <button
          onClick={() => save(true)}
          disabled={busy || !text.trim()}
          className="flex-1 rounded-xl bg-[#9ad6b0] py-3 font-medium text-[#14372b] disabled:opacity-50"
        >
          {busy ? "সেভ হচ্ছে…" : "চালু করুন"}
        </button>
      </div>
    </section>
  );
}

function NotifySection({ adminKey }: { adminKey: string }) {
  const [title, setTitle] = useState("আজকের পিঠা");
  const [body, setBody] = useState("");
  const [count, setCount] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!adminKey) return;
    fetch(`/api/push/send?key=${encodeURIComponent(adminKey)}`, {
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((j) => setCount(typeof j.count === "number" ? j.count : null))
      .catch(() => {});
  }, [adminKey]);

  async function send() {
    setMsg("");
    if (!body.trim()) return setMsg("কী লিখে পাঠাবেন তা লিখুন");
    if (!window.confirm(`${count ?? "সব"} জনকে নোটিফিকেশন পাঠাবেন?`)) return;
    setBusy(true);
    try {
      const r = await fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: adminKey, title, body }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || `পাঠানো যায়নি (কোড ${r.status})`);
      setMsg(`${j.sent} জনকে পাঠানো হয়েছে`);
      if (j.removed > 0) setCount((c) => (c == null ? c : c - j.removed));
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-[#f3f1e8]/15 bg-[#f3f1e8]/[0.04] p-5">
      <h2 className="text-2xl">🔔 নোটিফিকেশন</h2>
      <p className="mt-1 text-sm text-[#9db8aa]">
        {count != null
          ? `${count} জন নোটিফিকেশন চালু করেছেন`
          : "যারা চালু করেছেন তাদের ফোনে যাবে"}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setBody("আজকের পিঠা বিক্রি শুরু হয়েছে। এখনই স্টক দেখুন!")}
          className="rounded-full border border-[#f3f1e8]/20 px-3 py-1 text-xs"
        >
          🟢 বিক্রি শুরু হয়েছে
        </button>
        <button
          type="button"
          onClick={() => setBody("আজকের মতো বিক্রি শেষ। কাল আবার দেখা হবে।")}
          className="rounded-full border border-[#f3f1e8]/20 px-3 py-1 text-xs"
        >
          🔴 আজকের মতো শেষ
        </button>
      </div>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={80}
        placeholder="শিরোনাম"
        className="mt-3 w-full rounded-xl bg-[#f3f1e8]/10 p-3 text-base outline-none"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={2}
        maxLength={200}
        placeholder="মেসেজ লিখুন"
        className="mt-2 w-full rounded-xl bg-[#f3f1e8]/10 p-3 text-base outline-none"
      />

      {msg && <p className="mt-3 text-sm text-[#e3a83f]">{msg}</p>}

      <button
        onClick={send}
        disabled={busy}
        className="mt-4 w-full rounded-xl bg-[#9ad6b0] py-3 font-medium text-[#14372b] disabled:opacity-50"
      >
        {busy ? "পাঠানো হচ্ছে…" : "সবাইকে পাঠান"}
      </button>
    </section>
  );
}

export default function ManagePage() {
  const [adminKey, setAdminKey] = useState("");
  const [names, setNames] = useState<string[]>([]);
  const [profiles, setProfiles] = useState<Profiles>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    setAdminKey(new URLSearchParams(window.location.search).get("key") ?? "");
    (async () => {
      try {
        const r = await fetch("/api/profiles", { cache: "no-store" });
        setProfiles(await r.json());
      } catch {}
      try {
        const r = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE ?? ""}/api/public/stock`,
          { cache: "no-store" },
        );
        const j = await r.json();
        setNames((j.items ?? []).map((i: { name: string }) => i.name));
      } catch {}
    })();
  }, []);

  const all = Array.from(new Set([...names, ...Object.keys(profiles)]));

  return (
    <main className="mx-auto min-h-screen max-w-xl bg-[#14372b] px-6 pb-16 pt-12 text-[#f3f1e8]">
      <h1 className="text-3xl">ম্যানেজ</h1>
      {!adminKey && (
        <p className="mt-2 text-sm text-[#e3a83f]">
          লিংকের শেষে ?key=আপনার-চাবি না থাকলে সেভ হবে না।
        </p>
      )}

      <NoticeSection adminKey={adminKey} />
      <NotifySection adminKey={adminKey} />

      <h2 className="mt-10 text-2xl">পিঠার প্রোফাইল</h2>
      <p className="mt-2 text-sm text-[#9db8aa]">
        পিঠায় চাপ দিয়ে ছবি ও বিবরণ দিন।
      </p>

      <ul className="mt-6 space-y-3">
        {all.map((n) => (
          <li key={n}>
            <button
              onClick={() => setSelected(n)}
              className="flex w-full items-center justify-between rounded-2xl border border-[#f3f1e8]/15 bg-[#f3f1e8]/[0.04] p-4 text-left"
            >
              <span className="text-lg">{n}</span>
              <span className="text-xs text-[#9db8aa]">
                {profiles[n]
                  ? profiles[n].image
                    ? "✅ ছবি আছে"
                    : "✏️ ছবি নেই"
                  : "➕ তৈরি করুন"}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="তালিকায় নেই? পিঠার নাম লিখুন"
          className="flex-1 rounded-xl bg-[#f3f1e8]/10 p-3 text-base outline-none"
        />
        <button
          onClick={() => {
            if (newName.trim()) {
              setSelected(newName.trim());
              setNewName("");
            }
          }}
          className="rounded-xl bg-[#9ad6b0] px-4 font-medium text-[#14372b]"
        >
          যোগ
        </button>
      </div>

      {selected && (
        <Editor
          key={selected}
          name={selected}
          initial={profiles[selected]}
          adminKey={adminKey}
          onClose={() => setSelected(null)}
          onSaved={(n, p) => {
            setProfiles((prev) => ({ ...prev, [n]: p }));
            setSelected(null);
          }}
        />
      )}
    </main>
  );
}