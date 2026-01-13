importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyD3Dl_a7fxcRJXA96Gj6wDbdw7EwayrwAg",
    authDomain: "calendar-41ed2.firebaseapp.com",
    projectId: "calendar-41ed2",
    storageBucket: "calendar-41ed2.firebasestorage.app",
    messagingSenderId: "436853070689",
    appId: "1:436853070689:web:4be59dfe61c600565ac320",
    measurementId: "G-LNFVTEEZJR"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    // Customize notification here
    const notificationTitle = payload.data.title;
    const notificationOptions = {
        body: payload.data.body,
        icon: new URL(payload.data.icon || '/logo192.png', self.location.origin).href,
        data: payload.data // Pass data along
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});
