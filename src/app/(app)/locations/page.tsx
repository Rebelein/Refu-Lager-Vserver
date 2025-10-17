
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MoreHorizontal, PlusCircle, Pencil, Trash2, Truck, Warehouse, Star } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAppContext } from '@/context/AppContext';
import type { Location } from '@/lib/types';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export default function LocationsPage() {
  const { locations, setLocations, currentUser, updateUserSettings } = useAppContext();
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = React.useState(false);
  const [currentLocation, setCurrentLocation] = React.useState<Location | null>(null);
  const [isVehicle, setIsVehicle] = React.useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleOpenForm = (location: Location | null) => {
    setCurrentLocation(location);
    setIsVehicle(location?.isVehicle || false);
    setIsFormOpen(true);
  };

  const handleOpenDeleteConfirm = (location: Location) => {
    setCurrentLocation(location);
    setIsDeleteConfirmOpen(true);
  };

  const handleSaveLocation = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;

    if (!name) {
      toast({ title: 'Fehler', description: 'Name des Lagerorts ist ein Pflichtfeld.', variant: 'destructive' });
      return;
    }

    if (currentLocation) {
      setLocations(locations.map(l => (l.id === currentLocation.id ? { ...l, name, isVehicle } : l)));
      toast({ title: 'Erfolg!', description: 'Lagerort wurde aktualisiert.' });
    } else {
      const newLocation: Location = {
        id: new Date().toISOString(),
        name,
        isVehicle,
      };
      setLocations([...locations, newLocation]);
      toast({ title: 'Erfolg!', description: 'Lagerort wurde hinzugefügt.' });
    }

    setIsFormOpen(false);
    setCurrentLocation(null);
  };

  const handleDeleteLocation = () => {
    if (currentLocation) {
      if (locations.length === 1) {
        toast({ title: 'Fehler', description: 'Der letzte Lagerort kann nicht gelöscht werden.', variant: 'destructive' });
        setIsDeleteConfirmOpen(false);
        return;
      }
      setLocations(locations.filter(l => l.id !== currentLocation.id));
      if (currentUser?.favoriteLocationId === currentLocation.id) {
        updateUserSettings({ favoriteLocationId: '' });
      }
      toast({ title: 'Erfolg!', description: 'Lagerort wurde gelöscht.', variant: 'destructive' });
    }
    setIsDeleteConfirmOpen(false);
    setCurrentLocation(null);
  };

  const handleSetFavorite = (locationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    updateUserSettings({ favoriteLocationId: locationId });
    toast({ title: 'Favorit gesetzt', description: 'Dieser Lagerort wird nun standardmäßig angezeigt.' });
  };
  
  if (!locations || !currentUser) {
      return <div>Laden...</div>
  }

  const handleRowClick = (locationId: string) => {
    router.push(`/locations/${locationId}`);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl">Lagerorte</h1>
        <div className="ml-auto">
          <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
            if(!isOpen) setCurrentLocation(null);
            setIsFormOpen(isOpen);
          }}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-8 gap-1" onClick={() => handleOpenForm(null)}>
                <PlusCircle className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Lagerort anlegen</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleSaveLocation}>
                <DialogHeader>
                  <DialogTitle>{currentLocation ? 'Lagerort bearbeiten' : 'Neuen Lagerort anlegen'}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">Name</Label>
                    <Input id="name" name="name" defaultValue={currentLocation?.name} className="col-span-3" required />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="isVehicle" className="text-right">Fahrzeug</Label>
                    <Checkbox id="isVehicle" name="isVehicle" checked={isVehicle} onCheckedChange={(checked) => setIsVehicle(!!checked)} />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="secondary">Abbrechen</Button>
                  </DialogClose>
                  <Button type="submit">Speichern</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lagerorte</CardTitle>
          <CardDescription>Verwalten Sie hier Ihre Haupt- und Fahrzeuglager. Klicken Sie auf einen Ort, um dessen Lagerplätze zu verwalten.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Typ</TableHead>
                <TableHead>
                  <span className="sr-only">Aktionen</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {locations.map(location => (
                <TableRow 
                  key={location.id} 
                  className={cn("cursor-pointer", currentUser?.favoriteLocationId === location.id && "bg-secondary")}
                  onClick={() => handleRowClick(location.id)}
                >
                   <TableCell onClick={(e) => handleSetFavorite(location.id, e)}>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Als Favorit markieren"
                    >
                      <Star
                        className={cn(
                          'h-5 w-5',
                          currentUser?.favoriteLocationId === location.id
                            ? 'fill-yellow-400 text-yellow-500'
                            : 'text-muted-foreground'
                        )}
                      />
                    </Button>
                  </TableCell>
                  <TableCell className="font-medium">{location.name}</TableCell>
                  <TableCell>
                    <span className="flex items-center gap-2">
                        {location.isVehicle ? <Truck className="h-4 w-4 text-muted-foreground" /> : <Warehouse className="h-4 w-4 text-muted-foreground" />}
                        {location.isVehicle ? 'Fahrzeug' : 'Hauptlager'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Menü</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Aktionen</DropdownMenuLabel>
                        <DropdownMenuItem onSelect={() => handleOpenForm(location)}>
                          <Pencil className="mr-2 h-4 w-4" /> Bearbeiten
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => handleOpenDeleteConfirm(location)} className="text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" /> Löschen
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sind Sie sicher?</DialogTitle>
            <DialogDescription>
              Möchten Sie den Lagerort &quot;{currentLocation?.name}&quot; wirklich löschen? Alle zugehörigen Bestände gehen verloren. Diese Aktion kann nicht rückgängig gemacht werden.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsDeleteConfirmOpen(false)}>Abbrechen</Button>
            <Button variant="destructive" onClick={handleDeleteLocation}>Löschen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
