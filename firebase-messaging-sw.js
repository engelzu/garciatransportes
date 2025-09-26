// firebase-messaging-sw.js
importScripts("https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js");

// Configuração do Firebase (mesma do app)
firebase.initializeApp({
  apiKey: "AIzaSyARpmkXfWaDPp1whsQefM0G6cR5W6BxAyU",
  authDomain: "garciatransportes-6f499.firebaseapp.com",
  projectId: "garciatransportes-6f499",
  storageBucket: "garciatransportes-6f499.firebasestorage.app",
  messagingSenderId: "837434696553",
  appId: "1:837434696553:web:6fb49715809847b4a853f8",
  measurementId: "G-XGH7SF9KZC"
});

const messaging = firebase.messaging();

// Mensagem recebida em background
messaging.onBackgroundMessage((payload) => {
  console.log("[firebase-messaging-sw.js] Mensagem recebida:", payload);

  const notificationTitle = payload.notification?.title || "Nova mensagem";
  const notificationOptions = {
    body: payload.notification?.body || "",
    icon: "/icon-192.png"
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
