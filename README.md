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

## การเปลี่ยนบัญชี Google Calendar ของ Admin / Changing Admin Calendar Account

ระบบจองห้องประชุมนี้เชื่อมต่อกับ Google Calendar ผ่าน **Google Apps Script (GAS)** เพื่อให้สามารถสร้างและลบกิจกรรมในปฏิทินของ Admin ได้โดยไม่ต้องเปิดเผย Credentials ของบัญชีโดยตรง

หากต้องการเปลี่ยนบัญชี Gmail ที่ใช้เป็น Admin สำหรับสร้างนัดหมาย ให้ทำตามขั้นตอนดังนี้:

### 1. สร้าง Google Apps Script ใหม่
1.  ล็อกอินด้วยบัญชี Gmail ที่ต้องการใช้เป็น Admin
2.  ไปที่ [script.google.com](https://script.google.com/) คลิก **New Project**
3.  ลบโค้ดเดิมทั้งหมด แล้ววางโค้ดด้านล่างนี้ลงไป (เป็นโค้ดตัวอย่างสำหรับการทำงานพื้นฐาน):

```javascript
/* 
  Reference Google Apps Script for Meeting Room Booking 
  This script acts as a Web App to interface with Google Calendar.
*/

// Google Apps Script Code
// แก้ไขเพื่อให้รองรับการเพิ่ม User เป็นผู้เข้าร่วม (Attendees)

function doPost(e) {
    try {
        var data = JSON.parse(e.postData.contents);
        var action = data.action;
        
        if (action === 'delete') {
            return deleteEvent(data.eventId);
        } else {
            return createEvent(data);
        }
    } catch (error) {
        return ContentService.createTextOutput(JSON.stringify({
            status: 'error',
            message: error.toString()
        })).setMimeType(ContentService.MimeType.JSON);
    }
}

function createEvent(data) {
    var calendar = CalendarApp.getCalendarById('primary'); // หรือใส่ Email ของ Admin
    if (!calendar) {
        throw new Error('Calendar not found');
    }

    var startTime = new Date(data.startTime);
    var endTime = new Date(data.endTime);

    // --- ส่วนที่แก้ไข: เพิ่ม guests และ sendInvites ---
    var options = {
        description: data.description || '',
        location: data.location || '',
        guests: data.userEmail || '', // อีเมลของ User ที่ส่งมาจาก Frontend
        sendInvites: true             // ส่งอีเมลเชิญเพื่อให้ Sync ลงปฏิทินของ User อัตโนมัติ
    };
    // -------------------------------------------

    var event = calendar.createEvent(data.title, startTime, endTime, options);

    // กำหนดสีถ้ามีการส่งมา
    if (data.colorId) {
        event.setColor(data.colorId);
    }

    return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        eventId: event.getId()
    })).setMimeType(ContentService.MimeType.JSON);
}

function deleteEvent(eventId) {
    var calendar = CalendarApp.getCalendarById('primary');
    var event = calendar.getEventById(eventId);
    if (event) {
        event.deleteEvent();
        return ContentService.createTextOutput(JSON.stringify({ status: 'success' }))
            .setMimeType(ContentService.MimeType.JSON);
    } else {
        return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Event not found' }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}

function doGet(e) {
    return ContentService.createTextOutput("Calendar API is active with Attendee Support");
}
```

### 2. ทำการ Deploy เป็น Web App
1.  คลิกปุ่ม **Deploy** (สีน้ำเงินมุมขวาบน) > **New deployment**
2.  เลือก type เป็น **Web app** (รูปเฟือง)
3.  ตั้งค่าดังนี้:
    -   **Description**: (ตั้งชื่ออะไรก็ได้ เช่น "Calendar API")
    -   **Execute as**: **Me** (บัญชีของคุณ - สำคัญมาก!)
    -   **Who has access**: **Anyone** (เพื่อให้ Application เรียกใช้งานได้)
4.  คลิก **Deploy**
5.  คัดลอก **Web app URL** (ลิงก์ยาวๆ ที่ลงท้ายด้วย `/exec`)

### 3. อัปเดต URL ในโปรเจกต์
1.  เปิดไฟล์ `src/services/calendarService.js`
2.  แก้ไขตัวแปร `API_URL` ให้เป็น URL ใหม่ที่ได้มา:
    ```javascript
    const API_URL = 'https://script.google.com/macros/s/......./exec';
    ```
3.  บันทึกไฟล์และทดสอบการจอง

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
ดูรายละเอียดในโค้ด `src/services/calendarService.js` และ Google Apps Script ที่เกี่ยวข้อง (URL มาจาก GAS Web App)

### Firebase Config
ตั้งค่าที่ `src/services/firebase.js`

```javascript
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  // ...
};
```
