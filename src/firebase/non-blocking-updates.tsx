
'use client';
    
import { api } from '@/lib/api';


/**
 * Initiates a setDoc operation for a document reference.
 * Does NOT await the write operation internally.
 */
export function setDocumentNonBlocking(docRef: any, data: any, _options?: any) {
  const parts = (docRef?.path || '').split('/').filter(Boolean);
  const collection = parts[parts.length - 2];
  const id = parts[parts.length - 1];
  api.upsert(`${collection}`, id, data).catch(() => {});
}


/**
 * Initiates an addDoc operation for a collection reference.
 * Does NOT await the write operation internally.
 * Returns the Promise for the new doc ref, but typically not awaited by caller.
 */
export function addDocumentNonBlocking(colRef: any, data: any) {
  const parts = (colRef?.path || '').split('/').filter(Boolean);
  const collection = parts[parts.length - 1];
  return api.create(`${collection}`, data).catch(() => undefined as any);
}


/**
 * Initiates an updateDoc operation for a document reference.
 * Does NOT await the write operation internally.
 */
export function updateDocumentNonBlocking(docRef: any, data: any) {
  const parts = (docRef?.path || '').split('/').filter(Boolean);
  const collection = parts[parts.length - 2];
  const id = parts[parts.length - 1];
  api.patch(`${collection}`, id, data).catch(() => {});
}


/**
 * Initiates a deleteDoc operation for a document reference.
 * Does NOT await the write operation internally.
 */
export function deleteDocumentNonBlocking(docRef: any) {
  const parts = (docRef?.path || '').split('/').filter(Boolean);
  const collection = parts[parts.length - 2];
  const id = parts[parts.length - 1];
  api.remove(`${collection}`, id).catch(() => {});
}
