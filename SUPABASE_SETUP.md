# إعدادات Supabase المطلوبة

هذا الملف يشرح الإعدادات الضرورية في Supabase لضمان عمل البريد الإلكتروني بشكل صحيح.

## المشاكل التي تم إصلاحها في الكود

✅ تم تعديل `api/auth/register.js` لاستخدام `signUp` بدلاً من `admin.createUser` حتى يرسل Supabase بريد التأكيد تلقائياً  
✅ تم إصلاح `api/auth/reset-password.js` لإرسال رابط إعادة تعيين كلمة المرور  
✅ تم إضافة `emailRedirectTo` في كلا الـ APIs لتوجيه المستخدم للموقع بعد التأكيد

---

## الإعدادات المطلوبة في Supabase Dashboard

### 1. تفعيل تأكيد البريد الإلكتروني

1. افتح: **[Supabase Dashboard](https://supabase.com/dashboard/project/hxidjjzmfehenokfsblq/auth/providers)**
2. اذهب إلى **Authentication → Providers → Email**
3. تأكد أن **"Confirm email"** مُفعّل (enabled)
4. احفظ التغييرات

### 2. ضبط Site URL

1. اذهب إلى **Authentication → URL Configuration**
2. في حقل **Site URL** ضع: `https://www.getqrdesign.com`
3. في حقل **Redirect URLs** أضف:
   - `https://www.getqrdesign.com/**`
   - `https://getqrdesign.com/**`
4. احفظ التغييرات

### 3. تخصيص قوالب البريد الإلكتروني (اختياري)

1. اذهب إلى **Authentication → Email Templates**
2. اختر **Confirm signup** وعدّل النص ليكون بالعربية أو الإنجليزية حسب رغبتك
3. اختر **Reset password** وعدّل النص أيضاً
4. تأكد أن الروابط تحتوي على `{{ .ConfirmationURL }}` و `{{ .Token }}`

---

## اختبار بعد الإعداد

بعد تطبيق الإعدادات أعلاه:

1. افتح: https://www.getqrdesign.com/auth.html
2. أنشئ حساباً جديداً ببريد إلكتروني حقيقي
3. يجب أن تصلك رسالة تأكيد خلال دقيقة
4. اضغط على رابط التأكيد في البريد
5. سجّل دخولك بنفس البريد وكلمة المرور

إذا لم تصل الرسالة:
- تحقق من مجلد Spam
- تأكد أن "Confirm email" مُفعّل في Supabase
- تأكد أن Site URL صحيح

---

## ملاحظات مهمة

- Supabase يستخدم خدمة بريد إلكتروني مدمجة مجانية، لكنها محدودة (3-4 رسائل في الساعة)
- إذا أردت إرسال رسائل أكثر، يجب ربط SMTP خارجي (مثل SendGrid أو AWS SES)
- لإلغاء تأكيد البريد (السماح بتسجيل الدخول مباشرةً)، أطفئ "Confirm email" في Supabase
