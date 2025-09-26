// firebase-messaging.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-messaging.js";

// Configuração do seu projeto Firebase
const firebaseConfig = {
  apiKey: "AIzaSyARpmkXfWaDPp1whsQefM0G6cR5W6BxAyU",
  authDomain: "garciatransportes-6f499.firebaseapp.com",
  projectId: "garciatransportes-6f499",
  storageBucket: "garciatransportes-6f499.firebasestorage.app",
  messagingSenderId: "837434696553",
  appId: "1:837434696553:web:6fb49715809847b4a853f8",
  measurementId: "G-XGH7SF9KZC"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// Pede permissão e gera token
async function initNotifications() {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.warn("Permissão de notificação não concedida!");
      return;
    }

    // 👉 Use a chave pública VAPID que você gerou no Console Firebase
    const currentToken = await getToken(messaging, {
      vapidKey: "BGzQwJ9KG8QiN7kfwVKXHIQ610o1DLw4LT69KHPzAHmmzSvKOokhvyrO9gKTP3EYjxPwKDIiAf3QiC9vFQgPOyU"
    });

    if (currentToken) {
      console.log("Token do dispositivo FCM:", currentToken);
      // Aqui você deve enviar o token para seu backend (salvar no BD)
    } else {
      console.warn("Nenhum token gerado.");
    }
  } catch (err) {
    console.error("Erro ao inicializar notificações:", err);
  }
}

initNotifications();

// Quando o app está aberto e chega mensagem
onMessage(messaging, (payload) => {
  console.log("Mensagem recebida em foreground:", payload);
});
// firebase-messaging.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-messaging.js";

// Configuração do seu projeto Firebase
const firebaseConfig = {
  apiKey: "AIzaSyARpmkXfWaDPp1whsQefM0G6cR5W6BxAyU",
  authDomain: "garciatransportes-6f499.firebaseapp.com",
  projectId: "garciatransportes-6f499",
  storageBucket: "garciatransportes-6f499.firebasestorage.app",
  messagingSenderId: "837434696553",
  appId: "1:837434696553:web:6fb49715809847b4a853f8",
  measurementId: "G-XGH7SF9KZC"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// Pede permissão e gera token
async function initNotifications() {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.warn("Permissão de notificação não concedida!");
      return;
    }

    // 👉 Use a chave pública VAPID que você gerou no Console Firebase
    const currentToken = await getToken(messaging, {
      vapidKey: "BGzQwJ9KG8QiN7kfwVKXHIQ610o1DLw4LT69KHPzAHmmzSvKOokhvyrO9gKTP3EYjxPwKDIiAf3QiC9vFQgPOyU"
    });

    if (currentToken) {
      console.log("Token do dispositivo FCM:", currentToken);
      // Aqui você deve enviar o token para seu backend (salvar no BD)
    } else {
      console.warn("Nenhum token gerado.");
    }
  } catch (err) {
    console.error("Erro ao inicializar notificações:", err);
  }
}

initNotifications();

// Quando o app está aberto e chega mensagem
onMessage(messaging, (payload) => {
  console.log("Mensagem recebida em foreground:", payload);
});
