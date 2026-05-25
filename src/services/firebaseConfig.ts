/**
 * firebaseConfig.ts
 * Configuração única do Firebase para Expo + React Native
 */

import { initializeApp, getApps, getApp } from "firebase/app";

import {
  initializeAuth,
  getAuth,
} from "firebase/auth";

import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  getFirestore,
  enableNetwork,
  disableNetwork,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  onSnapshot,
} from "firebase/firestore";

import { getStorage } from "firebase/storage";

/**
 * Config Firebase
 */
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId:
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "",
};

/**
 * Inicialização segura
 */
const app = !getApps().length
  ? initializeApp(firebaseConfig)
  : getApp();

/**
 * Auth persistente no React Native
 */
export const auth = getAuth(app);

/**
 * Firestore
 */
export const db = getFirestore(app);

/**
 * Storage
 */
export const storage = getStorage(app);

/**
 * Exports Firestore
 */
export {
  enableNetwork,
  disableNetwork,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  onSnapshot,
};
