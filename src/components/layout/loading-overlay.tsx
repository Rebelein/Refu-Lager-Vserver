
'use client';

import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppContext } from '@/context/AppContext';
import { useState, useEffect } from 'react';

export function LoadingOverlay() {
  const { isLoading, isUserSelectionRequired } = useAppContext();
  const [showOverlay, setShowOverlay] = useState(true);

  useEffect(() => {
    // This effect ensures that we only decide to show/hide the overlay on the client,
    // preventing a mismatch with the server-rendered HTML.
    setShowOverlay(isLoading || isUserSelectionRequired);
  }, [isLoading, isUserSelectionRequired]);

  let messageTitle = "Verbinde mit der Datenbank...";
  let messageDescription = "Bitte warten.";

  if (isUserSelectionRequired) {
    messageTitle = "Warte auf Benutzerauswahl...";
    messageDescription = "Bitte wählen Sie einen Benutzer aus, um fortzufahren.";
  }

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-300',
        showOverlay ? 'opacity-100' : 'opacity-0 pointer-events-none'
      )}
    >
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
      <div className="relative flex flex-col items-center gap-4 text-foreground">
        <Loader2 className="h-10 w-10 animate-spin" />
        <p className="text-lg font-semibold">{messageTitle}</p>
        <p className="text-sm text-muted-foreground">{messageDescription}</p>
      </div>
    </div>
  );
}
