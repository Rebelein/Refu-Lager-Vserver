

'use client';

import * as React from 'react';
import Image from 'next/image';
import { PlusCircle, Search, File, MoreHorizontal, PackageMinus, PackagePlus, Pencil, Trash2, ArrowUpDown, QrCode, History, Building, Link as LinkIcon, Clipboard, GripVertical, ShoppingCart, Archive, Truck, XCircle, FileClock, Plus, Minus, Info, ImagePlus, X, Package, AlertCircle, RefreshCw, Camera, ScanLine, Upload, ChevronsUpDown, Printer, Sparkles, Wrench, CircleHelp, ClipboardPaste, Star, Warehouse, SlidersHorizontal, Pin, PinOff, Link2, Settings2, ArrowUp, ArrowDown, CheckCircle, CheckCircle2, Check, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { InventoryItem, ChangeLogEntry, ItemSupplier, Location, Stock, ManufacturerItemNumber, Machine } from '@/lib/types';
import QRCode from 'react-qr-code';
import Barcode from 'react-barcode';
import { useRouter, useSearchParams } from 'next/navigation';
import { Slider } from '@/components/ui/slider';
import { useAppContext } from '@/context/AppContext';
import { format, differenceInDays } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import { cn, resizeImage } from '@/lib/utils';
import { getChangeLogActionText } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import Webcam from 'react-webcam';
import jsqr from 'jsqr';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toPng } from 'html-to-image';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { analyzeItem, type AnalyzeItemOutput } from '@/ai/flows/analyze-item-flow';
import { Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';


type SortKey = keyof InventoryItem | 'mainLocation' | 'stocks' | 'subLocation';

type SortConfig = {
  key: SortKey;
  direction: 'ascending' | 'descending';
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

const getInventoryStatusClass = (item: InventoryItem, activeLocationId: string | 'all', needsLabelUpdate: boolean) => {
    const stockInfo = item.stocks?.find(s => s.locationId === activeLocationId);
    const minStockInfo = item.minStocks?.find(ms => ms.locationId === activeLocationId);
    const reorderStatus = item.reorderStatus?.[activeLocationId];

    if (stockInfo && minStockInfo && stockInfo.quantity < minStockInfo.quantity && !reorderStatus?.status) {
        return 'border-red-500';
    }
    if (needsLabelUpdate) {
        return 'border-orange-400';
    }
    
    const lastDate = item.lastInventoriedAt?.[activeLocationId] || null;
    if (!lastDate) {
      return 'border-red-500';
    }
    const daysSinceInventory = differenceInDays(new Date(), new Date(lastDate));
    if (daysSinceInventory <= 7) {
      return 'border-green-500';
    } else if (daysSinceInventory <= 30) {
      return 'border-yellow-500';
    } else {
      return 'border-red-500';
    }
};

const ItemCard = ({ item, activeLocationId, isCompactView }: { item: InventoryItem, activeLocationId: string, isCompactView: boolean }) => {
    const { updateItem, items, currentUser, wholesalers, orders, locations, removeItemFromLocation, handleQuickStockChange, openDetailView } = useAppContext();
    const { toast } = useToast();
    
    const [isQuickStockMode, setIsQuickStockMode] = React.useState(false);
    const [quickStockQuantity, setQuickStockQuantity] = React.useState(1);
    
    const stockInfo = item.stocks?.find(s => s.locationId === activeLocationId) || { locationId: activeLocationId, quantity: 0 };
    const minStockInfo = item.minStocks?.find(ms => ms.locationId === activeLocationId) || { locationId: activeLocationId, quantity: 0 };
    const reorderStatus = item.reorderStatus?.[activeLocationId];

    const preferredWholesaler = item.preferredWholesalerId ? wholesalers.find(w => w.id === item.preferredWholesalerId) : null;
    const preferredSupplierInfo = item.preferredWholesalerId ? item.suppliers?.find(s => s.wholesalerId === item.preferredWholesalerId) : null;
    const associatedOrder = reorderStatus?.orderId ? orders.find(o => o.id === reorderStatus.orderId) : null;
    
    const updateLogs = (item.changelog || []).filter(log => log.type === 'update').sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const lastUpdate = updateLogs[0];
    const needsLabelUpdate = !!(lastUpdate && item.labelLastPrintedAt && new Date(lastUpdate.date) > new Date(item.labelLastPrintedAt));


    const handleOpenStockModal = (item: InventoryItem) => {
        const event = new CustomEvent('openStockModal', { detail: { item } });
        window.dispatchEvent(event);
    };

    const handleOpenForm = (item: InventoryItem, mainLocation?: string) => {
        const event = new CustomEvent('openFormModal', { detail: {item, mainLocation} });
        window.dispatchEvent(event);
    };

    const handleOpenDeleteConfirm = (item: InventoryItem) => {
        const event = new CustomEvent('openDeleteModal', { detail: {item, locationId: activeLocationId} });
        window.dispatchEvent(event);
    };

    const handleOpenQrCode = (item: InventoryItem) => {
        const event = new CustomEvent('openQrModal', { detail: item });
        window.dispatchEvent(event);
    };
    
     const handleOpenArrangeReorderModal = (item: InventoryItem) => {
        const event = new CustomEvent('openArrangeReorderModal', { detail: item });
        window.dispatchEvent(event);
    };

    const handleOpenTransferModal = (item: InventoryItem) => {
        const event = new CustomEvent('openTransferModal', { detail: item });
        window.dispatchEvent(event);
    };

    const copyToClipboard = (text: string, entity: string) => {
        navigator.clipboard.writeText(text).then(() => {
            toast({ title: 'Kopiert!', description: `${entity} wurde in die Zwischenablage kopiert.` });
        }, (err) => {
            toast({ title: 'Fehler', description: 'Konnte nicht in die Zwischenablage kopieren.', variant: 'destructive' });
            console.error('Could not copy text: ', err);
        });
    };

    const handleReorderStateChange = (newStatus: 'arranged' | 'ordered' | null, details: string, logType: ChangeLogEntry['type'], quantity?: number | null) => {
        if (!currentUser) {
            toast({ title: 'Fehler', description: 'Bitte wählen Sie zuerst einen Benutzer aus.', variant: 'destructive' });
            return;
        }

        const now = new Date().toISOString();
        const newReorderStatus: InventoryItem['reorderStatus'] = { ...item.reorderStatus };
        let locationReorderStatus = newReorderStatus[activeLocationId] || {};


        if (newStatus === 'arranged') {
            locationReorderStatus = { ...locationReorderStatus, status: 'arranged', arrangedAt: now, orderedAt: null, quantity: quantity };
        } else if (newStatus === 'ordered') {
            locationReorderStatus = { ...locationReorderStatus, status: 'ordered', orderedAt: now };
        } else {
            locationReorderStatus = { status: null, arrangedAt: null, orderedAt: null, quantity: null, orderId: null };
        }
        
        newReorderStatus[activeLocationId] = locationReorderStatus;
        
        const newLogEntry: ChangeLogEntry = {
            id: `${now}-${Math.random()}`,
            date: now,
            userId: currentUser.id,
            userName: currentUser.name,
            type: logType,
            details: details,
            locationId: activeLocationId,
        };

        updateItem(item.id, { 
            reorderStatus: newReorderStatus, 
            changelog: [...(item.changelog || []), newLogEntry] 
        });

        toast({ title: 'Status geändert', description: details });
    };

    const handleMarkAsOrdered = () => handleReorderStateChange('ordered', `${reorderStatus?.quantity}x ${item.name} als bestellt markiert.`, 'reordered');
    const handleReceiveDelivery = () => {
        handleReorderStateChange(null, `Lieferung für ${reorderStatus?.quantity || ''}x ${item.name} als erhalten markiert.`, 'received');
        const event = new CustomEvent('openStockModal', { detail: { item, quantity: reorderStatus?.quantity, type: 'in' } });
        window.dispatchEvent(event);
    };
    const handleCancelReorder = () => handleReorderStateChange(null, `Bestellung für ${reorderStatus?.quantity}x ${item.name} storniert.`, 'reorder-cancelled');
    
    const inventoryStatusClass = getInventoryStatusClass(item, activeLocationId, needsLabelUpdate);

    const activeLocation = locations.find(l => l.id === activeLocationId);
    
     const onQuickStockChange = (type: 'in' | 'out') => {
        handleQuickStockChange(item.id, activeLocationId, type, quickStockQuantity);
        setIsQuickStockMode(false);
    };
    
    const handleDismissLabelNotification = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (lastUpdate) {
            updateItem(item.id, { labelLastPrintedAt: new Date().toISOString() });
            toast({ title: 'Erinnerung quittiert', description: 'Die Erinnerung zum Etikettendruck wurde entfernt.' });
        }
    };
    
    const linkedImageItem = item.linkedImageUrl ? items.find(i => i.imageUrl === item.linkedImageUrl) : null;
    const displayImageUrl = item.imageUrl || (linkedImageItem ? linkedImageItem.imageUrl : null);


    const borderClasses = [];
    let glowClass = '';

    if (currentUser?.showInventoryStatusBorder) {
        const statusColor = inventoryStatusClass.split('-')[1]; // 'red', 'yellow', 'green'
        if (statusColor === '500') { // This is how the colors are defined
            if (inventoryStatusClass.includes('red')) glowClass = 'animate-glow-red';
            else if (inventoryStatusClass.includes('yellow')) glowClass = 'animate-glow-yellow';
            else if (inventoryStatusClass.includes('green')) glowClass = 'animate-glow-green';
        }

        if (needsLabelUpdate) {
            glowClass = 'animate-glow-orange'; // Special glow for label updates
            if (inventoryStatusClass === 'border-red-500') {
                borderClasses.push('bg-gradient-to-r from-orange-500 to-red-500');
            } else if (inventoryStatusClass === 'border-yellow-500') {
                borderClasses.push('bg-gradient-to-r from-orange-500 to-yellow-500');
            } else {
                borderClasses.push('bg-orange-500');
            }
        } else {
            if (inventoryStatusClass === 'border-red-500') borderClasses.push('bg-red-500');
            if (inventoryStatusClass === 'border-yellow-500') borderClasses.push('bg-yellow-500');
            if (inventoryStatusClass === 'border-green-500') borderClasses.push('bg-green-500');
        }

        if (stockInfo.quantity < minStockInfo.quantity && !reorderStatus?.status && !needsLabelUpdate) {
            borderClasses.push('bg-red-500');
            glowClass = 'animate-glow-red';
        }
    }
    
    const itemNumberToDisplay = item.preferredManufacturerItemNumber || (Array.isArray(item.manufacturerItemNumbers) && item.manufacturerItemNumbers.length > 0 && item.manufacturerItemNumbers[0] ? item.manufacturerItemNumbers[0].number : '') || '';


    const CardContentWrapper = ({ children }: { children: React.ReactNode }) => {
        return (
             <div className="bg-card flex flex-col lg:flex-row lg:items-start lg:justify-between p-4 rounded-[5px]">
                {children}
            </div>
        )
    };
    
    const HeaderContent = () => (
        <div className="flex items-start flex-1 min-w-0">
            {displayImageUrl ? (
            <div className="flex-shrink-0 w-12 h-12 mr-4 relative cursor-pointer" onClick={(e) => { e.stopPropagation(); openDetailView(item); }}>
                <Image src={displayImageUrl} alt={item.name} fill className="rounded-md object-cover" />
            </div>
            ) : (
            <div className="flex-shrink-0 w-12 h-12 mr-4 bg-muted rounded-md flex items-center justify-center cursor-pointer" onClick={(e) => { e.stopPropagation(); openDetailView(item); }}>
                <Package className="w-6 h-6 text-muted-foreground" />
            </div>
            )}
            <div className="flex-1 min-w-0 pr-2">
                <p className="text-sm font-semibold">{item.name}</p>
                <div className="text-xs text-muted-foreground flex items-center gap-x-2 flex-wrap">
                    <span
                        onClick={(e) => { e.stopPropagation(); copyToClipboard(itemNumberToDisplay, 'Hersteller Art-Nr.'); }}
                        className="cursor-pointer hover:underline group inline-flex items-center"
                    >
                        {itemNumberToDisplay}
                        <Clipboard className="h-2.5 w-2.5 ml-1.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </span>
                    {preferredSupplierInfo?.wholesalerItemNumber && (
                    <>
                        <span>•</span>
                        <span 
                        onClick={(e) => { e.stopPropagation(); copyToClipboard(preferredSupplierInfo.wholesalerItemNumber, 'Großhändler Art-Nr.'); }} 
                        className="cursor-pointer hover:underline group inline-flex items-center"
                        >
                            {preferredSupplierInfo.wholesalerItemNumber}
                            <Clipboard className="h-2.5 w-2.5 ml-1.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </span>
                    </>
                    )}
                    {preferredWholesaler && (
                        <>
                        <span>•</span>
                        {preferredSupplierInfo?.url ? (
                            <a href={preferredSupplierInfo.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:underline text-muted-foreground hover:text-primary" onClick={(e) => e.stopPropagation()}>
                                <Building className="h-3 w-3" /> {preferredWholesaler.name}
                                <LinkIcon className="h-3 w-3" />
                            </a>
                        ) : (
                            <span className="flex items-center gap-1">
                                <Building className="h-3 w-3" /> {preferredWholesaler.name}
                            </span>
                        )}
                        </>
                    )}
                    <span>•</span>
                    <span>{item.mainLocation} / {item.subLocation}</span>
                </div>
            </div>
            <div className="flex items-center justify-end gap-1 lg:gap-2 ml-auto pl-2">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Menü</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuLabel>Aktionen</DropdownMenuLabel>
                            <DropdownMenuItem onSelect={() => openDetailView(item)}><Info className="mr-2 h-4 w-4" /> Details</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => handleOpenForm(item)}><Pencil className="mr-2 h-4 w-4" /> Bearbeiten</DropdownMenuItem>
                            
                        {!activeLocation?.isVehicle && (!reorderStatus || !reorderStatus.status) && (
                            <DropdownMenuItem onSelect={() => handleOpenArrangeReorderModal(item)}><FileClock className="mr-2 h-4 w-4" /> Nachbestellung anordnen</DropdownMenuItem>
                        )}
                            {activeLocation?.isVehicle && (!reorderStatus || !reorderStatus.status) && (
                            <DropdownMenuItem onSelect={() => handleOpenArrangeReorderModal(item)}><FileClock className="mr-2 h-4 w-4" /> Material anfordern</DropdownMenuItem>
                        )}
                        
                        {reorderStatus?.status === 'arranged' && (
                            <DropdownMenuItem onSelect={handleMarkAsOrdered}><ShoppingCart className="mr-2 h-4 w-4" /> Als bestellt markieren</DropdownMenuItem>
                        )}
                        {reorderStatus?.status === 'ordered' && (
                            <DropdownMenuItem onSelect={handleReceiveDelivery}><Archive className="mr-2 h-4 w-4" /> Lieferung erhalten</DropdownMenuItem>
                        )}
                        {(reorderStatus?.status === 'arranged' || reorderStatus?.status === 'ordered') && (
                            <DropdownMenuItem onSelect={handleCancelReorder} className="text-destructive"><XCircle className="mr-2 h-4 w-4" /> Bestellung stornieren</DropdownMenuItem>
                        )}

                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => handleOpenQrCode(item)}><QrCode className="mr-2 h-4 w-4" /> Etikett</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => openDetailView(item, 'history')}><History className="mr-2 h-4 w-4" /> Verlauf</DropdownMenuItem>
                        {(preferredWholesaler && preferredSupplierInfo) && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuLabel className="flex items-center gap-2">
                                    <Building className="h-4 w-4" /> {preferredWholesaler.name}
                                </DropdownMenuLabel>
                                <DropdownMenuItem onSelect={() => copyToClipboard(preferredSupplierInfo.wholesalerItemNumber, 'Großhändler Art-Nr.')}>
                                    <Clipboard className="mr-2 h-4 w-4" /> Art-Nr: {preferredSupplierInfo.wholesalerItemNumber}
                                </DropdownMenuItem>
                                {preferredSupplierInfo.url && (
                                     <a href={preferredSupplierInfo.url} target="_blank" rel="noopener noreferrer">
                                        <DropdownMenuItem>
                                            <LinkIcon className="mr-2 h-4 w-4" /> Zum Artikel
                                        </DropdownMenuItem>
                                    </a>
                                )}
                            </>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => handleOpenDeleteConfirm(item)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Löschen</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
    
    const FooterContent = () => (
         <div className="flex items-center justify-between lg:justify-end gap-4 mt-4 lg:mt-0">
            {isQuickStockMode ? (
                <div className="flex items-center gap-1 w-full lg:w-auto">
                    <Button size="icon" variant="ghost" onClick={(e) => {e.stopPropagation(); setQuickStockQuantity(q => Math.max(1, q - 1))}}><Minus className="h-4 w-4"/></Button>
                    <Input type="number" value={quickStockQuantity} onChange={(e) => { e.stopPropagation(); setQuickStockQuantity(parseInt(e.target.value) || 1); }} className="w-16 h-8 text-center" onClick={(e) => e.stopPropagation()}/>
                    <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); setQuickStockQuantity(q => q + 1)}}><Plus className="h-4 w-4"/></Button>
                    <Button size="sm" variant="ghost" className="text-green-600" onClick={(e) => { e.stopPropagation(); onQuickStockChange('in')}}><PackagePlus className="h-4 w-4"/></Button>
                    <Button size="sm" variant="ghost" className="text-red-600" onClick={(e) => { e.stopPropagation(); onQuickStockChange('out')}}><PackageMinus className="h-4 w-4"/></Button>
                    <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleOpenTransferModal(item); setIsQuickStockMode(false); }}><RefreshCw className="h-4 w-4"/></Button>
                    <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); setIsQuickStockMode(false)}}><X className="h-4 w-4"/></Button>
                </div>
            ) : (
            <div className="flex items-center gap-2 text-center flex-1 lg:flex-initial lg:w-32 cursor-pointer" onClick={(e) => { e.stopPropagation(); setIsQuickStockMode(true); setQuickStockQuantity(1);}}>
                <div className="p-1 rounded-md bg-gradient-to-b from-gray-50 to-gray-200 dark:from-gray-700 dark:to-gray-800 w-full flex flex-col justify-center items-center text-xs">
                    <div className="text-muted-foreground">Min.</div>
                    <div className="text-sm font-bold text-secondary-foreground">{minStockInfo.quantity}</div>
                </div>
                <div className={cn("p-1 rounded-md w-full flex flex-col justify-center items-center text-xs bg-gradient-to-b from-gray-50 to-gray-200 dark:from-gray-700 dark:to-gray-800", stockInfo.quantity < minStockInfo.quantity && !reorderStatus?.status ? 'bg-destructive/20' : 'bg-muted/50')}>
                    <div className="text-muted-foreground">Ist</div>
                    <div className={cn("text-sm font-bold text-secondary-foreground", stockInfo.quantity < minStockInfo.quantity && !reorderStatus?.status ? 'text-destructive' : '')}>
                        {stockInfo.quantity}
                    </div>
                </div>
            </div>
            )}

            <div className="flex items-center justify-end gap-1 lg:gap-2">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                    <Button
                        size="sm"
                        variant="secondary"
                        className="h-8"
                        onClick={(e) => e.stopPropagation()}
                    >
                        Buchen
                    </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenuItem onSelect={() => handleOpenStockModal(item)}><PackagePlus className="mr-2 h-4 w-4" /> Buchen / Entnehmen</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => handleOpenTransferModal(item)}><RefreshCw className="mr-2 h-4 w-4" /> Umlagern</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
    
    const CardBody = () => {
        if (isCompactView) {
            return (
                <Collapsible>
                    <CollapsibleTrigger asChild>
                        <div>
                             <CardContentWrapper>
                                <HeaderContent />
                            </CardContentWrapper>
                        </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                        <div className="bg-card flex flex-col lg:flex-row lg:items-start lg:justify-between p-4 pt-0 rounded-b-[5px]">
                            <div className="flex-1 min-w-0 hidden lg:block">
                                {/* Placeholder to keep layout consistent */}
                                <div className="w-12 h-12 mr-4 flex-shrink-0" />
                            </div>
                            <FooterContent />
                        </div>
                    </CollapsibleContent>
                </Collapsible>
            );
        }

        return (
            <CardContentWrapper>
                <HeaderContent />
                <FooterContent />
            </CardContentWrapper>
        )
    };


    return (
     <div className="relative">
       <Card 
          className={cn(
            "p-0.5",
            borderClasses,
            glowClass,
            stockInfo.quantity < minStockInfo.quantity && !reorderStatus?.status && !needsLabelUpdate ? 'bg-red-500' : ''
          )}
        >
          {CardBody()}
      </Card>
        {needsLabelUpdate && (
            <div className="absolute -top-2 -right-2 z-10">
                <div className="bg-yellow-100 border-2 border-dashed border-yellow-500 rounded-lg p-2 shadow-lg animate-pulse">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-yellow-600"/>
                        <div className="text-xs font-semibold text-yellow-800">Neues Etikett benötigt</div>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); handleOpenQrCode(item); }}>
                            <Printer className="h-4 w-4"/>
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleDismissLabelNotification}>
                            <X className="h-4 w-4"/>
                        </Button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default function InventoryListPage() {
  const { items, addItem, currentUser, wholesalers, locations, removeItemFromLocation, addItemToLocation, transferStock, bulkImportItems, handleQuickStockChange, updateItem, appSettings, updateUserSettings, openDetailView, isDetailViewOpen, setIsDetailViewOpen, currentItem: itemInDetail, detailViewTab } = useAppContext();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [activeTab, setActiveTab] = React.useState('all');
  
  const itemSortConfig = React.useRef<SortConfig | null>(null);
  const groupSortConfig = React.useRef<SortConfig | null>(null);
  const [_, setForceRender] = React.useState(0); // Helper to force re-render

  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isStockOpen, setIsStockOpen] = React.useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = React.useState(false);
  const [isQrCodeOpen, setIsQrCodeOpen] = React.useState(false);
  const [isArrangeReorderOpen, setIsArrangeReorderOpen] = React.useState(false);
  const [isImportScannerOpen, setIsImportScannerOpen] = React.useState(false);
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = React.useState(false);
  const [isSmartScannerOpen, setIsSmartScannerOpen] = React.useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = React.useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = React.useState(false);
  const [isPostSaveLabelOpen, setIsPostSaveLabelOpen] = React.useState(false);
  const [isCompartmentSelectOpen, setIsCompartmentSelectOpen] = React.useState(false);
  const [isImageReuseOpen, setIsImageReuseOpen] = React.useState(false);
  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = React.useState(false);
  
  const [duplicateItem, setDuplicateItem] = React.useState<InventoryItem | null>(null);
  const [compartmentItems, setCompartmentItems] = React.useState<InventoryItem[]>([]);
  const [itemJustSaved, setItemJustSaved] = React.useState<InventoryItem | null>(null);

  const [bulkImportData, setBulkImportData] = React.useState('');
  const [hasCameraPermission, setHasCameraPermission] = React.useState<boolean | null>(null);
  
  const [reorderQuantity, setReorderQuantity] = React.useState(1);
  const [currentItem, setCurrentItem] = React.useState<InventoryItem | Machine | null>(null);
  const [itemToDelete, setItemToDelete] = React.useState<{ item: InventoryItem; locationId: string; dependentItems: number } | null>(null);
  const [itemImage, setItemImage] = React.useState<string | null>(null);
  const [linkedImageUrl, setLinkedImageUrl] = React.useState<string | null>(null);
  const [originalImageFile, setOriginalImageFile] = React.useState<File | Blob | null>(null);
  const [imageZoom, setImageZoom] = React.useState(1);

  const [itemBarcode, setItemBarcode] = React.useState<string | null>(null);
  const [stockChange, setStockChange] = React.useState<{ quantity: number; locationId: string, type: 'in' | 'out' }>({ quantity: 1, locationId: '', type: 'in' });
  const [activeLocationId, setActiveLocationId] = React.useState<string>('');
  
  const [transferData, setTransferData] = React.useState<{ from: string, to: string, quantity: number, maxQuantity: number }>({ from: '', to: '', quantity: 1, maxQuantity: 0 });

  const [labelSize, setLabelSize] = React.useState({ width: 60, height: 30 });
  const [labelText, setLabelText] = React.useState({ name: '', itemNumber: '', location: '', wholesaler: '' });
  const [fontSize, setFontSize] = React.useState(70); // Percentage
  const [barcodeSource, setBarcodeSource] = React.useState('preferred');
  const [barcodeToRender, setBarcodeToRender] = React.useState<string | null>(null);

  const [suppliers, setSuppliers] = React.useState<ItemSupplier[]>([{ wholesalerId: '', wholesalerItemNumber: '', url: '' }]);
  const [preferredWholesaler, setPreferredWholesaler] = React.useState<string | null>(null);
  
  const [mainLocation, setMainLocation] = React.useState('');
  const [mainLocationPopoverOpen, setMainLocationPopoverOpen] = React.useState(false);
  const [subLocation, setSubLocation] = React.useState('');
  const [itemType, setItemType] = React.useState<'item' | 'machine'>('item');

  const [itemImportPopoverOpen, setItemImportPopoverOpen] = React.useState(false);
  
  const webcamRef = React.useRef<Webcam>(null);
  const lastScannedId = React.useRef<string | null>(null);

  const [scannerType, setScannerType] = React.useState<'qr' | 'barcode'>('qr');
  const [smartScannerType, setSmartScannerType] = React.useState<'qr' | 'barcode'>('qr');

  const [pinnedLocations, setPinnedLocations] = React.useState<Set<string>>(new Set());
  const [openAccordion, setOpenAccordion] = React.useState<string[]>([]);
  
  const [isCompactView, setIsCompactView] = React.useState(false);
  
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const searchInputRef = React.useRef<HTMLInputElement>(null);


  // AI Assistant State
  const [isAiMode, setIsAiMode] = React.useState(false);
  const [aiInputType, setAiInputType] = React.useState<'url' | 'image' | null>(null);
  const [aiUrl, setAiUrl] = React.useState('');
  const [aiImage, setAiImage] = React.useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [aiResult, setAiResult] = React.useState<AnalyzeItemOutput | null>(null);
  const [defaultItemName, setDefaultItemName] = React.useState('');
  const [manufacturerNumbers, setManufacturerNumbers] = React.useState<ManufacturerItemNumber[]>([{ number: '', manufacturer: '' }]);
  const [preferredManufacturerNumber, setPreferredManufacturerNumber] = React.useState<string | null>(null);
  const [defaultBarcode, setDefaultBarcode] = React.useState('');


  const router = useRouter();
  const searchParams = useSearchParams();
  const qrScannedId = searchParams.get('id');

  const { toast } = useToast();
  const qrCodeRef = React.useRef<HTMLDivElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const mainLocations = React.useMemo(() => {
    const itemsInActiveLocation = items.filter(
      item => item.itemType !== 'machine' && item.stocks.some(s => s.locationId === activeLocationId)
    );
    const locationsSet = new Set(itemsInActiveLocation.map(item => item.mainLocation).filter(Boolean));
    return Array.from(locationsSet);
}, [items, activeLocationId]);
  
  const mainWarehouse = React.useMemo(() => locations.find(l => !l.isVehicle), [locations]);

  const suggestNextSubLocation = () => {
    if (!mainLocation) {
        toast({ title: 'Lagerplatz fehlt', description: 'Bitte wählen Sie zuerst einen Lagerplatz aus.', variant: 'destructive' });
        return;
    }
    const existingItemsInLocation = items.filter(item => item.mainLocation === mainLocation && item.subLocation);
    if (existingItemsInLocation.length > 0) {
        const lastSubLocation = existingItemsInLocation.reduce((latest, item) => {
            const num = parseInt(item.subLocation.replace(/[^0-9]/g, ''));
            const latestNum = parseInt(latest.replace(/[^0-9]/g, ''));
            return !isNaN(num) && num > latestNum ? item.subLocation : latest;
        }, "Fach 0");
        
        const prefix = lastSubLocation.replace(/[0-9]/g, '').trim();
        const lastNum = parseInt(lastSubLocation.replace(/[^0-9]/g, ''));
        if (!isNaN(lastNum)) {
            setSubLocation(`${prefix} ${lastNum + 1}`);
        } else {
            setSubLocation('Fach 1');
        }
    } else {
        setSubLocation('Fach 1');
    }
  };

  React.useEffect(() => {
    try {
      const storedCompactView = localStorage.getItem('isCompactView');
      if (storedCompactView !== null) {
        setIsCompactView(JSON.parse(storedCompactView));
      } else {
        // Default to true on mobile, false on desktop
        setIsCompactView(window.innerWidth < 768);
      }
    } catch (e) {
      setIsCompactView(false);
    }
  }, []);

  const handleCompactViewChange = (checked: boolean) => {
    setIsCompactView(checked);
    try {
      localStorage.setItem('isCompactView', JSON.stringify(checked));
    } catch (e) {
      console.error('Failed to save compact view setting to localStorage');
    }
  };
  
  React.useEffect(() => {
    if (locations && locations.length > 0 && currentUser) {
      const favId = currentUser.favoriteLocationId;
      if (favId && locations.some(l => l.id === favId)) {
        setActiveLocationId(favId);
      } else if(mainWarehouse) {
        setActiveLocationId(mainWarehouse.id);
      } else if (locations.length > 0) {
        setActiveLocationId(locations[0]!.id);
      }
    }
  }, [locations, currentUser, mainWarehouse]);
  
  React.useEffect(() => {
    const handleOpenStock = (event: Event) => {
        const { item, quantity, type } = (event as CustomEvent).detail as { item: InventoryItem, quantity?: number, type?: 'in' | 'out' };
        setCurrentItem(item);
        setStockChange({ quantity: quantity || 1, locationId: activeLocationId, type: type || 'in' });
        setIsStockOpen(true);
    };
    const handleOpenFormModal = (event: Event) => {
        const { item, mainLocation: prefilledMainLocation } = (event as CustomEvent).detail as { item: InventoryItem | null, mainLocation?: string };
        setCurrentItem(item);
        if (item) {
          setSuppliers(item.suppliers || [{ wholesalerId: '', wholesalerItemNumber: '', url: '' }]);
          if (!item.suppliers || item.suppliers.length === 0) {
              setSuppliers([{ wholesalerId: '', wholesalerItemNumber: '', url: '' }]);
          }
          setPreferredWholesaler(item.preferredWholesalerId || null);
          setItemImage(item.imageUrl || null);
          setLinkedImageUrl(item.linkedImageUrl || null);
          setItemBarcode(item.barcode || null);
          setMainLocation(item.mainLocation || '');
          setSubLocation(item.subLocation || '');
          setItemType(item.itemType || 'item');
          setDefaultItemName(item.name);
          setManufacturerNumbers(item.manufacturerItemNumbers || [{ number: '', manufacturer: '' }]);
          setPreferredManufacturerNumber(item.preferredManufacturerItemNumber || null);
          setDefaultBarcode(item.barcode || '');
        } else {
          setSuppliers([{ wholesalerId: '', wholesalerItemNumber: '', url: '' }]);
          setPreferredWholesaler(null);
          setItemImage(null);
          setLinkedImageUrl(null);
          setItemBarcode(null);
          setMainLocation(prefilledMainLocation || '');
          setSubLocation('');
          setItemType('item');
          setDefaultItemName('');
          setManufacturerNumbers([{ number: '', manufacturer: '' }]);
          setPreferredManufacturerNumber(null);
          setDefaultBarcode('');
        }
        setOriginalImageFile(null);
        setImageZoom(1);
        setIsFormOpen(true);
        setIsAiMode(false);
        setAiResult(null);
    };
     const handleOpenDeleteModal = (event: Event) => {
        const {item, locationId} = (event as CustomEvent).detail as {item: InventoryItem, locationId: string};
        const dependentItems = items.filter(i => i.imageUrl === item.imageUrl && item.imageUrl).length;
        setItemToDelete({item, locationId, dependentItems});
        setIsDeleteConfirmOpen(true);
    };
     const handleOpenQrModal = (event: Event) => {
        const item = (event as CustomEvent).detail as InventoryItem;
        setCurrentItem(item);
        const wholesalerName = wholesalers.find(w => w.id === item.preferredWholesalerId)?.name || '';
        const itemNumberToDisplay = item.preferredManufacturerItemNumber || (Array.isArray(item.manufacturerItemNumbers) && item.manufacturerItemNumbers.length > 0 && item.manufacturerItemNumbers[0] ? item.manufacturerItemNumbers[0].number : '') || '';

        setLabelText({ 
            name: item.name, 
            itemNumber: itemNumberToDisplay, 
            location: `${item.mainLocation} / ${item.subLocation}`,
            wholesaler: wholesalerName
        });
        setFontSize(70);
        setBarcodeSource('preferred');
        setLabelSize({ width: 60, height: 30 });
        setIsQrCodeOpen(true);
    };
     const handleOpenArrangeReorderModal = (event: Event) => {
        const item = (event as CustomEvent).detail as InventoryItem;
        setCurrentItem(item);
        const stockInfo = item.stocks?.find(s => s.locationId === activeLocationId) || { quantity: 0 };
        const minStockInfo = item.minStocks?.find(ms => ms.locationId === activeLocationId) || { quantity: 0 };
        const neededQuantity = Math.max(0, minStockInfo.quantity - stockInfo.quantity);
        setReorderQuantity(neededQuantity > 0 ? neededQuantity : 1);
        setIsArrangeReorderOpen(true);
    };
     const handleOpenTransferModal = (event: Event) => {
        const item = (event as CustomEvent).detail as InventoryItem;
        setCurrentItem(item);
        const stockInfo = item.stocks.find(s => s.locationId === activeLocationId);
        setTransferData({
            from: activeLocationId,
            to: locations.find(l => l.id !== activeLocationId)?.id || '',
            quantity: 1,
            maxQuantity: stockInfo?.quantity || 0,
        });
        setIsTransferModalOpen(true);
    };
    
    window.addEventListener('openStockModal', handleOpenStock);
    window.addEventListener('openFormModal', handleOpenFormModal);
    window.addEventListener('openDeleteModal', handleOpenDeleteModal);
    window.addEventListener('openQrModal', handleOpenQrModal);
    window.addEventListener('openArrangeReorderModal', handleOpenArrangeReorderModal);
    window.addEventListener('openTransferModal', handleOpenTransferModal);


    return () => {
        window.removeEventListener('openStockModal', handleOpenStock);
        window.removeEventListener('openFormModal', handleOpenFormModal);
        window.removeEventListener('openDeleteModal', handleOpenDeleteModal);
        window.removeEventListener('openQrModal', handleOpenQrModal);
        window.removeEventListener('openArrangeReorderModal', handleOpenArrangeReorderModal);
        window.removeEventListener('openTransferModal', handleOpenTransferModal);
    };
}, [activeLocationId, locations, wholesalers, items]);

  React.useEffect(() => {
    if (qrScannedId) {
      const item = items.find(i => i.id === qrScannedId);
      if (item) {
        const event = new CustomEvent('openStockModal', { detail: { item, quantity: 1 } });
        window.dispatchEvent(event);
        router.replace('/inventory-list');
      } else {
        toast({ title: 'Fehler', description: 'Gescannter Artikel nicht gefunden.', variant: 'destructive' });
        router.replace('/inventory-list');
      }
    }
  }, [qrScannedId, items, router, toast]);

    React.useEffect(() => {
        if (!currentItem || currentItem.itemType === 'machine') return;

        let newBarcodeValue: string | null = null;
        if (barcodeSource === 'preferred') {
            const supplier = currentItem.suppliers.find(s => s.wholesalerId === currentItem.preferredWholesalerId);
            newBarcodeValue = supplier?.wholesalerItemNumber || null;
        } else if (barcodeSource === 'ean') {
            newBarcodeValue = currentItem.barcode || null;
        } else if (barcodeSource === 'manufacturer') {
            newBarcodeValue = currentItem.preferredManufacturerItemNumber || currentItem.manufacturerItemNumbers?.[0]?.number || null;
        } else { // It's a wholesaler ID
            const supplier = currentItem.suppliers.find(s => s.wholesalerId === barcodeSource);
            newBarcodeValue = supplier?.wholesalerItemNumber || null;
        }
        setBarcodeToRender(newBarcodeValue);
    }, [currentItem, barcodeSource]);

  const sortedItems = React.useMemo(() => {
    const sortableItems = [...items.filter((item): item is InventoryItem => item.itemType === 'item')];

    if (itemSortConfig.current) {
      sortableItems.sort((a, b) => {
        if (!itemSortConfig.current) return 0;
        const { key, direction } = itemSortConfig.current;
        const dir = direction === 'ascending' ? 1 : -1;
        
        switch(key) {
            case 'name':
                return a.name.localeCompare(b.name) * dir;
            case 'subLocation':
                return (a.subLocation || '').localeCompare(b.subLocation || '') * dir;
            case 'stocks':
                const stockA = a.stocks.find(s => s.locationId === activeLocationId)?.quantity ?? 0;
                const stockB = b.stocks.find(s => s.locationId === activeLocationId)?.quantity ?? 0;
                return (stockA - stockB) * dir;
            default:
                return 0;
        }
      });
    }
    return sortableItems;
  }, [items, activeLocationId, _]); // _ is the forceRender state
  
  const filteredItems = React.useMemo(() => {
    if (!sortedItems) return [];
    return sortedItems.filter(item => {
      if (!item.stocks) return false;
      const isInLocation = item.stocks.some(s => s.locationId === activeLocationId);
      if (!isInLocation) {
          return false;
      }

      const term = searchTerm.toLowerCase();
      const matchesSearch = item.name.toLowerCase().includes(term) || (Array.isArray(item.manufacturerItemNumbers) && item.manufacturerItemNumbers.some(n => n.number.toLowerCase().includes(term))) || (item.barcode && item.barcode.toLowerCase().includes(term)) || (item.mainLocation && item.mainLocation.toLowerCase().includes(term)) || (item.subLocation && item.subLocation.toLowerCase().includes(term));
      
      const stockInfo = item.stocks?.find(s => s.locationId === activeLocationId);
      const minStockInfo = item.minStocks?.find(ms => ms.locationId === activeLocationId);
      const reorderStatus = item.reorderStatus?.[activeLocationId];

      const currentStock = stockInfo?.quantity ?? 0;
      const minStock = minStockInfo?.quantity ?? 0;

      let matchesTab = true;
      if (activeTab === 'lowStock') {
        matchesTab = currentStock < minStock && !reorderStatus?.status;
      }
      if (activeTab === 'outOfStock') {
        matchesTab = currentStock === 0;
      }
      if (activeTab === 'reordered') {
          matchesTab = reorderStatus?.status === 'ordered';
      }
      if (activeTab === 'arranged') {
          matchesTab = reorderStatus?.status === 'arranged';
      }
      return matchesSearch && matchesTab;
    });
  }, [sortedItems, searchTerm, activeLocationId, activeTab]);
  
  const requestItemSort = (key: SortKey) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (itemSortConfig.current && itemSortConfig.current.key === key && itemSortConfig.current.direction === 'ascending') {
        direction = 'descending';
    }
    itemSortConfig.current = { key, direction };
    setForceRender(c => c + 1); // Force re-render
  };
  
  const requestGroupSort = (key: SortKey) => {
      let direction: 'ascending' | 'descending' = 'ascending';
      if (groupSortConfig.current && groupSortConfig.current.key === key && groupSortConfig.current.direction === 'ascending') {
        direction = 'descending';
      }
      groupSortConfig.current = { key, direction };
      setForceRender(c => c + 1); // Force re-render
  };


  const handleOpenForm = (item: InventoryItem | null, mainLocation?: string) => {
    const event = new CustomEvent('openFormModal', { detail: { item, mainLocation } });
    window.dispatchEvent(event);
};
  
  const handleDownloadQrCode = React.useCallback(async () => {
    if (qrCodeRef.current === null || !currentItem || !currentUser) {
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
      link.download = `etikett-${currentItem.name.replace(/\s+/g, '-').toLowerCase()}.png`;
      link.href = dataUrl;
      link.click();
      
      const newLogEntry: ChangeLogEntry = {
        id: `${new Date().toISOString()}-${Math.random()}`,
        date: new Date().toISOString(),
        userId: currentUser.id,
        userName: currentUser.name,
        type: 'label-printed',
        details: 'Etikett gedruckt',
      };
      updateItem(currentItem.id, { 
        labelLastPrintedAt: new Date().toISOString(), 
        changelog: [...(currentItem.changelog || []), newLogEntry]
      });
      toast({ title: 'Etikett heruntergeladen', description: 'Das neue Etikett wurde gespeichert.' });
    } catch (err) {
      console.error(err);
      toast({
        title: 'Fehler beim Erstellen des Bildes',
        description: 'Das Etikett konnte nicht als Bild gespeichert werden. Versuchen Sie es erneut.',
        variant: 'destructive',
      });
    }
  }, [currentItem, toast, updateItem, currentUser]);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setOriginalImageFile(file);
            setLinkedImageUrl(null);
            setImageZoom(1);
            resizeImage(file, 512, 512, 1).then(dataUrl => {
                if (isAiMode) {
                    setAiImage(dataUrl);
                } else {
                    setItemImage(dataUrl);
                }
            });
        }
    };
    
    const handleZoomChange = (value: number[]) => {
      const newZoom = value[0] ?? 1;
      setImageZoom(newZoom);
      if (originalImageFile) {
        resizeImage(originalImageFile, 512, 512, newZoom).then(dataUrl => {
          setItemImage(dataUrl);
        });
      }
    };

    const handleAiPaste = async () => {
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

            for (const item of clipboardItems) {
                const imageType = item.types.find(type => type.startsWith('image/'));
                if (imageType) {
                    const blob = await item.getType(imageType);
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        const dataUrl = reader.result as string;
                         setAiImage(dataUrl);
                        toast({ title: 'Bild eingefügt' });
                    };
                    reader.readAsDataURL(blob);
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
            for (const item of clipboardItems) {
                const imageType = item.types.find(type => type.startsWith('image/'));
                if (imageType) {
                    const blob = await item.getType(imageType);
                     setOriginalImageFile(blob);
                     setLinkedImageUrl(null);
                     setImageZoom(1);
                     resizeImage(blob, 512, 512, 1).then(dataUrl => {
                       setItemImage(dataUrl);
                       toast({ title: 'Bild eingefügt', description: 'Das Bild aus der Zwischenablage wurde übernommen.' });
                     });
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


React.useEffect(() => {
    if (aiResult) {
        setDefaultItemName(aiResult.name);

        const numbers = aiResult.manufacturerItemNumbers;
        
        if (Array.isArray(numbers) && numbers.length > 0) {
            // Deduplicate numbers before setting them
            const uniqueNumbers: ManufacturerItemNumber[] = [];
            const seen = new Set<string>();
            for (const num of numbers) {
                if (!seen.has(num.number)) {
                    uniqueNumbers.push(num);
                    seen.add(num.number);
                }
            }
            setManufacturerNumbers(uniqueNumbers);
            setPreferredManufacturerNumber(uniqueNumbers[0]?.number || null);
        } else {
             setManufacturerNumbers([{ number: '', manufacturer: '' }]);
             setPreferredManufacturerNumber(null);
        }
        
        setDefaultBarcode(aiResult.barcode || '');

        const wholesaler = wholesalers.find(w => w.name.toLowerCase() === aiResult.wholesalerName.toLowerCase());
      
        if (wholesaler) {
            setSuppliers([{ wholesalerId: wholesaler.id, wholesalerItemNumber: aiResult.wholesalerItemNumber, url: '' }]);
            setPreferredWholesaler(wholesaler.id);
        } else {
            setSuppliers([{ wholesalerId: '', wholesalerItemNumber: aiResult.wholesalerItemNumber, url: '' }]);
            setPreferredWholesaler(null);
            if (aiResult.wholesalerName && aiResult.wholesalerName !== 'Unbekannt') {
                toast({ title: 'Großhändler nicht erkannt', description: `Der Großhändler "${aiResult.wholesalerName}" wurde nicht in Ihrer Liste gefunden. Bitte weisen Sie ihn manuell zu.` });
            }
        }
        setIsAiMode(false);
    }
}, [aiResult, wholesalers, toast]);


  const handleSaveItem = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!currentUser) {
        toast({ title: 'Fehler', description: 'Bitte wählen Sie zuerst einen Benutzer aus.', variant: 'destructive' });
        return;
    }
    
    const uniqueManufacturerNumbers: ManufacturerItemNumber[] = [];
    const seenNumbers = new Set<string>();
    let duplicatesFound = false;

    for (const num of manufacturerNumbers) {
        if (num.number && !seenNumbers.has(num.number)) {
            uniqueManufacturerNumbers.push(num);
            seenNumbers.add(num.number);
        } else if (num.number && seenNumbers.has(num.number)) {
            duplicatesFound = true;
        } else if (!num.number && num.manufacturer) {
             uniqueManufacturerNumbers.push(num);
        }
    }

    if (duplicatesFound) {
        toast({
            title: 'Hinweis',
            description: 'Doppelte Herstellernummern wurden automatisch entfernt.',
        });
    }

    const formData = new FormData(e.currentTarget);
    const minStock = Number(formData.get('minStock') as string);
    const stock = !currentItem ? Number(formData.get('stock') as string) : 0;


    if (currentItem) {
       const updatedItemData: Partial<InventoryItem> = {
          name: formData.get('name') as string,
          manufacturerItemNumbers: uniqueManufacturerNumbers,
          preferredManufacturerItemNumber: preferredManufacturerNumber,
          barcode: itemBarcode,
          mainLocation,
          subLocation,
          suppliers,
          preferredWholesalerId: preferredWholesaler,
          imageUrl: itemImage,
          linkedImageUrl,
          itemType: 'item',
        };
        
       const wasChanged =
        currentItem.name !== updatedItemData.name ||
        JSON.stringify(currentItem.manufacturerItemNumbers) !== JSON.stringify(updatedItemData.manufacturerItemNumbers) ||
        (currentItem.itemType === 'item' && currentItem.preferredManufacturerItemNumber !== updatedItemData.preferredManufacturerItemNumber) ||
        (currentItem.itemType === 'item' && currentItem.barcode !== updatedItemData.barcode) ||
        currentItem.mainLocation !== updatedItemData.mainLocation ||
        currentItem.subLocation !== updatedItemData.subLocation ||
        (currentItem.itemType === 'item' && currentItem.preferredWholesalerId !== updatedItemData.preferredWholesalerId) ||
        (currentItem.itemType === 'item' && JSON.stringify(currentItem.suppliers) !== JSON.stringify(updatedItemData.suppliers));

      const newLogEntry: ChangeLogEntry | null = wasChanged ? {
        id: `${new Date().toISOString()}-${Math.random()}`,
        date: new Date().toISOString(),
        userId: currentUser.id,
        userName: currentUser.name,
        type: 'update',
        details: `Artikeldaten geändert`,
      } : null;

      const updatedChangelog = newLogEntry ? [...(currentItem.changelog || []), newLogEntry] : currentItem.changelog;

      const existingMinStockIndex = currentItem.minStocks.findIndex(ms => ms.locationId === activeLocationId);
      const updatedMinStocks = [...currentItem.minStocks];
      if (existingMinStockIndex > -1) {
          updatedMinStocks[existingMinStockIndex] = { locationId: activeLocationId, quantity: minStock };
      } else {
          updatedMinStocks.push({ locationId: activeLocationId, quantity: minStock });
      }

      const updatedItem = { ...currentItem, ...updatedItemData, changelog: updatedChangelog, minStocks: updatedMinStocks };
      updateItem(currentItem.id, updatedItem as Partial<InventoryItem | Machine>);

      toast({ title: 'Artikel aktualisiert', description: `${updatedItem.name} wurde erfolgreich gespeichert.` });
      
      if (wasChanged && currentItem.itemType === 'item' && currentItem.labelLastPrintedAt) {
          setItemJustSaved(updatedItem as InventoryItem);
          setIsPostSaveLabelOpen(true);
      }
    } else {
      // Check for duplicates before creating a new item
      for (const num of uniqueManufacturerNumbers) {
        if (num.number) {
            const existingItem = items.find(item => 
                item.itemType === 'item' &&
                // Check if item exists in the current location and has the same manufacturer number
                item.stocks.some(s => s.locationId === activeLocationId) &&
                Array.isArray(item.manufacturerItemNumbers) && 
                item.manufacturerItemNumbers.some(existingNum => existingNum.number === num.number)
            );
            if (existingItem) {
                setDuplicateItem(existingItem as InventoryItem);
                setIsDuplicateDialogOpen(true);
                return; // Stop the save process
            }
        }
      }

      const now = new Date();
      const newLogEntry: ChangeLogEntry = {
        id: `${now.toISOString()}-${Math.random()}`,
        date: now.toISOString(),
        userId: currentUser.id,
        userName: currentUser.name,
        type: 'initial',
        quantity: stock,
        newStock: stock,
        locationId: activeLocationId,
      };

      const newItem: InventoryItem = {
        id: `${now.toISOString()}-${Math.random()}`,
        name: formData.get('name') as string,
        manufacturerItemNumbers: uniqueManufacturerNumbers,
        preferredManufacturerItemNumber: preferredManufacturerNumber,
        barcode: itemBarcode,
        mainLocation: mainLocation,
        subLocation: subLocation,
        stocks: [{locationId: activeLocationId, quantity: stock}],
        minStocks: [{locationId: activeLocationId, quantity: minStock}],
        changelog: [newLogEntry],
        suppliers: suppliers,
        preferredWholesalerId: preferredWholesaler,
        lastInventoriedAt: {[activeLocationId]: now.toISOString()},
        imageUrl: itemImage,
        linkedImageUrl: linkedImageUrl,
        itemType: 'item',
        reorderStatus: {},
      };
      addItem(newItem);
      toast({ title: 'Artikel erstellt', description: `${newItem.name} wurde erfolgreich hinzugefügt.` });
    }
    setIsFormOpen(false);
    setCurrentItem(null);
    setItemImage(null);
    setLinkedImageUrl(null);
    setOriginalImageFile(null);
    setImageZoom(1);
  };
  
  const handleBulkImport = () => {
    if (!currentUser || !activeLocationId) {
      toast({ title: 'Fehler', description: 'Bitte wählen Sie zuerst einen Benutzer und einen Lagerort aus.', variant: 'destructive' });
      return;
    }

    try {
      const importedCount = bulkImportItems(bulkImportData, activeLocationId);
      toast({
        title: 'Import erfolgreich',
        description: `${importedCount} Artikel wurden erfolgreich importiert.`,
      });
      setIsBulkImportOpen(false);
      setBulkImportData('');
    } catch (error) {
      if (error instanceof Error) {
        toast({
          title: 'Import-Fehler',
          description: error.message,
          variant: 'destructive',
        });
      }
    }
  };

  const handleDeleteItem = () => {
    if (itemToDelete) {
      if(itemToDelete.dependentItems > 0) {
          toast({ title: 'Fehler', description: `Dieses Bild wird von ${itemToDelete.dependentItems} anderen Artikeln verwendet und kann nicht gelöscht werden.`, variant: 'destructive' });
          setIsDeleteConfirmOpen(false);
          setItemToDelete(null);
          return;
      }
      removeItemFromLocation(itemToDelete.item.id, itemToDelete.locationId);
      const locationName = locations.find(l => l.id === itemToDelete.locationId)?.name || 'dem Lagerort';
      toast({ title: 'Artikel entfernt', description: `${itemToDelete.item.name} wurde aus ${locationName} entfernt.`, variant: 'destructive' });
    }
    setIsDeleteConfirmOpen(false);
    setItemToDelete(null);
  };

  const handleStockChangeSubmit = (type: 'in' | 'out') => {
    if (currentItem && currentItem.itemType === 'item') {
        handleQuickStockChange(currentItem.id, stockChange.locationId, type, stockChange.quantity);
    }
    setIsStockOpen(false);
    setCurrentItem(null);
  };

  
  const handleArrangeReorder = () => {
    if (!currentUser || !currentItem || currentItem.itemType === 'machine') {
        toast({ title: 'Fehler', description: 'Benutzer oder Artikel nicht gefunden.', variant: 'destructive' });
        return;
    }
    if (reorderQuantity <= 0) {
        toast({ title: 'Fehler', description: 'Bestellmenge muss größer als 0 sein.', variant: 'destructive' });
        return;
    }

    const now = new Date().toISOString();
    const newReorderStatus = {
        status: 'arranged' as const,
        arrangedAt: now,
        orderedAt: null,
        quantity: reorderQuantity,
    };
    
    const newLogEntry: ChangeLogEntry = {
        id: `${now}-${Math.random()}`,
        date: now,
        userId: currentUser.id,
        userName: currentUser.name,
        type: 'reorder-arranged',
        details: `Nachbestellung für ${reorderQuantity}x ${currentItem.name} angeordnet.`,
        locationId: activeLocationId,
    };

    const updatedReorderStatus = {...currentItem.reorderStatus};
    updatedReorderStatus[activeLocationId] = newReorderStatus;

    updateItem(currentItem.id, { 
        reorderStatus: updatedReorderStatus, 
        changelog: [...(currentItem.changelog || []), newLogEntry] 
    });
    toast({ title: 'Nachbestellung angeordnet', description: `${reorderQuantity}x ${currentItem.name} zur Bestellung vorgemerkt.` });

    setIsArrangeReorderOpen(false);
    setCurrentItem(null);
    setReorderQuantity(1);
  };

  const handleConfirmTransfer = () => {
    if (!currentItem || !currentUser) return;
    
    if (transferData.quantity <= 0) {
        toast({ title: 'Fehler', description: 'Menge muss größer als 0 sein.', variant: 'destructive' });
        return;
    }
    if (transferData.quantity > transferData.maxQuantity) {
        toast({ title: 'Fehler', description: `Die Menge übersteigt den verfügbaren Bestand von ${transferData.maxQuantity}.`, variant: 'destructive' });
        return;
    }
    if (transferData.from === transferData.to) {
        toast({ title: 'Fehler', description: 'Quell- und Ziel-Lagerort dürfen nicht identisch sein.', variant: 'destructive' });
        return;
    }

    transferStock(currentItem.id, transferData.from, transferData.to, transferData.quantity);
    
    toast({
        title: 'Artikel umgelagert',
        description: `${transferData.quantity}x ${currentItem.name} wurde von "${locations.find(l => l.id === transferData.from)?.name}" nach "${locations.find(l => l.id === transferData.to)?.name}" verschoben.`
    });
    
    setIsTransferModalOpen(false);
    setCurrentItem(null);
  }

  const handleAddSupplier = () => {
    setSuppliers([...suppliers, { wholesalerId: '', wholesalerItemNumber: '', url: '' }]);
  };

  const handleRemoveSupplier = (index: number) => {
    const newSuppliers = [...suppliers];
    newSuppliers.splice(index, 1);
    setSuppliers(newSuppliers);
  };

  const handleSupplierChange = (index: number, field: keyof ItemSupplier, value: string) => {
    const newSuppliers = [...suppliers];
    const supplier = newSuppliers[index];
    if (supplier) {
        (supplier[field] as any) = value;
        setSuppliers(newSuppliers);
    }
  };

  const handleItemImport = (itemId: string) => {
    if (!currentUser) {
        toast({ title: 'Fehler', description: 'Bitte wählen Sie zuerst einen Benutzer aus.', variant: 'destructive' });
        return;
    }
    addItemToLocation(itemId, activeLocationId);
    toast({ title: 'Artikel hinzugefügt', description: `Der Artikel wurde zum Lagerort '${activeLocation?.name}' hinzugefügt.` });
    setItemImportPopoverOpen(false);
  };

  const openImportScanner = async () => {
    setItemImportPopoverOpen(false); // Close popover
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        setHasCameraPermission(true);
        stream.getTracks().forEach(track => track.stop()); // Stop stream immediately, we just need permission
        setIsImportScannerOpen(true);
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
  
const captureCode = React.useCallback(async (callback: (data: string) => void, type: 'qr' | 'barcode' | 'any') => {
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

                    if ((type === 'barcode' || type === 'any') && 'BarcodeDetector' in window) {
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

                    if (!codeFound && (type === 'qr' || type === 'any')) {
                        const code = jsqr(imageData.data, imageData.width, image.height, {
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
}, []);

const handleImportScan = (scannedId: string) => {
    const item = items.find(i => i.id === scannedId);
    if (item) {
        handleItemImport(item.id);
        toast({ title: 'Artikel importiert!', description: `${item.name} wurde hinzugefügt.` });
    } else {
        toast({ title: 'Fehler', description: 'Gescannter Artikel nicht gefunden.', variant: 'destructive' });
    }
}

const handleBarcodeScan = (scannedBarcode: string) => {
    setItemBarcode(scannedBarcode);
    setIsBarcodeScannerOpen(false);
    toast({ title: 'Code gescannt!', description: 'Der Code wurde in das Formular übernommen.' });
}

  const handleSmartScan = React.useCallback((scannedData: string) => {
    if (scannedData.startsWith('compartment::')) {
        const [, mainLoc, subLoc] = scannedData.split('::');
        const itemsInCompartment = items.filter((i): i is InventoryItem => 
            i.itemType === 'item' &&
            i.mainLocation === mainLoc && 
            i.subLocation === subLoc &&
            (activeLocationId === 'all' || i.stocks.some(s => s.locationId === activeLocationId))
        );
        if (itemsInCompartment.length > 1) {
            setCompartmentItems(itemsInCompartment);
            setIsCompartmentSelectOpen(true);
        } else if (itemsInCompartment.length === 1 && itemsInCompartment[0]) {
            const event = new CustomEvent('openStockModal', { detail: { item: itemsInCompartment[0], quantity: 1, type: 'out' } });
            window.dispatchEvent(event);
        } else {
            toast({ title: 'Fehler', description: 'Keine Artikel in diesem Lagerfach gefunden.', variant: 'destructive' });
        }
    } else {
        let item: InventoryItem | undefined;
        if (smartScannerType === 'qr') {
            item = items.find((i): i is InventoryItem => i.itemType === 'item' && i.id === scannedData);
        } else { // barcode
            item = items.find((i): i is InventoryItem => i.itemType === 'item' && i.barcode === scannedData);
        }

        if (item) {
            const event = new CustomEvent('openStockModal', { detail: { item, quantity: 1, type: 'out' } });
            window.dispatchEvent(event);
            toast({ title: 'Artikel gefunden!', description: `Bestandsbuchung für ${item.name} geöffnet.` });
        } else {
            toast({
                title: 'Artikel nicht gefunden',
                description: 'Der gescannte Code konnte keinem Artikel zugeordnet werden.',
                variant: 'destructive',
            });
        }
    }
    setIsSmartScannerOpen(false);
  }, [items, activeLocationId, smartScannerType, toast]);


React.useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (isImportScannerOpen && hasCameraPermission) {
        intervalId = setInterval(() => captureCode(handleImportScan, scannerType), 500);
    } else if (isBarcodeScannerOpen && hasCameraPermission) {
        intervalId = setInterval(() => captureCode(handleBarcodeScan, scannerType), 500);
    } else if (isSmartScannerOpen && hasCameraPermission) {
        intervalId = setInterval(() => captureCode(handleSmartScan, smartScannerType), 500);
    }
    return () => clearInterval(intervalId);
}, [captureCode, isImportScannerOpen, isBarcodeScannerOpen, hasCameraPermission, handleImportScan, handleBarcodeScan, isSmartScannerOpen, scannerType, smartScannerType, handleSmartScan]);


const openBarcodeScanner = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        setHasCameraPermission(true);
        stream.getTracks().forEach(track => track.stop());
        setIsBarcodeScannerOpen(true);
    } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        toast({
            variant: 'destructive',
            title: 'Kamerazugriff verweigert',
            description: 'Bitte erlauben Sie den Kamerazugriff.',
        });
    }
};

const openSmartScanner = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setHasCameraPermission(true);
      stream.getTracks().forEach(track => track.stop());
      setIsSmartScannerOpen(true);
    } catch (error) {
      console.error('Error accessing camera: ', error);
      setHasCameraPermission(false);
      toast({
        variant: 'destructive',
        title: 'Kamerazugriff verweigert',
        description: 'Bitte aktivieren Sie den Kamerazugriff in Ihren Browsereinstellungen, um den Scanner zu nutzen.',
      });
    }
  };

  const groupedItems = React.useMemo(() => {
    return filteredItems.reduce((acc, item) => {
        const groupKey = item.mainLocation || 'Unsortiert';
        if (!acc[groupKey]) {
            acc[groupKey] = [];
        }
        acc[groupKey].push(item);
        return acc;
    }, {} as Record<string, InventoryItem[]>);
  }, [filteredItems]);
  
  const sortedGroupKeys = React.useMemo(() => {
    const keys = Object.keys(groupedItems);
    if (groupSortConfig.current !== null) {
        keys.sort((a, b) => {
            const { direction } = groupSortConfig.current!;
             const dir = direction === 'ascending' ? 1 : -1;
            return a.localeCompare(b) * dir;
        });
    }
    return keys;
  }, [groupedItems, _]);


  const labelWidthPx = mmToPx(labelSize.width);
  const labelHeightPx = mmToPx(labelSize.height);

  if (!items || !locations) {
    return <div>Loading...</div>
  }

  const activeLocation = locations.find(l => l.id === activeLocationId);

  const importableItems = React.useMemo(() => {
    if (!items || !filteredItems) return [];
    const itemsInCurrentLocation = new Set(filteredItems.map(item => item.id));
    return items.filter((item): item is InventoryItem => item.itemType === 'item' && !itemsInCurrentLocation.has(item.id));
  }, [items, filteredItems]);
  
  const groupedImportableItems = React.useMemo(() => {
    const grouped: { [locationName: string]: { [subLocation: string]: InventoryItem[] } } = {};

    importableItems.forEach(item => {
        item.stocks.forEach(stock => {
            // only show items from other locations
            if (stock.locationId === activeLocationId) return;

            const location = locations.find(l => l.id === stock.locationId);
            if (!location) return;

            if (!grouped[location.name]) {
                grouped[location.name] = {};
            }
            
            const mainLoc = item.mainLocation || 'Unsortiert';
            if (!grouped[location.name][mainLoc]) {
                grouped[location.name][mainLoc] = [];
            }
            grouped[location.name][mainLoc].push(item);
        });
    });
    return grouped;
}, [importableItems, locations, activeLocationId]);

const bulkImportExample = `Kupferrohr 15mm,KR15,1234567890123,Regal A,Fach 1,50,10
Pressfitting Bogen 90,PFB90,2345678901234,Regal A,Fach 2,150,50
Waschtischarmatur Classic,WTA-C,,Regal B,Fach 1,25,5`;

  const handlePostSavePrint = () => {
    if (itemJustSaved) {
        const event = new CustomEvent('openQrModal', { detail: itemJustSaved });
        window.dispatchEvent(event);
    }
    setIsPostSaveLabelOpen(false);
    setItemJustSaved(null);
  };
  
  const handlePostSaveDismiss = () => {
    if (itemJustSaved && currentUser) {
        updateItem(itemJustSaved.id, { labelLastPrintedAt: new Date().toISOString() });
        toast({ title: 'Erinnerung quittiert', description: 'Die Erinnerung zum Etikettendruck wurde für diese Änderung entfernt.' });
    }
    setIsPostSaveLabelOpen(false);
    setItemJustSaved(null);
  };
  
  const handleQuickSwitchToggle = (value: 'warehouse' | 'favorite') => {
      if (value === 'favorite' && currentUser?.favoriteLocationId) {
          setActiveLocationId(currentUser.favoriteLocationId);
      } else if (value === 'warehouse' && mainWarehouse) {
          setActiveLocationId(mainWarehouse.id);
      }
  };

  const handleTogglePin = (location: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newPinned = new Set(pinnedLocations);
    if (newPinned.has(location)) {
      newPinned.delete(location);
    } else {
      newPinned.add(location);
    }
    setPinnedLocations(newPinned);
  };

  const handleAccordionChange = (value: string | string[]) => {
      const newOpenValues = Array.isArray(value) ? value : [value];
      const clickedItem = newOpenValues.find(v => !openAccordion.includes(v)) || openAccordion.find(v => !newOpenValues.includes(v));

      if (!clickedItem) {
          setOpenAccordion(newOpenValues);
          return;
      }
      
      const isPinned = pinnedLocations.has(clickedItem);
      
      if (isPinned) {
          const newOpen = new Set(openAccordion);
          if (newOpen.has(clickedItem)) {
              newOpen.delete(clickedItem);
          } else {
              newOpen.add(clickedItem);
          }
          setOpenAccordion(Array.from(newOpen));
      } else {
          const currentlyOpenNonPinned = openAccordion.filter(item => !pinnedLocations.has(item));
          
          if (currentlyOpenNonPinned.includes(clickedItem)) {
              setOpenAccordion(openAccordion.filter(item => item !== clickedItem));
          } else {
              const pinnedAndThisItem = [...Array.from(pinnedLocations), clickedItem];
              setOpenAccordion(pinnedAndThisItem);
          }
      }
  };
  
    const handleAiAnalyze = async () => {
        if (!appSettings?.ai?.provider || !appSettings?.ai?.model || !appSettings?.ai?.apiKey) {
            toast({
                title: 'KI-Einstellungen unvollständig',
                description: 'Bitte konfigurieren Sie den KI-Anbieter, das Modell und den API-Schlüssel in den Einstellungen.',
                variant: 'destructive',
            });
            return;
        }

        if (!aiUrl && !aiImage) {
            toast({
                title: 'Eingabe fehlt',
                description: 'Bitte geben Sie eine URL an oder laden Sie ein Bild hoch.',
                variant: 'destructive',
                });
            return;
        }

        setIsAnalyzing(true);
        setAiResult(null);

        toast({
            title: 'Starte KI-Analyse...',
            description: `Verwende Modell: ${appSettings.ai.model}`,
        });

        try {
            const result = await analyzeItem({
                url: aiUrl || undefined,
                photoDataUri: aiImage || undefined,
                provider: appSettings.ai.provider,
                model: appSettings.ai.model,
                apiKey: appSettings.ai.apiKey,
            });
            
            setAiResult(result);
            toast({ title: 'Analyse erfolgreich', description: 'Die Felder wurden vorausgefüllt. Bitte überprüfen Sie die Daten.' });

        } catch (error: any) {
             if (error.message === 'IMAGE_NOT_SUPPORTED') {
                toast({
                    title: 'Bild-Upload nicht unterstützt',
                    description: 'Das ausgewählte OpenRouter-Modell unterstützt keine Bilder. Bitte wählen Sie ein anderes Modell.',
                    variant: 'destructive',
                    });
            } else {
                console.error('AI analysis failed:', error);
                toast({
                    title: 'Analyse fehlgeschlagen',
                    description: 'Die KI konnte die Informationen nicht extrahieren. Versuchen Sie es erneut oder geben Sie die Daten manuell ein.',
                    variant: 'destructive',
                });
            }
        } finally {
            setIsAnalyzing(false);
        }
    };
    
    const handleImageSelection = (selectedItem: InventoryItem) => {
      if (selectedItem.imageUrl) {
        setLinkedImageUrl(selectedItem.imageUrl);
        setItemImage(null);
        setOriginalImageFile(null);
        setImageZoom(1);
      }
      setIsImageReuseOpen(false);
    };


    React.useEffect(() => {
        if (itemBarcode) {
            setDefaultBarcode(itemBarcode);
        }
    }, [itemBarcode]);
  
  const [imageFilterLocationId, setImageFilterLocationId] = React.useState('all');
  const [imageFilterMainLocation, setImageFilterMainLocation] = React.useState('all');
  const [imageFilterSearchTerm, setImageFilterSearchTerm] = React.useState('');
    
  const filteredImageItems = React.useMemo(() => {
    return items.filter((item): item is InventoryItem => {
      const hasImage = !!item.imageUrl;
      if (!hasImage) return false;

      const matchesLocation = imageFilterLocationId === 'all' || item.stocks.some(s => s.locationId === imageFilterLocationId);
      if (!matchesLocation) return false;

      const matchesMainLocation = imageFilterMainLocation === 'all' || item.mainLocation === imageFilterMainLocation;
      if (!matchesMainLocation) return false;
      
      const term = imageFilterSearchTerm.toLowerCase();
      if (term && !item.name.toLowerCase().includes(term) && !(Array.isArray(item.manufacturerItemNumbers) && item.manufacturerItemNumbers.some(n => n.number.toLowerCase().includes(term)))) {
        return false;
      }
      
      return true;
    });
  }, [items, imageFilterLocationId, imageFilterMainLocation, imageFilterSearchTerm]);
  
  const imageReuseMainLocations = React.useMemo(() => {
    const filteredByLocation = items.filter(item => imageFilterLocationId === 'all' || item.stocks.some(s => s.locationId === imageFilterLocationId));
    const mainLocs = new Set(filteredByLocation.map(i => i.mainLocation).filter(Boolean));
    return Array.from(mainLocs).sort();
  }, [items, imageFilterLocationId]);

  React.useEffect(() => {
    if (isSearchOpen) {
      searchInputRef.current?.focus();
    }
  }, [isSearchOpen]);
  
  const getSortIcon = (key: SortKey) => {
    if (itemSortConfig.current?.key !== key) return null;
    if (itemSortConfig.current.direction === 'ascending') return <ArrowUp className="h-4 w-4" />;
    return <ArrowDown className="h-4 w-4" />;
  };

  const getGroupSortIcon = (key: SortKey) => {
    if (groupSortConfig.current?.key !== key) return null;
    if (groupSortConfig.current.direction === 'ascending') return <ArrowUp className="h-4 w-4" />;
    return <ArrowDown className="h-4 w-4" />;
  };
  
    const handleManufacturerNumberChange = (index: number, field: keyof ManufacturerItemNumber, value: string) => {
        const newNumbers = [...manufacturerNumbers];
        const num = newNumbers[index];
        if (num) {
            (num[field] as any) = value;
            setManufacturerNumbers(newNumbers);
        }
    };
    
    const addManufacturerNumber = () => {
        setManufacturerNumbers([...manufacturerNumbers, { number: '', manufacturer: '' }]);
    };

    const removeManufacturerNumber = (index: number) => {
        if (manufacturerNumbers.length > 1) {
            const newNumbers = manufacturerNumbers.filter((_, i) => i !== index);
            setManufacturerNumbers(newNumbers);
        }
    };

    const handleDuplicateItem = () => {
        if(duplicateItem) {
            handleOpenForm(duplicateItem);
        }
        setIsDuplicateDialogOpen(false);
        setDuplicateItem(null);
    }


  return (
    <div className="flex flex-col gap-4">
       <Input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden"/>
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold md:text-2xl">Lagerbestand</h1>
         <div className="md:hidden">
            {currentUser?.favoriteLocationId && mainWarehouse && (
                <RadioGroup
                    value={activeLocationId === currentUser.favoriteLocationId ? 'favorite' : 'warehouse'}
                    onValueChange={(value) => handleQuickSwitchToggle(value as 'warehouse' | 'favorite')}
                    className="relative flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground"
                >
                    <div className={cn(
                        "absolute left-1 top-1 h-7 w-[calc(50%-4px)] rounded-md bg-background shadow-sm transition-transform duration-200 ease-in-out",
                        activeLocationId === currentUser.favoriteLocationId ? "translate-x-full" : "translate-x-0"
                    )}></div>
                    <Label
                        htmlFor="warehouse-switch-mobile"
                        className="relative z-10 flex cursor-pointer items-center justify-center px-3 py-1.5 text-sm font-medium"
                    >
                        <RadioGroupItem value="warehouse" id="warehouse-switch-mobile" className="sr-only" />
                        <Warehouse className={cn("w-4 h-4", activeLocationId === mainWarehouse?.id && "text-primary")} />
                        <span className="sr-only sm:not-sr-only">Lager</span>
                    </Label>
                    <Label
                        htmlFor="favorite-switch-mobile"
                        className="relative z-10 flex cursor-pointer items-center justify-center px-3 py-1.5 text-sm font-medium"
                    >
                        <RadioGroupItem value="favorite" id="favorite-switch-mobile" className="sr-only" />
                        <Star className={cn("w-4 h-4", activeLocationId === currentUser?.favoriteLocationId && "text-primary")} />
                        <span className="sr-only sm:not-sr-only">Favorit</span>
                    </Label>
                </RadioGroup>
            )}
         </div>
        <div className="ml-auto flex items-center gap-2">
            <Button size="icon" variant="default" className="h-8 w-8 sm:hidden" onClick={openSmartScanner}>
                <ScanLine className="h-4 w-4" />
                <span className="sr-only">Scannen</span>
            </Button>
            <Button size="sm" variant="default" className="h-8 gap-1 hidden sm:flex" onClick={openSmartScanner}>
                <ScanLine className="h-4 w-4" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Scannen</span>
            </Button>
            
          <Popover open={itemImportPopoverOpen} onOpenChange={setItemImportPopoverOpen}>
              <PopoverTrigger asChild>
                  <Button size="icon" variant="outline" className="h-8 w-8 sm:hidden">
                      <PackagePlus className="h-4 w-4" />
                      <span className="sr-only">Artikel importieren</span>
                  </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[350px] p-0">
                  <Command>
                      <CommandInput placeholder="Artikel suchen..." onValueChange={setSearchTerm} />
                      <div className="p-2 border-b">
                         <Button variant="outline" className="w-full" onClick={openImportScanner}>
                            <Camera className="mr-2 h-4 w-4" /> QR-Code scannen
                        </Button>
                      </div>
                      <CommandList>
                          <CommandEmpty>Keine Artikel gefunden.</CommandEmpty>
                          {Object.entries(groupedImportableItems).map(([locationName, mainLocations]) => (
                            <CommandGroup key={locationName} heading={locationName}>
                              {Object.entries(mainLocations).map(([mainLocation, subItems]) => (
                                <Collapsible key={mainLocation} className="w-full">
                                  <CollapsibleTrigger className="w-full text-left px-2 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-accent/50 rounded-sm">
                                    {mainLocation}
                                  </CollapsibleTrigger>
                                  <CollapsibleContent>
                                    {subItems.map(item => (
                                      <CommandItem
                                        key={item.id}
                                        value={`${item.name} ${Array.isArray(item.manufacturerItemNumbers) ? item.manufacturerItemNumbers.map(n => n.number).join(' ') : ''}`}
                                        onSelect={() => handleItemImport(item.id)}
                                        className="pl-4"
                                      >
                                        {item.name}
                                      </CommandItem>
                                    ))}
                                  </CollapsibleContent>
                                </Collapsible>
                              ))}
                            </CommandGroup>
                          ))}
                      </CommandList>
                  </Command>
              </PopoverContent>
          </Popover>
          <Button size="sm" variant="outline" className="h-8 gap-1 hidden sm:flex" onClick={() => setItemImportPopoverOpen(true)}>
            <PackagePlus className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Artikel importieren</span>
          </Button>

          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button size="icon" className="h-8 w-8 sm:hidden">
                    <PlusCircle className="h-4 w-4" />
                    <span className="sr-only">Hinzufügen</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => handleOpenForm(null)}>
                <Pencil className="mr-2 h-4 w-4" />
                Neuen Artikel anlegen
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setIsBulkImportOpen(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Massen-Import (CSV)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="h-8 gap-1 hidden sm:flex">
                <PlusCircle className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Hinzufügen</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => handleOpenForm(null)}>
                <Pencil className="mr-2 h-4 w-4" />
                Neuen Artikel anlegen
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setIsBulkImportOpen(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Massen-Import (CSV)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <Collapsible className="w-full md:hidden">
          <CollapsibleTrigger asChild>
            <div className="flex justify-center p-2 bg-muted/50 border-b">
              <Button variant="ghost" className="w-full">
                <Settings2 className="h-4 w-4 mr-2" />
                Filter & Ansicht
              </Button>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
             <div className="flex flex-col gap-4 p-4 bg-muted/50 border-b">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Suchen..."
                    className="pl-8 w-full"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={activeLocationId} onValueChange={setActiveLocationId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Lagerort wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map(loc => (
                      <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                 <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full justify-center gap-1">
                      <ArrowUpDown className="h-3.5 w-3.5" />
                      Sortieren & Ansicht
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-[calc(100vw-2rem)]">
                    <DropdownMenuLabel>Gruppen sortieren</DropdownMenuLabel>
                    <DropdownMenuItem onSelect={() => requestGroupSort('mainLocation')}>
                        <span className="flex-1">Lagerplatz</span>
                        {getGroupSortIcon('mainLocation')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Artikel sortieren</DropdownMenuLabel>
                    <DropdownMenuItem onSelect={() => requestItemSort('name')}>
                        <span className="flex-1">Bezeichnung</span>
                        {getSortIcon('name')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => requestItemSort('subLocation')}>
                        <span className="flex-1">Fach</span>
                        {getSortIcon('subLocation')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => requestItemSort('stocks')}>
                        <span className="flex-1">Bestand</span>
                        {getSortIcon('stocks')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                     <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="focus:bg-transparent">
                        <div className="flex items-center justify-between w-full">
                            <Label htmlFor="compact-view-mobile">Kompaktansicht</Label>
                            <Switch id="compact-view-mobile" checked={isCompactView} onCheckedChange={handleCompactViewChange} />
                        </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
            </div>
          </CollapsibleContent>
        </Collapsible>
        <div className="flex-col sm:flex-row sm:items-center gap-4 hidden md:flex">
            {currentUser?.favoriteLocationId && mainWarehouse && (
            <RadioGroup
                value={activeLocationId === currentUser.favoriteLocationId ? 'favorite' : 'warehouse'}
                onValueChange={(value) => handleQuickSwitchToggle(value as 'warehouse' | 'favorite')}
                className="relative flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground"
            >
                <div className={cn(
                    "absolute left-1 top-1 h-7 w-[calc(50%-4px)] rounded-md bg-background shadow-sm transition-transform duration-200 ease-in-out",
                    activeLocationId === currentUser.favoriteLocationId ? "translate-x-full" : "translate-x-0"
                )}></div>
                <Label
                    htmlFor="warehouse-switch"
                    className="relative z-10 flex cursor-pointer items-center justify-center px-3 py-1.5 text-sm font-medium"
                >
                    <RadioGroupItem value="warehouse" id="warehouse-switch" className="sr-only" />
                    <Warehouse className={cn("w-4 h-4 sm:mr-2", activeLocationId === mainWarehouse?.id && "text-primary")} />
                    <span className="hidden sm:inline">Lager</span>
                </Label>
                <Label
                    htmlFor="favorite-switch"
                    className="relative z-10 flex cursor-pointer items-center justify-center px-3 py-1.5 text-sm font-medium"
                >
                    <RadioGroupItem value="favorite" id="favorite-switch" className="sr-only" />
                    <Star className={cn("w-4 h-4 sm:mr-2", activeLocationId === currentUser?.favoriteLocationId && "text-primary")} />
                    <span className="hidden sm:inline">Favorit</span>
                </Label>
            </RadioGroup>
          )}
          <TabsList>
            <TabsTrigger value="all">Alle</TabsTrigger>
            <TabsTrigger value="lowStock">Mind.</TabsTrigger>
            <TabsTrigger value="arranged">Vorschläge</TabsTrigger>
            <TabsTrigger value="reordered">Bestellt</TabsTrigger>
            <TabsTrigger value="outOfStock">Leer</TabsTrigger>
          </TabsList>
          <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
             <Select value={activeLocationId} onValueChange={setActiveLocationId}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Lagerort wählen" />
              </SelectTrigger>
              <SelectContent>
                {locations.map(loc => (
                  <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Popover open={isSearchOpen} onOpenChange={setIsSearchOpen}>
                <PopoverTrigger asChild>
                    <Button variant="outline" size="icon" className="h-10 w-10">
                        <Search className="h-4 w-4 text-muted-foreground" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-2">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            ref={searchInputRef}
                            type="search"
                            placeholder="Suchen..."
                            className="pl-8"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </PopoverContent>
            </Popover>
             <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-10 sm:h-8 gap-1">
                  <ArrowUpDown className="h-3.5 w-3.5" />
                  <span className="sr-only sm:not-sr-only">Sortieren & Ansicht</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Gruppen sortieren</DropdownMenuLabel>
                <DropdownMenuItem onSelect={() => requestGroupSort('mainLocation')}>
                    <span className="flex-1">Lagerplatz</span>
                    {getGroupSortIcon('mainLocation')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Artikel sortieren</DropdownMenuLabel>
                <DropdownMenuItem onSelect={() => requestItemSort('name')}>
                    <span className="flex-1">Bezeichnung</span>
                    {getSortIcon('name')}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => requestItemSort('subLocation')}>
                    <span className="flex-1">Fach</span>
                    {getSortIcon('subLocation')}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => requestItemSort('stocks')}>
                    <span className="flex-1">Bestand</span>
                    {getSortIcon('stocks')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="focus:bg-transparent">
                    <div className="flex items-center justify-between w-full">
                        <Label htmlFor="compact-view">Kompaktansicht</Label>
                        <Switch id="compact-view" checked={isCompactView} onCheckedChange={handleCompactViewChange} />
                    </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
         <TabsList className="md:hidden flex-wrap h-auto self-start mt-2 w-full justify-start">
            <TabsTrigger value="all">Alle</TabsTrigger>
            <TabsTrigger value="lowStock">Mind.</TabsTrigger>
            <TabsTrigger value="arranged">Vorschläge</TabsTrigger>
            <TabsTrigger value="reordered">Bestellt</TabsTrigger>
            <TabsTrigger value="outOfStock">Leer</TabsTrigger>
        </TabsList>
        <TabsContent value={activeTab}>
            <div className="space-y-4 mt-4">
              {Object.keys(groupedItems).length > 0 ? (
                 <Accordion 
                    type="multiple" 
                    className="w-full space-y-4"
                    value={openAccordion}
                    onValueChange={handleAccordionChange}
                >
                    {sortedGroupKeys.map((mainLoc) => {
                        const itemsInLoc = groupedItems[mainLoc];
                        if (!itemsInLoc) return null;
                        const isPinned = pinnedLocations.has(mainLoc);
                        return (
                             <AccordionItem value={mainLoc} key={mainLoc} className="bg-card shadow-sm rounded-lg border-b-0">
                               <div className="flex items-center justify-between px-4 py-2 rounded-t-lg border-b data-[state=open]:border-b-0">
                                    <AccordionTrigger className="hover:no-underline flex-1 py-0">
                                        <div className="flex items-center">
                                            <h2 className="text-lg font-semibold">{mainLoc}</h2>
                                        </div>
                                    </AccordionTrigger>
                                    <div className="flex items-center gap-2">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={(e) => { e.stopPropagation(); handleOpenForm(null, mainLoc); }}>
                                            <PlusCircle className="h-5 w-5" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => handleTogglePin(mainLoc, e)}>
                                            {isPinned ? <Pin className="h-5 w-5 text-primary" /> : <PinOff className="h-5 w-5 text-muted-foreground" />}
                                        </Button>
                                    </div>
                                </div>
                                <AccordionContent className="p-2 rounded-b-lg">
                                    <div className="space-y-2">
                                        {itemsInLoc.map(item => (
                                            <ItemCard 
                                                key={item.id} 
                                                item={item} 
                                                activeLocationId={activeLocationId} 
                                                isCompactView={isCompactView} 
                                            />
                                        ))}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        )
                    })}
                </Accordion>
              ) : (
                 <div className="text-center text-muted-foreground col-span-full h-48 flex items-center justify-center">
                    Keine Artikel für diesen Lagerort gefunden.
                 </div>
              )}
            </div>
        </TabsContent>
      </Tabs>
      
      <Dialog open={isStockOpen} onOpenChange={setIsStockOpen}>
        <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Bestand buchen für: {currentItem?.name}</DialogTitle>
            <DialogDescription>
              Aktueller Bestand in {locations.find(l => l.id === stockChange.locationId)?.name}: {currentItem?.itemType === 'item' ? currentItem?.stocks?.find(s => s.locationId === stockChange.locationId)?.quantity ?? 0 : '-'}. Aktueller Benutzer: {currentUser?.name || 'Kein Benutzer gewählt'}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
             <div className="space-y-2">
              <Label htmlFor="location">Lagerort</Label>
               <Select value={stockChange.locationId} onValueChange={(value) => setStockChange(s => ({...s, locationId: value}))}>
                <SelectTrigger id="location">
                  <SelectValue placeholder="Lagerort wählen" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map(loc => (
                    <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity" className="text-center block">Menge</Label>
              <div className="flex items-center justify-center gap-4">
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="h-12 w-12 rounded-full"
                    onClick={() => setStockChange(s => ({...s, quantity: Math.max(1, s.quantity - 1)}))}
                  >
                      <Minus className="h-6 w-6" />
                  </Button>
                  <Input
                    id="quantity"
                    type="number"
                    className="w-24 h-24 text-center text-4xl font-bold"
                    value={stockChange.quantity}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setStockChange(s => ({...s, quantity: isNaN(val) || val < 1 ? 1 : val}));
                    }}
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="h-12 w-12 rounded-full"
                    onClick={() => setStockChange(s => ({...s, quantity: s.quantity + 1}))}
                  >
                      <Plus className="h-6 w-6" />
                  </Button>
              </div>
            </div>
          </div>
          <DialogFooter className="sm:justify-between">
            <Button variant="ghost" onClick={() => {
                if(currentItem) openDetailView(currentItem)
                setIsStockOpen(false)
            }}>
                <Info className="mr-2 h-4 w-4" />
                Details
            </Button>
            <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsStockOpen(false)}>Abbrechen</Button>
                <Button
                  onClick={() => handleStockChangeSubmit('out')}
                  variant="destructive"
                  disabled={stockChange.quantity <= 0 || !currentUser}
                >
                  <PackageMinus className="mr-2 h-4 w-4" /> Abgang
                </Button>
                <Button
                  onClick={() => handleStockChangeSubmit('in')}
                  className="bg-green-600 hover:bg-green-700"
                  disabled={stockChange.quantity <= 0 || !currentUser}
                >
                  <PackagePlus className="mr-2 h-4 w-4" /> Zugang
                </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
       <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Sind Sie sicher?</DialogTitle>
            <DialogDescription>
              Möchten Sie den Artikel &quot;{itemToDelete?.item.name}&quot; wirklich aus dem Lagerort &quot;{locations.find(l => l.id === itemToDelete?.locationId)?.name}&quot; entfernen? Diese Aktion kann nicht rückgängig gemacht werden. Der Artikel bleibt in anderen Lagerorten erhalten.
              {itemToDelete && itemToDelete.dependentItems > 0 && (
                <div className="mt-4 p-3 bg-destructive/10 border-l-4 border-destructive text-destructive-foreground">
                    <p className="font-bold">Warnung: Verknüpfte Bilder</p>
                    <p>Das Bild dieses Artikels wird von {itemToDelete.dependentItems} anderen Artikeln verwendet. Das Löschen dieses Artikels wird diese Verknüpfungen aufbrechen.</p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsDeleteConfirmOpen(false)}>Abbrechen</Button>
            <Button variant="destructive" onClick={handleDeleteItem}>Aus diesem Lagerort löschen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isQrCodeOpen} onOpenChange={setIsQrCodeOpen}>
        <DialogContent onOpenAutoFocus={(e) => e.preventDefault()} className="max-w-4xl">
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
                    <div className="space-y-2">
                        <Label htmlFor="barcode-source">Barcode-Quelle</Label>
                        <Select value={barcodeSource} onValueChange={setBarcodeSource}>
                            <SelectTrigger id="barcode-source">
                                <SelectValue placeholder="Quelle für Barcode wählen" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="preferred">Bevorzugter Großhändler</SelectItem>
                                <SelectItem value="ean">Artikel-EAN</SelectItem>
                                <SelectItem value="manufacturer">Hersteller-Artikelnummer</SelectItem>
                                {currentItem?.itemType === 'item' && currentItem?.suppliers && currentItem?.suppliers.length > 0 && <DropdownMenuSeparator />}
                                {currentItem?.itemType === 'item' && currentItem?.suppliers.map(s => {
                                    const w = wholesalers.find(w => w.id === s.wholesalerId);
                                    if (!w || w.id === currentItem.preferredWholesalerId) return null;
                                    return <SelectItem key={w.id} value={w.id}>GH: {w.name}</SelectItem>
                                })}
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <Label htmlFor="label-name">Text: Name</Label>
                        <Input 
                            id="label-name"
                            value={labelText.name} 
                            onChange={(e) => setLabelText(prev => ({ ...prev, name: e.target.value }))} 
                        />
                    </div>
                     <div>
                        <Label htmlFor="label-item-number">Text: Artikel-Nr.</Label>
                        <Input 
                            id="label-item-number"
                            value={labelText.itemNumber} 
                            onChange={(e) => setLabelText(prev => ({ ...prev, itemNumber: e.target.value }))} 
                        />
                    </div>
                    <div>
                        <Label htmlFor="label-location">Text: Lagerort</Label>
                        <Input 
                            id="label-location"
                            value={labelText.location} 
                            onChange={(e) => setLabelText(prev => ({ ...prev, location: e.target.value }))} 
                        />
                    </div>
                    <div>
                        <Label htmlFor="label-wholesaler">Text: Großhändler</Label>
                        <Input 
                            id="label-wholesaler"
                            value={labelText.wholesaler} 
                            onChange={(e) => setLabelText(prev => ({ ...prev, wholesaler: e.target.value }))} 
                        />
                    </div>
                </div>
            </div>
            <div className="flex items-center justify-center bg-gray-100 dark:bg-gray-800 p-4 rounded-md min-h-[200px]">
                 <div id="label-to-download" ref={qrCodeRef}>
                    {currentItem && (
                        <div 
                            className="p-1 bg-white border flex items-stretch justify-center gap-1"
                            style={{ 
                                fontFamily: "'PT Sans', sans-serif",
                                width: `${labelWidthPx}px`,
                                height: `${labelHeightPx}px`,
                                boxSizing: 'border-box'
                            }}
                        >
                           <div className="flex-1 h-full flex flex-col justify-between items-center overflow-hidden p-1">
                                <div className="w-full text-center">
                                    <p 
                                        className="text-black font-bold" 
                                        style={{ 
                                            fontSize: `${Math.max(8, (labelHeightPx * 0.18) * (fontSize / 100))}px`,
                                            lineHeight: 1.1,
                                            wordBreak: 'break-word',
                                        }}
                                    >
                                        {labelText.name}
                                    </p>
                                    <p 
                                        className="text-gray-600"
                                         style={{ 
                                            fontSize: `${Math.max(7, (labelHeightPx * 0.13) * (fontSize / 100))}px`,
                                            lineHeight: 1,
                                            wordBreak: 'break-word',
                                        }}
                                    >
                                        {labelText.itemNumber}
                                    </p>
                                </div>
                                <div className="w-full text-center text-gray-500" style={{ 
                                        fontSize: `${Math.max(7, (labelHeightPx * 0.11) * (fontSize / 100))}px`,
                                        lineHeight: 1,
                                        wordBreak: 'break-word',
                                    }}>
                                    <p>{labelText.location}</p>
                                    <p>{labelText.wholesaler}</p>
                                </div>
                                <div className="w-full flex justify-center items-end">
                                    {barcodeToRender && <Barcode 
                                        value={barcodeToRender}
                                        width={1}
                                        height={labelHeightPx * 0.25}
                                        fontSize={Math.min(labelHeightPx * 0.1, 10)}
                                        margin={2}
                                        displayValue={false}
                                    />}
                                </div>
                           </div>
                           <div className="h-full flex items-center justify-center p-1" style={{ width: `${Math.min(labelHeightPx - 4, 80)}px` }}>
                             <QRCode
                                value={currentItem.id}
                                size={Math.min(labelHeightPx - 4, 80)}
                                style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                                viewBox={`0 0 ${Math.min(labelHeightPx-4, 80)} ${Math.min(labelHeightPx-4, 80)}`}
                             />
                           </div>
                        </div>
                    )}
                  </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsQrCodeOpen(false)}>Schließen</Button>
            <Button onClick={handleDownloadQrCode}>Herunterladen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
       {/* Arrange Reorder Modal */}
      <Dialog open={isArrangeReorderOpen} onOpenChange={setIsArrangeReorderOpen}>
        <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Nachbestellung anordnen für: {currentItem?.name}</DialogTitle>
            <DialogDescription>
              Geben Sie die gewünschte Bestellmenge für den Lagerort &quot;{activeLocation?.name}&quot; an.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="reorder-quantity" className="text-right">Bestellmenge</Label>
              <Input
                id="reorder-quantity"
                type="number"
                value={reorderQuantity}
                onChange={(e) => setReorderQuantity(Number(e.target.value))}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <div className="col-start-2 col-span-3">
                    <Button type="button" variant="link" className="p-0 h-auto" onClick={() => {
                        if (currentItem && currentItem.itemType === 'item') {
                            const stockInfo = currentItem.stocks?.find(s => s.locationId === activeLocationId) || { quantity: 0 };
                            const minStockInfo = currentItem.minStocks?.find(ms => ms.locationId === activeLocationId) || { quantity: 0 };
                            const needed = Math.max(0, minStockInfo.quantity - stockInfo.quantity);
                            setReorderQuantity(needed > 0 ? needed : 1);
                        }
                    }}>
                        Auf Mindestbestand auffüllen
                    </Button>
                </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsArrangeReorderOpen(false)}>Abbrechen</Button>
            <Button onClick={handleArrangeReorder}>Anordnen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        {/* Item Detail View Modal */}
        <Dialog open={isDetailViewOpen} onOpenChange={setIsDetailViewOpen}>
            <DialogContent onOpenAutoFocus={(e) => e.preventDefault()} className="max-w-4xl h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{itemInDetail?.name}</DialogTitle>
                    {itemInDetail?.itemType === 'item' && <DialogDescription>Hersteller-Art.Nr: {itemInDetail.preferredManufacturerItemNumber || itemInDetail.manufacturerItemNumbers?.[0]?.number}</DialogDescription>}
                </DialogHeader>
                <Tabs defaultValue={detailViewTab} className="flex-grow flex flex-col">
                    <TabsList>
                        <TabsTrigger value="overview">Übersicht</TabsTrigger>
                        <TabsTrigger value="history">Verlauf</TabsTrigger>
                    </TabsList>
                    <TabsContent value="overview" className="flex-grow">
                        <ScrollArea className="h-full">
                            {itemInDetail?.itemType === 'item' ? (
                                // Render InventoryItem details
                                <div className="grid md:grid-cols-3 gap-6 py-4">
                                   {/* Content from inventory-list page */}
                                </div>
                            ) : itemInDetail?.itemType === 'machine' ? (
                                // Render Machine details
                                 <div className="grid md:grid-cols-2 gap-6 py-4">
                                     <Card>
                                        <CardHeader><CardTitle>Stammdaten</CardTitle></CardHeader>
                                        <CardContent className="text-sm space-y-3">
                                             <div className="flex justify-between"><span className="text-muted-foreground">Hersteller</span><span className="font-medium">{itemInDetail.manufacturer || '-'}</span></div>
                                             <div className="flex justify-between"><span className="text-muted-foreground">Modell</span><span className="font-medium">{itemInDetail.model || '-'}</span></div>
                                             <div className="flex justify-between"><span className="text-muted-foreground">Baujahr</span><span className="font-medium">{itemInDetail.yearOfConstruction || '-'}</span></div>
                                             <Separator/>
                                             <div className="flex justify-between"><span className="text-muted-foreground">Letzte Reparatur</span><span className="font-medium">{itemInDetail.lastRepair ? format(new Date(itemInDetail.lastRepair), 'dd.MM.yyyy') : '-'}</span></div>
                                             <div className="flex justify-between"><span className="text-muted-foreground">Nächste Prüfung</span><span className="font-medium">{itemInDetail.nextInspection ? format(new Date(itemInDetail.nextInspection), 'dd.MM.yyyy') : '-'}</span></div>
                                        </CardContent>
                                    </Card>
                                     <Card>
                                        <CardHeader><CardTitle>Status & Reservierungen</CardTitle></CardHeader>
                                        <CardContent className="text-sm space-y-3">
                                            {/* Status and Reservation details */}
                                        </CardContent>
                                    </Card>
                                </div>
                            ) : null}
                        </ScrollArea>
                    </TabsContent>
                    <TabsContent value="history" className="flex-grow">
                        <ScrollArea className="h-full">
                             <Table>
                                <TableHeader><TableRow><TableHead>Datum</TableHead><TableHead>Benutzer</TableHead><TableHead>Aktion</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {(itemInDetail?.changelog || (itemInDetail && 'rentalHistory' in itemInDetail ? itemInDetail.rentalHistory : []) || []).slice().reverse().map((log: any) => (
                                        <TableRow key={log.id}>
                                            <TableCell className="text-xs whitespace-nowrap">{format(new Date(log.date), 'dd.MM.yy HH:mm')}</TableCell>
                                            <TableCell>{log.userName}</TableCell>
                                            <TableCell>{log.details || getChangeLogActionText(log as ChangeLogEntry)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    </TabsContent>
                </Tabs>
                <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="secondary">Schließen</Button></DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        
        {/* Import Scanner Dialog */}
        <Dialog open={isImportScannerOpen} onOpenChange={setIsImportScannerOpen}>
            <DialogContent>
                 <DialogHeader>
                    <DialogTitle>Artikel per Code importieren</DialogTitle>
                    <DialogDescription>
                    Richten Sie die Kamera auf einen Code, um ihn zum Lagerort &apos;{activeLocation?.name}&apos; hinzuzufügen.
                    </DialogDescription>
                </DialogHeader>
                 <div className="flex items-center space-x-2 my-4 justify-center">
                    <Label htmlFor="import-scanner-type-switch">QR-Code</Label>
                    <Switch
                        id="import-scanner-type-switch"
                        checked={scannerType === 'barcode'}
                        onCheckedChange={(checked) => setScannerType(checked ? 'barcode' : 'qr')}
                    />
                    <Label htmlFor="import-scanner-type-switch">Barcode (EAN)</Label>
                </div>
                 <div className="relative aspect-video w-full max-w-md mx-auto overflow-hidden rounded-lg border">
                    {hasCameraPermission === true && (
                        <Webcam
                        audio={false}
                        ref={webcamRef}
                        screenshotFormat="image/jpeg"
                        videoConstraints={{ facingMode: 'environment' }}
                        className="w-full h-full object-cover"
                        />
                    )}
                    {hasCameraPermission === false && (
                         <div className="w-full h-full bg-muted flex flex-col items-center justify-center p-4">
                           <Alert variant="destructive">
                                <AlertTitle>Kamerazugriff erforderlich</AlertTitle>
                                <AlertDescription>
                                    Bitte erlauben Sie den Zugriff auf die Kamera, um diese Funktion zu nutzen.
                                </AlertDescription>
                            </Alert>
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
                <DialogFooter>
                    <Button variant="secondary" onClick={() => setIsImportScannerOpen(false)}>Schließen</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
         {/* Barcode Scanner Dialog */}
        <Dialog open={isBarcodeScannerOpen} onOpenChange={setIsBarcodeScannerOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Code scannen</DialogTitle>
                     <DialogDescription>
                        Richten Sie die Kamera auf den Barcode oder QR-Code des Artikels.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex items-center space-x-2 my-4 justify-center">
                    <Label htmlFor="form-scanner-type-switch">QR-Code</Label>
                    <Switch
                        id="form-scanner-type-switch"
                        checked={scannerType === 'barcode'}
                        onCheckedChange={(checked) => setScannerType(checked ? 'barcode' : 'qr')}
                    />
                    <Label htmlFor="form-scanner-type-switch">Barcode (EAN)</Label>
                </div>
                <div className="relative aspect-video w-full max-w-md mx-auto overflow-hidden rounded-lg border">
                    {hasCameraPermission === true ? (
                        <Webcam
                            audio={false}
                            ref={webcamRef}
                            screenshotFormat="image/jpeg"
                            videoConstraints={{ facingMode: 'environment' }}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full bg-muted flex flex-col items-center justify-center p-4">
                            <Alert variant="destructive">
                                <AlertTitle>Kamerazugriff erforderlich</AlertTitle>
                                <AlertDescription>
                                    Bitte erlauben Sie den Zugriff auf die Kamera, um diese Funktion zu nutzen.
                                </AlertDescription>
                            </Alert>
                        </div>
                    )}
                    {hasCameraPermission !== false && (
                         <>
                            <div className="absolute inset-0 border-[20px] border-black/20 rounded-lg"></div>
                            <div className={cn(
                                "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4/5 border-2 border-dashed border-destructive opacity-75",
                                scannerType === 'qr' ? 'h-2/3' : 'h-1/4'
                            )}></div>
                         </>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="secondary" onClick={() => setIsBarcodeScannerOpen(false)}>Abbrechen</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* Smart Scanner Dialog */}
      <Dialog open={isSmartScannerOpen} onOpenChange={setIsSmartScannerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Artikel scannen</DialogTitle>
            <DialogDescription>
              Richten Sie die Kamera auf einen Artikel-QR-Code oder einen EAN-Barcode.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2 my-4 justify-center">
                <Label htmlFor="smart-scanner-type-switch">QR-Code</Label>
                <Switch
                    id="smart-scanner-type-switch"
                    checked={smartScannerType === 'barcode'}
                    onCheckedChange={(checked) => setSmartScannerType(checked ? 'barcode' : 'qr')}
                />
                <Label htmlFor="smart-scanner-type-switch">Barcode (EAN)</Label>
            </div>
          <div className="relative aspect-video w-full max-w-md mx-auto overflow-hidden rounded-lg border mt-4">
            {hasCameraPermission === true ? (
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                videoConstraints={{ facingMode: 'environment' }}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-muted flex flex-col items-center justify-center p-4">
                <Alert variant="destructive">
                  <AlertTitle>Kamerazugriff erforderlich</AlertTitle>
                  <AlertDescription>
                    Bitte erlauben Sie den Zugriff auf die Kamera, um diese Funktion zu nutzen.
                  </AlertDescription>
                </Alert>
              </div>
            )}
            {hasCameraPermission !== false && (
              <>
                <div className="absolute inset-0 border-[20px] border-black/20 rounded-lg"></div>
                 <div className={cn(
                    "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2/3 border-2 border-dashed border-destructive opacity-75",
                    smartScannerType === 'qr' ? 'h-2/3' : 'h-1/3'
                )}></div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsSmartScannerOpen(false)}>Abbrechen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent onOpenAutoFocus={(e) => e.preventDefault()} className="max-w-4xl">
          <form onSubmit={handleSaveItem}>
            <DialogHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <DialogTitle>{currentItem ? 'Artikel bearbeiten' : 'Neuen Artikel anlegen'}</DialogTitle>
                        <DialogDescription>
                            {isAiMode 
                                ? 'Artikelinformationen mit KI-Unterstützung aus einem Link oder Bild extrahieren.'
                                : (currentItem ? `Bearbeiten Sie die Details für ${currentItem.name}.` : 'Füllen Sie die Details für den neuen Artikel aus.')
                            }
                        </DialogDescription>
                    </div>
                    {!currentItem && (
                        <Button type="button" variant="ghost" size="icon" onClick={() => setIsAiMode(!isAiMode)}>
                            <Sparkles className={cn("h-5 w-5", isAiMode && "text-primary")} />
                        </Button>
                    )}
                </div>
            </DialogHeader>

            {isAiMode ? (
                <div className="py-4 space-y-6">
                    {isAnalyzing ? (
                        <div className="flex flex-col items-center justify-center gap-4 h-48">
                            <Loader2 className="h-12 w-12 animate-spin text-primary" />
                            <p className="text-muted-foreground">Analysiere Daten...</p>
                        </div>
                    ) : (
                    <>
                        <div className="text-center space-y-2">
                            <p className="font-semibold">Wie möchten Sie den Artikel anlegen?</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Button type="button" variant={aiInputType === 'url' ? 'default' : 'outline'} className="h-20" onClick={() => setAiInputType('url')}>
                                <LinkIcon className="mr-2 h-5 w-5"/> Link
                            </Button>
                            <Button type="button" variant={aiInputType === 'image' ? 'default' : 'outline'} className="h-20" onClick={() => setAiInputType('image')}>
                                <ImagePlus className="mr-2 h-5 w-5"/> Bild
                            </Button>
                        </div>

                        {aiInputType === 'url' && (
                            <div className="space-y-2">
                                <Label htmlFor="ai-url">Produkt-URL des Großhändlers</Label>
                                <Input id="ai-url" placeholder="https://www.gc-gruppe.de/..." value={aiUrl} onChange={e => setAiUrl(e.target.value)} />
                            </div>
                        )}

                        {aiInputType === 'image' && (
                           <div className="space-y-2">
                                <Label>Produktbild</Label>
                                <Card className="flex items-center justify-center h-32 border-dashed">
                                    {aiImage ? (
                                        <div className="relative w-28 h-28">
                                            <Image src={aiImage} alt="Vorschau" fill className="object-cover"/>
                                            <Button type="button" variant="destructive" size="icon" className="absolute -top-2 -right-2 z-10 h-6 w-6" onClick={(e) => {e.stopPropagation(); setAiImage(null);}}>
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="text-center text-muted-foreground space-y-2">
                                            <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}><ImagePlus className="mr-2 h-4 w-4"/>Bild auswählen</Button>
                                            <Button type="button" variant="outline" size="sm" onClick={handleAiPaste}><ClipboardPaste className="mr-2 h-4 w-4"/>Einfügen</Button>
                                        </div>
                                    )}
                                </Card>
                            </div>
                        )}

                        {(aiInputType === 'url' || aiInputType === 'image') && (
                            <Button type="button" className="w-full" onClick={handleAiAnalyze} disabled={(!aiUrl && !aiImage) || isAnalyzing}>
                                <Sparkles className="mr-2 h-4 w-4" /> Analysieren & Felder ausfüllen
                            </Button>
                        )}
                    </>
                    )}
                </div>
            ) : (
              <div className="py-4">
                <ScrollArea className="h-[65vh] pr-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">
                    {/* Stammdaten Section */}
                    <div className="md:col-span-1 space-y-2">
                        <Label>Bild</Label>
                        <div className="relative group w-full aspect-square border border-dashed rounded-md flex items-center justify-center text-muted-foreground">
                            {itemImage || linkedImageUrl ? (
                                <>
                                    <Image src={itemImage || linkedImageUrl || ''} alt="Vorschau" fill className="rounded-md object-cover" />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-md">
                                    <Button type="button" variant="destructive" size="icon" className="h-8 w-8" onClick={() => { setItemImage(null); setLinkedImageUrl(null); setOriginalImageFile(null); }}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                    </div>
                                </>
                            ) : (
                                <div className="flex flex-col items-center justify-center gap-2">
                                    <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}><ImagePlus className="mr-2 h-4 w-4"/>Hochladen</Button>
                                    <div className="flex gap-1">
                                    <Button type="button" variant="ghost" size="sm" className="text-xs" onClick={handlePaste}><ClipboardPaste className="mr-1 h-3 w-3"/>Einfügen</Button>
                                    <Button type="button" variant="ghost" size="sm" className="text-xs" onClick={() => setIsImageReuseOpen(true)}><Link2 className="mr-1 h-3 w-3"/>Verknüpfen</Button>
                                    </div>
                                </div>
                            )}
                        </div>
                        {originalImageFile && (
                            <div className="space-y-2 pt-2">
                                <Label htmlFor="image-zoom">Zoom</Label>
                                <Slider id="image-zoom" min={1} max={3} step={0.1} value={[imageZoom]} onValueChange={handleZoomChange} />
                            </div>
                        )}
                    </div>
                    <div className="md:col-span-2 space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Bezeichnung</Label>
                            <Input id="name" name="name" defaultValue={defaultItemName} required/>
                        </div>
                        <div className="space-y-2">
                            <Label>Hersteller-Artikelnummer(n)</Label>
                            <div className="space-y-2">
                            {manufacturerNumbers.map((num, index) => (
                                <div key={index} className="flex items-center gap-2">
                                <Input
                                    value={num.number}
                                    onChange={(e) => handleManufacturerNumberChange(index, 'number', e.target.value)}
                                    placeholder={`Nummer ${index + 1}`}
                                    className="flex-1"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => setPreferredManufacturerNumber(num.number)}
                                >
                                    <CheckCircle2 className={cn("h-6 w-6 text-muted-foreground/50 transition-colors", preferredManufacturerNumber === num.number && "text-primary fill-green-100")} />
                                </Button>
                                {manufacturerNumbers.length > 1 && (
                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeManufacturerNumber(index)}>
                                    <Trash2 className="h-4 w-4 text-destructive"/>
                                    </Button>
                                )}
                                </div>
                            ))}
                            </div>
                            <Button type="button" variant="outline" size="sm" onClick={addManufacturerNumber}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Weitere Nummer
                            </Button>
                            </div>
                        <div className="space-y-2">
                            <Label htmlFor="barcode">Barcode (EAN)</Label>
                            <div className="flex items-center gap-2">
                            <Input id="barcode" name="barcode" value={itemBarcode || defaultBarcode} onChange={(e) => setItemBarcode(e.target.value)} />
                            <Button type="button" variant="outline" size="icon" onClick={openBarcodeScanner}><Camera className="h-4 w-4"/></Button>
                            </div>
                        </div>
                    </div>
                    
                    <div className="md:col-span-3"><Separator/></div>

                    <div className="md:col-span-2 grid grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h4 className="text-sm font-medium text-muted-foreground">Lagerplatz</h4>
                        <div className="space-y-2">
                          <Label htmlFor="mainLocation">Haupt-Lagerplatz</Label>
                          <div className="flex items-center gap-2">
                            <Popover open={mainLocationPopoverOpen} onOpenChange={setMainLocationPopoverOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" role="combobox" className="w-[200px] justify-between">
                                        {mainLocation || "Lagerplatz wählen..."}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[200px] p-0">
                                    <Command>
                                        <CommandInput placeholder="Lagerplatz suchen..." onValueChange={setMainLocation} value={mainLocation} />
                                        <CommandEmpty><Button variant="ghost" className="w-full" onClick={() => setMainLocationPopoverOpen(false)}>&quot;{mainLocation}&quot; anlegen</Button></CommandEmpty>
                                        <CommandGroup>
                                            {mainLocations.map((loc) => (<CommandItem key={loc} value={loc} onSelect={(currentValue) => { setMainLocation(currentValue === mainLocation ? "" : currentValue); setMainLocationPopoverOpen(false); }}>{loc}</CommandItem>))}
                                        </CommandGroup>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                            <Input id="mainLocationInput" name="mainLocation" value={mainLocation} onChange={(e) => setMainLocation(e.target.value)} className="flex-1" placeholder="z.B. Regal A"/>
                        </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="subLocation">Fach / Detailort</Label>
                          <div className="flex items-center gap-2">
                            <Input id="subLocation" name="subLocation" value={subLocation} onChange={e => setSubLocation(e.target.value)} placeholder="z.B. Fach 3"/>
                            <Button type="button" variant="ghost" size="icon" onClick={suggestNextSubLocation}><Sparkles className="h-4 w-4" /><span className="sr-only">Nächstes Fach vorschlagen</span></Button>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <h4 className="text-sm font-medium text-muted-foreground">Lagerbestand ({activeLocation?.name})</h4>
                        <div className="grid grid-cols-2 gap-4">
                          { !currentItem && (
                              <div className="space-y-2">
                                  <Label htmlFor="stock">Anfangsbestand</Label>
                                  <Input id="stock" name="stock" type="number" defaultValue="0" />
                              </div>
                          )}
                          <div className={cn("space-y-2", currentItem && "col-span-2")}>
                              <Label htmlFor="minStock">Mindestbestand</Label>
                              <Input id="minStock" name="minStock" type="number" defaultValue={currentItem?.itemType === 'item' ? currentItem.minStocks.find(ms => ms.locationId === activeLocationId)?.quantity || 0 : 0} />
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="md:col-span-3"><Separator/></div>

                    <div className="md:col-span-3 space-y-4">
                       <div className="flex justify-between items-center">
                            <h4 className="text-sm font-medium text-muted-foreground">Großhändler / Lieferanten</h4>
                            <Button type="button" variant="outline" size="sm" onClick={handleAddSupplier}><PlusCircle className="mr-2 h-4 w-4" /> Lieferant</Button>
                        </div>
                         <RadioGroup value={preferredWholesaler || ''} onValueChange={setPreferredWholesaler}>
                          <div className="space-y-3">
                            {suppliers.map((supplier, index) => (
                                <Card key={index} className="p-4 bg-muted/30">
                                    <div className="flex justify-end -mt-2 -mr-2">
                                        {suppliers.length > 1 && 
                                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleRemoveSupplier(index)}><X className="h-4 w-4 text-destructive"/></Button>
                                        }
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor={`wholesaler-${index}`}>Großhändler</Label>
                                            <Select value={supplier.wholesalerId} onValueChange={(value) => handleSupplierChange(index, 'wholesalerId', value)}>
                                                <SelectTrigger id={`wholesaler-${index}`}><SelectValue placeholder="Großhändler wählen" /></SelectTrigger>
                                                <SelectContent>{wholesalers.map(w => (<SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>))}</SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor={`wholesaler-item-number-${index}`}>Großhändler-Art.Nr.</Label>
                                            <Input id={`wholesaler-item-number-${index}`} value={supplier.wholesalerItemNumber} onChange={(e) => handleSupplierChange(index, 'wholesalerItemNumber', e.target.value)} />
                                        </div>
                                        <div className="space-y-2 sm:col-span-2">
                                            <Label htmlFor={`supplier-url-${index}`}>URL zum Artikel</Label>
                                            <Input id={`supplier-url-${index}`} value={supplier.url} onChange={(e) => handleSupplierChange(index, 'url', e.target.value)} placeholder="https://..." />
                                        </div>
                                        {supplier.wholesalerId && (
                                            <div className="flex items-center space-x-2 sm:col-span-2">
                                                <RadioGroupItem value={supplier.wholesalerId} id={`preferred-${index}`} />
                                                <Label htmlFor={`preferred-${index}`}>Als bevorzugten Großhändler für Bestellungen festlegen</Label>
                                            </div>
                                        )}
                                    </div>
                                </Card>
                            ))}
                          </div>
                        </RadioGroup>
                    </div>

                  </div>
                </ScrollArea>
              </div>
            )}

            {!isAiMode && (
                <DialogFooter>
                  <DialogClose asChild><Button type="button" variant="secondary">Abbrechen</Button></DialogClose>
                  <Button type="submit">Speichern</Button>
                </DialogFooter>
            )}
          </form>
        </DialogContent>
      </Dialog>
       <Dialog open={isImageReuseOpen} onOpenChange={setIsImageReuseOpen}>
        <DialogContent className="max-w-4xl">
            <DialogHeader>
                <DialogTitle>Bild wiederverwenden</DialogTitle>
                <DialogDescription>
                    Wählen Sie ein bereits vorhandenes Artikelbild aus, um es zu verknüpfen.
                </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 py-4">
                <div className="md:col-span-1 space-y-4">
                    <Input
                        placeholder="Suchen..."
                        value={imageFilterSearchTerm}
                        onChange={(e) => setImageFilterSearchTerm(e.target.value)}
                    />
                    <Select value={imageFilterLocationId} onValueChange={setImageFilterLocationId}>
                        <SelectTrigger><SelectValue placeholder="Lagerort wählen..." /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Alle Lagerorte</SelectItem>
                            {locations.map(loc => <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select value={imageFilterMainLocation} onValueChange={setImageFilterMainLocation}>
                        <SelectTrigger><SelectValue placeholder="Lagerplatz wählen..." /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Alle Lagerplätze</SelectItem>
                            {imageReuseMainLocations.map(loc => <SelectItem key={loc} value={loc}>{loc}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="md:col-span-3">
                    <ScrollArea className="h-96">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 pr-4">
                            {filteredImageItems.map(item => (
                                <div key={item.id} className="cursor-pointer group relative aspect-square" onClick={() => handleImageSelection(item)}>
                                    <Image src={item.imageUrl!} alt={item.name} fill className="rounded-md object-cover transition-transform group-hover:scale-105" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2">
                                        <p className="text-xs text-white text-center font-semibold">{item.name}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {filteredImageItems.length === 0 && (
                          <div className="flex items-center justify-center h-full">
                              <p className="text-muted-foreground">Keine Bilder gefunden.</p>
                          </div>
                        )}
                    </ScrollArea>
                </div>
            </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isDuplicateDialogOpen} onOpenChange={setIsDuplicateDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Duplikat gefunden</DialogTitle>
                <DialogDescription>
                    Ein Artikel mit einer der angegebenen Herstellernummern existiert bereits an diesem Lagerort: <br />
                    <span className="font-semibold text-foreground">{duplicateItem?.name}</span>
                    <br/><br/>
                    Möchten Sie stattdessen diesen Artikel bearbeiten?
                </DialogDescription>
            </DialogHeader>
            <DialogFooter>
                <Button variant="secondary" onClick={() => setIsDuplicateDialogOpen(false)}>Abbrechen</Button>
                <Button onClick={handleDuplicateItem}>Zum Artikel wechseln</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

    

    
