
'use client';

import { useState, useEffect, useRef } from 'react';

/**
 * A custom hook to manage a temporary animation class when a value changes.
 * @param value The value to monitor for changes.
 * @param animationClass The CSS class to apply for the animation.
 * @param duration The duration of the animation in milliseconds.
 * @returns A ref to attach to the element and a boolean indicating if the animation is currently active.
 */
export const useStatChangeAnimation = (
  value: number | string,
  animationClass: string = 'animate-flash',
  duration: number = 1500
): [React.RefObject<HTMLDivElement>, boolean] => {
  const [isAnimating, setIsAnimating] = useState(false);
  const prevValueRef = useRef<number | string>();
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only trigger animation if the value has been previously set and has changed.
    if (prevValueRef.current !== undefined && prevValueRef.current !== value) {
      setIsAnimating(true);
      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [value, duration]);

  useEffect(() => {
    // Update the previous value ref after the animation logic has run.
    prevValueRef.current = value;
  }, [value]);

  return [elementRef, isAnimating];
};

    