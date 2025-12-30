import { collection, addDoc, query, where, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db } from './firebase';

const COLLECTION_NAME = 'customNotifications';

// Add a new custom notification
export const addCustomNotification = async (userId, notificationData) => {
    if (!db) throw new Error('Firestore not initialized');
    if (!userId) throw new Error('User ID is required');

    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        userId,
        ...notificationData,
        createdAt: new Date().toISOString()
    });
    return docRef.id;
};

// Subscribe to user's custom notifications
export const subscribeCustomNotifications = (userId, onUpdate) => {
    if (!db || !userId) return () => { };

    const q = query(
        collection(db, COLLECTION_NAME),
        where('userId', '==', userId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const notifications = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Client-side sort to avoid composite index requirement
        notifications.sort((a, b) => {
            const dateA = new Date(a.createdAt || 0);
            const dateB = new Date(b.createdAt || 0);
            return dateB - dateA; // Descending
        });

        onUpdate(notifications);
    }, (error) => {
        console.error("Error subscribing to custom notifications:", error);
    });

    return unsubscribe;
};

// Delete a custom notification
export const deleteCustomNotification = async (notificationId) => {
    if (!db) throw new Error('Firestore not initialized');

    const docRef = doc(db, COLLECTION_NAME, notificationId);
    await deleteDoc(docRef);
};

// Update a custom notification
export const updateCustomNotification = async (notificationId, updatedData) => {
    if (!db) throw new Error('Firestore not initialized');

    // Remove id from data if present to avoid overwriting document ID with itself
    const { id, ...data } = updatedData;

    const docRef = doc(db, COLLECTION_NAME, notificationId);
    await import('firebase/firestore').then(({ updateDoc }) => updateDoc(docRef, data));
};

// Subscribe to notification history (Server-side generated)
export const subscribeNotificationHistory = (userId, onUpdate) => {
    if (!db || !userId) return () => { };

    const q = query(
        collection(db, `users/${userId}/notificationHistory`),
        orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const history = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        onUpdate(history);
    }, (error) => {
        console.error("Error subscribing to notification history:", error);
    });

    return unsubscribe;
};
