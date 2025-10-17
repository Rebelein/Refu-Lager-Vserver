

'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardTrigger } from '@/components/ui/card';
import { useAppContext } from '@/context/AppContext';
import { differenceInDays, format } from 'date-fns';
import { de } from 'date-fns/locale';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis } from "recharts";
import { Badge } from '@/components/ui/badge';
import { AlertCircle, FileClock, Truck, Package, PackagePlus, PackageMinus, History, Warehouse, Wrench, Calendar, User, GripVertical, Car, Settings2, LayoutGrid } from 'lucide-react';
import { getChangeLogActionText, isInventoryItem } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
} from "@/components/ui/collapsible"
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { InventoryItem, DashboardCardLayout, ChangeLogEntry } from '@/lib/types';
import { cn } from '@/lib/utils';
import { DndContext, PointerSensor, useSensor, useSensors, DragEndEvent, closestCenter } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const useIsDesktop = () => {
    const [isDesktop, setIsDesktop] = React.useState(false);

    React.useEffect(() => {
        const checkScreenSize = () => {
            setIsDesktop(window.innerWidth >= 1024); // lg breakpoint
        };
        checkScreenSize();
        window.addEventListener('resize', checkScreenSize);
        return () => window.removeEventListener('resize', checkScreenSize);
    }, []);

    return isDesktop;
};

const getCardTitle = (id: string) => {
    switch (id) {
        case 'machines': return 'Maschinenstatus';
        case 'lowStock': return 'Artikel unter Mindestbestand';
        case 'arranged': return 'Angeordnete Bestellungen';
        case 'ordered': return 'Bestellte Artikel';
        case 'totalItems': return 'Artikelvarianten';
        case 'totalStock': return 'Gesamtlagerbestand';
        case 'main-warehouse-activities': return 'Aktivitäten Hauptlager';
        case 'other-locations-activities': return 'Aktivitäten Fahrzeuge';
        case 'inventory-status': return 'Inventurstatus';
        case 'turnover': return 'Lagerbewegungen';
        default: return 'Unbekannte Kachel';
    }
}


export default function DashboardPage() {
    const { items, allChangelog, locations, dashboardLayout, setDashboardLayout, currentUser, allDashboardCards } = useAppContext();
    const [activeDragId, setActiveDragId] = React.useState<string | null>(null);
    const [isManageCardsOpen, setIsManageCardsOpen] = React.useState(false);
    const isDesktop = useIsDesktop();


    const stats = React.useMemo(() => {
        if (!items || !locations) return { lowStockItems: [], arrangedItems: [], orderedItems: [], totalItems: 0, totalStock: 0 };
        
        const lowStockItems: {item: InventoryItem, locationName: string}[] = [];
        const arrangedItems: {item: InventoryItem, locationName: string, quantity: number}[] = [];
        const orderedItems: {item: InventoryItem, locationName: string, quantity: number}[] = [];


        items.forEach(item => {
          (item.stocks || []).forEach(stock => {
            const minStock = (item.minStocks || []).find(ms => ms.locationId === stock.locationId)?.quantity ?? 0;
            const reorderStatus = isInventoryItem(item) ? (item.reorderStatus || {})[stock.locationId] : null;
            if (stock.quantity < minStock && !reorderStatus?.status) {
              const location = locations.find(l => l.id === stock.locationId);
              lowStockItems.push({ item: item as InventoryItem, locationName: location?.name || 'Unbekannt' });
            }
          });

          if (isInventoryItem(item)) {
            Object.entries(item.reorderStatus || {}).forEach(([locationId, status]) => {
              const location = locations.find(l => l.id === locationId);
              if (status?.status === 'arranged') {
                  arrangedItems.push({ item: item as InventoryItem, locationName: location?.name || 'Unbekannt', quantity: status.quantity || 0 });
              }
              if (status?.status === 'ordered') {
                  orderedItems.push({ item: item as InventoryItem, locationName: location?.name || 'Unbekannt', quantity: status.quantity || 0 });
              }
            });
          }
        });

        const totalStock = items.reduce((acc, item) => acc + (item.stocks || []).reduce((sAcc, s) => sAcc + s.quantity, 0), 0);

        return { lowStockItems, arrangedItems, orderedItems, totalItems: items.length, totalStock };
    }, [items, locations]);
    
    const mainWarehouse = React.useMemo(() => locations.find(l => !l.isVehicle), [locations]);

    const mainWarehouseChangelog = React.useMemo(() => {
        if (!mainWarehouse) return [];
        return allChangelog.filter(log => log.locationId === mainWarehouse.id);
    }, [allChangelog, mainWarehouse]);
    
    const otherLocationsChangelog = React.useMemo(() => {
        if (!mainWarehouse) return allChangelog;
        return allChangelog.filter(log => log.locationId !== mainWarehouse.id);
    }, [allChangelog, mainWarehouse]);

    const sensors = useSensors(
      useSensor(PointerSensor, {
          activationConstraint: {
            distance: 8,
          },
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = dashboardLayout.layout.findIndex(item => item.id === active.id);
            const newIndex = dashboardLayout.layout.findIndex(item => item.id === over.id);
            const newLayout = arrayMove(dashboardLayout.layout, oldIndex, newIndex);
            setDashboardLayout(newLayout);
        }
        setActiveDragId(null);
    };

    const handleDragStart = (event: DragEndEvent) => {
        setActiveDragId(event.active.id as string);
    };

    const handleSizeChange = (id: string, size: 'small' | 'default' | 'wide') => {
        const newLayout = dashboardLayout.layout.map(item => 
            item.id === id ? { ...item, size } : item
        );
        setDashboardLayout(newLayout);
    };

    const handleVisibilityChange = (id: string, isVisible: boolean) => {
         const newLayout = dashboardLayout.layout.map(item => 
            item.id === id ? { ...item, hidden: !isVisible } : item
        );
        setDashboardLayout(newLayout);
    };


    const getCardComponent = (cardLayout: DashboardCardLayout) => {
        const { id, size } = cardLayout;
        const key = id;
        const cardProps = {
            id,
            size,
            onSizeChange: (newSize: 'small' | 'default' | 'wide') => handleSizeChange(id, newSize),
        };
        switch (id) {
            case 'machines': return <MachinesCard key={key} {...cardProps} />;
            case 'lowStock': return <StatCard key={key} {...cardProps} title="Artikel unter Mindestbestand" value={stats.lowStockItems.length} icon={AlertCircle} description="Benötigen Aufmerksamkeit">{stats.lowStockItems.length > 0 ? (<div className="space-y-2 text-sm max-h-56 overflow-y-auto pr-2">{stats.lowStockItems.map(({item, locationName}) => (<div key={`${item.id}-${locationName}`} className="flex justify-between"><span>{item.name}</span><span className="text-muted-foreground">{locationName}</span></div>))}</div>) : (<p className="text-sm text-muted-foreground">Alle Bestände sind im grünen Bereich.</p>)}</StatCard>;
            case 'arranged': return <StatCard key={key} {...cardProps} title="Angeordnete Bestellungen" value={stats.arrangedItems.length} icon={FileClock} description="Warten auf Bestellung">{stats.arrangedItems.length > 0 ? (<div className="space-y-2 text-sm max-h-56 overflow-y-auto pr-2">{stats.arrangedItems.map(({item, locationName, quantity}) => (<div key={`${item.id}-${locationName}`} className="flex justify-between"><span>{quantity}x {item.name}</span><span className="text-muted-foreground">{locationName}</span></div>))}</div>) : (<p className="text-sm text-muted-foreground">Keine Bestellungen angeordnet.</p>)}</StatCard>;
            case 'ordered': return <StatCard key={key} {...cardProps} title="Bestellte Artikel" value={stats.orderedItems.length} icon={Truck} description="Warten auf Lieferung">{stats.orderedItems.length > 0 ? (<div className="space-y-2 text-sm max-h-56 overflow-y-auto pr-2">{stats.orderedItems.map(({item, locationName, quantity}) => (<div key={`${item.id}-${locationName}`} className="flex justify-between"><span>{quantity}x {item.name}</span><span className="text-muted-foreground">{locationName}</span></div>))}</div>) : (<p className="text-sm text-muted-foreground">Aktuell keine offenen Bestellungen.</p>)}</StatCard>;
            case 'totalItems': return <StatCard key={key} {...cardProps} title="Artikelvarianten" value={stats.totalItems} icon={Package} description="Anzahl einzigartiger Artikel" />;
            case 'totalStock': return <StatCard key={key} {...cardProps} title="Gesamtlagerbestand" value={stats.totalStock} icon={Warehouse} description="Anzahl aller Teile im Lager" />;
            case 'main-warehouse-activities': return <ActivityCard key={key} {...cardProps} title="Aktivitäten Hauptlager" icon={Warehouse} changelog={mainWarehouseChangelog} />;
            case 'other-locations-activities': return <ActivityCard key={key} {...cardProps} title="Aktivitäten Fahrzeuge" icon={Car} changelog={otherLocationsChangelog} />;
            case 'inventory-status': return <InventoryStatusCard key={key} {...cardProps} />;
            case 'turnover': return <TurnoverCard key={key} {...cardProps} />;
            default: return null;
        }
    };
    
    const getGridSpan = (size: 'small' | 'default' | 'wide') => {
        switch(size) {
            case 'small': return { col: 'lg:col-span-1', row: 'lg:row-span-1' };
            case 'wide': return { col: 'lg:col-span-2', row: 'lg:row-span-2' };
            default: return { col: 'lg:col-span-1', row: 'lg:row-span-1' };
        }
    }

    if (!items || !allChangelog) {
        return <div>Loading...</div>
    }

    return (
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex flex-col gap-6">
             <div className="flex items-center gap-4">
                <h1 className="text-lg font-semibold md:text-2xl">Dashboard</h1>
                {currentUser?.isDashboardEditing && <Badge variant="destructive" className="ml-2 animate-pulse">Bearbeitungsmodus</Badge>}
                <div className="ml-auto">
                    {currentUser?.isDashboardEditing && (
                        <Button variant="outline" size="sm" onClick={() => setIsManageCardsOpen(true)}>
                            <LayoutGrid className="h-4 w-4 mr-2" />
                            Kacheln verwalten
                        </Button>
                    )}
                </div>
            </div>
            
            <div className={cn("gap-4", isDesktop ? "grid lg:grid-cols-3 auto-rows-[160px]" : "flex flex-col")}>
                <SortableContext items={dashboardLayout.layout.map(item => item.id)} disabled={!dashboardLayout.isEditing || !isDesktop}>
                    {dashboardLayout.layout.filter(l => !l.hidden).map((cardLayout) => {
                        const cardComponent = getCardComponent(cardLayout);
                        if (!cardComponent) return null;
                        
                        const spans = getGridSpan(cardLayout.size);

                        if (isDesktop) {
                             return <div key={cardLayout.id} className={cn(spans.col, spans.row)}>{cardComponent}</div>;
                        }

                        return <div key={cardLayout.id}>{cardComponent}</div>
                    })}
                </SortableContext>
            </div>
        </div>
         <Dialog open={isManageCardsOpen} onOpenChange={setIsManageCardsOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Kacheln verwalten</DialogTitle>
                    <DialogDescription>
                        Wählen Sie aus, welche Kacheln auf Ihrem Dashboard angezeigt werden sollen.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto">
                    {dashboardLayout.layout.map(card => (
                        <div key={card.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <Label htmlFor={`visibility-${card.id}`} className="font-medium">
                                {getCardTitle(card.id)}
                            </Label>
                            <Switch
                                id={`visibility-${card.id}`}
                                checked={!card.hidden}
                                onCheckedChange={(checked) => handleVisibilityChange(card.id, checked)}
                            />
                        </div>
                    ))}
                </div>
                <DialogFooter>
                    <Button onClick={() => setIsManageCardsOpen(false)}>Fertig</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </DndContext>
    );
}

// Helper components for cards to keep the main component cleaner

const DraggableCardWrapper = ({ id, onSizeChange, currentSize, children }: { id: string; onSizeChange: (size: 'small' | 'default' | 'wide') => void; currentSize: 'small' | 'default' | 'wide'; children: React.ReactNode }) => {
    const { dashboardLayout } = useAppContext();
    const isDesktop = useIsDesktop();
    const canDrag = dashboardLayout.isEditing && isDesktop;
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled: !canDrag });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 'auto',
    };

    return (
        <div ref={setNodeRef} style={style} className={"relative h-full"}>
             {canDrag && (
                <div className="absolute top-1 right-1 z-20 flex gap-1">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 cursor-pointer text-muted-foreground/50 hover:text-muted-foreground" onClick={(e) => e.stopPropagation()}>
                                <Settings2 className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuLabel>Größe ändern</DropdownMenuLabel>
                            <DropdownMenuRadioGroup value={currentSize} onValueChange={(value) => onSizeChange(value as 'small' | 'default' | 'wide')}>
                                <DropdownMenuRadioItem value="small">Klein</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="default">Standard</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="wide">Breit</DropdownMenuRadioItem>
                            </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>
                     <div {...listeners} {...attributes} className="p-1 cursor-grab text-muted-foreground/50 hover:text-muted-foreground">
                        <GripVertical className="h-5 w-5" />
                    </div>
                </div>
            )}
            {children}
        </div>
    );
}

const MachinesCard = ({ id, size, onSizeChange }: { id: string; size: 'small' | 'default' | 'wide', onSizeChange: (size: 'small' | 'default' | 'wide') => void }) => {
    const { items } = useAppContext();
    const isDesktop = useIsDesktop();
    const machines = React.useMemo(() => items.filter(item => item.itemType === 'machine'), [items]);
    const rentedMachines = React.useMemo(() => machines.filter(m => m.rentalStatus === 'rented'), [machines]);
    const repairMachines = React.useMemo(() => machines.filter(m => m.rentalStatus === 'in_repair'), [machines]);
    const reservedMachines = React.useMemo(() => machines.filter(m => m.reservations && m.reservations.length > 0 && new Date(m.reservations[0]!.startDate) >= new Date()).sort((a,b) => new Date(a.reservations![0]!.startDate).getTime() - new Date(b.reservations![0]!.startDate).getTime()), [machines]);

    const DesktopView = () => (
        <div className="grid grid-cols-3 gap-4 h-full">
            <div className="space-y-2">
                <h4 className="font-semibold text-center text-sm border-b pb-2">Verliehen ({rentedMachines.length})</h4>
                <div className="space-y-2 pt-2 text-sm">
                    {rentedMachines.length > 0 ? rentedMachines.map(m => (
                        <div key={m.id} className="p-2 border rounded-md">
                            <p className="font-medium truncate">{m.name}</p>
                            <p className="text-xs text-muted-foreground truncate flex items-center gap-1"><User className="h-3 w-3"/> {m.rentedBy?.name}</p>
                        </div>
                    )) : <p className="text-xs text-muted-foreground text-center">Keine</p>}
                </div>
            </div>
             <div className="space-y-2">
                <h4 className="font-semibold text-center text-sm border-b pb-2">Reserviert ({reservedMachines.length})</h4>
                 <div className="space-y-2 pt-2 text-sm">
                    {reservedMachines.length > 0 ? reservedMachines.map(m => (
                        <div key={m.id} className="p-2 border rounded-md">
                            <p className="font-medium truncate">{m.name}</p>
                            <p className="text-xs text-muted-foreground truncate">für {m.reservations![0]!.reservedFor}</p>
                            {size === 'wide' && <p className="text-xs text-muted-foreground">{format(new Date(m.reservations![0]!.startDate), 'dd.MM')} - {format(new Date(m.reservations![0]!.endDate), 'dd.MM')}</p>}
                        </div>
                    )) : <p className="text-xs text-muted-foreground text-center">Keine</p>}
                </div>
            </div>
             <div className="space-y-2">
                <h4 className="font-semibold text-center text-sm border-b pb-2 text-destructive">Reparatur ({repairMachines.length})</h4>
                 <div className="space-y-2 pt-2 text-sm">
                    {repairMachines.length > 0 ? repairMachines.map(m => (
                        <div key={m.id} className="p-2 border border-destructive/50 bg-destructive/10 rounded-md">
                            <p className="font-medium truncate text-destructive">{m.name}</p>
                        </div>
                    )) : <p className="text-xs text-muted-foreground text-center">Keine</p>}
                </div>
            </div>
        </div>
    );

    const MobileView = () => (
         <Tabs defaultValue="rented" className="flex flex-col flex-grow">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="rented">Verliehen ({rentedMachines.length})</TabsTrigger>
                <TabsTrigger value="reserved">Reserviert ({reservedMachines.length})</TabsTrigger>
                <TabsTrigger value="repair">Reparatur ({repairMachines.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="rented" className="mt-4 flex-grow">{rentedMachines.length > 0 ? <div className="space-y-4">{rentedMachines.map(machine => (<div key={machine.id} className="flex items-center gap-4 p-2 rounded-lg border"><Wrench className="h-5 w-5 text-primary" /><div className="flex-1"><p className="font-semibold">{machine.name}</p><p className="text-sm text-muted-foreground flex items-center gap-1"><User className="h-3 w-3" /> {machine.rentedBy?.name}</p></div></div>))}</div> : <p className="text-center text-muted-foreground py-8">Aktuell sind keine Maschinen verliehen.</p>}</TabsContent>
            <TabsContent value="reserved" className="mt-4 flex-grow">{reservedMachines.length > 0 ? <div className="space-y-4">{reservedMachines.map(machine => (<div key={machine.id} className="flex items-center gap-4 p-2 rounded-lg border"><Calendar className="h-5 w-5 text-primary" /><div className="flex-1"><p className="font-semibold">{machine.name}</p><p className="text-sm text-muted-foreground">für {machine.reservations![0]!.reservedFor}</p></div><div className="text-sm text-right"><p>{format(new Date(machine.reservations![0]!.startDate), 'dd.MM.yy')} - {format(new Date(machine.reservations![0]!.endDate), 'dd.MM.yy')}</p></div></div>))}</div> : <p className="text-center text-muted-foreground py-8">Keine anstehenden Reservierungen.</p>}</TabsContent>
            <TabsContent value="repair" className="mt-4 flex-grow">{repairMachines.length > 0 ? <div className="space-y-4">{repairMachines.map(machine => (<div key={machine.id} className="flex items-center gap-4 p-2 rounded-lg border border-destructive/50 bg-destructive/10"><Wrench className="h-5 w-5 text-destructive" /><div className="flex-1"><p className="font-semibold text-destructive">{machine.name}</p></div></div>))}</div> : <p className="text-center text-muted-foreground py-8">Keine Maschinen in Reparatur.</p>}</TabsContent>
        </Tabs>
    );

    return (
        <DraggableCardWrapper id={id} currentSize={size} onSizeChange={onSizeChange}>
            <Card className="h-full flex flex-col">
                <CardHeader>
                    <CardTitle>Maschinenstatus</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow flex flex-col">
                    {isDesktop ? <DesktopView /> : <MobileView />}
                </CardContent>
            </Card>
        </DraggableCardWrapper>
    );
}

const ActivityCard = ({ id, size, onSizeChange, title, icon: Icon, changelog }: { id: string; size: 'small' | 'default' | 'wide'; onSizeChange: (size: 'small' | 'default' | 'wide') => void; title: string; icon: React.ElementType; changelog: ChangeLogEntry[] }) => {
    return (
        <DraggableCardWrapper id={id} currentSize={size} onSizeChange={onSizeChange}>
            <Card className="h-full flex flex-col">
                <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Icon className="h-5 w-5 text-primary" /> {title}</CardTitle></CardHeader>
                <CardContent className="flex-grow overflow-hidden pl-2"><div className="space-y-4 h-full overflow-y-auto">{changelog.slice(0, 15).map((log, index) => (<div key={`${log.id}-${index}`} className="flex items-center gap-4 pr-4"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">{log.type === 'in' || log.type === 'received' ? <PackagePlus className="h-4 w-4 text-green-500" /> : log.type === 'out' ? <PackageMinus className="h-4 w-4 text-red-500" /> : <History className="h-4 w-4 text-gray-500" />}</div><div className="grid gap-1 flex-1"><p className="text-sm font-medium leading-none truncate">{log.itemName || 'Artikel'}</p><p className="text-sm text-muted-foreground">{getChangeLogActionText(log)} von {log.userName}</p></div><div className="ml-auto font-medium text-sm text-muted-foreground">{format(new Date(log.date), 'dd.MM HH:mm', { locale: de })}</div></div>))}</div></CardContent>
            </Card>
        </DraggableCardWrapper>
    );
};

const StatCard = ({ id, size, onSizeChange, title, value, icon: Icon, description, children }: { id: string; size: 'small' | 'default' | 'wide'; onSizeChange: (size: 'small' | 'default' | 'wide') => void; title: string; value: string | number; icon: React.ElementType; description: string; children?: React.ReactNode }) => {
    return (
        <DraggableCardWrapper id={id} currentSize={size} onSizeChange={onSizeChange}>
            {children ? (
                 <Collapsible asChild>
                     <Card className="h-full flex flex-col">
                        <CardTrigger className="w-full text-left flex-grow">
                           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                                <Icon className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{value}</div>
                                {size !== 'small' && <p className="text-xs text-muted-foreground">{description}</p>}
                            </CardContent>
                        </CardTrigger>
                        <CollapsibleContent><CardContent className="pt-4">{children}</CardContent></CollapsibleContent>
                     </Card>
                 </Collapsible>
            ) : (
                <Card className="h-full">
                   <div className={cn("flex h-full flex-col justify-between p-4", size === 'small' ? 'items-center justify-center text-center' : '')}>
                         <div className={cn("flex w-full items-start justify-between", size === 'small' ? 'flex-col items-center gap-1' : '')}>
                            <CardTitle className="text-sm font-medium">{title}</CardTitle>
                            {size !== 'small' && <Icon className="h-4 w-4 text-muted-foreground" />}
                         </div>
                        <div className={cn("mt-auto", size === 'small' ? 'text-center' : '')}>
                            <div className="text-2xl font-bold">{value}</div>
                            {size !== 'small' && <p className="text-xs text-muted-foreground">{description}</p>}
                        </div>
                    </div>
                </Card>
            )}
        </DraggableCardWrapper>
    );
};

const InventoryStatusCard = ({ id, size, onSizeChange }: { id: string; size: 'small' | 'default' | 'wide', onSizeChange: (size: 'small' | 'default' | 'wide') => void }) => {
    const { items } = useAppContext();
    const inventoryStatusData = React.useMemo(() => {
        const data = [
          { status: 'ok', name: 'Aktuell (< 8T)', value: 0, fill: 'hsl(var(--chart-2))' },
          { status: 'due', name: 'Fällig (8-30T)', value: 0, fill: 'hsl(var(--chart-3))' },
          { status: 'overdue', name: 'Überfällig (>30T)', value: 0, fill: 'hsl(var(--chart-5))' },
        ];
        if (!items) return data;
        items.forEach(item => {
          if (isInventoryItem(item)) {
            if (!item.lastInventoriedAt) {
              data[2].value++;
              return;
            }
            const allDates = Object.values(item.lastInventoriedAt).filter(Boolean) as string[];
            if (allDates.length === 0) {
              data[2].value++;
              return;
            }
            const latestDate = allDates.reduce((latest, current) => new Date(current) > new Date(latest) ? current : latest);
            const days = differenceInDays(new Date(), new Date(latestDate));
            
            if (days <= 7) data[0].value++;
            else if (days <= 30) data[1].value++;
            else data[2].value++;
          } else {
            // For machines, assume not inventoried or handle differently
            data[2].value++;
          }
        });
        return data.filter(d => d.value > 0);
    }, [items]);

    const chartConfig = {
        ok: { label: 'Aktuell', color: 'hsl(var(--chart-2))' },
        due: { label: 'Fällig', color: 'hsl(var(--chart-3))' },
        overdue: { label: 'Überfällig', color: 'hsl(var(--chart-5))' },
    } satisfies React.ComponentProps<typeof ChartContainer>["config"];

    return (
    <DraggableCardWrapper id={id} currentSize={size} onSizeChange={onSizeChange}>
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Inventurstatus</CardTitle>
        <CardDescription>Verteilung der Artikel nach letzter Zählung</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer config={chartConfig} className="mx-auto aspect-square h-full w-full">
            <PieChart>
                <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                <Pie data={inventoryStatusData} dataKey="value" nameKey="name" innerRadius={40} strokeWidth={5}>
                    {inventoryStatusData.map((entry) => (
                    <Cell key={entry.status} fill={entry.fill} className="focus:outline-none" />
                    ))}
                </Pie>
            </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
    </DraggableCardWrapper>
    )
}

const TurnoverCard = ({ id, size, onSizeChange }: { id: string; size: 'small' | 'default' | 'wide', onSizeChange: (size: 'small' | 'default' | 'wide') => void }) => {
    const { allChangelog } = useAppContext();
    const stockTurnoverData = React.useMemo(() => {
        const last30days = new Date();
        last30days.setDate(last30days.getDate() - 30);
        
        if (!allChangelog) return [];
        
        const ins = allChangelog.filter(log => log.type === 'in' && new Date(log.date) > last30days).reduce((acc, log) => acc + (log.quantity || 0), 0);
        const outs = allChangelog.filter(log => log.type === 'out' && new Date(log.date) > last30days).reduce((acc, log) => acc + (log.quantity || 0), 0);

        return [
            { name: 'Zugänge', value: ins, fill: 'hsl(var(--chart-2))' },
            { name: 'Abgänge', value: outs, fill: 'hsl(var(--chart-5))' },
        ];
    }, [allChangelog]);
    
    return (
    <DraggableCardWrapper id={id} currentSize={size} onSizeChange={onSizeChange}>
    <Card className="h-full flex flex-col">
       <CardHeader>
        <CardTitle>Lagerbewegungen</CardTitle>
        <CardDescription>Zugänge vs. Abgänge (letzte 30 Tage)</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer config={{}} className="h-full w-full">
            <BarChart data={stockTurnoverData} layout="vertical" margin={{left: 0, right: 10}}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} tick={{fill: "hsl(var(--muted-foreground))", fontSize: 12}} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                <Bar dataKey="value" radius={5} />
            </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
    </DraggableCardWrapper>
    )
}
