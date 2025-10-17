
'use client';

import * as React from 'react';
import { Search, AlertCircle, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ChangeLogEntry, InventoryItem } from '@/lib/types';
import QRCode from 'react-qr-code';
import Barcode from 'react-barcode';
import { Slider } from '@/components/ui/slider';
import { useAppContext } from '@/context/AppContext';
import { Checkbox } from '@/components/ui/checkbox';
import { isInventoryItem } from '@/lib/utils';
import { toPng } from 'html-to-image';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenuSeparator } from '@/components/ui/dropdown-menu';


const presetLabelSizes = [
  { name: 'Klein (40x20mm)', width: 40, height: 20 },
  { name: 'Mittel (60x30mm)', width: 60, height: 30 },
  { name: 'Groß (80x40mm)', width: 80, height: 40 },
  { name: 'Versand (102x50mm)', width: 102, height: 50 },
];

const DPI = 96;
const MM_PER_INCH = 25.4;
const mmToPx = (mm: number) => (mm / MM_PER_INCH) * DPI;

export default function LabelsPage() {
  const { items, wholesalers, updateItem, currentUser, locations } = useAppContext();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [activeTab, setActiveTab] = React.useState('suggestions');
  const [selectedItems, setSelectedItems] = React.useState<Set<string>>(new Set());
  const [selectedCompartments, setSelectedCompartments] = React.useState<Set<string>>(new Set());

  const [isPrintDialogOpen, setIsPrintDialogOpen] = React.useState(false);
  const [labelSize, setLabelSize] = React.useState({ width: 60, height: 30 });
  const [fontSize, setFontSize] = React.useState(70); // Percentage
  const [barcodeSource, setBarcodeSource] = React.useState('preferred');
  const [selectedMainLocation, setSelectedMainLocation] = React.useState('all');
  const [selectedLocationId, setSelectedLocationId] = React.useState('all');
  const { toast } = useToast();

  const printAreaRef = React.useRef<HTMLDivElement>(null);

  const mainLocations = React.useMemo(() => {
    const itemsInSelectedLocation = items.filter(item => 
        selectedLocationId === 'all' || item.stocks.some(s => s.locationId === selectedLocationId)
    );
    const uniqueMainLocations = new Set(itemsInSelectedLocation.map(item => item.mainLocation).filter(Boolean));
    return ['all', ...Array.from(uniqueMainLocations).sort()];
  }, [items, selectedLocationId]);

  const subLocations = React.useMemo(() => {
      if (selectedMainLocation === 'all') return [];
      const itemsInMainLocation = items.filter(item => 
          item.mainLocation === selectedMainLocation &&
          (selectedLocationId === 'all' || item.stocks.some(s => s.locationId === selectedLocationId))
      );
      const uniqueSubLocations = new Set(itemsInMainLocation.map(item => item.subLocation).filter(Boolean));
      return Array.from(uniqueSubLocations).sort();
  }, [items, selectedMainLocation, selectedLocationId]);


  React.useEffect(() => {
    if (!mainLocations.includes(selectedMainLocation)) {
        setSelectedMainLocation('all');
    }
  }, [mainLocations, selectedMainLocation]);
  
  const filteredItems = React.useMemo(() => {
    return items.filter(item => {
        const term = searchTerm.toLowerCase();
        const matchesSearch = item.name.toLowerCase().includes(term) || (isInventoryItem(item) && item.manufacturerItemNumbers[0]?.number.toLowerCase().includes(term));

        const matchesLocation = selectedLocationId === 'all' || item.stocks.some(s => s.locationId === selectedLocationId);
        const matchesMainLocation = selectedMainLocation === 'all' || item.mainLocation === selectedMainLocation;

        let matchesTab = true;
        if (activeTab === 'suggestions') {
            const updateLogs = (item.changelog || []).filter(log => log.type === 'update').sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            const lastUpdate = updateLogs[0];
            matchesTab = !!(lastUpdate && isInventoryItem(item) && item.labelLastPrintedAt && new Date(lastUpdate.date) > new Date(item.labelLastPrintedAt));
        }

        return matchesSearch && matchesLocation && matchesMainLocation && matchesTab;
    });
  }, [items, searchTerm, selectedMainLocation, selectedLocationId, activeTab]);


  const handleSelectAll = (checked: boolean) => {
    if (activeTab === 'compartment') {
        if (checked) {
            const allCompartmentKeys = subLocations.map(subLoc => `${selectedMainLocation}::${subLoc}`);
            setSelectedCompartments(new Set(allCompartmentKeys));
        } else {
            setSelectedCompartments(new Set());
        }
    } else {
        if (checked) {
          setSelectedItems(new Set(filteredItems.map(item => item.id)));
        } else {
          setSelectedItems(new Set());
        }
    }
  };

  const handleSelectItem = (itemId: string, checked: boolean) => {
    const newSelection = new Set(selectedItems);
    if (checked) {
      newSelection.add(itemId);
    } else {
      newSelection.delete(itemId);
    }
    setSelectedItems(newSelection);
  };

  const handleSelectCompartment = (compartmentKey: string, checked: boolean) => {
    const newSelection = new Set(selectedCompartments);
    if (checked) {
      newSelection.add(compartmentKey);
    } else {
      newSelection.delete(compartmentKey);
    }
    setSelectedCompartments(newSelection);
  };
  
const handleDownload = React.useCallback(async () => {
    if (printAreaRef.current === null || !currentUser) {
        return;
    }

    const labelElements = Array.from(printAreaRef.current.children);
    if (labelElements.length === 0) {
        toast({ title: 'Keine Etiketten zum Herunterladen', variant: 'destructive' });
        return;
    }

    let downloadCount = 0;
    for (const labelNode of labelElements) {
        try {
            const dataUrl = await toPng(labelNode as HTMLElement, {
                cacheBust: true,
                pixelRatio: 3,
                fontEmbedCSS: `@import url('https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&display=swap');`,
            });
            
            const link = document.createElement('a');
            const fileName = labelNode.getAttribute('data-filename') || `etikett-${downloadCount + 1}.png`;
            link.download = fileName;
            link.href = dataUrl;
            link.click();
            downloadCount++;
        } catch (err) {
            console.error('Fehler beim Erstellen eines Etiketts:', err);
        }
    }
    
    if (downloadCount > 0) {
        toast({ title: `${downloadCount} Etikett(en) heruntergeladen` });
        
        const now = new Date().toISOString();
        if (activeTab !== 'compartment') {
            selectedItems.forEach(itemId => {
                const item = items.find(i => i.id === itemId);
                if (!item || !currentUser) return;
                const newLogEntry: ChangeLogEntry = {
                    id: `${now}-${Math.random()}`,
                    date: now,
                    userId: currentUser.id,
                    userName: currentUser.name,
                    type: 'label-printed',
                    details: `Etikett gedruckt`,
                };
                updateItem(itemId, { 
                    labelLastPrintedAt: now, 
                    changelog: [...(item.changelog || []), newLogEntry] 
                });
            });
        }
    } else {
        toast({ title: 'Fehler beim Download', description: 'Keine Etiketten konnten heruntergeladen werden.', variant: 'destructive' });
    }
}, [selectedItems, activeTab, currentUser, items, toast, updateItem]);


  const itemsToPrint = React.useMemo(() => {
    if (activeTab === 'compartment') return [];
    return items.filter(item => selectedItems.has(item.id));
  }, [items, selectedItems, activeTab]);

  const compartmentsToPrint = React.useMemo(() => {
    if (activeTab !== 'compartment') return [];
    return Array.from(selectedCompartments).map(key => {
        const [mainLocation, subLocation] = key.split('::');
        return {
            key,
            mainLocation,
            subLocation,
            items: items.filter(item => item.mainLocation === mainLocation && item.subLocation === subLocation)
        };
    })
  }, [items, selectedCompartments, activeTab]);
  
  const handleOpenQuickPrint = (item: InventoryItem) => {
    setSelectedItems(new Set([item.id]));
    setIsPrintDialogOpen(true);
  };

  const handleOpenCompartmentPrint = (mainLocation: string, subLocation: string) => {
      setSelectedCompartments(new Set([`${mainLocation}::${subLocation}`]));
      setIsPrintDialogOpen(true);
  }

  const labelWidthPx = mmToPx(labelSize.width);
  const labelHeightPx = mmToPx(labelSize.height);

  const selectionCount = activeTab === 'compartment' ? selectedCompartments.size : selectedItems.size;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl">Etikettendruck</h1>
      </div>
      <Tabs defaultValue="suggestions" value={activeTab} onValueChange={(value) => {
          setActiveTab(value);
          setSelectedItems(new Set());
          setSelectedCompartments(new Set());
      }}>
         <TabsList>
            <TabsTrigger value="suggestions">Druckvorschläge</TabsTrigger>
            <TabsTrigger value="all">Alle Artikel</TabsTrigger>
            <TabsTrigger value="compartment">Lagerplatz-Etiketten</TabsTrigger>
          </TabsList>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-4">
             <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
                <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Lagerort wählen" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Alle Lagerorte</SelectItem>
                    {locations.map(loc => (
                        <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
             <Select value={selectedMainLocation} onValueChange={setSelectedMainLocation} disabled={activeTab === 'suggestions'}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Lagerbereich wählen" />
              </SelectTrigger>
              <SelectContent>
                {mainLocations.map(loc => (
                  <SelectItem key={loc} value={loc}>{loc === 'all' ? 'Alle Lagerbereiche' : loc}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative w-full sm:w-auto flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Suchen..."
                className="pl-8 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={activeTab === 'compartment'}
              />
            </div>
             <Button size="sm" className="h-10 sm:h-9 gap-1" disabled={selectionCount === 0} onClick={() => setIsPrintDialogOpen(true)}>
                Auswahl drucken ({selectionCount})
              </Button>
        </div>

        <TabsContent value="suggestions">
             <Card className="mt-4">
                <CardContent className="p-0">
                   <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px]"><Checkbox checked={filteredItems.length > 0 && selectedItems.size === filteredItems.length} onCheckedChange={(checked) => handleSelectAll(!!checked)} aria-label="Alle auswählen" /></TableHead>
                                <TableHead className="w-12"></TableHead>
                                <TableHead>Bezeichnung</TableHead>
                                <TableHead>Lagerort</TableHead>
                                <TableHead className="text-right">Bestand</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredItems.length > 0 ? (
                                filteredItems.map(item => {
                                    const needsLabelUpdate = !!((item.changelog || []).filter(log => log.type === 'update').sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] && isInventoryItem(item) && item.labelLastPrintedAt && new Date((item.changelog || []).filter(log => log.type === 'update').sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]!.date) > new Date(item.labelLastPrintedAt));
                                    return(
                                    <TableRow key={item.id}>
                                        <TableCell><Checkbox checked={selectedItems.has(item.id)} onCheckedChange={(checked) => handleSelectItem(item.id, !!checked)} aria-label={`${item.name} auswählen`} /></TableCell>
                                        <TableCell>{needsLabelUpdate && isInventoryItem(item) && (<Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenQuickPrint(item)}><AlertCircle className="h-5 w-5 text-yellow-500" /></Button> )}</TableCell>
                                        <TableCell className="font-medium">{item.name}</TableCell>
                                        <TableCell>{item.mainLocation} / {item.subLocation}</TableCell>
                                        <TableCell className="text-right">{item.stocks.reduce((acc, s) => acc + s.quantity, 0)}</TableCell>
                                    </TableRow>
                                )})
                            ) : ( <TableRow><TableCell colSpan={6} className="h-24 text-center">Keine Druckvorschläge gefunden.</TableCell></TableRow> )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="all">
            <Card className="mt-4">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px]"><Checkbox checked={filteredItems.length > 0 && selectedItems.size === filteredItems.length} onCheckedChange={(checked) => handleSelectAll(!!checked)} aria-label="Alle auswählen" /></TableHead>
                                <TableHead>Bezeichnung</TableHead>
                                <TableHead>Lagerort</TableHead>
                                <TableHead className="text-right">Bestand</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredItems.length > 0 ? (
                                filteredItems.map(item => (
                                <TableRow key={item.id}>
                                    <TableCell><Checkbox checked={selectedItems.has(item.id)} onCheckedChange={(checked) => handleSelectItem(item.id, !!checked)} aria-label={`${item.name} auswählen`} /></TableCell>
                                    <TableCell className="font-medium">{item.name}</TableCell>
                                    <TableCell>{item.mainLocation} / {item.subLocation}</TableCell>
                                    <TableCell className="text-right">{item.stocks.reduce((acc, s) => acc + s.quantity, 0)}</TableCell>
                                </TableRow>
                            ))) : ( <TableRow><TableCell colSpan={5} className="h-24 text-center">Keine Artikel gefunden.</TableCell></TableRow> )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="compartment">
             <Card className="mt-4">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px]">
                                    <Checkbox 
                                      checked={subLocations.length > 0 && selectedCompartments.size === subLocations.length} 
                                      onCheckedChange={(checked) => handleSelectAll(!!checked)} 
                                      aria-label="Alle auswählen"
                                      disabled={selectedMainLocation === 'all'}
                                    />
                                </TableHead>
                                <TableHead>Lagerfach</TableHead>
                                <TableHead>Anzahl Artikel</TableHead>
                                <TableHead className="text-right">Aktion</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                           {selectedMainLocation !== 'all' && subLocations.length > 0 ? (
                                subLocations.map(subLoc => {
                                    const compartmentItems = items.filter(item => 
                                        item.mainLocation === selectedMainLocation && 
                                        item.subLocation === subLoc &&
                                        (selectedLocationId === 'all' || item.stocks.some(s => s.locationId === selectedLocationId))
                                    );
                                    const compartmentKey = `${selectedMainLocation}::${subLoc}`;
                                    return (
                                        <TableRow key={subLoc}>
                                            <TableCell>
                                                <Checkbox
                                                  checked={selectedCompartments.has(compartmentKey)}
                                                  onCheckedChange={(checked) => handleSelectCompartment(compartmentKey, !!checked)}
                                                />
                                            </TableCell>
                                            <TableCell className="font-medium">{selectedMainLocation} / {subLoc}</TableCell>
                                            <TableCell>{compartmentItems.length}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="outline" size="sm" onClick={() => handleOpenCompartmentPrint(selectedMainLocation, subLoc)}>
                                                    <Printer className="mr-2 h-4 w-4" /> Etikett
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        {selectedMainLocation === 'all' ? "Bitte wählen Sie zuerst einen Lagerbereich aus." : "Keine Fächer in diesem Bereich gefunden."}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
      
      <Dialog open={isPrintDialogOpen} onOpenChange={setIsPrintDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Etiketten drucken</DialogTitle>
            <DialogDescription>
              Passen Sie die Größe an und drucken Sie die ausgewählten Etiketten.
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
                    <div><Label htmlFor="label-width" className="mb-2 block text-sm font-medium">Etikettenbreite ({labelSize.width}mm)</Label><Slider id="label-width" min={20} max={150} step={1} value={[labelSize.width]} onValueChange={(value) => setLabelSize(prev => ({ ...prev, width: value[0]! }))} /></div>
                    <div><Label htmlFor="label-height" className="mb-2 block text-sm font-medium">Etikettenhöhe ({labelSize.height}mm)</Label><Slider id="label-height" min={10} max={100} step={1} value={[labelSize.height]} onValueChange={(value) => setLabelSize(prev => ({ ...prev, height: value[0]! }))} /></div>
                     <div><Label htmlFor="font-size" className="mb-2 block text-sm font-medium">Schriftgröße ({fontSize}%)</Label><Slider id="font-size" min={50} max={150} step={10} value={[fontSize]} onValueChange={(value) => setFontSize(value[0]!)} /></div>
                </div>
                 {activeTab !== 'compartment' && (
                    <div className="space-y-4 border-t pt-6">
                        <div className="space-y-2">
                            <Label htmlFor="barcode-source-bulk">Barcode-Quelle</Label>
                            <Select value={barcodeSource} onValueChange={setBarcodeSource}>
                                <SelectTrigger id="barcode-source-bulk"><SelectValue placeholder="Quelle für Barcode wählen" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="preferred">Bevorzugter Großhändler</SelectItem>
                                    <SelectItem value="ean">Artikel-EAN</SelectItem>
                                    <SelectItem value="manufacturer">Hersteller-Artikelnummer</SelectItem>
                                    {isInventoryItem(itemsToPrint[0]) && itemsToPrint[0]?.suppliers && itemsToPrint[0]?.suppliers.length > 0 && <DropdownMenuSeparator />}
                                    {isInventoryItem(itemsToPrint[0]) && itemsToPrint[0]?.suppliers.map(s => {
                                        const w = wholesalers.find(w => w.id === s.wholesalerId);
                                        if (!w || (isInventoryItem(itemsToPrint[0]) && w.id === itemsToPrint[0]?.preferredWholesalerId)) return null;
                                        return <SelectItem key={w.id} value={w.id}>GH: {w.name}</SelectItem>
                                    })}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">Gilt für alle ausgewählten Etiketten. Basiert auf dem ersten Artikel.</p>
                        </div>
                    </div>
                 )}
            </div>
            <div className="flex items-center justify-center bg-gray-100 dark:bg-gray-800 p-4 rounded-md min-h-[200px] overflow-auto">
              <div ref={printAreaRef} className="print-area bg-white flex flex-wrap gap-2 p-2" style={{fontFamily: "'PT Sans', sans-serif"}}>
                {activeTab !== 'compartment' && itemsToPrint.map(item => {
                    const wholesalerName = isInventoryItem(item) ? wholesalers.find(w => w.id === item.preferredWholesalerId)?.name || '' : '';
                    let finalBarcodeValue: string | null = null;
                    if (barcodeSource === 'preferred') { if (isInventoryItem(item)) { const supplier = item.suppliers.find(s => s.wholesalerId === item.preferredWholesalerId); finalBarcodeValue = supplier?.wholesalerItemNumber || null; } } else if (barcodeSource === 'ean') { finalBarcodeValue = isInventoryItem(item) ? item.barcode || null : null; } else if (barcodeSource === 'manufacturer') { finalBarcodeValue = isInventoryItem(item) ? item.manufacturerItemNumbers[0]?.number : null; } else { if (isInventoryItem(item)) { const supplier = item.suppliers.find(s => s.wholesalerId === barcodeSource); finalBarcodeValue = supplier?.wholesalerItemNumber || null; } }
                    return(
                      <div key={item.id} className="label-container bg-white" data-filename={`etikett-${item.name.replace(/\s+/g, '-').toLowerCase()}.png`}>
                          <div className="p-1 bg-white border flex items-stretch justify-center gap-1" style={{ width: `${labelWidthPx}px`, height: `${labelHeightPx}px`, boxSizing: 'content-box' }}>
                             <div className="flex-1 h-full flex flex-col justify-between items-center overflow-hidden p-1">
                                  <div className="w-full text-center">
                                      <p className="text-black font-bold" style={{ fontSize: `${Math.max(8, (labelHeightPx * 0.18) * (fontSize / 100))}px`, lineHeight: 1.1, wordBreak: 'break-word' }}>{item.name}</p>
                                      <p className="text-gray-600" style={{ fontSize: `${Math.max(7, (labelHeightPx * 0.13) * (fontSize / 100))}px`, lineHeight: 1, wordBreak: 'break-word' }}>{isInventoryItem(item) ? item.manufacturerItemNumbers[0]?.number || '' : ''}</p>
                                  </div>
                                  <div className="w-full text-center text-gray-500" style={{ fontSize: `${Math.max(7, (labelHeightPx * 0.11) * (fontSize / 100))}px`, lineHeight: 1, wordBreak: 'break-word' }}>
                                      <p>{item.mainLocation} / {item.subLocation}</p>
                                      <p>{wholesalerName}</p>
                                  </div>
                                 <div className="w-full flex justify-center items-end">
                                      {finalBarcodeValue && <Barcode value={finalBarcodeValue} width={1} height={labelHeightPx * 0.25} fontSize={Math.min(labelHeightPx * 0.1, 10)} margin={2} displayValue={false} />}
                                  </div>
                             </div>
                             <div className="h-full flex items-center justify-center p-1" style={{ width: `${Math.min(labelHeightPx - 4, 80)}px` }}>
                               <QRCode value={item.id} size={Math.min(labelHeightPx - 4, 80)} style={{ height: "auto", maxWidth: "100%", width: "100%" }} viewBox={`0 0 ${Math.min(labelHeightPx-4, 80)} ${Math.min(labelHeightPx-4, 80)}`} />
                             </div>
                          </div>
                      </div>
                    )
                  })}
                  {activeTab === 'compartment' && compartmentsToPrint.map(comp => (
                    <div key={comp.key} className="label-container bg-white" data-filename={`lagerfach-${comp.mainLocation.replace(/\s+/g, '-')}-${comp.subLocation.replace(/\s+/g, '-')}.png`}>
                        <div
                          className="p-2 bg-white border flex flex-col"
                          style={{
                            fontFamily: "'PT Sans', sans-serif",
                            width: `${labelWidthPx}px`,
                            height: `${labelHeightPx}px`,
                            boxSizing: 'content-box'
                          }}
                        >
                          <div className="flex-grow flex items-center gap-2">
                            <div className="flex-1">
                                <ul className="text-black list-disc list-inside" style={{ fontSize: `${Math.max(6, (labelHeightPx * 0.12) * (fontSize/100))}px`, lineHeight: 1.2 }}>
                                    {comp.items.slice(0, 5).map(item => <li key={item.id} className="truncate">{item.name}</li>)}
                                    {comp.items.length > 5 && <li className="font-bold">... und {comp.items.length - 5} weitere</li>}
                                </ul>
                            </div>
                            <div className="flex items-center justify-center h-full p-1" style={{ width: `${Math.min(labelHeightPx * 0.8, 100)}px` }}>
                               <QRCode value={`compartment::${comp.mainLocation}::${comp.subLocation}`} size={Math.min(labelHeightPx * 0.8, 100)} style={{ height: "auto", maxWidth: "100%", width: "100%" }} />
                            </div>
                          </div>
                          <p className="text-gray-500 w-full text-left" style={{ fontSize: `${Math.max(7, (labelHeightPx * 0.11) * (fontSize / 100))}px`, lineHeight: 1 }}>
                            {comp.mainLocation} / {comp.subLocation}
                          </p>
                        </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsPrintDialogOpen(false)}>Schließen</Button>
            <Button onClick={handleDownload}>Herunterladen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
