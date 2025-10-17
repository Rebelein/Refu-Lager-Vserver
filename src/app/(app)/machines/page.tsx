

'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAppContext } from '@/context/AppContext';
import {
  RentedBy,
  RentalStatus,
  RentalHistoryEntry,
  Reservation,
  Machine,
} from '@/lib/types';
import {
  Search,
  ScanLine,
  Wrench,
  Building,
  Users,
  AlertCircle,
  PlusCircle,
  ImagePlus,
  X,
  Calendar,
  Printer,
  History,
  Info,
  MoreHorizontal,
  Pencil,
  ClipboardPaste,
  CheckCircle,
  CalendarX2,
  Trash2,
} from 'lucide-react';
import Image from 'next/image';
import { cn, resizeImage } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import Webcam from 'react-webcam';
import jsQR from 'jsqr';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  format,
  startOfDay,
  endOfDay,
} from 'date-fns';
import { de } from 'date-fns/locale';
import { Separator } from '@/components/ui/separator';
import QRCode from 'react-qr-code';
import { toPng } from 'html-to-image';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Slider } from '@/components/ui/slider';
import { DateRange } from 'react-day-picker';
import { useFirestore } from '@/firebase/provider';
import { deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { doc } from 'firebase/firestore';


const getStatusBadgeVariant = (status: RentalStatus) => {
  switch (status) {
    case 'available':
      return 'bg-green-500 hover:bg-green-600';
    case 'rented':
      return 'bg-yellow-500 hover:bg-yellow-600';
    case 'in_repair':
      return 'bg-red-500 hover:bg-red-500';
    case 'reserved':
      return 'bg-blue-500 hover:bg-blue-600';
    default:
      return 'secondary';
  }
};

const getStatusText = (status: RentalStatus) => {
  switch (status) {
    case 'available':
      return 'Verfügbar';
    case 'rented':
      return 'Verliehen';
    case 'in_repair':
      return 'In Reparatur';
    case 'reserved':
      return 'Reserviert';
    default:
      return 'Unbekannt';
  }
};

const MachineCard = ({
  machine,
  setCurrentItem,
  setIsRentalModalOpen,
  setIsReturnModalOpen,
  handleOpenForm,
  setIsReservationOpen,
  setIsQrCodeOpen,
  handleSetMachineStatus,
  setIsReservationConflictOpen,
  setConflictingReservation,
  handleCancelReservation,
}: {
  machine: Machine;
  setCurrentItem: (item: Machine | null) => void;
  setIsRentalModalOpen: (isOpen: boolean) => void;
  setIsReturnModalOpen: (isOpen: boolean) => void;
  handleOpenForm: (item: Machine | null) => void;
  setIsReservationOpen: (isOpen: boolean) => void;
  setIsQrCodeOpen: (isOpen: boolean) => void;
  handleSetMachineStatus: (machine: Machine, status: RentalStatus) => void;
  setIsReservationConflictOpen: (isOpen: boolean) => void;
  setConflictingReservation: (reservation: Reservation | null) => void;
  handleCancelReservation: (reservationId: string) => void;
}) => {
   const { openDetailView } = useAppContext();
   const isOutOfService = machine.rentalStatus === 'in_repair';

  const handlePrimaryAction = () => {
    if (isOutOfService) return;
    setCurrentItem(machine);
    
    if (machine.rentalStatus === 'rented') {
      setIsReturnModalOpen(true);
    } else {
       const upcomingReservation = machine.reservations?.find(r => new Date(r.startDate) >= startOfDay(new Date()));
       if(machine.rentalStatus === 'reserved' && upcomingReservation){
           setConflictingReservation(upcomingReservation);
           setIsReservationConflictOpen(true);
       } else {
           setIsRentalModalOpen(true);
       }
    }
  };
  
    const upcomingReservation = machine.reservations?.filter(r => new Date(r.endDate) >= startOfDay(new Date())).sort((a,b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())[0];

  return (
      <Card className={cn("transition-shadow hover:shadow-md flex flex-col", isOutOfService && "opacity-50")}>
        <div className="flex items-start p-4 gap-4 flex-grow">
            {machine.imageUrl ? (
                <div className="w-12 h-12 relative flex-shrink-0">
                    <Image src={machine.imageUrl} alt={machine.name} fill className="rounded-md object-cover" />
                </div>
            ) : (
                <div className="w-12 h-12 bg-muted rounded-md flex items-center justify-center flex-shrink-0">
                    <Wrench className="w-6 h-6 text-muted-foreground" />
                </div>
            )}
            <div className="flex-grow min-w-0 pr-4">
                <p className="font-semibold cursor-pointer hover:underline" onClick={() => openDetailView(machine)}>{machine.name}</p>
                <p className="text-xs text-muted-foreground">{machine.manufacturer} {machine.model}</p>
                <div className="mt-1 flex items-center gap-2">
                    <Badge className={cn(getStatusBadgeVariant(machine.rentalStatus || 'available'))}>
                        {getStatusText(machine.rentalStatus || 'available')}
                    </Badge>
                    {machine.rentalStatus === 'rented' && machine.rentedBy && (
                        <span className="text-sm text-muted-foreground">an <span className="font-semibold text-foreground">{machine.rentedBy.name}</span></span>
                    )}
                </div>
            </div>
             <div className="flex items-center justify-end gap-1 sm:gap-2">
                <Button
                    size="sm"
                    variant={machine.rentalStatus === 'rented' ? 'destructive' : 'default'}
                    className="h-8"
                    onClick={(e) => { e.stopPropagation(); handlePrimaryAction(); }}
                    disabled={isOutOfService}
                >
                     {machine.rentalStatus === 'rented' ? 'Rückgabe' : 'Verleihen'}
                </Button>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Menü</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuLabel>Aktionen</DropdownMenuLabel>
                        <DropdownMenuItem onSelect={() => openDetailView(machine)}><Info className="mr-2 h-4 w-4"/> Details</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => handleOpenForm(machine)}><Pencil className="mr-2 h-4 w-4"/> Bearbeiten</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {isOutOfService ? (
                          <DropdownMenuItem onSelect={() => handleSetMachineStatus(machine, 'available')}>
                            <CheckCircle className="mr-2 h-4 w-4 text-green-500" /> Reparatur abschließen
                          </DropdownMenuItem>
                        ) : (
                        <>
                          {upcomingReservation && machine.rentalStatus === 'reserved' ? (
                            <DropdownMenuItem onSelect={() => handleCancelReservation(upcomingReservation.id)} className="text-destructive">
                              <CalendarX2 className="mr-2 h-4 w-4" /> Reservierung aufheben
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onSelect={() => { setCurrentItem(machine); setIsReservationOpen(true); }}>
                              <Calendar className="mr-2 h-4 w-4"/> Reservieren
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onSelect={() => handleSetMachineStatus(machine, 'in_repair')} className="text-destructive"><Wrench className="mr-2 h-4 w-4"/> Zur Reparatur melden</DropdownMenuItem>
                        </>
                        )}
                         <DropdownMenuItem onSelect={() => { setCurrentItem(machine); setIsQrCodeOpen(true); }}>
                          <Printer className="mr-2 h-4 w-4"/> Etikett drucken
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => openDetailView(machine, 'history')}><History className="mr-2 h-4 w-4"/> Verlauf</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
        {upcomingReservation && machine.rentalStatus !== 'rented' && (
             <div className="border-t px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300">
                <p className="text-xs font-semibold flex items-center gap-2">
                    <Calendar className="h-3 w-3" />
                    Reserviert für {upcomingReservation.reservedFor} ({format(new Date(upcomingReservation.startDate), 'dd.MM')} - {format(new Date(upcomingReservation.endDate), 'dd.MM')})
                </p>
            </div>
        )}
    </Card>
  );
};

const presetLabelSizes = [
  { name: 'Klein (40x20mm)', width: 40, height: 20 },
  { name: 'Mittel (60x30mm)', width: 60, height: 30 },
  { name: 'Groß (80x40mm)', width: 80, height: 40 },
  { name: 'Versand (102x50mm)', width: 102, height: 50 },
];

const DPI = 96;
const MM_PER_INCH = 25.4;
const mmToPx = (mm: number) => (mm / MM_PER_INCH) * DPI;

const useMediaQuery = (query: string) => {
    const [matches, setMatches] = React.useState(false);

    React.useEffect(() => {
        const media = window.matchMedia(query);
        if (media.matches !== matches) {
            setMatches(media.matches);
        }
        const listener = () => {
            setMatches(media.matches);
        };
        media.addEventListener('change', listener);
        return () => media.removeEventListener('change', listener);
    }, [matches, query]);

    return matches;
};

export default function MachinesPage() {
  const {
    items,
    users,
    currentUser,
    updateItem,
    openDetailView,
  } = useAppContext();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = React.useState('');
  const [isScannerOpen, setIsScannerOpen] = React.useState(false);
  const [isRentalModalOpen, setIsRentalModalOpen] = React.useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = React.useState(false);
  const [isQrCodeOpen, setIsQrCodeOpen] = React.useState(false);
  const [isReservationOpen, setIsReservationOpen] = React.useState(false);
  
  const [isReservationConflictOpen, setIsReservationConflictOpen] =
    React.useState(false);
  
  const [currentItem, setCurrentItem] = React.useState<Machine | null>(null);
  const [conflictingReservation, setConflictingReservation] =
    React.useState<Reservation | null>(null);

  const [hasCameraPermission, setHasCameraPermission] = React.useState<
    boolean | null
  >(null);
  const webcamRef = React.useRef<Webcam>(null);
  const lastScannedId = React.useRef<string | null>(null);

  const [rentalTargetType, setRentalTargetType] = React.useState<
    'user' | 'customer' | 'other'
  >('user');
  const [selectedUserId, setSelectedUserId] = React.useState('');
  const [customerName, setCustomerName] = React.useState('');
  const [otherName, setOtherName] = React.useState('');
  
  const [reservationTargetType, setReservationTargetType] = React.useState<'user' | 'customer' | 'other'>('customer');
  const [reservationSelectedUserId, setReservationSelectedUserId] = React.useState('');
  const [reservationCustomerName, setReservationCustomerName] = React.useState('');
  const [reservationOtherName, setReservationOtherName] = React.useState('');

  const [returnCondition, setReturnCondition] = React.useState<'ok' | 'damaged'>(
    'ok'
  );
  const [returnNotes, setReturnNotes] = React.useState('');
  const [needsConsumables, setNeedsConsumables] = React.useState(false);

  const [reservationDate, setReservationDate] = React.useState<
    DateRange | undefined
  >();

  const [itemImage, setItemImage] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const qrCodeRef = React.useRef<HTMLDivElement>(null);

  const [labelSize, setLabelSize] = React.useState({ width: 60, height: 30 });
  const [labelText, setLabelText] = React.useState({ name: '' });
  const [fontSize, setFontSize] = React.useState(70);

  const isDesktop = useMediaQuery("(min-width: 768px)");
  const numberOfMonths = isDesktop ? 2 : 1;

  const machines = React.useMemo(() => {
    return items.filter((item): item is Machine => item.itemType === 'machine');
  }, [items]);
  
  const handleOpenForm = (item: Machine | null) => {
    setCurrentItem(item);
    if (item) {
      setItemImage(item.imageUrl || null);
    } else {
      setItemImage(null);
    }
    setIsFormOpen(true);
  };
  
  React.useEffect(() => {
    if (isQrCodeOpen && currentItem) {
      setLabelText({ name: currentItem.name });
    }
  }, [isQrCodeOpen, currentItem]);

    React.useEffect(() => {
    if ((isRentalModalOpen || isReservationOpen) && currentUser) {
      setSelectedUserId(currentUser.id);
      setReservationSelectedUserId(currentUser.id);
    }
    }, [isRentalModalOpen, isReservationOpen, currentUser]);


  const filterMachines = (machineList: Machine[]) => {
    if (!searchTerm) return machineList;
    return machineList.filter(machine => {
      const term = searchTerm.toLowerCase();
      const rentedByName = machine.rentedBy?.name?.toLowerCase() || '';
      return (
        machine.name.toLowerCase().includes(term) ||
        (machine.manufacturer || '').toLowerCase().includes(term) ||
        (machine.model || '').toLowerCase().includes(term) ||
        rentedByName.includes(term)
      );
    });
  };

  const rentedMachines = React.useMemo(() => {
    return filterMachines(machines.filter(m => m.rentalStatus === 'rented'));
  }, [machines, searchTerm]);

  const availableMachines = React.useMemo(() => {
    return filterMachines(
      machines.filter(
        m =>
          m.rentalStatus === 'available' ||
          m.rentalStatus === 'in_repair' ||
          m.rentalStatus === 'reserved'
      )
    );
  }, [machines, searchTerm]);

  const openScanner = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      setHasCameraPermission(true);
      stream.getTracks().forEach(track => track.stop());
      setIsScannerOpen(true);
    } catch (error) {
      setHasCameraPermission(false);
      toast({
        variant: 'destructive',
        title: 'Kamerazugriff verweigert',
        description:
          'Bitte aktivieren Sie den Kamerazugriff in Ihren Browsereinstellungen.',
      });
    }
  };

  const handleScan = React.useCallback(
    (scannedId: string) => {
      lastScannedId.current = scannedId;
      const machine = machines.find(m => m.id === scannedId);
      if (!machine) {
        toast({
          variant: 'destructive',
          title: 'Fehler',
          description: 'Keine Maschine mit diesem Code gefunden.',
        });
        return;
      }

      setCurrentItem(machine);
      setIsScannerOpen(false);

      if (machine.rentalStatus === 'rented') {
        setIsReturnModalOpen(true);
      } else if (
        machine.rentalStatus === 'available' ||
        machine.rentalStatus === 'reserved'
      ) {
         const upcomingReservation = machine.reservations?.find(r => new Date(r.startDate) >= startOfDay(new Date()));
        if (machine.rentalStatus === 'reserved' && upcomingReservation) {
          setConflictingReservation(upcomingReservation);
          setIsReservationConflictOpen(true);
        } else {
          setIsRentalModalOpen(true);
        }

        if (users.length > 0) setSelectedUserId(users[0]!.id);
      } else {
        toast({
          variant: 'destructive',
          title: 'Aktion nicht möglich',
          description: `Die Maschine "${machine.name}" ist in Reparatur.`,
        });
      }

      setTimeout(() => {
        lastScannedId.current = null;
      }, 2000);
    },
    [machines, toast, users]
  );

  const captureCode = React.useCallback(() => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        const image = new window.Image();
        image.src = imageSrc;
        image.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = image.width;
          canvas.height = image.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(image, 0, 0, image.width, image.height);
            const imageData = ctx.getImageData(0, 0, image.width, image.height);
            const code = jsQR(imageData.data, imageData.width, image.height, {
              inversionAttempts: 'dontInvert',
            });
            if (code && code.data && lastScannedId.current !== code.data) {
              handleScan(code.data);
            }
          }
        };
      }
    }
  }, [handleScan]);

  React.useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (isScannerOpen && hasCameraPermission) {
      intervalId = setInterval(captureCode, 500);
    }
    return () => clearInterval(intervalId);
  }, [isScannerOpen, hasCameraPermission, captureCode]);

  const handleConfirmRental = () => {
    if (!currentItem || !currentUser) return;

    let rentedBy: RentedBy | null = null;
    if (rentalTargetType === 'user') {
      const user = users.find(u => u.id === selectedUserId);
      if (!user) {
        toast({
          variant: 'destructive',
          title: 'Fehler',
          description: 'Bitte wählen Sie einen gültigen Benutzer.',
        });
        return;
      }
      rentedBy = { type: 'user', id: user.id, name: user.name };
    } else if (rentalTargetType === 'customer') {
      if (!customerName.trim()) {
        toast({
          variant: 'destructive',
          title: 'Fehler',
          description: 'Bitte geben Sie einen Kundennamen ein.',
        });
        return;
      }
      rentedBy = {
        type: 'customer',
        id: customerName.trim(),
        name: customerName.trim(),
      };
    } else {
      // other
      if (!otherName.trim()) {
        toast({
          variant: 'destructive',
          title: 'Fehler',
          description: 'Bitte geben Sie eine Bezeichnung ein.',
        });
        return;
      }
      rentedBy = { type: 'other', id: otherName.trim(), name: otherName.trim() };
    }

    const now = new Date().toISOString();
    const newHistoryEntry: RentalHistoryEntry = {
      id: `${now}-${Math.random()}`,
      date: now,
      type: 'rented',
      userId: currentUser.id,
      userName: currentUser.name,
      details: `Verliehen an ${rentedBy.name} (${rentedBy.type})`,
    };

    updateItem(currentItem.id, {
      rentalStatus: 'rented',
      rentedBy: rentedBy,
      rentalHistory: [...(currentItem.rentalHistory || []), newHistoryEntry],
    }, true);

    toast({
      title: 'Maschine verliehen',
      description: `${currentItem.name} wurde an ${rentedBy.name} verliehen.`,
    });
    setIsRentalModalOpen(false);
    setIsReservationConflictOpen(false);
    setCurrentItem(null);
  };

  const handleConfirmReturn = () => {
    if (!currentItem || !currentUser) return;

    const now = new Date().toISOString();
    let newStatus: RentalStatus;
    
    if (returnCondition === 'damaged') {
        newStatus = 'in_repair';
    } else {
        const hasFutureReservations = (currentItem.reservations || []).some(r => new Date(r.endDate) >= startOfDay(new Date()));
        newStatus = hasFutureReservations ? 'reserved' : 'available';
    }

    const historyDetails =
      returnCondition === 'ok'
        ? `Zurückgegeben von ${
            currentItem.rentedBy?.name
          }. Zustand: OK. Verbrauchsmaterial ${
            needsConsumables ? 'benötigt' : 'OK'
          }.`
        : `Zurückgegeben von ${
            currentItem.rentedBy?.name
          }. Zustand: BESCHÄDIGT. Notiz: ${returnNotes}. Verbrauchsmaterial ${
            needsConsumables ? 'benötigt' : 'OK'
          }.`;

    const newHistoryEntry: RentalHistoryEntry = {
      id: `${now}-${Math.random()}`,
      date: now,
      type: 'returned',
      userId: currentUser.id,
      userName: currentUser.name,
      details: historyDetails,
    };

    updateItem(currentItem.id, {
      rentalStatus: newStatus,
      rentedBy: null,
      needsConsumables: needsConsumables,
      rentalHistory: [...(currentItem.rentalHistory || []), newHistoryEntry],
    }, true);

    toast({
      title: 'Maschine zurückgegeben',
      description: `${currentItem.name} ist wieder im System.`,
    });
    if (newStatus === 'in_repair') {
      toast({
        variant: 'destructive',
        title: 'Reparatur benötigt!',
        description: `Der Status von ${currentItem.name} wurde auf "In Reparatur" gesetzt.`,
      });
    }

    setIsReturnModalOpen(false);
    setCurrentItem(null);
    setReturnCondition('ok');
    setReturnNotes('');
    setNeedsConsumables(false);
  };

  const handleDownloadQrCode = React.useCallback(async () => {
    if (qrCodeRef.current === null || !currentItem) {
      return;
    }
    try {
        const dataUrl = await toPng(qrCodeRef.current, {
            cacheBust: true,
            pixelRatio: 3,
            fontEmbedCSS: `@font-face {
        font-family: 'PT Sans';
        src: url('https://fonts.gstatic.com/s/ptsans/v17/jizaRExUiTo99u79D0-ExdGM.woff2') format('woff2');
        font-weight: 400;
        font-style: normal;
      }
      @font-face {
        font-family: 'PT Sans';
        src: url('https://fonts.gstatic.com/s/ptsans/v17/jizfRExUiTo99u79B_mh4O3f-A.woff2') format('woff2');
        font-weight: 700;
        font-style: normal;
      }`
        });
      const link = document.createElement('a');
      link.download = `qr-maschine-${currentItem.name
        .replace(/\s+/g, '-')
        .toLowerCase()}.png`;
      link.href = dataUrl;
      link.click();
      toast({ title: 'QR-Code heruntergeladen' });
    } catch (err) {
      console.error(err);
      toast({
        title: 'Fehler beim Erstellen des Bildes',
        variant: 'destructive',
      });
    }
  }, [currentItem, toast]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const resizedImage = await resizeImage(file, 1024, 1024);
        setItemImage(resizedImage);
      } catch (error) {
        console.error('Error resizing image:', error);
        toast({ title: 'Fehler bei der Bildverarbeitung', variant: 'destructive' });
      }
    }
  };

   const handlePaste = async () => {
    try {
        if (!navigator.clipboard.read) {
            toast({
                title: 'Funktion nicht unterstützt',
                description: 'Ihr Browser unterstützt das Einfügen von Bildern aus der Zwischenablage nicht.',
                variant: 'destructive',
            });
            return;
        }
        const clipboardItems = await navigator.clipboard.read();

        if (clipboardItems.length === 0) {
            toast({ title: 'Kein Bild gefunden', description: 'Die Zwischenablage ist leer.' });
            return;
        }

        for (const item of clipboardItems) {
            const imageType = item.types.find(type => type.startsWith('image/'));
            if (imageType) {
                const blob = await item.getType(imageType);
                try {
                    const resizedImage = await resizeImage(blob, 1024, 1024);
                    setItemImage(resizedImage);
                    toast({ title: 'Bild eingefügt', description: 'Das Bild aus der Zwischenablage wurde übernommen.' });
                } catch (error) {
                    console.error('Error resizing image:', error);
                    toast({ title: 'Fehler bei der Bildverarbeitung', variant: 'destructive' });
                }
                return;
            }
        }
        toast({ title: 'Kein Bild gefunden', description: 'Es wurde kein Bild in der Zwischenablage gefunden.' });
    } catch (error: any) {
        console.error('Error pasting image:', error);
        let description = 'Das Bild konnte nicht eingefügt werden. Versuchen Sie es erneut.';
        if (error.name === 'NotAllowedError') {
            description = 'Der Zugriff auf die Zwischenablage wurde verweigert. Bitte überprüfen Sie die Website-Berechtigungen in Ihrem Browser.';
        }
        toast({
            title: 'Einfügen fehlgeschlagen',
            description: description,
            variant: 'destructive',
        });
    }
  };


  const handleSaveMachine = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentUser) {
      toast({
        title: 'Fehler',
        description: 'Bitte wählen Sie zuerst einen Benutzer aus.',
        variant: 'destructive',
      });
      return;
    }
    const formData = new FormData(e.currentTarget);
    const now = new Date().toISOString();

    const updatedData = {
      name: formData.get('name') as string,
      manufacturer: formData.get('manufacturer') as string,
      model: formData.get('model') as string,
      yearOfConstruction: Number(formData.get('yearOfConstruction')),
      lastRepair: formData.get('lastRepair') as string,
      nextInspection: formData.get('nextInspection') as string,
      imageUrl: itemImage,
    };

    if (currentItem) {
      const newHistoryEntry: RentalHistoryEntry = {
        id: `${now}-${Math.random()}`,
        date: now,
        type: 'updated',
        userId: currentUser.id,
        userName: currentUser.name,
        details: 'Maschinendaten aktualisiert.',
      };
      updateItem(currentItem.id, {
        ...updatedData,
        rentalHistory: [...(currentItem.rentalHistory || []), newHistoryEntry],
      }, true);
      toast({ title: 'Maschine aktualisiert' });
    } else {
      const newHistoryEntry: RentalHistoryEntry = {
        id: `${now}-${Math.random()}`,
        date: now,
        type: 'created',
        userId: currentUser.id,
        userName: currentUser.name,
        details: 'Maschine im System angelegt.',
      };
      const newItem: Machine = {
        id: `${now}-${Math.random()}`,
        itemType: 'machine',
        rentalStatus: 'available',
        rentalHistory: [newHistoryEntry],
        reservations: [],
        mainLocation: '',
        subLocation: '',
        stocks: [],
        minStocks: [],
        manufacturerItemNumbers: [],
        changelog: [],
        ...updatedData,
      };
      updateItem(newItem.id, newItem, true); 
      toast({ title: 'Maschine erstellt' });
    }
    setIsFormOpen(false);
    setCurrentItem(null);
  };
  
  const handleDeleteMachine = () => {
    if (currentItem) {
        if (!firestore) {
            toast({ title: 'Fehler', description: 'Datenbankverbindung nicht gefunden.', variant: 'destructive'});
            return;
        }
        const machineRef = doc(firestore, 'machines', currentItem.id);
        deleteDocumentNonBlocking(machineRef);
        toast({ title: 'Maschine gelöscht', variant: 'destructive'});
    }
    setIsDeleteConfirmOpen(false);
    setCurrentItem(null);
  };

  const handleSetMachineStatus = (machine: Machine, status: RentalStatus) => {
    if (!currentUser) return;

    const now = new Date().toISOString();
    const newHistoryEntry: RentalHistoryEntry = {
      id: `${now}-${Math.random()}`,
      date: now,
      type: 'updated',
      userId: currentUser.id,
      userName: currentUser.name,
      details: `Status manuell auf "${getStatusText(status)}" gesetzt.`,
    };

    updateItem(machine.id, {
      rentalStatus: status,
      rentalHistory: [...(machine.rentalHistory || []), newHistoryEntry],
    }, true);

    toast({ title: 'Status geändert' });

    const updatedItem = items.find(i => i.id === machine.id) as Machine;
    if (updatedItem) {
        openDetailView(updatedItem);
    }
  };

  const handleConfirmReservation = () => {
    if (!currentItem || !currentUser || !reservationDate?.from) {
      toast({
        variant: 'destructive',
        title: 'Fehler',
        description: 'Bitte füllen Sie alle Felder aus.',
      });
      return;
    }
    
    let reservedForName = '';
    if (reservationTargetType === 'user') {
        const user = users.find(u => u.id === reservationSelectedUserId);
        if (!user) return;
        reservedForName = user.name;
    } else if (reservationTargetType === 'customer') {
        if (!reservationCustomerName.trim()) return;
        reservedForName = reservationCustomerName.trim();
    } else {
        if (!reservationOtherName.trim()) return;
        reservedForName = reservationOtherName.trim();
    }

    const now = new Date().toISOString();
    const newReservation: Reservation = {
      id: `${now}-${Math.random()}`,
      startDate: startOfDay(reservationDate.from).toISOString(),
      endDate: endOfDay(reservationDate.to || reservationDate.from).toISOString(),
      reservedFor: reservedForName,
      userId: currentUser.id,
      userName: currentUser.name,
    };
    
    const newHistoryEntry: RentalHistoryEntry = {
      id: `${now}-${Math.random()}`,
      date: now,
      type: 'reserved',
      userId: currentUser.id,
      userName: currentUser.name,
      details: `Reserviert für ${newReservation.reservedFor} von ${format(
        new Date(newReservation.startDate),
        'dd.MM.yy'
      )} bis ${format(new Date(newReservation.endDate), 'dd.MM.yy')}`,
    };
    
    const newRentalStatus: RentalStatus = currentItem.rentalStatus === 'available' ? 'reserved' : (currentItem.rentalStatus || 'available');

    const existingReservations = currentItem.reservations || [];

    updateItem(currentItem.id, {
      reservations: [...existingReservations, newReservation],
      rentalHistory: [...(currentItem.rentalHistory || []), newHistoryEntry],
      rentalStatus: newRentalStatus,
    }, true);

    toast({ title: 'Maschine reserviert' });
    setIsReservationOpen(false);
    setReservationDate(undefined);
    setReservationCustomerName('');
    setReservationOtherName('');
  };

  const handleCancelReservation = (reservationId: string) => {
    if (!currentItem || !currentUser) return;

    const reservation = currentItem.reservations?.find(
      r => r.id === reservationId
    );
    if (!reservation) return;

    const now = new Date().toISOString();
    const newHistoryEntry: RentalHistoryEntry = {
      id: `${now}-${Math.random()}`,
      date: now,
      type: 'reservation_cancelled',
      userId: currentUser.id,
      userName: currentUser.name,
      details: `Reservierung für ${
        reservation.reservedFor
      } vom ${format(new Date(reservation.startDate), 'dd.MM.yy')} storniert.`,
    };

    const updatedReservations =
      currentItem.reservations?.filter(r => r.id !== reservationId) || [];
    
    const hasOtherReservations = updatedReservations.some(r => new Date(r.endDate) >= startOfDay(new Date()));
    const newRentalStatus = (currentItem.rentalStatus === 'reserved' && !hasOtherReservations) ? 'available' : currentItem.rentalStatus;


    updateItem(currentItem.id, {
      reservations: updatedReservations,
      rentalHistory: [...(currentItem.rentalHistory || []), newHistoryEntry],
      rentalStatus: newRentalStatus,
    }, true);
    toast({ title: 'Reservierung storniert', variant: 'destructive' });
  };
  
    const labelWidthPx = mmToPx(labelSize.width);
  const labelHeightPx = mmToPx(labelSize.height);


  return (
    <div className="grid gap-6">
      <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl">Maschinen</h1>
        <div className="ml-auto flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1"
            onClick={openScanner}
          >
            <ScanLine className="h-4 w-4" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              Ausleihen / Zurückgeben
            </span>
          </Button>
          <Button
            size="sm"
            className="h-8 gap-1"
            onClick={() => handleOpenForm(null)}
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              Neue Maschine
            </span>
          </Button>
        </div>
      </div>

      <div className="relative w-full">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Maschine, Hersteller, Typ oder Ausleiher suchen..."
          className="w-full pl-8"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Verliehene Maschinen ({rentedMachines.length})</CardTitle>
          <CardDescription>
            Diese Maschinen sind aktuell bei Mitarbeitern oder Kunden im Einsatz.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
            {rentedMachines.length > 0 ? (
              rentedMachines.map(machine => (
                <MachineCard key={machine.id} machine={machine} 
                  setCurrentItem={setCurrentItem}
                  setIsRentalModalOpen={setIsRentalModalOpen}
                  setIsReturnModalOpen={setIsReturnModalOpen}
                  handleOpenForm={handleOpenForm}
                  setIsReservationOpen={setIsReservationOpen}
                  setIsQrCodeOpen={setIsQrCodeOpen}
                  handleSetMachineStatus={handleSetMachineStatus}
                  setIsReservationConflictOpen={setIsReservationConflictOpen}
                  setConflictingReservation={setConflictingReservation}
                  handleCancelReservation={handleCancelReservation}
                />
              ))
            ) : (
              <div className="col-span-full py-12 text-center text-muted-foreground">
                Aktuell sind keine Maschinen verliehen.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Verfügbare Maschinen & Werkstatt ({availableMachines.length})
          </CardTitle>
          <CardDescription>
            Diese Maschinen sind im Lager verfügbar, reserviert oder zur
            Reparatur.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
            {availableMachines.length > 0 ? (
              availableMachines.map(machine => (
                <MachineCard
                  key={machine.id}
                  machine={machine}
                  setCurrentItem={setCurrentItem}
                  setIsRentalModalOpen={setIsRentalModalOpen}
                  setIsReturnModalOpen={setIsReturnModalOpen}
                  handleOpenForm={handleOpenForm}
                  setIsReservationOpen={setIsReservationOpen}
                  setIsQrCodeOpen={setIsQrCodeOpen}
                  handleSetMachineStatus={handleSetMachineStatus}
                  setIsReservationConflictOpen={setIsReservationConflictOpen}
                  setConflictingReservation={setConflictingReservation}
                  handleCancelReservation={handleCancelReservation}
                />
              ))
            ) : (
              <div className="col-span-full py-12 text-center text-muted-foreground">
                Keine verfügbaren Maschinen oder Maschinen in Reparatur gefunden.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Maschine scannen</DialogTitle>
            <DialogDescription>
              Richten Sie die Kamera auf den QR-Code der Maschine, um sie
              auszuleihen oder zurückzugeben.
            </DialogDescription>
          </DialogHeader>
          <div className="relative mx-auto mt-4 w-full max-w-md overflow-hidden rounded-lg border aspect-video">
            {hasCameraPermission === true ? (
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                videoConstraints={{ facingMode: 'environment' }}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center bg-muted p-4">
                <Alert variant="destructive">
                  <AlertTitle>Kamerazugriff erforderlich</AlertTitle>
                  <AlertDescription>
                    Bitte erlauben Sie den Zugriff auf die Kamera, um diese
                    Funktion zu nutzen.
                  </AlertDescription>
                </Alert>
              </div>
            )}
            {hasCameraPermission !== false && (
              <>
                <div className="absolute inset-0 rounded-lg border-[20px] border-black/20"></div>
                <div className="absolute left-1/2 top-1/2 h-2/3 w-2/3 -translate-x-1/2 -translate-y-1/2 rounded-lg border-2 border-dashed border-destructive opacity-75"></div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setIsScannerOpen(false)}
            >
              Schließen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRentalModalOpen} onOpenChange={setIsRentalModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Maschine ausleihen: {currentItem?.name}
            </DialogTitle>
            <DialogDescription>
              An wen wird die Maschine verliehen?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Select
              value={rentalTargetType}
              onValueChange={v => setRentalTargetType(v as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Typ auswählen..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" /> Mitarbeiter
                  </div>
                </SelectItem>
                <SelectItem value="customer">
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4" /> Kunde
                  </div>
                </SelectItem>
                <SelectItem value="other">
                  <div className="flex items-center gap-2">
                    <Wrench className="h-4 w-4" /> Sonstige
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            {rentalTargetType === 'user' && (
              <div>
                <Label htmlFor="user-select">Mitarbeiter</Label>
                <Select
                  value={selectedUserId}
                  onValueChange={setSelectedUserId}
                >
                  <SelectTrigger id="user-select">
                    <SelectValue placeholder="Mitarbeiter auswählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {rentalTargetType === 'customer' && (
              <div>
                <Label htmlFor="customer-name">Kundenname</Label>
                <Input
                  id="customer-name"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="Name des Kunden"
                />
              </div>
            )}
            {rentalTargetType === 'other' && (
              <div>
                <Label htmlFor="other-name">Name/Firma</Label>
                <Input
                  id="other-name"
                  value={otherName}
                  onChange={e => setOtherName(e.target.value)}
                  placeholder="Name der Person oder Firma"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setIsRentalModalOpen(false)}
            >
              Abbrechen
            </Button>
            <Button onClick={handleConfirmRental}>Verleih bestätigen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isReturnModalOpen} onOpenChange={setIsReturnModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Maschine zurückgeben: {currentItem?.name}
            </DialogTitle>
            <DialogDescription>
              Maschine wurde von{' '}
              <span className="font-semibold">{currentItem?.rentedBy?.name}</span>{' '}
              zurückgegeben. Bitte Zustand prüfen.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Zustand bei Rückgabe</Label>
              <Select
                value={returnCondition}
                onValueChange={v =>
                  setReturnCondition(v as 'ok' | 'damaged')
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Zustand auswählen..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ok">Alles in Ordnung</SelectItem>
                  <SelectItem value="damaged">
                    Beschädigt / Reparatur nötig
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            {returnCondition === 'damaged' && (
              <div>
                <Label htmlFor="return-notes">Notizen zur Beschädigung</Label>
                <Input
                  id="return-notes"
                  value={returnNotes}
                  onChange={e => setReturnNotes(e.target.value)}
                  placeholder="z.B. Kabelbruch, lautes Geräusch"
                />
              </div>
            )}
            <div className="flex items-center space-x-2">
              <Switch
                id="needs-consumables"
                checked={needsConsumables}
                onCheckedChange={setNeedsConsumables}
              />
              <Label htmlFor="needs-consumables">
                Verbrauchsmaterial nachbestellen?
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setIsReturnModalOpen(false)}
            >
              Abbrechen
            </Button>
            <Button onClick={handleConfirmReturn}>Rückgabe bestätigen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isFormOpen}
        onOpenChange={isOpen => {
          if (!isOpen) setCurrentItem(null);
          setIsFormOpen(isOpen);
        }}
      >
        <DialogContent
          onOpenAutoFocus={e => e.preventDefault()}
          className="max-w-2xl"
        >
          <form onSubmit={handleSaveMachine}>
            <DialogHeader>
              <DialogTitle>
                {currentItem ? 'Maschine bearbeiten' : 'Neue Maschine anlegen'}
              </DialogTitle>
            </DialogHeader>
            <div className="grid max-h-[70vh] gap-4 overflow-y-auto py-4 pr-2">
            <Input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden"/>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Bild</Label>
                <div className="col-span-3">
                  <div className="relative flex h-24 w-24 items-center justify-center rounded-md border border-dashed text-muted-foreground group">
                    {itemImage ? (
                      <>
                        <Image
                          src={itemImage}
                          alt="Vorschau"
                          fill
                          className="rounded-md object-cover"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute -right-2 -top-2 z-10 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => setItemImage(null)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <div className="text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-auto p-1"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <ImagePlus className="h-8 w-8" />
                        </Button>
                         <Button type="button" variant="ghost" className="h-auto p-1 text-xs flex items-center gap-1" onClick={handlePaste}><ClipboardPaste className="h-3 w-3" /> Einfügen</Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Bezeichnung
                </Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={currentItem?.name}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="manufacturer" className="text-right">
                  Hersteller
                </Label>
                <Input
                  id="manufacturer"
                  name="manufacturer"
                  defaultValue={currentItem?.manufacturer}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="model" className="text-right">
                  Typ
                </Label>
                <Input
                  id="model"
                  name="model"
                  defaultValue={currentItem?.model}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="yearOfConstruction" className="text-right">
                  Baujahr
                </Label>
                <Input
                  id="yearOfConstruction"
                  name="yearOfConstruction"
                  type="number"
                  defaultValue={currentItem?.yearOfConstruction}
                  className="col-span-3"
                />
              </div>
              <Separator />
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="lastRepair" className="text-right">
                  Letzte Reparatur
                </Label>
                <Input
                  id="lastRepair"
                  name="lastRepair"
                  type="date"
                  defaultValue={currentItem?.lastRepair?.split('T')[0]}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="nextInspection" className="text-right">
                  Nächste Prüfung
                </Label>
                <Input
                  id="nextInspection"
                  name="nextInspection"
                  type="date"
                  defaultValue={currentItem?.nextInspection?.split('T')[0]}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter className="sm:justify-between">
                <div>
                {currentItem && (
                    <Button type="button" variant="destructive" onClick={() => { setIsFormOpen(false); setIsDeleteConfirmOpen(true); }}>
                        <Trash2 className="mr-2 h-4 w-4" /> Löschen
                    </Button>
                )}
                </div>
                <div className="flex gap-2">
                <DialogClose asChild>
                    <Button type="button" variant="secondary">
                    Abbrechen
                    </Button>
                </DialogClose>
                <Button type="submit">Speichern</Button>
                </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Sind Sie sicher?</AlertDialogTitle>
                <AlertDialogDescription>
                    Möchten Sie die Maschine &quot;{currentItem?.name}&quot; wirklich endgültig löschen? Diese Aktion kann nicht rückgängig gemacht werden.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteMachine} className="bg-destructive hover:bg-destructive/90">Ja, endgültig löschen</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <Dialog open={isQrCodeOpen} onOpenChange={setIsQrCodeOpen}>
        <DialogContent onOpenAutoFocus={e => e.preventDefault()} className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Etikett für: {currentItem?.name}</DialogTitle>
            <DialogDescription>
             Passen Sie die Größe an und laden Sie das Etikett als Bild herunter.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4 max-h-[70vh]">
            <div className="space-y-6 overflow-y-auto pr-4">
                <div>
                    <Label className="mb-2 block">Voreinstellungen</Label>
                    <div className="grid grid-cols-2 gap-2">
                        {presetLabelSizes.map(preset => (
                            <Button key={preset.name} variant="outline" size="sm" onClick={() => setLabelSize({ width: preset.width, height: preset.height })}>
                                {preset.name}
                            </Button>
                        ))}
                    </div>
                </div>
                <div className="space-y-4">
                    <div>
                        <Label htmlFor="label-width" className="mb-2 block text-sm font-medium">Etikettenbreite ({labelSize.width}mm)</Label>
                        <Slider
                            id="label-width"
                            min={20}
                            max={150}
                            step={1}
                            value={[labelSize.width]}
                            onValueChange={(value) => setLabelSize(prev => ({ ...prev, width: value[0]! }))}
                        />
                    </div>
                     <div>
                        <Label htmlFor="label-height" className="mb-2 block text-sm font-medium">Etikettenhöhe ({labelSize.height}mm)</Label>
                        <Slider
                            id="label-height"
                            min={10}
                            max={100}
                            step={1}
                            value={[labelSize.height]}
                            onValueChange={(value) => setLabelSize(prev => ({ ...prev, height: value[0]! }))}
                        />
                    </div>
                    <div>
                        <Label htmlFor="font-size" className="mb-2 block text-sm font-medium">Schriftgröße ({fontSize}%)</Label>
                        <Slider
                            id="font-size"
                            min={50}
                            max={150}
                            step={10}
                            value={[fontSize]}
                            onValueChange={(value) => setFontSize(value[0]!)}
                        />
                    </div>
                </div>
                 <div className="space-y-4 border-t pt-6">
                    <div>
                        <Label htmlFor="label-name">Text: Name</Label>
                        <Input 
                            id="label-name"
                            value={labelText.name} 
                            onChange={(e) => setLabelText(prev => ({ ...prev, name: e.target.value }))} 
                        />
                    </div>
                </div>
            </div>
            <div className="flex items-center justify-center bg-gray-100 dark:bg-gray-800 p-4 rounded-md min-h-[200px]">
                 <div id="label-to-download" ref={qrCodeRef}>
                    {currentItem && (
                        <div 
                            className="p-2 bg-white border flex flex-col items-center justify-center gap-2"
                            style={{ 
                                fontFamily: "'PT Sans', sans-serif",
                                width: `${labelWidthPx}px`,
                                height: `${labelHeightPx}px`,
                                boxSizing: 'border-box'
                            }}
                        >
                           <p 
                                className="text-black font-bold text-center"
                                style={{ 
                                    fontSize: `${Math.max(8, (labelHeightPx * 0.18) * (fontSize / 100))}px`,
                                    lineHeight: 1.1,
                                    wordBreak: 'break-word',
                                }}
                            >
                                {labelText.name}
                            </p>
                            <div className="flex-grow flex items-center justify-center">
                                <QRCode
                                    value={currentItem.id}
                                    size={Math.min(labelHeightPx * 0.6, labelWidthPx * 0.6)}
                                />
                            </div>
                        </div>
                    )}
                  </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsQrCodeOpen(false)}>Schließen</Button>
            <Button onClick={handleDownloadQrCode}>
              <Printer className="mr-2 h-4 w-4" /> Herunterladen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isReservationOpen} onOpenChange={setIsReservationOpen}>
        <DialogContent className="sm:max-w-[425px] md:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Maschine reservieren: {currentItem?.name}
            </DialogTitle>
             <DialogDescription>
              Wählen Sie einen Zeitraum und für wen die Reservierung ist.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Zeitraum</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date"
                    variant={'outline'}
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !reservationDate && 'text-muted-foreground'
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {reservationDate?.from ? (
                      reservationDate.to ? (
                        <>
                          {format(reservationDate.from, 'PPP', { locale: de })} -{' '}
                          {format(reservationDate.to, 'PPP', { locale: de })}
                        </>
                      ) : (
                        format(reservationDate.from, 'PPP', { locale: de })
                      )
                    ) : (
                      <span>Datum wählen</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    initialFocus
                    mode="range"
                    locale={de}
                    selected={reservationDate}
                    onSelect={setReservationDate}
                    numberOfMonths={numberOfMonths}
                  />
                </PopoverContent>
              </Popover>
            </div>
             <div>
              <Label>Reserviert für</Label>
               <Select value={reservationTargetType} onValueChange={(v) => setReservationTargetType(v as any)}>
                  <SelectTrigger><SelectValue placeholder="Typ auswählen..." /></SelectTrigger>
                  <SelectContent>
                      <SelectItem value="customer"><div className="flex items-center gap-2"><Building className="h-4 w-4" /> Kunde</div></SelectItem>
                      <SelectItem value="user"><div className="flex items-center gap-2"><Users className="h-4 w-4" /> Mitarbeiter</div></SelectItem>
                      <SelectItem value="other"><div className="flex items-center gap-2"><Wrench className="h-4 w-4" /> Sonstige</div></SelectItem>
                  </SelectContent>
              </Select>
            </div>
            {reservationTargetType === 'user' && (
              <div>
                <Label htmlFor="reservation-user-select">Mitarbeiter</Label>
                <Select value={reservationSelectedUserId} onValueChange={setReservationSelectedUserId}>
                  <SelectTrigger id="reservation-user-select"><SelectValue placeholder="Mitarbeiter auswählen..." /></SelectTrigger>
                  <SelectContent>
                    {users.map(user => (<SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {reservationTargetType === 'customer' && (
                <div>
                    <Label htmlFor="reservation-customer-name">Kundenname</Label>
                    <Input id="reservation-customer-name" value={reservationCustomerName} onChange={e => setReservationCustomerName(e.target.value)} placeholder="Name des Kunden" />
                </div>
            )}
            {reservationTargetType === 'other' && (
                <div>
                    <Label htmlFor="reservation-other-name">Grund</Label>
                    <Input id="reservation-other-name" value={reservationOtherName} onChange={e => setReservationOtherName(e.target.value)} placeholder="z.B. Baustelle XY" />
                </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setIsReservationOpen(false)}
            >
              Abbrechen
            </Button>
            <Button onClick={handleConfirmReservation}>
              Reservierung speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={isReservationConflictOpen}
        onOpenChange={setIsReservationConflictOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-6 w-6 text-yellow-500" />
              Reservierungskonflikt
            </AlertDialogTitle>
            {conflictingReservation && (
              <AlertDialogDescription>
                Diese Maschine ist für &quot;{conflictingReservation.reservedFor}&quot; vom {format(new Date(conflictingReservation.startDate), 'dd.MM.yyyy')} bis {format(new Date(conflictingReservation.endDate), 'dd.MM.yyyy')} reserviert. Möchten Sie die Maschine trotzdem ausleihen?
              </AlertDialogDescription>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRental}>
              Trotzdem ausleihen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
