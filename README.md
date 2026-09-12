<div align="center">

# Darakom · داركم العقاري

**A property listing site for a Damascus real-estate office — Arabic-first, right-to-left, and built without a framework.**

[![Firebase](https://img.shields.io/badge/Firebase-Firestore%20%C2%B7%20Auth%20%C2%B7%20Hosting-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES%20Modules-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![No build step](https://img.shields.io/badge/Build%20step-none-5FD8FF)](#running-it)
[![License: MIT](https://img.shields.io/badge/License-MIT-A78BFA)](LICENSE)

English · [العربية](#بالعربية)

</div>

---

## What this is

A working storefront for a real-estate office in Damascus. Visitors browse listings, filter by neighbourhood, price and property type, and message the office on WhatsApp about a specific property — no sign-up, no account, no form to fill in.

Behind it sits a private admin panel where the office adds, edits and removes listings. Public visitors never authenticate; only the office does.

## Why it is built this way

**No framework, no build step.** The whole site is ES modules loaded straight by the browser. There is nothing to compile, nothing to keep patched, and no bundle to go stale — the office can hand the folder to anyone and it runs. For a site whose job is to list properties and open WhatsApp, a framework would have been weight without payoff.

**Arabic first, not translated into Arabic.** `dir="rtl"` is on the document from the first byte, the type is set in IBM Plex Sans Arabic with Amiri for display, and the layout was composed right-to-left rather than mirrored afterwards.

**The contact path is the shortest possible.** Every listing builds a WhatsApp deep link carrying the property reference, so the office receives a message that already says which property it is about. The alternative — a contact form into an inbox — adds a step for the visitor and a habit change for the office.

**Read is public, write is authenticated.** Listings are world-readable from Firestore; creating and editing requires Firebase Auth. The admin panel is a separate page, not a hidden mode of the public one.

## Features

- Browse listings with photos, price, area, and room count
- Filter by neighbourhood (41 Damascus areas), type and price range
- Per-listing WhatsApp enquiry carrying the property reference
- Admin dashboard: create, edit, delete listings behind Firebase Auth
- Live counters for available properties and covered areas
- Custom `404.html` so deep links never dead-end

## Tech stack

Vanilla JavaScript (ES modules) · Firebase Firestore · Firebase Auth · Firebase Hosting · CSS custom properties

## Project structure

```
index.html          Public listing page
app.js              Listings, filters, WhatsApp links
admin.html          Admin dashboard
admin.js            Auth + listing CRUD
firebase-config.js  Firebase web config, office details, area list
styles.css          Design tokens and layout
404.html            Fallback page
firebase.json       Hosting configuration
```

## Running it

No install, no build:

```bash
npx serve .
```

Or open `index.html` directly — ES modules need a server, so `npx serve` is the reliable path.

To point it at your own Firebase project, replace the values in `firebase-config.js` with your own from **Firebase Console → Project settings → Your apps → Web app**, and set `WHATSAPP` and `OFFICE_NAME` to your own.

> The Firebase web config is client-side by design — it identifies the project, it does not grant access. Access is controlled by Firestore Security Rules, which is where the real permissions live.

Deploy:

```bash
firebase deploy
```

## License

[MIT](LICENSE) © Mohammad Almoslly

---

<div dir="rtl">

## بالعربية

**داركم العقاري** — موقع عرض عقارات لمكتب عقاري في دمشق.

الزائر يتصفّح العقارات، يفلتر حسب المنطقة والسعر ونوع العقار، ولمّا يعجبه بيت يراسل المكتب على واتساب مباشرة — بدون تسجيل ولا حساب ولا استمارة. والرسالة تصل للمكتب وفيها رقم العقار جاهز.

وراء الموقع لوحة تحكم خاصة يضيف منها المكتب العقارات ويعدّلها ويحذفها. القراءة عامة للجميع، والكتابة تتطلب تسجيل دخول عبر Firebase Auth.

**بلا إطار عمل وبلا خطوة بناء** — الموقع كله وحدات ES يحمّلها المتصفح مباشرة. ما في شي يُترجم ولا حزمة تحتاج تحديث؛ المجلد يشتغل كما هو.

**عربي من الأساس** — الاتجاه من اليمين إلى اليسار من أول بايت في الصفحة، والتصميم مبني بهذا الاتجاه لا معكوساً عنه، بخط IBM Plex Sans Arabic ومعه Amiri للعناوين.

### التشغيل

```bash
npx serve .
```

ولتشغيله على مشروع Firebase خاص فيك، بدّل القيم في `firebase-config.js` من إعدادات مشروعك، وعدّل `WHATSAPP` و `OFFICE_NAME`.

</div>
