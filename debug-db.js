
import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize (Same as server.js)
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function debugData() {
    console.log('--- DEBUGGING DATABASE ---');

    // 1. Check Custom Notifications
    console.log('\nReading "customNotifications"...');
    const notifs = await db.collection('customNotifications').get();
    if (notifs.empty) {
        console.log('❌ No documents in "customNotifications".');
    } else {
        notifs.forEach(doc => {
            console.log(`- ID: ${doc.id}, Data:`, doc.data());
        });
    }

    // 2. Check Users (for Tokens)
    console.log('\nReading "users" (checking tokens)...');
    const users = await db.collection('users').get();
    if (users.empty) {
        console.log('❌ No documents in "users".');
    } else {
        users.forEach(doc => {
            const data = doc.data();
            const hasToken = !!data.fcmToken;
            console.log(`- User: ${doc.id}, Has FCM Token: ${hasToken ? '✅' : '❌'}`);
            if (hasToken) console.log(`  Token: ${data.fcmToken.substring(0, 20)}...`);
        });
    }
}

debugData();
