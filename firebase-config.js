// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js";


const firebaseConfig = {
    apiKey: "AIzaSyB52hRH8vfCKFLCAzPCEaQM05lKHgYq-hE",
    authDomain: "kumlaskytte.firebaseapp.com",
    projectId: "kumlaskytte",
    storageBucket: "kumlaskytte.firebasestorage.app",
    messagingSenderId: "571676149705",
    appId: "1:571676149705:web:a0ace868f4680298a78a18",
    measurementId: "G-KSJ9NLNDBX"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };