# Tower Bot — Vercel Dashboard (Arabic)

هذه نسخة Dashboard منفصلة تمامًا عن البوت. الموقع يرفع على Vercel، والبوت يظل على Pella.

## 1) إعداد البوت على Pella
أضف Environment Variables:
- `DASHBOARD_API_KEY` = مفتاح عشوائي طويل جدًا.
- `DASHBOARD_ENABLED=true`
- `DASHBOARD_PORT=3000` (يمكن تركه كما هو إذا كانت لوحة البوت القديمة تعمل على نفس المنفذ).

استخدم نسخة البوت المرفقة مع هذا المشروع، لأنها تحتوي على Remote Dashboard Bridge.

## 2) إعداد Vercel
Environment Variables:
- `BOT_DASHBOARD_URL` = رابط Web Port الخاص بالبوت على Pella، بدون `/` في النهاية.
- `BOT_DASHBOARD_API_KEY` = نفس قيمة `DASHBOARD_API_KEY` في Pella.
- `DASHBOARD_USERNAME` = اسم دخول الموقع.
- `DASHBOARD_PASSWORD` = كلمة مرور قوية.
- `DASHBOARD_SESSION_SECRET` = سر طويل عشوائي.

ثم Deploy للمشروع على Vercel.

## الأمان
- Bot Token و OpenAI Key لا يوضعان في Vercel.
- الموقع يمرر أوامر الإدارة إلى البوت عبر مفتاح API منفصل.
- تسجيل الدخول يتم في Vercel عبر HttpOnly cookie.
