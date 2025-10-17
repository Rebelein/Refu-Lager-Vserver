
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppContext } from '@/context/AppContext';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { de } from 'date-fns/locale';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { getOrderStatusBadgeVariant, getOrderStatusText } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, Search } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import type { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import type { Order, OrderItem } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from '@/components/ui/label';
import { Minus, Plus } from 'lucide-react';

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


export default function OrderHistoryPage() {
  const { orders, locations, receiveOrderItem, currentUser } = useAppContext();
  const { toast } = useToast();

  const [filteredOrders, setFilteredOrders] = React.useState<Order[]>([]);
  const [selectedLocation, setSelectedLocation] = React.useState('all');
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>();
  const [activePreset, setActivePreset] = React.useState<string | null>(null);
  const [searchTerm, setSearchTerm] = React.useState('');
  
  const [isReceiveModalOpen, setIsReceiveModalOpen] = React.useState(false);
  const [receivingInfo, setReceivingInfo] = React.useState<{ order: Order; item: OrderItem } | null>(null);
  const [receivedQuantity, setReceivedQuantity] = React.useState(0);
  const [isCommissionDialog, setIsCommissionDialog] = React.useState(false);

  const isDesktop = useMediaQuery("(min-width: 768px)");
  const numberOfMonths = isDesktop ? 2 : 1;

  const sortedOrders = React.useMemo(() => {
    return [...orders].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [orders]);

  React.useEffect(() => {
    const applyFilters = () => {
      let result = [...sortedOrders];

      // Location Filter
      if (selectedLocation !== 'all') {
        result = result.filter(order => order.locationId === selectedLocation || order.items.some(item => item.locationId === selectedLocation));
      }

      // Date Filter
      if (dateRange?.from) {
        const fromDate = startOfDay(dateRange.from);
        const toDate = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
        result = result.filter(order => {
          const orderDate = new Date(order.date);
          return orderDate >= fromDate && orderDate <= toDate;
        });
      }

      // Search Filter
      if (searchTerm.trim() !== '') {
        const lowercasedTerm = searchTerm.toLowerCase();
        result = result.filter(order => 
          order.orderNumber.toLowerCase().includes(lowercasedTerm) ||
          order.wholesalerName.toLowerCase().includes(lowercasedTerm) ||
          order.items.some(item => 
            item.itemName.toLowerCase().includes(lowercasedTerm) ||
            item.itemNumber.toLowerCase().includes(lowercasedTerm) ||
            item.wholesalerItemNumber?.toLowerCase().includes(lowercasedTerm)
          )
        );
      }

      setFilteredOrders(result);
    };

    applyFilters();
  }, [sortedOrders, selectedLocation, dateRange, searchTerm]);

  const handlePresetDateRange = (days: number) => {
    setActivePreset(String(days));
    setDateRange({
      from: subDays(new Date(), days - 1),
      to: new Date(),
    });
  };

  const handleDateChange = (range: DateRange | undefined) => {
    setDateRange(range);
    if(range?.from || range?.to){
        setActivePreset(null);
    }
  }

  const resetFilters = () => {
    setSelectedLocation('all');
    setDateRange(undefined);
    setSearchTerm('');
    setActivePreset(null);
  };
  
  const handleOpenReceiveModal = (order: Order, item: OrderItem) => {
    const isVehicleOrder = !!order.locationId && locations.some(l => l.id === order.locationId && l.isVehicle);
    setReceivingInfo({ order, item });
    const remainingQuantity = item.quantity - item.receivedQuantity;
    setReceivedQuantity(remainingQuantity);
    if(isVehicleOrder && item.status !== 'commissioned') {
        setIsCommissionDialog(true);
    } else {
        setIsReceiveModalOpen(true);
    }
  };
  
   const handleConfirmReception = (commissionOnly = false) => {
    if (!receivingInfo || !currentUser) {
      toast({ title: 'Fehler', description: 'Ein unerwarteter Fehler ist aufgetreten.', variant: 'destructive' });
      return;
    }
    if (receivedQuantity <= 0 && !commissionOnly) {
      toast({ title: 'Fehler', description: 'Die Menge muss größer als 0 sein.', variant: 'destructive' });
      return;
    }
    
    const quantityToReceive = commissionOnly ? (receivingInfo.item.quantity - receivingInfo.item.receivedQuantity) : receivedQuantity;
    
    receiveOrderItem(receivingInfo.order.id, receivingInfo.item.itemId, quantityToReceive, commissionOnly);
    
    if (commissionOnly) {
        toast({
            title: 'Artikel kommissioniert',
            description: `${quantityToReceive}x ${receivingInfo.item.itemName} wurde für das Fahrzeug bereitgestellt.`
        });
    } else {
        toast({
          title: 'Wareneingang gebucht',
          description: `${quantityToReceive}x ${receivingInfo.item.itemName} wurden dem Bestand hinzugefügt.`
        });
    }
    
    setIsReceiveModalOpen(false);
    setIsCommissionDialog(false);
    setReceivingInfo(null);
    setReceivedQuantity(0);
  };


  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Bestellverlauf</CardTitle>
          <CardDescription>
            Filtern und durchsuchen Sie die Historie aller ausgelösten Bestellungen.
          </CardDescription>
        </CardHeader>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Filter</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="location-filter">Lagerort</Label>
            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger id="location-filter">
                <SelectValue placeholder="Lagerort wählen..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Lagerorte</SelectItem>
                {locations.map(loc => (
                  <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Zeitraum</Label>
            <div className="flex gap-2 flex-wrap">
              <Button variant={activePreset === '7' ? 'default' : 'outline'} size="sm" onClick={() => handlePresetDateRange(7)}>7 T</Button>
              <Button variant={activePreset === '14' ? 'default' : 'outline'} size="sm" onClick={() => handlePresetDateRange(14)}>14 T</Button>
              <Button variant={activePreset === '30' ? 'default' : 'outline'} size="sm" onClick={() => handlePresetDateRange(30)}>30 T</Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date"
                    variant={"outline"}
                    size="sm"
                    className={cn(
                      "w-10 sm:w-auto sm:flex-1 justify-center sm:justify-start text-left font-normal",
                      !dateRange && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "LLL dd, y")} -{" "}
                            {format(dateRange.to, "LLL dd, y")}
                          </>
                        ) : (
                          format(dateRange.from, "LLL dd, y")
                        )
                      ) : (
                        "Zeitraum wählen"
                      )}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={handleDateChange}
                    numberOfMonths={numberOfMonths}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="search-term">Suche</Label>
            <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    id="search-term"
                    placeholder="Bestell-Nr, Artikel..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>
          </div>
          
          <div className="flex items-end">
            <Button variant="outline" onClick={resetFilters} className="w-full">Filter zurücksetzen</Button>
          </div>
        </CardContent>
      </Card>

      {filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Für die aktuellen Filterkriterien wurden keine Bestellungen gefunden.</p>
          </CardContent>
        </Card>
      ) : (
        <Accordion type="single" collapsible className="w-full space-y-4">
          {filteredOrders.map(order => (
            <AccordionItem value={order.id} key={order.id} className="border-b-0">
                <Card>
                    <AccordionTrigger className="p-4 sm:p-6 hover:no-underline rounded-lg data-[state=open]:rounded-b-none">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full text-left gap-2 sm:gap-4">
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-base sm:text-lg truncate">{order.orderNumber}</p>
                                <p className="text-sm text-muted-foreground truncate">{order.wholesalerName}</p>
                            </div>
                            <div className="flex-1 text-left sm:text-center mt-2 sm:mt-0">
                                <p className="text-xs sm:text-sm text-muted-foreground">Datum</p>
                                <p className="text-sm sm:text-base">{format(new Date(order.date), 'dd. MMMM yyyy', { locale: de })}</p>
                            </div>
                            <div className="w-full sm:w-auto sm:flex-1 text-left sm:text-right mt-2 sm:mt-0">
                                <Badge variant={getOrderStatusBadgeVariant(order.status)}>
                                    {getOrderStatusText(order.status)}
                                </Badge>
                            </div>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent>
                        <div className="px-4 sm:px-6 pb-4 sm:pb-6">
                           <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Menge</TableHead>
                                        <TableHead>Artikel</TableHead>
                                        <TableHead>Herst. Art-Nr.</TableHead>
                                        <TableHead>Großh. Art-Nr.</TableHead>
                                        <TableHead>Lagerort</TableHead>
                                        <TableHead className="text-right">Aktion</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {order.items.map(item => (
                                        <TableRow key={item.itemId}>
                                            <TableCell className="font-medium">{item.receivedQuantity} / {item.quantity}</TableCell>
                                            <TableCell>{item.itemName}</TableCell>
                                            <TableCell>{item.itemNumber}</TableCell>
                                            <TableCell>{item.wholesalerItemNumber || '-'}</TableCell>
                                            <TableCell>{locations.find(l => l.id === item.locationId)?.name || 'N/A'}</TableCell>
                                            <TableCell className="text-right">
                                                 <Button 
                                                    size="sm" 
                                                    variant="outline"
                                                    onClick={() => handleOpenReceiveModal(order, item)}
                                                    disabled={item.status === 'received'}
                                                >
                                                    Wareneingang
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                           </div>
                        </div>
                    </AccordionContent>
                </Card>
            </AccordionItem>
          ))}
        </Accordion>
      )}
      
       <Dialog open={isCommissionDialog} onOpenChange={setIsCommissionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Wareneingang für Fahrzeug</DialogTitle>
            <DialogDescription>
              Die Bestellung ist für das Fahrzeug &quot;{locations.find(l => l.id === receivingInfo?.order.locationId)?.name}&quot;. Wurde das Material direkt ins Fahrzeug geladen?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="grid grid-cols-2 gap-4 pt-4">
             <Button variant="outline" size="lg" onClick={() => handleConfirmReception(true)}>Nein, im Lager kommissionieren</Button>
             <Button size="lg" onClick={() => handleConfirmReception(false)}>Ja, direkt verladen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isReceiveModalOpen} onOpenChange={setIsReceiveModalOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Wareneingang für {receivingInfo?.item.itemName}</DialogTitle>
                <DialogDescription>
                    Bestellnummer: {receivingInfo?.order.orderNumber}.
                    Bestellte Menge: {receivingInfo?.item.quantity}. Bereits erhalten: {receivingInfo?.item.receivedQuantity}.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4">
                <Label htmlFor="received-quantity" className="text-center block mb-2">Erhaltene Menge</Label>
                <div className="flex items-center justify-center gap-4">
                    <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="h-10 w-10"
                        onClick={() => setReceivedQuantity(q => Math.max(1, q - 1))}
                    >
                        <Minus className="h-4 w-4" />
                    </Button>
                    <Input
                        id="received-quantity"
                        type="number"
                        value={receivedQuantity}
                        onChange={(e) => setReceivedQuantity(Number(e.target.value))}
                        className="w-24 h-16 text-center text-3xl font-bold"
                        max={receivingInfo ? receivingInfo.item.quantity - receivingInfo.item.receivedQuantity : undefined}
                    />
                    <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="h-10 w-10"
                        onClick={() => setReceivedQuantity(q => Math.min(q + 1, receivingInfo ? receivingInfo.item.quantity - receivingInfo.item.receivedQuantity : q + 1))}
                    >
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>
            </div>
            <DialogFooter>
                <Button variant="secondary" onClick={() => setIsReceiveModalOpen(false)}>Abbrechen</Button>
                <Button onClick={() => handleConfirmReception(false)}>Bestätigen</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
