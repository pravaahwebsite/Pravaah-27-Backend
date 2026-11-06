import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

let firebaseAuth;

export function getFirebaseAuth() {
  if (firebaseAuth) return firebaseAuth;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error('FIREBASE_PROJECT_ID is not configured');
  }
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    throw new Error('GOOGLE_APPLICATION_CREDENTIALS is not configured');
  }

  const app = getApps()[0] || initializeApp({
    credential: applicationDefault(),
    projectId,
  });

  firebaseAuth = getAuth(app);
  return firebaseAuth;
}

