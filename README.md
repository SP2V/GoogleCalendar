# React + Vite

โปรเจกต์ React ที่สร้างด้วย Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

## การใช้งาน / Usage

### ติดตั้ง Dependencies
```bash
npm install
```

### รันโปรเจกต์ในโหมด Development
```bash
npm run dev
```

### Build สำหรับ Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

### ตรวจสอบ Code ด้วย ESLint
```bash
npm run lint
```

### รัน Server สำหรับแจ้งเตือน (Backend)
เพื่อให้ได้รับแจ้งเตือนแม้ไม่ได้เปิดหน้าเว็บ (Desktop Notification) **จำเป็นต้องเปิด Server นี้ทิ้งไว้**

```bash
node server.js
```
*(Server จะทำงานทุกๆ 1 นาที เพื่อตรวจสอบเวลาแจ้งเตือน)*

---

## ข้อมูลเพิ่มเติม

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## การตั้งค่า Google Calendar API (OAuth 2.0)

ระบบนี้ใช้ Google Calendar API โดยตรงผ่าน OAuth 2.0 แทนการใช้ Service Account หรือ Apps Script แบบเดิม เพื่อความปลอดภัยและสะดวกในการจัดการสิทธิ์ของ Admin

### 1. สร้าง Google Cloud Project
1. ไปที่ [Google Cloud Console](https://console.cloud.google.com/)
2. สร้าง Project ใหม่ (หรือใช้ Project เดียวกับ Firebase ก็ได้)
3. ไปที่เมนู **APIs & Services** > **Library**
4. ค้นหา **"Google Calendar API"** และกด **Enable**

### 2. ตั้งค่า OAuth Consent Screen
1. ไปที่เมนู **APIs & Services** > **OAuth consent screen**
2. เลือก **External** (หรือ Internal ถ้าใช้ในองค์กร) แล้วกด Create
3. กรอก App Information (ชื่อ App, Email Support)
4. ในส่วน **Scopes**, กด Add Scopes และเลือก:
   - `.../auth/calendar` (See, edit, share, and permanently delete all the calendars you can access using Google Calendar)
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
5. เพิ่ม **Test users** (Email ของ Admin ที่จะใช้จัดการปฏิทิน)

### 3. สร้าง Credentials
1. ไปที่เมนู **APIs & Services** > **Credentials**
2. กด **Create Credentials** > **OAuth client ID**
3. Application type เลือก **Web application**
4. ตั้งชื่อ (เช่น `Calendar Web App`)
5. ในส่วน **Authorized redirect URIs** ให้ใส่:
   - `http://localhost:3000/auth/google/callback` (โปรดตรวจสอบ Port ของ Server ให้ตรงกับที่ใช้งานจริง)
6. กด Create จะได้ **Client ID** และ **Client Secret**

### 4. อัปเดตไฟล์ .env
นำค่าที่ได้มาใส่ในไฟล์ `.env` ของโปรเจกต์:

```env
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
REDIRECT_URI=http://localhost:3000/auth/google/callback
```

## การตั้งค่า Firebase / Firebase Configuration

ระบบจองห้องประชุมนี้ใช้ Firebase สำหรับระบบสมาชิก (Authentication) และฐานข้อมูล (Firestore)
หากมีการเปลี่ยนโปรเจกต์ Firebase จำเป็นต้องอัปเดตค่า Config ในโค้ด

### 1. สร้างโปรเจกต์ Firebase ใหม่
1. ไปที่ [Firebase Console](https://console.firebase.google.com/)
2. คลิก **Add project** และทำตามขั้นตอนจนเสร็จสิ้น
3. เข้าไปที่โปรเจกต์ที่เพิ่งสร้าง คลิกไอคอน **Web (</>)** เพื่อ Register App
4. ตั้งชื่อ App (เช่น `Meeting Room`) และคลิก **Register app**
5. คุณจะได้รับ `const firebaseConfig = { ... };` ให้คัดลอกค่านี้เก็บไว้

### 2. ตั้งค่า Authentication และ Database
1.  **Authentication**:
    -   เมนู Build > Authentication > **Get started**
    -   แท็บ **Sign-in method** > เปิดใช้งาน **Google** และ **Email/Password**
2.  **Firestore Database**:
    -   เมนู Build > Firestore Database > **Create database**
    -   เลือก Location (เช่น `asia-southeast1`)
    -   Start in **Test mode** (หรือ Production mode แล้วแก้ Rules ทีหลัง)

### 3. อัปเดต Config ในโปรเจกต์
1.  เปิดไฟล์ `src/services/firebase.js`
2.  หาตัวแปร `firebaseConfig` และแทนที่ด้วยค่าใหม่ที่คุณคัดลอกมา:
    ```javascript
    const firebaseConfig = {
      apiKey: "AIzaSy...",
      authDomain: "...",
      projectId: "...",
      storageBucket: "...",
      messagingSenderId: "...",
      appId: "..."
    };
    ```
3.  บันทึกไฟล์

---

## การตั้งค่าระบบแจ้งเตือน (Background Notifications)

## การเตรียมไฟล์สำคัญ / Prerequisites

ก่อนรันโปรเจกต์ ต้องตรวจสอบว่ามีไฟล์เหล่านี้ครบถ้วน:

### 1. Firebase Service Account Key
เพื่อให้ `server.js` ทำงานได้ ต้องมีไฟล์ **`serviceAccountKey.json`** วางอยู่ที่โฟลเดอร์หลัก (`/Calendar`)
- ดาวน์โหลดได้จาก [Firebase Console](https://console.firebase.google.com/) > Project Settings > Service accounts > Generate new private key

### 2. ไฟล์ .env (ถ้ามี)
ตรวจสอบการตั้งค่า Environment Variables หากจำเป็น
- **GOOGLE_CLIENT_ID**: จาก Google Cloud Console
- **GOOGLE_CLIENT_SECRET**: จาก Google Cloud Console

### 3. ไฟล์ .firebaserc
เปลี่ยนค่า 
```
{
  "projects": {
    "default": "YOUR_projectId"
  }
}

```

---

## ข้อมูลเพิ่มเติม

### การทำงานของการแจ้งเตือน (Notifications)
- **ขณะเปิดหน้าเว็บ**: `User.jsx` จะคอยเช็คเวลาและแจ้งเตือน
- **ขณะปิดหน้าเว็บ**: `server.js` จะคอยเช็คเวลาจาก Database และส่ง Notification ผ่าน Firebase Cloud Messaging (FCM) ไปยัง Service Worker (`firebase-messaging-sw.js`)

### การเปลี่ยนบัญชี Google Calendar
ใช้ระบบ OAuth 2.0 (ล็อกอินผ่านหน้า Admin) โดยค่า Token จะถูกเก็บลงใน Firebase Firestore (`systemConfig/adminSettings`) เพื่อให้ Server นำไปใช้งานต่อ (Offline Access)

### Firebase Config
ตั้งค่าที่ `src/services/firebase.js`

```javascript
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  // ...
};
```
