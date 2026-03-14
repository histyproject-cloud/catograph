import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCiTHthA8UTbDBf4CcEF9xUYlK-2yG2kaw",
  authDomain: "catograph-5d8f5.firebaseapp.com",
  projectId: "catograph-5d8f5",
  storageBucket: "catograph-5d8f5.firebasestorage.app",
  messagingSenderId: "558234928920",
  appId: "1:558234928920:web:da1d38a467da108c8bc06d",
  measurementId: "G-S0SFGTF903"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider