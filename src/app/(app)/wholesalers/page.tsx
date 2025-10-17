'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MoreHorizontal, PlusCircle, Pencil, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAppContext } from '@/context/AppContext';
import type { Wholesaler } from '@/lib/types';
import { useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';


export default function WholesalersPage() {
  const { wholesalers, setWholesalers } = useAppContext();
  const firestore = useFirestore();
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = React.useState(false);
  const [currentWholesaler, setCurrentWholesaler] = React.useState<Wholesaler | null>(null);
  const { toast } = useToast();

  const handleOpenForm = (wholesaler: Wholesaler | null) => {
    setCurrentWholesaler(wholesaler);
    setIsFormOpen(true);
  };

  const handleOpenDeleteConfirm = (wholesaler: Wholesaler) => {
    setCurrentWholesaler(wholesaler);
    setIsDeleteConfirmOpen(true);
  };

  const handleSaveWholesaler = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;

    if (!name) {
      toast({ title: 'Fehler', description: 'Name des Großhändlers ist ein Pflichtfeld.', variant: 'destructive' });
      return;
    }

    if (currentWholesaler) {
      // Edit wholesaler
      setWholesalers(wholesalers.map(w => (w.id === currentWholesaler.id ? { ...w, name } : w)));
      toast({ title: 'Erfolg!', description: 'Großhändler wurde aktualisiert.' });
    } else {
      // Add new wholesaler
      const newWholesaler: Wholesaler = {
        id: new Date().toISOString(),
        name,
      };
      setWholesalers([...wholesalers, newWholesaler]);
      toast({ title: 'Erfolg!', description: 'Großhändler wurde hinzugefügt.' });
    }

    setIsFormOpen(false);
    setCurrentWholesaler(null);
  };

  const handleDeleteWholesaler = () => {
    if (currentWholesaler) {
      // Note: This does not handle cleaning up references in inventory items.
      // A more robust solution would do that.
      const wholesalerRef = doc(firestore, 'wholesalers', currentWholesaler.id);
      deleteDocumentNonBlocking(wholesalerRef);
      toast({ title: 'Erfolg!', description: 'Großhändler wurde gelöscht.', variant: 'destructive' });
    }
    setIsDeleteConfirmOpen(false);
    setCurrentWholesaler(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl">Großhändler</h1>
        <div className="ml-auto">
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-8 gap-1" onClick={() => handleOpenForm(null)}>
                <PlusCircle className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Großhändler anlegen</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleSaveWholesaler}>
                <DialogHeader>
                  <DialogTitle>{currentWholesaler ? 'Großhändler bearbeiten' : 'Neuen Großhändler anlegen'}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">Name</Label>
                    <Input id="name" name="name" defaultValue={currentWholesaler?.name} className="col-span-3" required />
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
          <CardTitle>Großhändler</CardTitle>
          <CardDescription>Verwalten Sie hier Ihre Großhändler.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>
                  <span className="sr-only">Aktionen</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {wholesalers.map(wholesaler => (
                <TableRow key={wholesaler.id}>
                  <TableCell className="font-medium">{wholesaler.name}</TableCell>
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
                        <DropdownMenuItem onSelect={() => handleOpenForm(wholesaler)}>
                          <Pencil className="mr-2 h-4 w-4" /> Bearbeiten
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => handleOpenDeleteConfirm(wholesaler)} className="text-destructive">
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
              Möchten Sie den Großhändler &quot;{currentWholesaler?.name}&quot; wirklich löschen?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsDeleteConfirmOpen(false)}>Abbrechen</Button>
            <Button variant="destructive" onClick={handleDeleteWholesaler}>Löschen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
