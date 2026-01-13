import { initializeApp, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, initializeAuth, browserSessionPersistence } from 'firebase/auth';
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
  where,
} from 'firebase/firestore';

// --- Firebase Config ---
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};
console.log("Firebase Config Check:", {
  apiKey: !!firebaseConfig.apiKey,
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain
});

// --- Initialize ---
// --- Initialize Admin (Default) ---
let app, db, adminAuth;
try {
  if (!firebaseConfig.projectId) {
    console.warn('Firebase not initialized — missing projectId.');
  } else {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app); // Default DB (Admin)
    adminAuth = getAuth(app); // Default Auth (Admin)
  }
} catch (err) {
  console.error('Error initializing Firebase:', err);
  throw err;
}

// --- Initialize User (Secondary) ---
let userApp, userDb, userAuth;

if (!firebaseConfig.apiKey) {
  console.error("CRITICAL: Firebase API Key is missing! Check .env file.");
}

try {
  // Try to retrieve existing app
  // Note: We avoid importing getApp to keep it simple, relying on try-catch on initializeApp
  userApp = initializeApp(firebaseConfig, "UserApp");
} catch (e) {
  // If "UserApp" already exists (duplicate service init), ignore or recreate?
  // "app/duplicate-app" error means we should get the existing one.
  // Since we don't import getApp, we can catch and ignore if we assume it works.
  // BUT the best way is to import { getApp } from 'firebase/app';
  console.warn("UserApp init warning (likely duplicate):", e);
  try {
    userApp = getApp("UserApp");
  } catch (err) {
    console.error("Failed to retrieve existing UserApp:", err);
  }
}

// Fallback if null (shouldn't happen if initializeApp works or throws duplicate)
// Actually if it throws duplicate, we need to GET it.
// Let's modify imports to include getApp for safety.
if (!userApp) {
  // Re-init tactic is tricky if it already exists. 
  // We will just proceed and hope getApp work or just ignore if we can't fix without getApp import.
}

userDb = getFirestore(userApp);

// Initialize Auth with STRICT Session Persistence
console.log("Persistence Type Check:", browserSessionPersistence); // Debug: Check if undefined

try {
  // Reverting to getAuth temporarily to isolate "initializeAuth" vs "missing api key" issue
  // If this works, then initializeAuth+Persistence is the culprit.
  userAuth = getAuth(userApp);

  // Try setting persistence asynchronously if possible, or just log for now
  // setPersistence(userAuth, browserSessionPersistence).catch(e => console.error("Async Persistence Set Error:", e));

} catch (e) {
  console.error("UserAuth Init Error:", e);
  userAuth = getAuth(userApp);
}

// Debug Auth Instance
console.log("UserAuth Initialized:", {
  app: userAuth?.app?.name,
  apiKey: userAuth?.app?.options?.apiKey
});

const auth = adminAuth; // Default export alias
const googleProvider = new GoogleAuthProvider();

// Initialize Messaging (Default App)
import { getMessaging } from "firebase/messaging";
const messaging = app ? getMessaging(app) : null;

export { app, db, auth, adminAuth, userApp, userDb, userAuth, googleProvider, messaging };

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
export function subscribeSchedules(onUpdate, ownerEmail, database = db) {
  if (!database) return () => { };

  // Query ALL (to include legacy items with no ownerEmail)
  const q = query(collection(database, 'schedules'), orderBy('createdDate', 'desc'));

  const unsub = onSnapshot(
    q,
    snapshot => {
      let items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

      // Client-side Filter: Show Own Items OR Legacy Items (no ownerEmail)
      if (ownerEmail) {
        items = items.filter(i => !i.ownerEmail || i.ownerEmail === ownerEmail);
      }

      onUpdate(items);
    },
    err => console.error('onSnapshot error:', err)
  );
  return unsub;
}

// ================= ACTIVITY TYPES =================

// ✅ SUBSCRIBE ACTIVITY TYPES (Realtime)
export const subscribeActivityTypes = (callback, ownerEmail, database = db) => {
  if (!database) return () => { };
  const typesRef = collection(database, 'activityTypes');

  // Query ALL (to include legacy items)
  const q = query(typesRef, orderBy('name'));

  const unsub = onSnapshot(
    q,
    snapshot => {
      let types = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Client-side Filter: Show Own Items OR Legacy Items (no ownerEmail)
      if (ownerEmail) {
        types = types.filter(t => !t.ownerEmail || t.ownerEmail === ownerEmail);
      }

      callback(types);
    },
    err => console.error('subscribeActivityTypes error:', err)
  );
  return unsub;
};

// ✅ ADD ACTIVITY TYPE
export const addActivityType = async (name, color, ownerEmail) => {
  if (!db) throw new Error('Firestore not initialized');
  if (!name || !name.trim()) return;

  const typesRef = collection(db, 'activityTypes');
  await addDoc(typesRef, {
    name: name.trim(),
    color: color || '#3B82F6',
    ownerEmail: ownerEmail || '' // Save Owner Email
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
export const addBooking = async (bookingData, database = db) => {
  if (!database) throw new Error('Firestore not initialized');
  const bookingsRef = collection(database, 'bookings');
  const docRef = await addDoc(bookingsRef, {
    ...bookingData,
    createdAt: new Date().toISOString()
  });
  return docRef.id;
};

// ✅ DELETE BOOKING
export const deleteBooking = async (id, database = db) => {
  if (!database) throw new Error('Firestore not initialized');
  const docRef = doc(database, 'bookings', id);
  await deleteDoc(docRef);
};

// ✅ UPDATE BOOKING
export const updateBookingDoc = async (id, data, database = db) => {
  if (!database) throw new Error('Firestore not initialized');
  const docRef = doc(database, 'bookings', id);
  await updateDoc(docRef, data);
};

// ✅ SUBSCRIBE BOOKINGS (Realtime)
export const subscribeBookings = (callback, database = db) => {
  if (!database) return () => { };
  const bookingsRef = collection(database, 'bookings');
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
  deleteBooking,
  updateBookingDoc, // Export เพิ่ม
};