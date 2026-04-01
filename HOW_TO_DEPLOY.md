# كيفية رفع التحديثات على GitHub ونشرها على Vercel

## الخطوة 1 — افتح Terminal على جهازك

افتح مجلد المشروع الموجود على جهازك، ثم شغّل الأوامر التالية:

```bash
# انتقل لمجلد المشروع
cd qr-studio

# أضف جميع الملفات المعدّلة
git add .

# اكتب رسالة توضح التغييرات
git commit -m "feat: add Wi-Fi, vCard, email, phone QR types + custom colors + logo + SVG download + FAQ + fix 404 routes"

# ارفع التغييرات على GitHub
git push origin main
```

## الخطوة 2 — Vercel سيُحدَّث تلقائياً

بمجرد رفع الكود على GitHub، سيقوم Vercel بإعادة النشر تلقائياً خلال دقيقة أو دقيقتين.

---

## ملاحظة مهمة — إعداد Supabase

لكي تعمل ميزة تسجيل الدخول (Sign in) بشكل صحيح، يجب عليك:

1. افتح ملف `public/js/config.js`
2. استبدل القيم التالية بمعلوماتك الحقيقية من Supabase:

```js
window.QR_SUPABASE_URL  = 'https://YOUR_PROJECT.supabase.co';
window.QR_SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

يمكنك إيجاد هذه القيم في:
**supabase.com → مشروعك → Settings → API**

---

## ما تم تحديثه في هذا الإصدار

| الملف | التغيير |
|---|---|
| `public/index.html` | إضافة تبويبات الأنواع (Wi-Fi, vCard, Email, Phone, Text) |
| `public/index.html` | إضافة تخصيص الألوان والشعار |
| `public/index.html` | إضافة تحميل SVG |
| `public/index.html` | إضافة قسم الأسئلة الشائعة (FAQ) |
| `public/index.html` | تحسين SEO (Meta Tags, Keywords) |
| `vercel.json` | إصلاح أخطاء 404 لصفحات /signin /login /dashboard /pro /promo |
