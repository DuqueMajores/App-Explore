/**
 * firebaseConfig.ts — fonte única de inicialização do Firebase
 *
 * Exporta `db` e todas as funções do Firestore usadas no projeto.
 * Usa getApps() para evitar "Firebase App named '[DEFAULT]' already exists"
 * em reloads do Metro/Expo.
 */
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  onSnapshot,
  enableNetwork,
  disableNetwork,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey:            process.env.EXPO_PUBLIC_FIREBASE_API_KEY            ?? "",
  authDomain:        process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN        ?? "",
  projectId:         process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID         ?? "",
  storageBucket:     process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET     ?? "",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId:             process.env.EXPO_PUBLIC_FIREBASE_APP_ID             ?? "",
};

// Evita re-inicialização em hot-reloads do Metro
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const db = getFirestore(app);

export {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  onSnapshot,
  enableNetwork,
  disableNetwork,
};
