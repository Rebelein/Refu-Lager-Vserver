'use client';

import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { api } from '@/lib/api';

/** Utility type to add an 'id' field to a given type T. */
export type WithId<T> = T & { id: string };

type UseCollectionOptions = {
    onInitialLoad?: (docCount: number) => void;
};


/**
 * Interface for the return value of the useCollection hook.
 * @template T Type of the document data.
 */
export interface UseCollectionResult<T> {
  data: WithId<T>[] | null; // Document data with ID, or null.
  isLoading: boolean;       // True if loading.
  error: Error | null; // Error object, or null.
}

/* Internal implementation of Query:
  https://github.com/firebase/firebase-js-sdk/blob/c5f08a9bc5da0d2b0207802c972d53724ccef055/packages/firestore/src/lite-api/reference.ts#L143
*/
export interface InternalQuery {}

/**
 * React hook to subscribe to a Firestore collection or query in real-time.
 * Handles nullable references/queries.
 * 
 *
 * IMPORTANT! YOU MUST MEMOIZE the inputted memoizedTargetRefOrQuery or BAD THINGS WILL HAPPEN
 * use useMemo to memoize it per React guidence.  Also make sure that it's dependencies are stable
 * references
 *  
 * @template T Optional type for document data. Defaults to any.
 * @param {CollectionReference<DocumentData> | Query<DocumentData> | null | undefined} targetRefOrQuery -
 * The Firestore CollectionReference or Query. Waits if null/undefined.
 * @returns {UseCollectionResult<T>} Object with data, isLoading, error.
 */
export function useCollection<T = any>(
  memoizedTargetRefOrQuery: any,
  options: UseCollectionOptions = {}
): UseCollectionResult<T> {
  type ResultItemType = WithId<T>;
  type StateDataType = ResultItemType[] | null;

  const [data, setData] = useState<StateDataType>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  useEffect(() => {
    if (!memoizedTargetRefOrQuery) {
      setData(null);
      setIsLoading(false);
      setError(null);
      setHasLoadedOnce(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    let mounted = true;
    const colPath: string = typeof memoizedTargetRefOrQuery === 'string' ? memoizedTargetRefOrQuery : memoizedTargetRefOrQuery?.path || '';
    const collection = colPath.split('/').filter(Boolean).pop() as string;

    // initial fetch
    api.list<T>(collection)
      .then((items) => {
        if (!mounted) return;
        if (!hasLoadedOnce) {
          options.onInitialLoad?.(items.length);
          setHasLoadedOnce(true);
        }
        setData(items as ResultItemType[]);
        setIsLoading(false);
      })
      .catch((e) => {
        if (!mounted) return;
        setError(e);
        setIsLoading(false);
      });

    // realtime via socket.io
    let socket: Socket | null = null;
    try {
      socket = io(process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000', { transports: ['websocket'] });
      const onInsert = (doc: any) => setData((prev) => (prev ? ([doc, ...prev] as ResultItemType[]) : [doc] as ResultItemType[]));
      const onUpdate = (doc: any) => setData((prev) => (prev ? prev.map((d) => (d.id === doc.id ? doc : d)) : [doc]));
      const onDelete = (doc: any) => setData((prev) => (prev ? prev.filter((d) => d.id !== doc.id) : prev));
      socket.on(`${collection}:insert`, onInsert);
      socket.on(`${collection}:update`, onUpdate);
      socket.on(`${collection}:delete`, onDelete);
    } catch (e) {
      // ignore socket errors in fallback
      // console.error(e);
    }

    return () => {
      mounted = false;
      setHasLoadedOnce(false);
      socket?.disconnect();
    };
  }, [memoizedTargetRefOrQuery]);

  // keep memoization requirement for existing callers, but don't throw in production
  // if(memoizedTargetRefOrQuery && !memoizedTargetRefOrQuery.__memo) {
  //   throw new Error(memoizedTargetRefOrQuery + ' was not properly memoized using useMemoFirebase');
  // }
  return { data, isLoading, error };
}
