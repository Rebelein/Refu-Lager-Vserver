'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MoreHorizontal, Pencil, Trash2, ArrowLeft } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAppContext } from '@/context/AppContext';
// import type { InventoryItem } from '@/lib/types';
import Link from 'next/link';

export default function StoragePlacesPage() {
  const params = useParams<{ locationId: string }>();
  const locationId = React.useMemo(() => params.locationId ? decodeURIComponent(params.locationId) : '', [params.locationId]);
  const router = useRouter();
  const { items, locations, updateItem, currentUser } = useAppContext();
  const { toast } = useToast();

  const [isRenameOpen, setIsRenameOpen] = React.useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [currentPlace, setCurrentPlace] = React.useState<string | null>(null);
  const [newPlaceName, setNewPlaceName] = React.useState('');

  const location = React.useMemo(() => locations.find(l => l.id === locationId), [locations, locationId]);

  const storagePlaces = React.useMemo(() => {
    const places = new Set<string>();
    items
      .filter(item => item.stocks.some(s => s.locationId === locationId) && item.mainLocation)
      .forEach(item => places.add(item.mainLocation));
    return Array.from(places).sort();
  }, [items, locationId]);

  if (!location) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-lg font-semibold">Lagerort nicht gefunden.</p>
            <p className="text-muted-foreground">Der angegebene Lagerort konnte nicht geladen werden.</p>
            <Button asChild className="mt-4">
                <Link href="/locations">Zurück zur Übersicht</Link>
            </Button>
        </div>
    );
  }
  
  const handleRename = () => {
    if (!currentPlace || !newPlaceName.trim() || !currentUser) {
        toast({ title: 'Fehler', description: 'Neuer Name darf nicht leer sein.', variant: 'destructive'});
        return;
    }

    const itemsToUpdate = items.filter(item => 
        item.mainLocation === currentPlace && item.stocks.some(s => s.locationId === locationId)
    );

    if (storagePlaces.includes(newPlaceName.trim())) {
        toast({ title: 'Fehler', description: 'Ein Lagerplatz mit diesem Namen existiert bereits.', variant: 'destructive'});
        return;
    }
    
    const now = new Date().toISOString();

    itemsToUpdate.forEach(item => {
        const logEntry = {
            id: `${now}-${Math.random()}`,
            date: now,
            userId: currentUser.id,
            userName: currentUser.name,
            type: 'update' as const,
            details: `Lagerplatz von "${currentPlace}" zu "${newPlaceName.trim()}" geändert.`,
            locationId: locationId,
        };
        updateItem(item.id, { mainLocation: newPlaceName.trim(), changelog: [...item.changelog, logEntry] });
    });
    
    toast({ title: 'Lagerplatz umbenannt', description: `${itemsToUpdate.length} Artikel wurden aktualisiert.` });
    setIsRenameOpen(false);
    setCurrentPlace(null);
    setNewPlaceName('');
  };

  const handleDelete = () => {
    if (!currentPlace || !currentUser) return;
    
    const itemsToUpdate = items.filter(item => 
        item.mainLocation === currentPlace && item.stocks.some(s => s.locationId === locationId)
    );

    const now = new Date().toISOString();

    itemsToUpdate.forEach(item => {
        const logEntry = {
            id: `${now}-${Math.random()}`,
            date: now,
            userId: currentUser.id,
            userName: currentUser.name,
            type: 'update' as const,
            details: `Lagerplatz "${currentPlace}" wurde gelöscht.`,
            locationId: locationId,
        };
        updateItem(item.id, { mainLocation: '', changelog: [...item.changelog, logEntry] });
    });

    toast({ title: 'Lagerplatz gelöscht', description: `Der Lagerplatz wurde bei ${itemsToUpdate.length} Artikeln entfernt.`, variant: 'destructive' });
    setIsDeleteOpen(false);
    setCurrentPlace(null);
  };
  
  const getArticleCountForPlace = (placeName: string) => {
    return items.filter(item => item.mainLocation === placeName && item.stocks.some(s => s.locationId === locationId)).length;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
         <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => router.push('/locations')}>
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Zurück</span>
        </Button>
        <div>
            <h1 className="text-lg font-semibold md:text-2xl">Lagerplätze für: {location.name}</h1>
            <p className="text-sm text-muted-foreground">Verwalten Sie hier die übergeordneten Lagerplätze (z.B. Regale).</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lagerplatz-Liste</CardTitle>
          <CardDescription>Hier sehen Sie alle eindeutigen Lagerplätze, die in diesem Lagerort verwendet werden.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name des Lagerplatzes</TableHead>
                <TableHead className="text-right">Anzahl Artikel</TableHead>
                <TableHead className="w-[100px]">
                  <span className="sr-only">Aktionen</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {storagePlaces.length > 0 ? storagePlaces.map(place => (
                <TableRow key={place}>
                  <TableCell className="font-medium">{place}</TableCell>
                  <TableCell className="text-right">{getArticleCountForPlace(place)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Menü</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Aktionen</DropdownMenuLabel>
                        <DropdownMenuItem onSelect={() => { setCurrentPlace(place); setNewPlaceName(place); setIsRenameOpen(true); }}>
                          <Pencil className="mr-2 h-4 w-4" /> Umbenennen
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => { setCurrentPlace(place); setIsDeleteOpen(true); }} className="text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" /> Löschen
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center">In diesem Lagerort werden noch keine Lagerplätze verwendet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Rename Dialog */}
      <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Lagerplatz umbenennen</DialogTitle>
                <DialogDescription>
                    Der neue Name wird für alle {getArticleCountForPlace(currentPlace || '')} Artikel an diesem Lagerplatz übernommen.
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="new-name" className="text-right">Neuer Name</Label>
                <Input 
                    id="new-name" 
                    value={newPlaceName} 
                    onChange={(e) => setNewPlaceName(e.target.value)} 
                    className="col-span-3"
                />
                </div>
            </div>
            <DialogFooter>
                <Button variant="secondary" onClick={() => setIsRenameOpen(false)}>Abbrechen</Button>
                <Button onClick={handleRename}>Umbenennen</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Sind Sie sicher?</AlertDialogTitle>
                <AlertDialogDescription>
                    Möchten Sie den Lagerplatz &quot;{currentPlace}&quot; wirklich löschen? Der Name wird bei {getArticleCountForPlace(currentPlace || '')} Artikeln entfernt. Diese Aktion kann nicht rückgängig gemacht werden.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Ja, löschen</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
