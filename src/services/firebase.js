import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import {
  getFirestore,
  collection,
  onSnapshot,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  getDocs,
  getDoc,
  query,
  orderBy,
} from 'firebase/firestore';

// --- Firebase Config ---
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};

// --- Initialize ---
let app, db;
try {
  if (!firebaseConfig.projectId) {
    console.warn('Firebase not initialized — missing projectId.');
  } else {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
  }
} catch (err) {
  console.error('Error initializing Firebase:', err);
  throw err;
}

const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
// Initialize Messaging
import { getMessaging } from "firebase/messaging";
const messaging = app ? getMessaging(app) : null;

export { app, db, auth, googleProvider, messaging };

// ================= SCHEDULES =================

// ✅ CREATE
export async function addScheduleDoc(schedule) {
  if (!db) throw new Error('Firestore not initialized');
  const docRef = await addDoc(collection(db, 'schedules'), {
    ...schedule,
    createdDate: new Date().toISOString(),
  });
  return docRef.id;
}

// ✅ READ ALL
export async function getAllSchedules() {
  if (!db) throw new Error('Firestore not initialized');
  const q = query(collection(db, 'schedules'), orderBy('createdDate', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ✅ READ BY ID
export async function getScheduleById(id) {
  if (!db) throw new Error('Firestore not initialized');
  const docRef = doc(db, 'schedules', id);
  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() };
}

// ✅ UPDATE (Function เดิม)
export async function updateScheduleById(id, data) {
  if (!db) throw new Error('Firestore not initialized');
  const docRef = doc(db, 'schedules', id);
  await updateDoc(docRef, data);
  return true;
}

// ✅ UPDATE (ALIAS สำหรับ Admin.js)
// เพิ่มบรรทัดนี้เพื่อให้ Admin.js เรียกใช้ updateScheduleDoc ได้
export const updateScheduleDoc = updateScheduleById;

// ✅ DELETE
export async function deleteScheduleById(id) {
  if (!db) throw new Error('Firestore not initialized');
  const docRef = doc(db, 'schedules', id);
  await deleteDoc(docRef);
  return true;
}

// ✅ SUBSCRIBE SCHEDULES (Realtime)
export function subscribeSchedules(onUpdate) {
  if (!db) return () => { };
  const q = query(collection(db, 'schedules'), orderBy('createdDate', 'desc'));
  const unsub = onSnapshot(
    q,
    snapshot => {
      const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      onUpdate(items);
    },
    err => console.error('onSnapshot error:', err)
  );
  return unsub;
}

// ================= ACTIVITY TYPES =================

// ✅ SUBSCRIBE ACTIVITY TYPES (Realtime)
export const subscribeActivityTypes = (callback) => {
  if (!db) return () => { };
  const typesRef = collection(db, 'activityTypes');
  const q = query(typesRef, orderBy('name'));
  const unsub = onSnapshot(
    q,
    snapshot => {
      // ดึงข้อมูลทั้งหมดรวมถึง color ด้วย
      const types = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(types);
    },
    err => console.error('subscribeActivityTypes error:', err)
  );
  return unsub;
};

// ✅ ADD ACTIVITY TYPE
export const addActivityType = async (name, color) => {
  if (!db) throw new Error('Firestore not initialized');
  if (!name || !name.trim()) return;

  const typesRef = collection(db, 'activityTypes');
  await addDoc(typesRef, {
    name: name.trim(),
    // บันทึกสีลงไป ถ้าไม่มีให้ใช้สี Default เป็นสีฟ้า
    color: color || '#3B82F6'
  });
};

// ✅ UPDATE ACTIVITY TYPE
// ปรับปรุงฟังก์ชันให้รับ color ด้วย
export const updateActivityType = async (id, name, color) => {
  if (!db) throw new Error('Firestore not initialized');
  if (!name || !name.trim()) return;
  const docRef = doc(db, 'activityTypes', id);

  const updateData = { name: name.trim() };
  if (color) {
    updateData.color = color;
  }

  await updateDoc(docRef, updateData);
};

// ✅ DELETE ACTIVITY TYPE
export const deleteActivityType = async (id) => {
  if (!db) throw new Error('Firestore not initialized');
  const docRef = doc(db, 'activityTypes', id);
  await deleteDoc(docRef);
};

// ================= BOOKINGS =================


// ✅ ADD BOOKING
export const addBooking = async (bookingData) => {
  if (!db) throw new Error('Firestore not initialized');
  const bookingsRef = collection(db, 'bookings');
  const docRef = await addDoc(bookingsRef, {
    ...bookingData,
    createdAt: new Date().toISOString()
  });
  return docRef.id;
};

// ✅ DELETE BOOKING
export const deleteBooking = async (id) => {
  if (!db) throw new Error('Firestore not initialized');
  const docRef = doc(db, 'bookings', id);
  await deleteDoc(docRef);
};

// ✅ SUBSCRIBE BOOKINGS (Realtime)
export const subscribeBookings = (callback) => {
  if (!db) return () => { };
  const bookingsRef = collection(db, 'bookings');
  const q = query(bookingsRef, orderBy('startTime', 'asc'));
  const unsub = onSnapshot(
    q,
    snapshot => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(items);
    },
    err => console.error('subscribeBookings error:', err)
  );
  return unsub;
};

export default {
  addScheduleDoc,
  getAllSchedules,
  getScheduleById,
  updateScheduleById,
  updateScheduleDoc,
  deleteScheduleById,
  subscribeSchedules,
  subscribeActivityTypes,
  addActivityType,
  updateActivityType,
  deleteActivityType,
  addBooking,
  subscribeBookings,
  deleteBooking, // Export เพิ่ม
};
