export default function PaymentSuccess() {
  return (
    <main
      style={{
        maxWidth: 480,
        margin: "0 auto",
        padding: 24,
        textAlign: "center",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1 style={{ fontSize: 24, marginBottom: 12 }}>ধন্যবাদ 🙏</h1>
      <p style={{ lineHeight: 1.7 }}>
        আপনার পেমেন্ট আমরা যাচাই করছি। যাচাই হলেই WhatsApp-এ জানিয়ে দেওয়া হবে।
        কোনো সমস্যা হলে আমাদের ফোন করুন।
      </p>
    </main>
  );
}