
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAppContext } from '@/context/AppContext';
import type { InventoryItem } from '@/lib/types';
import { format, differenceInDays } from 'date-fns';
import { cn, isInventoryItem } from '@/lib/utils';
import { Info, Minus, Plus, CameraOff, Crown, Award, Activity } from 'lucide-react';
import Webcam from 'react-webcam';
import jsQR from 'jsqr';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';


const getLatestInventoryDate = (lastInventoriedAt: { [locationId: string]: string | null } | undefined | null): string | null => {
    if (!lastInventoriedAt) return null;
    const dates = Object.values(lastInventoriedAt).filter(Boolean) as string[];
    if (dates.length === 0) return null;
    return dates.reduce((latest, current) => new Date(current) > new Date(latest) ? current : latest, dates[0]!);
};


const getInventoryStatusColorClass = (lastInventoriedAt?: { [locationId: string]: string | null } | null) => {
    const latestDate = getLatestInventoryDate(lastInventoriedAt);
    if (!latestDate) {
      return 'border-red-500'; // Rot
    }
    const daysSinceInventory = differenceInDays(new Date(), new Date(latestDate));
    if (daysSinceInventory <= 7) {
      return 'border-green-500'; // Grün
    } else if (daysSinceInventory <= 30) {
      return 'border-yellow-500'; // Gelb
    } else {
      return 'border-red-500'; // Rot
    }
  };

export default function InventoryPage() {
    const { items, currentUser, locations, inventoryCounts, latestInventoryLogs, handleQuickStockChange } = useAppContext();
    const [isCountModalOpen, setIsCountModalOpen] = React.useState(false);
    const [isCompartmentSelectOpen, setIsCompartmentSelectOpen] = React.useState(false);
    const [currentItem, setCurrentItem] = React.useState<InventoryItem | null>(null);
    const [compartmentItems, setCompartmentItems] = React.useState<InventoryItem[]>([]);
    const [countedStock, setCountedStock] = React.useState(0);
    const [activeLocationId, setActiveLocationId] = React.useState<string>('');
    const [scannerType, setScannerType] = React.useState<'qr' | 'barcode'>('qr');

    const { toast } = useToast();

    const webcamRef = React.useRef<Webcam>(null);
    const [hasCameraPermission, setHasCameraPermission] = React.useState<boolean | null>(null);
    const [isClient, setIsClient] = React.useState(false);
    const lastScannedId = React.useRef<string | null>(null);

    React.useEffect(() => {
        setIsClient(true);
        const getCameraPermission = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            setHasCameraPermission(true);
            stream.getTracks().forEach(track => track.stop());
        } catch (error) {
            console.error('Error accessing camera:', error);
            setHasCameraPermission(false);
            toast({
            variant: 'destructive',
            title: 'Kamerazugriff verweigert',
            description: 'Bitte aktivieren Sie den Kamerazugriff in Ihren Browsereinstellungen.',
            });
        }
        };
        getCameraPermission();
    }, [toast]);


    const sortedItems = React.useMemo(() => {
        if (!items) return [];
        return [...items].sort((a, b) => {
            const dateA = isInventoryItem(a) ? getLatestInventoryDate(a.lastInventoriedAt) : new Date(0);
            const dateB = isInventoryItem(b) ? getLatestInventoryDate(b.lastInventoriedAt) : new Date(0);
            const timeA = dateA ? new Date(dateA).getTime() : 0;
            const timeB = dateB ? new Date(dateB).getTime() : 0;
            
            if (timeA === 0 && timeB !== 0) return -1;
            if (timeB === 0 && timeA !== 0) return 1;
            return timeA - timeB;
        });
    }, [items]);

    const handleOpenCountModal = (item: InventoryItem) => {
        setCurrentItem(item);
        const stockInfo = item.stocks.find(s => s.locationId === activeLocationId);
        setCountedStock(stockInfo?.quantity || 0);
        setIsCountModalOpen(true);
        setIsCompartmentSelectOpen(false);
    };
    
     React.useEffect(() => {
        if (locations && locations.length > 0 && currentUser) {
        const favId = currentUser.favoriteLocationId;
        if (favId && locations.some(l => l.id === favId)) {
            setActiveLocationId(favId);
        } else if(locations.length > 0) {
            setActiveLocationId(locations[0]!.id);
        }
        }
    }, [locations, currentUser]);


    const handleUpdateStock = () => {
        if (!currentItem || !currentUser || !activeLocationId) {
            toast({ title: 'Fehler', description: 'Artikel, Benutzer oder Lagerort nicht gefunden.', variant: 'destructive' });
            return;
        }

        handleQuickStockChange(currentItem.id, activeLocationId, 'inventory', countedStock);

        toast({
            title: 'Bestand aktualisiert',
            description: `Bestand für ${currentItem.name} auf ${countedStock} gesetzt.`,
        });

        setIsCountModalOpen(false);
        setCurrentItem(null);
    };

    const handleCodeScanned = React.useCallback((scannedData: string) => {
        if (scannedData.startsWith('compartment::')) {
            const [, mainLoc, subLoc] = scannedData.split('::');
            const itemsInCompartment = items.filter(i => 
                i.mainLocation === mainLoc && 
                i.subLocation === subLoc &&
                (activeLocationId === 'all' || i.stocks.some(s => s.locationId === activeLocationId))
            );
            if (itemsInCompartment.length > 1) {
                setCompartmentItems(itemsInCompartment.filter(isInventoryItem));
                setIsCompartmentSelectOpen(true);
            } else if (itemsInCompartment.length === 1 && itemsInCompartment[0]) {
                if (isInventoryItem(itemsInCompartment[0])) {
                  handleOpenCountModal(itemsInCompartment[0]);
                }
            } else {
                toast({ title: 'Fehler', description: 'Keine Artikel in diesem Lagerfach gefunden.', variant: 'destructive' });
            }
        } else {
            let item: InventoryItem | undefined;
            if (scannerType === 'qr') {
                item = items.find(i => i.id === scannedData && isInventoryItem(i)) as InventoryItem | undefined;
            } else { // barcode
                item = items.find(i => isInventoryItem(i) && i.barcode === scannedData) as InventoryItem | undefined;
            }
            
            if (item) {
                toast({ title: 'Artikel erkannt!', description: `Öffne Inventur für ${item.name}.` });
                handleOpenCountModal(item);
            } else {
                toast({ title: 'Fehler', description: 'Gescannter Artikel nicht gefunden.', variant: 'destructive' });
            }
        }
    }, [items, scannerType, toast, activeLocationId]);
    
    const captureCode = React.useCallback(async (callback: (data: string) => void) => {
        if (webcamRef.current) {
            const imageSrc = webcamRef.current.getScreenshot();
            if (imageSrc) {
                const image = new window.Image();
                image.src = imageSrc;
                image.onload = async () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = image.width;
                    canvas.height = image.height;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(image, 0, 0, image.width, image.height);
                        const imageData = ctx.getImageData(0, 0, image.width, image.height);
                        
                        let codeFound = false;

                        if (scannerType === 'barcode' && 'BarcodeDetector' in window) {
                            // @ts-expect-error BarcodeDetector is not in global types
                            const barcodeDetector = new window.BarcodeDetector({ formats: ['ean_13', 'code_128'] });
                            try {
                                const barcodes = await barcodeDetector.detect(imageData);
                                if (barcodes.length > 0 && barcodes[0]) {
                                    const scannedData = barcodes[0].rawValue;
                                    if (lastScannedId.current !== scannedData) {
                                        lastScannedId.current = scannedData;
                                        codeFound = true;
                                        callback(scannedData);
                                        setTimeout(() => { lastScannedId.current = null; }, 2000);
                                    }
                                }
                            } catch (e) {
                                console.warn('BarcodeDetector failed.', e);
                            }
                        }

                        if (!codeFound) { // Always check for QR, even if Barcode is selected, as compartment codes are QR.
                            const code = jsQR(imageData.data, imageData.width, imageData.height, {
                                inversionAttempts: 'dontInvert',
                            });
                            if (code && code.data && lastScannedId.current !== code.data) {
                                lastScannedId.current = code.data;
                                callback(code.data);
                                setTimeout(() => { lastScannedId.current = null; }, 2000);
                            }
                        }
                    }
                };
            }
        }
    }, [scannerType]);


    React.useEffect(() => {
        let intervalId: NodeJS.Timeout;
        if (hasCameraPermission && !isCountModalOpen && !isCompartmentSelectOpen) {
            intervalId = setInterval(() => captureCode(handleCodeScanned), 500);
        }
        return () => clearInterval(intervalId);
    }, [captureCode, hasCameraPermission, isCountModalOpen, isCompartmentSelectOpen, handleCodeScanned]);

    if (!locations || !items) {
        return <div>Laden...</div>
    }

    const activeLocation = locations.find(l=>l.id === activeLocationId);

    const itemsForActiveLocation = React.useMemo(() => {
        return sortedItems.filter(item => {
            return item.stocks.some(s => s.locationId === activeLocationId);
        });
    }, [sortedItems, activeLocationId]);

    return (
        <div className="flex flex-col gap-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="lg:col-span-4">
                    <CardHeader>
                        <CardTitle>Inventur-Scanner</CardTitle>
                        <CardDescription>
                        Richten Sie die Kamera auf einen Code, um eine Inventur durchzuführen. Die Buchung erfolgt auf: <span className="font-bold">{activeLocation?.name}</span>.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center space-x-2 my-4 justify-center">
                            <Label htmlFor="scanner-type-switch">QR-Code</Label>
                            <Switch
                                id="scanner-type-switch"
                                checked={scannerType === 'barcode'}
                                onCheckedChange={(checked) => setScannerType(checked ? 'barcode' : 'qr')}
                            />
                            <Label htmlFor="scanner-type-switch">Barcode (EAN)</Label>
                        </div>
                        <div className="relative aspect-video w-full max-w-md mx-auto overflow-hidden rounded-lg border">
                        {isClient && hasCameraPermission === true && (
                            <Webcam
                            audio={false}
                            ref={webcamRef}
                            screenshotFormat="image/jpeg"
                            videoConstraints={{ facingMode: 'environment' }}
                            className="w-full h-full object-cover"
                            />
                        )}
                        {hasCameraPermission === false && (
                            <div className="w-full h-full bg-muted flex flex-col items-center justify-center">
                                <CameraOff className="h-16 w-16 text-muted-foreground" />
                                <p className="mt-4 text-muted-foreground">Kein Kamerazugriff</p>
                            </div>
                        )}
                        {hasCameraPermission === null && (
                            <div className="w-full h-full bg-muted flex items-center justify-center">
                                <p>Kamerazugriff wird angefordert...</p>
                            </div>
                        )}
                        <div className="absolute inset-0 border-[20px] border-black/20 rounded-lg"></div>
                         <div className={cn(
                            "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2/3 border-2 border-dashed border-destructive opacity-75",
                            scannerType === 'qr' ? 'h-2/3' : 'h-1/3'
                        )}></div>
                        </div>
                        {hasCameraPermission === false && (
                            <Alert variant="destructive" className="mt-4 max-w-md mx-auto">
                            <AlertTitle>Kamerazugriff erforderlich</AlertTitle>
                            <AlertDescription>
                                Bitte erlauben Sie den Zugriff auf die Kamera in den Einstellungen Ihres Browsers, um diese Funktion zu nutzen.
                            </AlertDescription>
                            </Alert>
                        )}
                    </CardContent>
                </Card>

                <div className="lg:col-span-3 grid grid-cols-1 gap-4 auto-rows-min">
                   <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Award className="h-5 w-5 text-yellow-500" /> Bestenliste</CardTitle>
                            <CardDescription>Wer war im aktuellen Monat am fleißigsten?</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {inventoryCounts.length > 0 ? inventoryCounts.slice(0, 3).map((user, index) => (
                                    <div key={user.userId} className="flex items-center gap-4">
                                        {index === 0 && <Crown className="h-6 w-6 text-yellow-500" />}
                                        {index === 1 && <Award className="h-6 w-6 text-gray-400" />}
                                        {index === 2 && <Award className="h-6 w-6 text-orange-400" />}
                                        <Avatar className="h-9 w-9">
                                            <AvatarImage src={`https://api.dicebear.com/7.x/micah/svg?seed=${user.userName}`} alt={user.userName} />
                                            <AvatarFallback>{user.userName.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 font-medium">{user.userName}</div>
                                    </div>
                                )) : (
                                    <p className="text-center text-muted-foreground">Noch keine Zählungen diesen Monat.</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5" /> Letzte Zählungen</CardTitle>
                             <CardDescription>Die letzten 5 durchgeführten Inventuren.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {latestInventoryLogs.slice(0,5).map(log => (
                                    <div key={log.id} className="flex items-start gap-3">
                                        <Avatar className="h-8 w-8 border">
                                           <AvatarImage src={`https://api.dicebear.com/7.x/micah/svg?seed=${log.userName}`} alt={log.userName} />
                                           <AvatarFallback>{log.userName.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div className="text-sm flex-1">
                                            <p><span className="font-semibold">{log.userName}</span> hat <span className="font-semibold">{log.itemName}</span> gezählt</p>
                                            <p className="text-xs text-muted-foreground">{format(new Date(log.date), 'dd.MM.yy HH:mm')} in {locations.find(l=>l.id === log.locationId)?.name}</p>
                                        </div>
                                    </div>
                                ))}
                                 {latestInventoryLogs.length === 0 && (
                                     <p className="text-center text-muted-foreground">Noch keine Inventuren durchgeführt.</p>
                                 )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Inventur-Assistent</CardTitle>
                    <CardDescription>
                        Empfehlungsliste zur systematischen Inventur für den Lagerort <span className="font-bold">{activeLocation?.name}</span>. Die Artikel, deren letzte Zählung am längsten her ist, werden zuerst angezeigt.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="hidden md:block">
                        <table className="w-full">
                            <thead>
                                <tr>
                                    <th className="w-4"></th>
                                    <th className="text-left">Artikel</th>
                                    <th className="text-left">Lagerort</th>
                                    <th className="text-left">Letzte Zählung</th>
                                    <th className="text-right">Aktueller Bestand</th>
                                    <th className="w-[100px]"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {itemsForActiveLocation.map(item => {
                                    const latestInventoryDate = isInventoryItem(item) ? getLatestInventoryDate(item.lastInventoriedAt) : new Date(0);
                                    const stockInfo = item.stocks.find(s => s.locationId === activeLocationId);
                                    const itemNumberToDisplay = isInventoryItem(item) ? (item.preferredManufacturerItemNumber || item.manufacturerItemNumbers?.[0]?.number || '') : '';
                                    
                                    return (
                                        <tr key={item.id} className="border-b">
                                            <td className="p-2">
                                                <div className={cn("w-2 h-10 rounded-full", isInventoryItem(item) ? getInventoryStatusColorClass(item.lastInventoriedAt).replace('border-', 'bg-') : 'bg-gray-400')} />
                                            </td>
                                            <td>
                                                <p className="font-medium">{item.name}</p>
                                                <p className="text-sm text-muted-foreground">{itemNumberToDisplay}</p>
                                            </td>
                                            <td>{item.mainLocation} / {item.subLocation}</td>
                                            <td>
                                                {latestInventoryDate ? format(new Date(latestInventoryDate), 'dd.MM.yyyy HH:mm') : 'Nie'}
                                            </td>
                                            <td className="text-right font-medium">{stockInfo?.quantity}</td>
                                            <td className="text-right">
                                                {isInventoryItem(item) && <Button onClick={() => handleOpenCountModal(item)}>Zählen</Button>}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div className="md:hidden space-y-4">
                        {itemsForActiveLocation.map(item => {
                            const latestInventoryDate = isInventoryItem(item) ? getLatestInventoryDate(item.lastInventoriedAt) : new Date(0);
                            const stockInfo = item.stocks.find(s => s.locationId === activeLocationId);
                             const itemNumberToDisplay = isInventoryItem(item) ? (item.preferredManufacturerItemNumber || item.manufacturerItemNumbers?.[0]?.number || '') : '';
                                    
                            return (
                             <div key={item.id} className={cn("p-4 border rounded-lg flex gap-4", isInventoryItem(item) ? getInventoryStatusColorClass(item.lastInventoriedAt) : 'border-gray-400')}>
                                <div className="flex-grow">
                                    <p className="font-medium">{item.name}</p>
                                    <p className="text-sm text-muted-foreground">{itemNumberToDisplay}</p>
                                    <p className="text-sm text-muted-foreground">{item.mainLocation} / {item.subLocation}</p>
                                    <div className="text-sm mt-2 flex justify-between items-center">
                                        <span>Letzte Zählung: </span>
                                        <span>{latestInventoryDate ? format(new Date(latestInventoryDate), 'dd.MM.yy') : 'Nie'}</span>
                                    </div>
                                    <div className="text-sm flex justify-between items-center">
                                        <span>Buchungsbestand: </span>
                                        <span className="font-medium">{stockInfo?.quantity}</span>
                                    </div>
                                </div>
                                <div className="flex flex-col justify-center">
                                    {isInventoryItem(item) && <Button onClick={() => handleOpenCountModal(item)}>Zählen</Button>}
                                </div>
                            </div>
                        )})}
                    </div>
                </CardContent>
            </Card>

            <Dialog open={isCompartmentSelectOpen} onOpenChange={setIsCompartmentSelectOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Artikel auswählen</DialogTitle>
                        <DialogDescription>
                            Dieses Lagerfach enthält mehrere Artikel. Bitte wählen Sie den gewünschten Artikel aus.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-2">
                        {compartmentItems.map(item => (
                            <Button key={item.id} variant="outline" className="w-full justify-start" onClick={() => handleOpenCountModal(item)}>
                                {item.name}
                            </Button>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isCountModalOpen} onOpenChange={setIsCountModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Inventur für: {currentItem?.name}</DialogTitle>
                        <DialogDescription>
                            Geben Sie den tatsächlich gezählten Bestand für den Lagerort &quot;{activeLocation?.name}&quot; ein. Aktueller Buchungsbestand ist {currentItem?.stocks.find(s => s.locationId === activeLocationId)?.quantity ?? 0}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="counted-stock" className="text-center block mb-2">Gezählter Bestand</Label>
                         <div className="flex items-center justify-center gap-4">
                            <Button
                                type="button"
                                size="icon"
                                variant="outline"
                                className="h-12 w-12 active:scale-95"
                                onClick={() => setCountedStock(s => Math.max(0, s - 1))}
                            >
                                <Minus className="h-6 w-6" />
                            </Button>
                            <Input
                                id="counted-stock"
                                type="number"
                                value={countedStock}
                                onChange={(e) => setCountedStock(Number(e.target.value))}
                                className="w-32 h-20 text-center text-4xl font-bold"
                            />
                            <Button
                                type="button"
                                size="icon"
                                variant="outline"
                                className="h-12 w-12 active:scale-95"
                                onClick={() => setCountedStock(s => s + 1)}
                            >
                                <Plus className="h-6 w-6" />
                            </Button>
                        </div>
                        {currentItem && activeLocationId && countedStock < (currentItem.minStocks.find(ms => ms.locationId === activeLocationId)?.quantity ?? 0) && (
                            <div className="mt-4 p-3 bg-orange-100 border-l-4 border-orange-500 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-600">
                                <div className="flex">
                                    <div className="py-1"><Info className="h-5 w-5 text-orange-500 mr-3" /></div>
                                    <div>
                                        <p className="font-bold">Mindestbestand unterschritten</p>
                                        <p className="text-sm">Bei Bestätigung wird automatisch eine Nachbestellung über {(currentItem.minStocks.find(ms => ms.locationId === activeLocationId)?.quantity ?? 0) - countedStock} Stk. angeordnet.</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="secondary" onClick={() => setIsCountModalOpen(false)}>Abbrechen</Button>
                        <Button onClick={handleUpdateStock} disabled={!currentUser || !activeLocationId}>
                           Bestand aktualisieren
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
