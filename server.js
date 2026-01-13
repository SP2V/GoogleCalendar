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

// --- Google OAuth Setup ---
import { google } from 'googleapis';

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.REDIRECT_URI || 'http://localhost:3000/auth/google/callback'
);

// Route to start OAuth flow
app.get('/auth/google', (req, res) => {
    const url = oauth2Client.generateAuthUrl({
        access_type: 'offline', // Critical for receiving refresh_token
        prompt: 'select_account', // Allow account selection, do NOT force consent every time
        scope: [
            'https://www.googleapis.com/auth/calendar',
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile'
        ]
    });
    res.redirect(url);
});

// OAuth Callback
app.get('/auth/google/callback', async (req, res) => {
    const { code } = req.query;
    if (!code) return res.status(400).send('No code provided');

    try {
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        // 1. Get User Info to identify user (and get UID/Email)
        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
        const userInfo = await oauth2.userinfo.get();
        const { email, id: googleUserId, name, picture } = userInfo.data;

        console.log(`✅ OAuth Success for: ${email}`);

        // 2. Store Refresh Token (For Admin Sync - Assuming this login IS the Admin)
        if (tokens.refresh_token) {
            await db.collection('systemConfig').doc('adminSettings').set({
                refresh_token: tokens.refresh_token,
                adminEmail: email,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            console.log('   ✅ Refresh Token stored/updated.');
        }

        // 3. Mint Firebase Custom Token for Frontend Login
        // We use the email or Google ID to create/get a Firebase User
        // Note: Ideally we should match with existing Firebase user by email if exists.
        let uid = googleUserId; // Default to Google ID
        try {
            const userRecord = await admin.auth().getUserByEmail(email);
            uid = userRecord.uid;
            console.log(`   ✅ Found existing Firebase user: ${uid}`);
        } catch (e) {
            if (e.code === 'auth/user-not-found') {
                console.log(`   ✨ Creating new Firebase user for ${email}`);
                const newUser = await admin.auth().createUser({
                    uid: googleUserId,
                    email: email,
                    displayName: name,
                    photoURL: picture,
                    emailVerified: true
                });
                uid = newUser.uid;
            } else {
                throw e;
            }
        }

        const customToken = await admin.auth().createCustomToken(uid, { role: 'admin' });

        // 4. Redirect back to Frontend with Token
        // Redirect to AdminLogin page, which will handle the token exchange
        res.redirect(`http://localhost:5173/admin-login?token=${customToken}&email=${encodeURIComponent(email)}`);

    } catch (error) {
        console.error('❌ Error in OAuth Callback:', error);
        res.status(500).send('Authentication failed: ' + error.message);
    }
});

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

// --- 3. Sync Logic (Server-Side) ---

// Valid Google Calendar Colors (Event)
const googleColors = {
    1: '#7986cb',  // Lavender
    2: '#33b679',  // Sage
    3: '#8e24aa',  // Grape
    4: '#e67c73',  // Flamingo
    5: '#f6c026',  // Banana
    6: '#f5511d',  // Tangerine
    7: '#039be5',  // Peacock
    8: '#616161',  // Graphite
    9: '#3f51b5',  // Blueberry
    10: '#0b8043', // Basil
    11: '#d50000'  // Tomato
};

const hexToRgb = (hex) => {
    // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
    var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, function (m, r, g, b) {
        return r + r + g + g + b + b;
    });

    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

const mapHexToGoogleColorId = (hex) => {
    if (!hex) return '7'; // Default Peacock

    const target = hexToRgb(hex);
    if (!target) return '7';

    let minDiff = Infinity;
    let bestId = '7';

    for (const [id, colorHex] of Object.entries(googleColors)) {
        const current = hexToRgb(colorHex);
        if (!current) continue;

        // Simple Euclidean distance in RGB space
        const diff = Math.sqrt(
            Math.pow(target.r - current.r, 2) +
            Math.pow(target.g - current.g, 2) +
            Math.pow(target.b - current.b, 2)
        );

        if (diff < minDiff) {
            minDiff = diff;
            bestId = id;
        }
    }
    return bestId;
};

// Helper: Ensure we have valid credentials
async function ensureAuth() {
    const configDoc = await db.collection('systemConfig').doc('adminSettings').get();
    if (!configDoc.exists || !configDoc.data().refresh_token) {
        throw new Error('No Admin Refresh Token found');
    }
    const refreshToken = configDoc.data().refresh_token;
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    return google.calendar({ version: 'v3', auth: oauth2Client });
}

// Helper: Get Activity Colors
async function getActivityColors() {
    const activityTypesSnapshot = await db.collection('activityTypes').get();
    const activityColors = {};
    activityTypesSnapshot.forEach(doc => {
        const d = doc.data();
        if (d.name) activityColors[d.name] = d.color;
    });
    return activityColors;
}

// Function to Update an Existing Event
async function updateGoogleCalendarEvent(bookingId, bookingData) {
    if (!bookingData.googleCalendarEventId_Admin) return;

    try {
        const calendar = await ensureAuth();
        const activityColors = await getActivityColors();

        const typeColor = activityColors[bookingData.type];
        const colorId = mapHexToGoogleColorId(typeColor);

        const event = {
            summary: bookingData.title || bookingData.subject,
            description: `${bookingData.description || ''}\n\n(Booked by: ${bookingData.userName || 'User'})`,
            start: { dateTime: bookingData.startTime, timeZone: 'Asia/Bangkok' },
            end: { dateTime: bookingData.endTime, timeZone: 'Asia/Bangkok' },
            location: bookingData.location,
            colorId: colorId
        };

        await calendar.events.patch({
            calendarId: 'primary',
            eventId: bookingData.googleCalendarEventId_Admin,
            resource: event
        });

        console.log(`      ✏️ Updated Google Event for Booking ${bookingId}`);

    } catch (error) {
        console.error(`      ❌ Failed to update Google Event for Booking ${bookingId}:`, error.message);
    }
}

async function syncBookingsToAdminCalendar() {
    console.log(`[${new Date().toISOString()}] 🔄 Starting Sync Bookings...`);
    try {
        const calendar = await ensureAuth();
        const activityColors = await getActivityColors();

        // 3. Find Bookings to Sync (Confirmed + Missing googleCalendarEventId_Admin)
        // Note: Ideally use a composite index, but for now fetching 'confirmed' and filtering is safer for undefined field.
        const bookingsSnapshot = await db.collection('bookings')
            .where('status', '==', 'confirmed')
            .get();

        const bookingsToSync = [];
        bookingsSnapshot.forEach(doc => {
            const data = doc.data();
            if (!data.googleCalendarEventId_Admin) {
                bookingsToSync.push({ id: doc.id, ...data });
            }
        });

        if (bookingsToSync.length === 0) {
            console.log('   ✅ No new bookings to sync.');
            return;
        }

        console.log(`   Found ${bookingsToSync.length} bookings to sync.`);

        // 4. Sync Each Booking
        for (const booking of bookingsToSync) {
            try {
                // Determine Color
                const typeColor = activityColors[booking.type];
                const colorId = mapHexToGoogleColorId(typeColor);

                const event = {
                    summary: booking.title || booking.subject,
                    description: `${booking.description || ''}\n\n(Booked by: ${booking.userName || 'User'})`,
                    start: { dateTime: booking.startTime, timeZone: 'Asia/Bangkok' }, // Ensure ISO string
                    end: { dateTime: booking.endTime, timeZone: 'Asia/Bangkok' },
                    location: booking.location,
                    colorId: colorId
                };

                const response = await calendar.events.insert({
                    calendarId: 'primary',
                    resource: event,
                });

                console.log(`      ✅ Synced booking ${booking.id} -> Event ID: ${response.data.id}`);

                // Update Firestore
                await db.collection('bookings').doc(booking.id).update({
                    googleCalendarEventId_Admin: response.data.id
                });

            } catch (err) {
                console.error(`      ❌ Failed to sync booking ${booking.id}:`, err.message);
            }
        }

    } catch (error) {
        console.error('❌ Error in syncBookingsToAdminCalendar:', error);
    }
}

// Function to Delete an Event
async function deleteGoogleCalendarEvent(bookingId, googleCalendarEventId) {
    if (!googleCalendarEventId) return;

    try {
        const calendar = await ensureAuth();
        await calendar.events.delete({
            calendarId: 'primary',
            eventId: googleCalendarEventId
        });
        console.log(`      🗑️ Deleted Google Event for Booking ${bookingId}`);
    } catch (error) {
        console.error(`      ❌ Failed to delete Google Event for Booking ${bookingId}:`, error.message);
    }
}

// --- 4. Real-time Sync Setup ---
function setupRealtimeSync() {
    console.log('QUERY: Setting up Real-time Booking Sync listener...');

    // Listen for NEW, MODIFIED, or REMOVED confirmed bookings
    const query = db.collection('bookings')
        // .where('status', '==', 'confirmed'); // Removing filter to catch deletions of any status if needed, 
        // but 'removed' event might not trigger if it doesn't match query *before* deletion?
        // Firestore real-time listener behavior: if a doc matches query and then is deleted, it triggers 'removed'.
        // So keeping the filter is fine IF the doc matched it before.
        // However, if we want to catch ALL deletions, we should remove the filter or handle it carefully.
        // Let's keep it simple: We only care about deleting confirmed bookings from calendar.
        .where('status', '==', 'confirmed');

    query.onSnapshot(snapshot => {
        snapshot.docChanges().forEach(change => {
            const data = change.doc.data();
            const bookingId = change.doc.id;

            if (change.type === 'added') {
                if (!data.googleCalendarEventId_Admin) {
                    console.log(`🔔 New Booking detected: ${bookingId}, triggering Sync...`);
                    syncBookingsToAdminCalendar();
                }
            }
            else if (change.type === 'modified') {
                if (data.googleCalendarEventId_Admin) {
                    console.log(`🔔 Modified Booking detected: ${bookingId}, Update Google Calendar...`);
                    updateGoogleCalendarEvent(bookingId, data);
                } else {
                    // Became confirmed but no ID yet? Sync it.
                    console.log(`🔔 Modified Booking detected (Now Confirmed): ${bookingId}, triggering Sync...`);
                    syncBookingsToAdminCalendar();
                }
            }
            else if (change.type === 'removed') {
                console.log(`🔔 Booking Removed: ${bookingId}`);
                if (data.googleCalendarEventId_Admin) {
                    deleteGoogleCalendarEvent(bookingId, data.googleCalendarEventId_Admin);
                }
            }
        });
    }, err => {
        console.error('❌ Real-time Sync Listener Error:', err);
    });
}

// --- 5. Schedule Cron Jobs ---
// Check Notifications every minute
cron.schedule('* * * * *', () => {
    checkAndSendNotifications();
});

// Sync Calendar every minute (Backup for missed events)
cron.schedule('* * * * *', () => {
    syncBookingsToAdminCalendar();
});

// --- 6. Start Server ---
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => {
    res.send('Calendar Notification Server is Running! 🚀');
});

// Manual trigger for testing: /test?time=14:30
app.get('/test', async (req, res) => {
    const testTime = req.query.time;
    console.log(`🧪 Manual test triggered via /test`);

    // Trigger both Notification check and Calendar Sync
    await Promise.all([
        checkAndSendNotifications(),
        syncBookingsToAdminCalendar()
    ]);

    res.send('✅ Manual trigger executed. Check server console for details.');
});

app.listen(PORT, () => {
    console.log(`\n🚀 Server running on port ${PORT}`);
    console.log(`📅 Timezone set to Asia/Bangkok`);
    console.log(`Waiting for the next minute tick...`);
    setupRealtimeSync(); // Initialize real-time sync listener
});