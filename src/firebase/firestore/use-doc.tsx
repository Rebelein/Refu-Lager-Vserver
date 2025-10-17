'use client';
    
import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { api } from '@/lib/api';

/** Utility type to add an 'id' field to a given type T. */
type WithId<T> = T & { id: string };

/**
 * Interface for the return value of the useDoc hook.
 * @template T Type of the document data.
 */
export interface UseDocResult<T> {
  data: WithId<T> | null; // Document data with ID, or null.
  isLoading: boolean;       // True if loading.
  error: Error | null; // Error object, or null.
}

/**
 * React hook to subscribe to a single Firestore document in real-time.
 * Handles nullable references.
 * 
 * IMPORTANT! YOU MUST MEMOIZE the inputted memoizedTargetRefOrQuery or BAD THINGS WILL HAPPEN
 * use useMemo to memoize it per React guidence.  Also make sure that it's dependencies are stable
 * references
 *
 *
 * @template T Optional type for document data. Defaults to any.
 * @param {DocumentReference<DocumentData> | null | undefined} docRef -
 * The Firestore DocumentReference. Waits if null/undefined.
 * @returns {UseDocResult<T>} Object with data, isLoading, error.
 */
export function useDoc<T = any>(
  memoizedDocRef: any,
): UseDocResult<T> {
  type StateDataType = WithId<T> | null;

  const [data, setData] = useState<StateDataType>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!memoizedDocRef) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    let mounted = true;
    const pathStr: string = typeof memoizedDocRef === 'string' ? memoizedDocRef : memoizedDocRef?.path || '';
    const parts = pathStr.split('/').filter(Boolean);
    const collection = parts[parts.length - 2];
    const id = parts[parts.length - 1];

    api
      .get<T>(collection, id)
      .then((doc) => {
        if (!mounted) return;
        setData(doc as WithId<T>);
        setIsLoading(false);
      })
      .catch((e) => {
        if (!mounted) return;
        setError(e);
        setIsLoading(false);
      });

    let socket: Socket | null = null;
    try {
      socket = io(process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000', { transports: ['websocket'] });
      const onUpdate = (doc: any) => {
        if (doc.id === id) setData(doc);
      };
      const onDelete = (doc: any) => {
        if (doc.id === id) setData(null);
      };
      socket.on(`${collection}:update`, onUpdate);
      socket.on(`${collection}:delete`, onDelete);
    } catch (e) {}

    return () => {
      mounted = false;
      socket?.disconnect();
    };
  }, [memoizedDocRef]); // Re-run if the memoizedDocRef changes.

  return { data, isLoading, error };
}
