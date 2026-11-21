import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore, doc, onSnapshot, setDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const app = initializeApp(CONFIG.FIREBASE);
const auth = getAuth(app);
const db = getFirestore(app);
const ref = doc(db, 'hub', 'data');   // كل الداتا في مستند واحد

window.Store = {
  onAuth(cb) { return onAuthStateChanged(auth, cb); },

  signIn() {
    const p = new GoogleAuthProvider();
    p.setCustomParameters({ prompt: 'select_account' });
    return signInWithPopup(auth, p);
  },

  signOut() { return signOut(auth); },

  // تحديث لحظي: بيتنادى أول مرة وكل ما الداتا تتغير من أي جهاز
  subscribe(cb, errCb) {
    return onSnapshot(ref, snap => cb(snap.exists() ? snap.data() : null, snap.metadata.fromCache), errCb);
  },

  save(data) {
    return setDoc(ref, JSON.parse(JSON.stringify(data)));
  },

  // داتا النسخة القديمة اللي كانت محفوظة في المتصفح (لنقلها مرة واحدة)
  legacy() {
    try { return JSON.parse(localStorage.getItem('enactus_hub_v1')); } catch (e) { return null; }
  },

  exportJSON(data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'enactus-hub-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
};
