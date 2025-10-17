
'use client';

import * as React from 'react';
import { Bell, Package, ShoppingCart, Wrench, X, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { useAppContext } from '@/context/AppContext';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';

const getNotificationIcon = (type: string) => {
    switch (type) {
        case 'orderSuggestion':
            return <ShoppingCart className="h-4 w-4" />;
        case 'rentedMachine':
            return <Wrench className="h-4 w-4" />;
        case 'orderStatus':
             return <Package className="h-4 w-4" />;
        default:
            return <Bell className="h-4 w-4" />;
    }
}

export function NotificationBell() {
  const { notifications, markNotificationsAsRead, dismissNotification, dismissAllNotifications } = useAppContext();
  const router = useRouter();
  const [isOpen, setIsOpen] = React.useState(false);

  const unreadCount = (notifications || []).filter(n => !n.read).length;

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open && unreadCount > 0) {
      // Mark as read when the popover opens
      markNotificationsAsRead();
    }
  };
  
  const handleNotificationClick = (href: string) => {
      router.push(href);
      setIsOpen(false);
  }

  const handleDismiss = (e: React.MouseEvent, notificationId: string) => {
      e.stopPropagation();
      dismissNotification(notificationId);
  }

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="relative h-8 w-8">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full p-0"
            >
              {unreadCount}
            </Badge>
          )}
          <span className="sr-only">Benachrichtigungen öffnen</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0">
        <div className="p-4 font-semibold border-b">Benachrichtigungen</div>
        <div className="max-h-96 overflow-y-auto">
            {(notifications || []).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center p-8">Keine neuen Benachrichtigungen.</p>
            ) : (
                notifications.map(notification => (
                    <div 
                        key={notification.id} 
                        className={cn(
                            "group relative flex items-start gap-4 p-4 border-b hover:bg-muted/50 cursor-pointer",
                            !notification.read && "bg-accent/20"
                        )}
                        onClick={() => handleNotificationClick(notification.href)}
                    >
                        <div className="mt-1">
                            {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-medium">{notification.title}</p>
                            <p className="text-sm text-muted-foreground">{notification.description}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                {formatDistanceToNow(new Date(notification.date), { addSuffix: true, locale: de })}
                            </p>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100"
                            onClick={(e) => handleDismiss(e, notification.id)}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                ))
            )}
        </div>
        {(notifications || []).length > 0 && (
            <div className="p-2 border-t">
                <Button variant="ghost" size="sm" className="w-full" onClick={dismissAllNotifications}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Alle löschen
                </Button>
            </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
