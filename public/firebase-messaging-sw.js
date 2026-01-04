importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
<<<<<<< HEAD
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: "",
    measurementId: ""
=======
    apiKey: "AIzaSyAp445JADdXfbhGBPIcClLEtbIUWLezxf0",
    authDomain: "calendar-c8858.firebaseapp.com",
    projectId: "calendar-c8858",
    storageBucket: "calendar-c8858.firebasestorage.app",
    messagingSenderId: "926181659250",
    appId: "1:926181659250:web:14ac3740f5efbb0b5128eb",
    measurementId: "G-84YFY1X1B7"
>>>>>>> abb7bf5 (edit vite.config.js)
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
