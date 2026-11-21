const CONFIG = {
  // ===== الإيميل المسموح له بالدخول (شاشة شكلية، مش حماية حقيقية) =====
  OWNER_EMAIL: "mohamed1462004@gmail.com",
    // ===== Firebase =====
  FIREBASE: {
    apiKey: "AIzaSyAXbaaH0YXIwRReN-zzQfQ9tgl_ob0A5YY",
    authDomain: "president-dashboard-54840.firebaseapp.com",
    projectId: "president-dashboard-54840",
    storageBucket: "president-dashboard-54840.firebasestorage.app",
    messagingSenderId: "247365639440",
    appId: "1:247365639440:web:f9191578b285e9ab27d995"
  },

  // ===== EmailJS: املأهم بعد ما تعمل حسابك، وغيّر ENABLED إلى true =====
  EMAILJS: {
    ENABLED: false,
    PUBLIC_KEY: "",
    SERVICE_ID: "",
    TEMPLATE_ID: ""
  },

  // ===== V2 SETTINGS: إيميلات الـ heads =====
  // اكتب الاسم زي ما هو متسجل في الـ app بالظبط، وإيميله.
  // (تقدر برضه تكتب الإيميل من شاشة تعديل الشخص جوه الـ app.)
  HEAD_EMAILS: {
    // "Karim": "karim@example.com",
    // "Sara": "sara@example.com",
  }
};
