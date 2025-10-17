
'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { useAppContext } from '@/context/AppContext';
import { User } from '@/lib/types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function UserSelectionDialog() {
  const {
    isUserSelectionRequired,
    users,
    setCurrentUser,
    addUser,
  } = useAppContext();
  const [showNewUserForm, setShowNewUserForm] = React.useState(false);
  const [newUserName, setNewUserName] = React.useState('');

  const handleSelectUser = (user: User) => {
    setCurrentUser(user);
  };

  const handleCreateUser = () => {
    if (newUserName.trim()) {
      addUser(newUserName.trim());
      setNewUserName('');
      setShowNewUserForm(false);
    }
  };

  return (
    <Dialog open={isUserSelectionRequired}>
      <DialogContent
        className="sm:max-w-[425px]"
        onInteractOutside={e => e.preventDefault()}
        hideCloseButton={true}
      >
        <DialogHeader>
          <DialogTitle>Willkommen!</DialogTitle>
          <DialogDescription>
            Wählen Sie bitte Ihren Benutzer aus oder legen Sie einen neuen an, um
            fortzufahren.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {showNewUserForm ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-user-name">Ihr Name</Label>
                <Input
                  id="new-user-name"
                  value={newUserName}
                  onChange={e => setNewUserName(e.target.value)}
                  placeholder="Max Mustermann"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  onClick={() => setShowNewUserForm(false)}
                >
                  Zurück
                </Button>
                <Button onClick={handleCreateUser} disabled={!newUserName.trim()}>
                  Benutzer anlegen
                </Button>
              </div>
            </div>
          ) : (
            <Command>
              <CommandInput placeholder="Benutzer suchen..." onValueChange={() => {}} />
              <CommandList>
                <CommandEmpty>Keine Benutzer gefunden.</CommandEmpty>
                <CommandGroup>
                  {users.map(user => (
                    <CommandItem
                      key={user.id}
                      onSelect={() => handleSelectUser(user)}
                      className="flex items-center gap-3"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {user.name
                            .split(' ')
                            .map(n => n[0])
                            .join('')}
                        </AvatarFallback>
                      </Avatar>
                      <span>{user.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          )}
        </div>
        {!showNewUserForm && (
          <DialogFooter>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowNewUserForm(true)}
            >
              Neuen Benutzer anlegen
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
