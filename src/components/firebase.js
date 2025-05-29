import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
    apiKey: "AIzaSyAY3y3mIYCUZ1yLM8Y0c9awopSkkFOPHHs",
    authDomain: "kliqit-303c0.firebaseapp.com",
    projectId: "kliqit-303c0",
    storageBucket: "kliqit-303c0.firebasestorage.app",
    messagingSenderId: "560852262103",
    appId: "1:560852262103:web:821a7e69ad466d6a436492",
    measurementId: "G-VTMJZEFMZF"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;
