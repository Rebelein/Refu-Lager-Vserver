'use client';
import { useEffect } from 'react';
import { redirect } from 'next/navigation';

export default function UsersPage() {
  useEffect(() => {
    redirect('/settings');
  }, []);

  return null;
}
