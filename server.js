

import admin from 'firebase-admin';
import cron from 'node-cron';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

dotenv.config();

// Construct require for JSON imports and __dirname for path resolution in ESM
const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// --- 1. Initialize Firebase Admin ---
// Try to find serviceAccountKey.json in the root directory
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');

try {
    if (fs.existsSync(serviceAccountPath)) {
        // Use the constructed require to load the JSON file
        const serviceAccount = require(serviceAccountPath);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log('✅ Firebase Admin initialized with serviceAccountKey.json');
    } else {
        console.warn('⚠️ serviceAccountKey.json not found!');
        console.warn('Attempting to initialize with default credentials...');
        // Fallback to default credentials (works if GOOGLE_APPLICATION_CREDENTIALS is set)
        admin.initializeApp();
    }
} catch (error) {
    console.error('❌ Error initializing Firebase Admin:', error);
    process.exit(1);
}

const db = admin.firestore();
const messaging = admin.messaging();

// --- 2. Notification Logic ---
async function checkAndSendNotifications() {
    const now = new Date();
    // Get time in Bangkok timezone
    const timeString = now.toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Bangkok'
    });

    console.log(`\n[${new Date().toISOString()}] ⏰ Checking alarms for time: ${timeString} (Asia/Bangkok)`);

    try {
        // DEBUG: First, just count all notifications to ensure connection works
        const allDocs = await db.collection('customNotifications').get();
        console.log(`   --> DEBUG: Total documents in 'customNotifications': ${allDocs.size}`);

        if (!allDocs.empty) {
            allDocs.forEach(d => {
                const data = d.data();
                console.log(`      - Doc ID: ${d.id}, Time: "${data.time}", Title: "${data.title}", Enabled: ${data.isEnabled}`);
            });
        }

        // Query 'customNotifications' - Relaxed query to handle missing 'isEnabled' field
        const snapshot = await db.collection('customNotifications')
            .where('time', '==', timeString)
            .get();

        if (snapshot.empty) {
            console.log(`   ❌ No alarms match time "${timeString}"`);
            return;
        }

        console.log(`   🔍 Found ${snapshot.size} potential alarms with time "${timeString}". Filtering...`);

        const promises = [];
        snapshot.forEach(doc => {
            const note = doc.data();

            // Treat undefined/null as TRUE. Only skip if explicitly FALSE.
            if (note.isEnabled === false) {
                console.log(`      Skipping "${note.title}" (Disabled)`);
                return;
            }

            console.log(`      ✅ Processing "${note.title}" (Enabled/Default)`);
            const uid = note.userId;

            if (!uid) {
                console.warn(`   ⚠️ Notification ${doc.id} has no userId.`);
                return;
            }

            // Create a promise for each notification to process in parallel
            const p = (async () => {
                try {
                    // Get User's FCM Token
                    const userDoc = await db.collection('users').doc(uid).get();
                    if (!userDoc.exists) {
                        console.log(`   User ${uid} not found.`);
                        return;
                    }

                    const userData = userDoc.data();
                    const token = userData.fcmToken;

                    if (!token) {
                        console.log(`   User ${uid} has no FCM Token.`);
                        return;
                    }

                    // Send Push Notification
                    const message = {
                        token: token,
                        // Data-only message to force Service Worker handling
                        data: {
                            notificationId: doc.id,
                            type: 'custom_alarm',
                            time: note.time,
                            title: note.title || 'Notification',
                            body: `ถึงเวลา ${note.time} แล้ว`,
                            icon: '/logo192.png',
                            link: '/'
                        }
                    };

                    const response = await messaging.send(message);
                    console.log(`   ✅ Sent notification to user ${uid}: ${response}`);

                    // --- SAVE TO HISTORY ---
                    try {
                        const historyRef = db.collection('users').doc(uid).collection('notificationHistory');
                        const now = new Date();

                        // Thai Date Strings
                        const dateThai = now.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Bangkok' });
                        const timeThai = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok' });

                        // Eng Date Strings
                        const dateEng = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Bangkok' });
                        const timeEng = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok' });

                        await historyRef.add({
                            title: note.title || 'Notification',
                            desc: 'ถึงเวลาแล้ว',
                            fullThaiInfo: `${dateThai} เวลา ${timeThai}`,
                            footerTime: `${dateEng}, ${timeEng} (GMT+07:00)`,
                            time: note.time,
                            // Use YYYY-MM-DD in Bangkok time for consistency
                            date: now.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' }),
                            timestamp: admin.firestore.FieldValue.serverTimestamp(),
                            type: 'custom',
                            read: false,
                            originalId: doc.id
                        });
                        console.log(`   📝 Saved to notificationHistory for user ${uid}`);
                    } catch (histErr) {
                        console.error(`   ❌ Failed to save history for user ${uid}:`, histErr);
                    }
                } catch (err) {
                    console.error(`   ❌ Failed to send to user ${uid}:`, err.message);
                }
            })();

            promises.push(p);
        });

        await Promise.all(promises);

    } catch (error) {
        console.error('❌ Error in checkAndSendNotifications:', error);
    }
}

// --- 3. Schedule Cron Job (Every Minute) ---
// * * * * * runs at every minute
cron.schedule('* * * * *', () => {
    checkAndSendNotifications();
});

// --- 4. Start Server ---
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => {
    res.send('Calendar Notification Server is Running! 🚀');
});

// Manual trigger for testing: /test?time=14:30
app.get('/test', async (req, res) => {
    const testTime = req.query.time;
    if (testTime) {
        console.log(`Testing for time: ${testTime}`);
        // Temporarily override logic to test specific time
        // (For simplicity in this snippet, we just log. 
        // Real implementation would refactor core logic to accept time param)
    }
    await checkAndSendNotifications();
    res.send('Check trigger initiated. See console logs.');
});

app.listen(PORT, () => {
    console.log(`\n🚀 Server running on port ${PORT}`);
    console.log(`📅 Timezone set to Asia/Bangkok`);
    console.log(`Waiting for the next minute tick...`);
});
