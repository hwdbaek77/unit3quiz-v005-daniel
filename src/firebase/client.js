import { initializeApp, getApps } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

function env(key) {
  return import.meta.env[key] ?? ''
}

const fallbackFirebaseConfig = {
  apiKey: 'AIzaSyBxQcvQyUpyyXD9gfb5l0Xabip92BGlqp8',
  authDomain: 'unit3quiz-v005-daniel.firebaseapp.com',
  projectId: 'unit3quiz-v005-daniel',
  storageBucket: 'unit3quiz-v005-daniel.firebasestorage.app',
  messagingSenderId: '749260899718',
  appId: '1:749260899718:web:671d353e798cf23b005807',
  measurementId: 'G-Q2RQRCYXXJ',
}

const firebaseConfig = {
  apiKey: env('VITE_FIREBASE_API_KEY') || fallbackFirebaseConfig.apiKey,
  authDomain: env('VITE_FIREBASE_AUTH_DOMAIN') || fallbackFirebaseConfig.authDomain,
  projectId: env('VITE_FIREBASE_PROJECT_ID') || fallbackFirebaseConfig.projectId,
  storageBucket: env('VITE_FIREBASE_STORAGE_BUCKET') || fallbackFirebaseConfig.storageBucket,
  messagingSenderId: env('VITE_FIREBASE_MESSAGING_SENDER_ID') || fallbackFirebaseConfig.messagingSenderId,
  appId: env('VITE_FIREBASE_APP_ID') || fallbackFirebaseConfig.appId,
  measurementId: env('VITE_FIREBASE_MEASUREMENT_ID') || fallbackFirebaseConfig.measurementId,
}

const configured = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.messagingSenderId &&
    firebaseConfig.appId,
)

export const firebaseApp = configured
  ? getApps().length
    ? getApps()[0]
    : initializeApp(firebaseConfig)
  : null

export const firestore = configured && firebaseApp ? getFirestore(firebaseApp) : null

export function isFirebaseConfigured() {
  return Boolean(configured && firestore)
}


