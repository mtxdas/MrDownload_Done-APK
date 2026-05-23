# MR Download — APK বানানোর সম্পূর্ণ গাইড (মোবাইল দিয়ে)

## প্রয়োজনীয় accounts (সব FREE)
1. GitHub: https://github.com
2. Expo: https://expo.dev

---

## STEP 1 — GitHub এ project upload করো

1. github.com এ login করো
2. New repository বানাও → নাম দাও: `mr-download`
3. Private রাখো (optional)
4. Create repository click করো

এরপর **github.dev** (web editor) ব্যবহার করে সব files upload করো:
- ফোনের Files app থেকে সব files select করো
- GitHub এর upload files এ drag করো

---

## STEP 2 — Expo account বানাও

1. expo.dev → Sign Up (free)
2. Email verify করো

---

## STEP 3 — EAS Build setup (Expo website থেকেই হবে)

expo.dev এ login করার পর:
1. "Create Project" → নাম দাও "mr-download"
2. Project ID copy করো
3. `app.json` এর `"YOUR_EAS_PROJECT_ID"` জায়গায় paste করো

---

## STEP 4 — Build শুরু করো

expo.dev → তোমার project → "Builds" → "New Build"
- Platform: Android
- Build type: APK (preview build)
- Branch: main
- Start build click করো

⏳ Build সময় লাগে: **10-20 মিনিট**

---

## STEP 5 — APK ডাউনলোড করো

Build complete হলে:
- expo.dev → Builds → তোমার build
- "Download" button → APK ফাইল পাবে

---

## STEP 6 — Play Store এ upload করো

### Play Store এর জন্য AAB দরকার (APK না)
Build type এ "production" বেছে নিলে AAB পাবে।

1. play.google.com/console → নতুন account ($25 one-time fee)
2. Create app → MR Download
3. App bundle upload করো (.aab file)
4. Store listing পূরণ করো:
   - Description, screenshots, icon
5. Review submit করো (3-7 দিন লাগে)

---

## ⚠️ গুরুত্বপূর্ণ নোট

Play Store এ video downloader app approve পেতে:
- Privacy policy লাগবে (Google Sites দিয়ে বানাতে পারো, free)
- App যেন শুধু copyright-free বা user-owned content download করে — এটা description এ উল্লেখ করো
- `com.mrdownload.app` package name unique রাখো

---

## সাহায্য দরকার হলে

প্রতিটি step এ আমাকে screenshot পাঠাও — আমি guide করব।
