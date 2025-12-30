const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();
// Run every minute
exports.checkScheduledNotifications = functions.pubsub.schedule("every 1 minutes").onRun(async (_context) => {
    const db = admin.firestore();
    const messaging = admin.messaging();
    const now = new Date();

    // Calculate time window (e.g., current minute)
    // Note: This is a simplified example. You might need timezone adjustments.
    const timeString = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok' });

    console.log(`Checking alarms for time: ${timeString}`);
    // Query all users (Or structure your DB to have a 'scheduled_notifications' collection for efficiency)
    // For this example, we simply look for custom notifications that match the time.
    // NOTE: In production, querying *all* users is expensive. Better to duplicate alarms to a global collection.

    // query 'customNotifications' collection directly if it exists.

    const snapshot = await db.collection('customNotifications')
        .where('isEnabled', '==', true)
        .where('time', '==', timeString)
        .get();
    if (snapshot.empty) {
        return null;
    }
    const promises = [];
    for (const doc of snapshot.docs) {
        const note = doc.data();
        const uid = note.userId; // Fixed: Use 'userId' as saved in customNotificationService.js
        // Get User's FCM Token
        const userDoc = await db.collection('users').doc(uid).get();
        if (!userDoc.exists || !userDoc.data().fcmToken) continue;
        const token = userDoc.data().fcmToken;
        // Send Push
        const message = {
            token: token,
            notification: {
                title: note.title,
                body: `ถึงเวลา ${note.time} แล้ว`
            },
            webpush: {
                fcm_options: {
                    link: 'https://your-app-url.com'
                }
            }
        };
        promises.push(messaging.send(message));
    }
    await Promise.all(promises);
    return null;
});