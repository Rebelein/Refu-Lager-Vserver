import { AppShell } from '@/components/layout/app-shell';
import { AppProvider } from '@/context/AppContext';
import { FirebaseClientProvider } from '@/firebase';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <FirebaseClientProvider>
      <AppProvider>
        <AppShell>{children}</AppShell>
      </AppProvider>
    </FirebaseClientProvider>
  );
}
