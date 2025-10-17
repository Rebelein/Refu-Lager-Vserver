'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore'

export function initializeFirebase() {
  if (getApps().length) {
    const app = getApp();
    return getSdks(app);
  }

  const app = initializeApp(firebaseConfig);
  return getSdks(app);
}

export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp)
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
// Minimal adapters to satisfy existing useMemoFirebase(factory) usage and ID generation
export function collection(_fs: any, path: string) {
  return { path, type: 'collection', __memo: true } as const;
}

function genId() {
  // Firestore-like random id (20 chars alphanum)
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < 20; i++) out += chars.charAt(Math.floor(Math.random() * chars.length));
  return out;
}

// Overloads: doc(collectionRef), doc(fs, 'col'), doc(fs, 'col', 'id')
export function doc(arg1: any, arg2?: string, arg3?: string) {
  if (arg1 && typeof arg1 === 'object' && arg1.path && !arg2) {
    const id = genId();
    return { path: `${arg1.path}/${id}`, type: 'doc', id, __memo: true } as const;
  }
  if (typeof arg2 === 'string' && !arg3) {
    const id = genId();
    return { path: `${arg2}/${id}`, type: 'doc', id, __memo: true } as const;
  }
  if (typeof arg2 === 'string' && typeof arg3 === 'string') {
    return { path: `${arg2}/${arg3}`, type: 'doc', id: arg3, __memo: true } as const;
  }
  throw new Error('Invalid doc() call');
}
export * from './non-blocking-updates';
export * from './errors';
export * from './error-emitter';
