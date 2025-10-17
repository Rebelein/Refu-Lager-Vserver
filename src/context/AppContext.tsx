

'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { InventoryItem, User, Wholesaler, ChangeLogEntry, Order, Location, YearlyInventoryExportRow, StockTurnover, AnalysisData, OrderItem, Notification, AppSettings, DashboardLayout, DashboardCardLayout, Machine, ReorderStatus } from '@/lib/types';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useMemoFirebase } from '@/firebase';
import { collection, doc } from '@/firebase';
import { useFirestore } from '@/firebase/provider';
import { setDocumentNonBlocking, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { startOfMonth, startOfYear, endOfYear, format as formatDate, subDays } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { initialUsers, initialWholesalers, initialLocations, initialInventory, initialOrders, initialMachines } from '@/lib/data';

interface AppContextType {
  isLoading: boolean;
  isUserSelectionRequired: boolean;
  items: (InventoryItem | Machine)[];
  addItem: (item: InventoryItem) => void;
  updateItem: (itemId: string, data: Partial<InventoryItem | Machine>, isMachine?: boolean) => void;
  users: User[];
  setUsers: (users: User[]) => void;
  addUser: (name: string) => void;
  wholesalers: Wholesaler[];
  setWholesalers: (wholesalers: Wholesaler[]) => void;
  orders: Order[];
  setOrders: (orders: Order[]) => void;
  locations: Location[];
  setLocations: (locations: Location[]) => void;
  appSettings: AppSettings;
  updateAppSettings: (settings: AppSettings) => void;
  currentUser: User | null;
  favoriteUser: User | null;
  setCurrentUser: (user: User | null) => void;
  setActiveUser: (user: User | null) => void;
  setFavoriteUser: (user: User) => void;
  updateUserSettings: (settings: Partial<Omit<User, 'id' | 'name'>>) => void;
  allChangelog: ChangeLogEntry[];
  inventoryCounts: { userId: string; userName: string; count: number }[];
  latestInventoryLogs: ChangeLogEntry[];
  createOrder: (wholesalerId: string, itemsToOrder: InventoryItem[], locationId: string, isVehicleRequest: boolean) => Order;
  addItemsToOrder: (orderId: string, itemsToAdd: InventoryItem[], locationId: string) => void;
  confirmOrder: (orderId: string) => void;
  receiveOrderItem: (orderId: string, itemId: string, quantity: number, commissionOnly: boolean) => void;
  loadCommissionedItem: (orderId: string, itemId: string) => void;
  removeItemFromDraftOrder: (orderId: string, itemId: string) => void;
  cancelArrangedOrder: (itemIds: string[], locationId: string) => void;
  removeSingleItemFromArrangedOrder: (itemId: string, locationId: string) => void;
  removeItemFromLocation: (itemId: string, locationId: string) => void;
  addItemToLocation: (itemId: string, locationId: string) => void;
  transferStock: (itemId: string, fromLocationId: string, toLocationId: string, quantity: number) => void;
  bulkImportItems: (csvData: string, locationId: string) => number;
  handleQuickStockChange: (itemId: string, locationId: string, type: 'in' | 'out' | 'inventory', quantity: number) => void;
  getYearlyInventory: (year: number) => YearlyInventoryExportRow[];
  getAvailableYears: () => number[];
  getAnalysisData: (year: number, locationId: string) => AnalysisData;
  openDetailView: (item: InventoryItem | Machine, tab?: string) => void;
  isDetailViewOpen: boolean;
  setIsDetailViewOpen: React.Dispatch<React.SetStateAction<boolean>>;
  currentItem: InventoryItem | Machine | null;
  detailViewTab: string;
  notifications: Notification[];
  markNotificationsAsRead: () => void;
  dismissNotification: (notificationId: string) => void;
  dismissAllNotifications: () => void;
  dashboardLayout: DashboardLayout;
  setDashboardLayout: (layout: DashboardCardLayout[]) => void;
  allDashboardCards: DashboardCardLayout[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const allDashboardCards: DashboardCardLayout[] = [
    { id: 'machines', size: 'default' },
    { id: 'lowStock', size: 'default' },
    { id: 'arranged', size: 'default' },
    { id: 'ordered', size: 'default' },
    { id: 'totalItems', size: 'small' },
    { id: 'totalStock', size: 'small' },
    { id: 'main-warehouse-activities', size: 'default' },
    { id: 'other-locations-activities', size: 'default' },
    { id: 'inventory-status', size: 'default' },
    { id: 'turnover', size: 'default' },
];

export function AppProvider({ children }: { children: React.ReactNode }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [currentUser, setActiveUser] = useState<User | null>(null);
  const [favoriteUser, setFavoriteUserInternal] = useState<User | null>(null);
  
  const [isDetailViewOpen, setIsDetailViewOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<InventoryItem | Machine | null>(null);
  const [detailViewTab, setDetailViewTab] = useState('overview');

  const [readNotificationIds, setReadNotificationIds] = useState<Set<string>>(new Set());
  const [dismissedNotificationIds, setDismissedNotificationIds] = useState<Set<string>>(new Set());
  
  const [dashboardLayout, setDashboardLayoutState] = useState<DashboardCardLayout[]>(allDashboardCards);


  const { data: usersData, isLoading: usersLoading } = useCollection<User>(useMemoFirebase(() => collection(firestore, 'users'), [firestore]));
  const { data: wholesalersData, isLoading: wholesalersLoading } = useCollection<Wholesaler>(useMemoFirebase(() => collection(firestore, 'wholesalers'), [firestore]));
  const { data: locationsData, isLoading: locationsLoading } = useCollection<Location>(useMemoFirebase(() => collection(firestore, 'locations'), [firestore]));
  const { data: articlesData, isLoading: articlesLoading } = useCollection<InventoryItem>(useMemoFirebase(() => collection(firestore, 'articles'), [firestore]));
  const { data: machinesData, isLoading: machinesLoading } = useCollection<Machine>(useMemoFirebase(() => collection(firestore, 'machines'), [firestore]));
  const { data: ordersData, isLoading: ordersLoading } = useCollection<Order>(useMemoFirebase(() => collection(firestore, 'orders'), [firestore]));
  const { data: settingsData, isLoading: settingsLoading } = useDoc<AppSettings>(useMemoFirebase(() => doc(firestore, 'app_settings', 'global'), [firestore]));

  const users = useMemo(() => usersData || initialUsers, [usersData]);
  const wholesalers = useMemo(() => wholesalersData || initialWholesalers, [wholesalersData]);
  const locations = useMemo(() => locationsData || initialLocations, [locationsData]);
  const orders = useMemo(() => ordersData || initialOrders, [ordersData]);
  const appSettings = useMemo(() => settingsData || {}, [settingsData]);

  const items = useMemo(() => {
    const articles = articlesData || initialInventory;
    const machines = machinesData || initialMachines;
    return [...articles, ...machines];
  }, [articlesData, machinesData]);
  
  const isLoading = articlesLoading || machinesLoading || usersLoading || wholesalersLoading || ordersLoading || locationsLoading || settingsLoading;
  const isUserSelectionRequired = !usersLoading && !currentUser;

  const allChangelog = useMemo(() => {
    return items
      .filter((item): item is InventoryItem => item.itemType === 'item')
      .flatMap(item => 
        (item.changelog || []).map(log => ({
          ...log,
          itemId: item.id,
          itemName: item.name,
        }))
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [items]);

  useEffect(() => {
    try {
      const savedLayout = localStorage.getItem('dashboardLayout');
      if (savedLayout) {
        const parsedLayout = JSON.parse(savedLayout) as DashboardCardLayout[];
        
        if (Array.isArray(parsedLayout) && parsedLayout.every(item => typeof item.id === 'string' && typeof item.size === 'string')) {
          const layoutMap = new Map(parsedLayout.map(item => [item.id, item]));
          const newLayout = allDashboardCards.map(defaultCard => 
            layoutMap.has(defaultCard.id) ? layoutMap.get(defaultCard.id)! : defaultCard
          );
          setDashboardLayoutState(newLayout);
        }
      }
    } catch (e) {
      console.error("Failed to load dashboard layout from localStorage", e);
    }
  }, []);

  const setDashboardLayout = (layout: DashboardCardLayout[]) => {
      setDashboardLayoutState(layout);
      try {
          localStorage.setItem('dashboardLayout', JSON.stringify(layout));
      } catch (e) {
          console.error("Failed to save dashboard layout to localStorage", e);
      }
  };

  const setCurrentUser = useCallback((user: User | null) => {
    setActiveUser(user);
    if (user) {
      try {
        localStorage.setItem('favoriteUserId', user.id);
      } catch (error) {
        console.error("Could not save favorite user ID to localStorage:", error);
      }
    }
  }, []);

  const setFavoriteUser = useCallback((user: User) => {
    setFavoriteUserInternal(user);
    setActiveUser(user);
    try {
      localStorage.setItem('favoriteUserId', user.id);
    } catch (error) {
      console.error("Could not save favorite user ID to localStorage:", error);
    }
  }, []);
  
  useEffect(() => {
    if (!usersLoading && users.length > 0 && !currentUser) {
      try {
        const favoriteUserId = localStorage.getItem('favoriteUserId');
        const user = users.find(u => u.id === favoriteUserId);
        if (user) {
          setFavoriteUserInternal(user);
          setActiveUser(user);
        }
      } catch (error) {
        console.error("Could not read favorite user ID from localStorage:", error);
      }
    }
  }, [users, usersLoading, currentUser]);

  
  const updateAppSettings = useCallback((settings: AppSettings) => {
    if (!firestore) return;
    const settingsRef = doc(firestore, 'app_settings', 'global');
    //mongodb
    setDocumentNonBlocking(settingsRef, settings, { merge: true });
  }, [firestore]);


  const notifications = useMemo<Notification[]>(() => {
    if (isLoading) {
      return [];
    }
    const twentyFourHoursAgo = subDays(new Date(), 1);
    const mainWarehouse = locations.find(l => !l.isVehicle);
    const mainWarehouseId = mainWarehouse?.id || 'main';

    const generated: Notification[] = [];
    
    // 1. New Items Created
    const newItemsLogs = allChangelog.filter(log => log.type === 'initial' && new Date(log.date) > twentyFourHoursAgo);
    newItemsLogs.forEach(log => {
       const id = `new-item-${log.itemId}`;
       generated.push({
           id,
           type: 'newItem',
           title: 'Neuer Artikel',
           description: `"${log.itemName}" wurde von ${log.userName} angelegt.`,
           date: log.date,
           href: `/inventory-list`,
           read: readNotificationIds.has(id),
       });
    });

    // 2. Minimum Stock Breach (Main Warehouse only)
    items.forEach(item => {
        if(item.itemType === 'machine') return;
        const mainStock = (item.stocks || []).find(s => s.locationId === mainWarehouseId);
        const mainMinStock = (item.minStocks || []).find(ms => ms.locationId === mainWarehouseId);

        if (mainStock && mainMinStock && mainStock.quantity < mainMinStock.quantity) {
             const id = `min-stock-${item.id}`;
             generated.push({
                id,
                type: 'minStock',
                title: 'Mindestbestand unterschritten',
                description: `Bestand von "${item.name}" im Hauptlager ist niedrig.`,
                date: new Date().toISOString(),
                href: `/inventory-list`,
                read: readNotificationIds.has(id),
            });
        }
    });
    
    // 3. Main Warehouse Order Placed
    const mainWarehouseOrders = orders.filter(order => order.locationId === mainWarehouseId && order.status === 'ordered' && new Date(order.date) > twentyFourHoursAgo);
    mainWarehouseOrders.forEach(order => {
        const id = `order-placed-${order.id}`;
        generated.push({
            id,
            type: 'orderStatus',
            title: 'Hauptlager Bestellung',
            description: `Bestellung ${order.orderNumber} wurde ausgelöst.`,
            date: order.date,
            href: '/order-history',
            read: readNotificationIds.has(id),
        });
    });

    // 4. Main Warehouse Delivery Received
    const receivedLogs = allChangelog.filter(log => 
        log.type === 'received' && 
        log.locationId === mainWarehouseId &&
        new Date(log.date) > twentyFourHoursAgo
    );
    receivedLogs.forEach(log => {
        const id = `delivery-${log.id}`;
        generated.push({
            id,
            type: 'delivery',
            title: 'Lieferung eingegangen',
            description: `Lieferung für "${log.itemName}" im Hauptlager verbucht.`,
            date: log.date,
            href: '/order-history',
            read: readNotificationIds.has(id),
        });
    });


    // 5. Rented machines by current user (if user is selected)
    if (currentUser) {
        const userRentedMachines = items.filter((item): item is Machine =>
            item.itemType === 'machine' &&
            item.rentalStatus === 'rented' &&
            item.rentedBy?.type === 'user' &&
            item.rentedBy?.id === currentUser.id
        );

        userRentedMachines.forEach(machine => {
            const id = `rented-${machine.id}`;
            generated.push({
                id: id,
                type: 'rentedMachine',
                title: 'Maschine ausgeliehen',
                description: `Sie haben "${machine.name}" ausgeliehen.`,
                date: machine.rentalHistory?.find(h => h.type === 'rented')?.date || new Date().toISOString(),
                href: '/machines',
                read: readNotificationIds.has(id),
                userId: currentUser.id,
            });
        });
    }
    
    return generated
      .filter(n => !dismissedNotificationIds.has(n.id))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [items, orders, currentUser, isLoading, readNotificationIds, dismissedNotificationIds, locations, allChangelog]);


  const markNotificationsAsRead = useCallback(() => {
    setReadNotificationIds(prev => {
        const newReadIds = new Set(prev);
        notifications.forEach(n => newReadIds.add(n.id));
        return newReadIds;
    });
  }, [notifications]);
  
  const dismissNotification = useCallback((notificationId: string) => {
    setDismissedNotificationIds(prev => new Set(prev).add(notificationId));
  }, []);

  const dismissAllNotifications = useCallback(() => {
    setDismissedNotificationIds(new Set(notifications.map(n => n.id)));
  }, [notifications]);

  const addItem = useCallback((newItem: InventoryItem) => {
    if (!firestore) return;
    const itemRef = doc(firestore, 'articles', newItem.id);
    //mongodb
    setDocumentNonBlocking(itemRef, newItem, { merge: true });
  }, [firestore]);

    const updateItem = useCallback((itemId: string, data: Partial<InventoryItem | Machine>, isMachine: boolean = false) => {
        if (!firestore) return;
        const collectionName = isMachine ? 'machines' : 'articles';
        const itemRef = doc(firestore, collectionName, itemId);

        const isNewItem = !items.some(i => i.id === itemId);

        if (isNewItem) {
            //mongodb
            setDocumentNonBlocking(itemRef, data, { merge: true });
        } else {
            //mongodb
            updateDocumentNonBlocking(itemRef, data);
        }
    }, [firestore, items]);

  const setUsers = useCallback((newUsers: User[]) => {
      if (!firestore) return;
      newUsers.forEach(user => {
          const userRef = doc(firestore, 'users', user.id);
          //mongodb
          setDocumentNonBlocking(userRef, user, { merge: true });
      });
  }, [firestore]);

  const addUser = useCallback((name: string) => {
    if (!firestore) return;
    const newUser: User = {
      id: new Date().toISOString(),
      name,
    };
    const userRef = doc(firestore, 'users', newUser.id);
    //mongodb
    setDocumentNonBlocking(userRef, newUser, { merge: true });
    setCurrentUser(newUser); // Set new user as active
  }, [firestore, setCurrentUser]);

  const updateUserSettings = useCallback((settings: Partial<Omit<User, 'id' | 'name'>>) => {
    if (!currentUser || !firestore) return;
    const updatedUser = { ...currentUser, ...settings };
    setActiveUser(updatedUser);
    const userRef = doc(firestore, 'users', currentUser.id);
    //mongodb
    updateDocumentNonBlocking(userRef, settings);
  }, [currentUser, firestore]);

  const setWholesalers = useCallback((newWholesalers: Wholesaler[]) => {
      if (!firestore) return;
      newWholesalers.forEach(wholesaler => {
          const wholesalerRef = doc(firestore, 'wholesalers', wholesaler.id);
          //mongodb
          setDocumentNonBlocking(wholesalerRef, wholesaler, { merge: true });
      });
  }, [firestore]);

    const setOrders = useCallback((newOrders: Order[]) => {
        if (!firestore) return;
        newOrders.forEach(order => {
            const orderRef = doc(firestore, 'orders', order.id);
            //mongodb
            setDocumentNonBlocking(orderRef, order, { merge: true });
        });
    }, [firestore]);

    const setLocations = useCallback((newLocations: Location[]) => {
        if (!firestore) return;
        newLocations.forEach(location => {
            const locationRef = doc(firestore, 'locations', location.id);
            //mongodb
            setDocumentNonBlocking(locationRef, location, { merge: true });
        });
    }, [firestore]);
    
  const latestInventoryLogs = useMemo(() => {
    return allChangelog.filter(log => log.type === 'inventory');
  }, [allChangelog]);

  const inventoryCounts = useMemo(() => {
    const firstDayOfMonth = startOfMonth(new Date());
    const counts = latestInventoryLogs
      .filter(log => new Date(log.date) >= firstDayOfMonth)
      .reduce((acc, log) => {
        if (!acc[log.userId]) {
          acc[log.userId] = { userId: log.userId, userName: log.userName, count: 0 };
        }
        acc[log.userId].count++;
        return acc;
      }, {} as { [userId: string]: { userId: string; userName: string; count: number } });

    return Object.values(counts).sort((a, b) => b.count - a.count);
  }, [latestInventoryLogs]);

   const updateItemsToOrdered = useCallback((itemsToUpdate: InventoryItem[], order: Order, markAsOrdered: boolean, locationId: string) => {
    if (!currentUser || !firestore) return;
    
    itemsToUpdate.forEach(item => {
        const itemRef = doc(firestore, 'articles', item.id);
        const logDate = new Date();
        const latestUpdateLog = (item.changelog || [])
            .filter(log => log.type === 'update')
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
        
        const newLogEntry: ChangeLogEntry | null = markAsOrdered ? {
            id: `${logDate.toISOString()}-${Math.random()}`,
            date: logDate.toISOString(),
            userId: currentUser.id,
            userName: currentUser.name,
            type: 'reordered',
            details: `Bestellt mit Bestell-Nr. ${order.orderNumber}`,
            locationId,
        } : null;

        const updatedChangelog = newLogEntry ? [...(item.changelog || []), newLogEntry] : item.changelog;

        const newReorderStatusForLocation = {
          ...item.reorderStatus[locationId],
          status: markAsOrdered ? 'ordered' : 'arranged',
          orderedAt: markAsOrdered ? logDate.toISOString() : null,
          orderId: order.id,
        };
        
        const updatedData: Partial<InventoryItem> = {
          reorderStatus: {
            ...item.reorderStatus,
            [locationId]: newReorderStatusForLocation
          } as { [locationId: string]: ReorderStatus },
          changelog: updatedChangelog,
        };

        if (latestUpdateLog && (!item.labelLastPrintedAt || new Date(latestUpdateLog.date) > new Date(item.labelLastPrintedAt))) {
            // This condition is for flagging the need for a new label, but the actual update is done on printing/dismissal
        }
        
        //mongodb
        updateDocumentNonBlocking(itemRef, updatedData);
    });
  }, [currentUser, firestore]);

  const createOrder = useCallback((wholesalerId: string, itemsToOrder: InventoryItem[], locationId: string, isVehicleRequest: boolean): Order => {
    if (!firestore || !currentUser) throw new Error("Firestore not initialized or user not logged in");
    const wholesaler = wholesalers.find(w => w.id === wholesalerId);
    if (!wholesaler && wholesalerId !== 'unbekannt') {
      throw new Error("Wholesaler not found");
    }

    const orderPrefix = isVehicleRequest ? `MAT-${locations.find(l => l.id === locationId)?.name.replace(/\s/g, '')}-` : 'Lager-';
    const newOrderNumber = `${orderPrefix}${1001 + orders.length}`;
    
    const now = new Date();
    const orderId = doc(collection(firestore, 'orders')).id;

    const newOrder: Order = {
      id: orderId,
      orderNumber: newOrderNumber,
      date: now.toISOString(),
      wholesalerId,
      wholesalerName: wholesaler?.name || 'Unbekannter Großhändler',
      status: 'draft',
      locationId: isVehicleRequest ? locationId : null,
      initiatedBy: { userId: currentUser.id, userName: currentUser.name },
      items: itemsToOrder.map((item): OrderItem => {
        const supplierInfo = item.suppliers?.find(s => s.wholesalerId === wholesalerId);
        const reorderStatus = item.reorderStatus[locationId];
        return {
          itemId: item.id,
          itemName: item.name,
          itemNumber: Array.isArray(item.manufacturerItemNumbers) && item.manufacturerItemNumbers.length > 0 ? (item.manufacturerItemNumbers[0]?.number || '') : '',
          wholesalerItemNumber: supplierInfo?.wholesalerItemNumber,
          quantity: reorderStatus?.quantity || 0,
          receivedQuantity: 0,
          status: 'pending',
          locationId: locationId,
        };
      }),
    };

    const orderRef = doc(firestore, 'orders', orderId);
    //mongodb
    setDocumentNonBlocking(orderRef, newOrder, { merge: true });
    updateItemsToOrdered(itemsToOrder, newOrder, false, locationId);
    return newOrder;
  }, [orders.length, wholesalers, firestore, updateItemsToOrdered, locations, currentUser]);

    const addItemsToOrder = useCallback((orderId: string, itemsToAdd: InventoryItem[], locationId: string) => {
        if (!firestore) return;
        const orderRef = doc(firestore, 'orders', orderId);
        const order = orders.find(o => o.id === orderId);
        if (!order) return;

        const newItems: OrderItem[] = [...order.items];

        itemsToAdd.forEach(itemToAdd => {
            const existingItemIndex = newItems.findIndex(i => i.itemId === itemToAdd.id);
            const supplierInfo = itemToAdd.suppliers?.find(s => s.wholesalerId === order.wholesalerId);
            const reorderStatus = itemToAdd.reorderStatus[locationId];

            if (existingItemIndex > -1) {
                const existingItem = newItems[existingItemIndex];
                if (existingItem) {
                    existingItem.quantity += reorderStatus?.quantity || 0;
                }
            } else {
                newItems.push({
                    itemId: itemToAdd.id,
                    itemName: itemToAdd.name,
                    itemNumber: Array.isArray(itemToAdd.manufacturerItemNumbers) && itemToAdd.manufacturerItemNumbers.length > 0 ? (itemToAdd.manufacturerItemNumbers[0]?.number || '') : '',
                    wholesalerItemNumber: supplierInfo?.wholesalerItemNumber,
                    quantity: reorderStatus?.quantity || 0,
                    receivedQuantity: 0,
                    status: 'pending',
                    locationId: locationId,
                });
            }
        });
        
        const updatedOrder = { ...order, items: newItems };
        //mongodb
        updateDocumentNonBlocking(orderRef, updatedOrder);
        updateItemsToOrdered(itemsToAdd, updatedOrder, false, locationId);
    }, [firestore, orders, updateItemsToOrdered]);
    
    const confirmOrder = useCallback((orderId: string) => {
        if (!firestore || !currentUser) return;
        const orderRef = doc(firestore, 'orders', orderId);
        const order = orders.find(o => o.id === orderId);
        if (!order) return;

        const updatedOrderData: Partial<Order> = {
            status: 'ordered',
            date: new Date().toISOString(),
            initiatedBy: { userId: currentUser.id, userName: currentUser.name },
        };
        //mongodb
        updateDocumentNonBlocking(orderRef, updatedOrderData);
        
        const confirmedOrder = { ...order, ...updatedOrderData } as Order;
        const itemLocationMap = new Map(confirmedOrder.items.map(i => [i.itemId, i.locationId]));
        const itemsToUpdate = items.filter((i): i is InventoryItem => i.itemType === 'item' && itemLocationMap.has(i.id));
        
        itemsToUpdate.forEach(item => {
            const locationId = itemLocationMap.get(item.id);
            if (locationId) {
                updateItemsToOrdered([item], confirmedOrder, true, locationId);
            }
        });
  }, [firestore, orders, items, currentUser, updateItemsToOrdered]);


  const receiveOrderItem = useCallback((orderId: string, itemId: string, quantity: number, commissionOnly: boolean) => {
    if (!currentUser || !firestore) return;

    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const orderRef = doc(firestore, 'orders', orderId);

    const isVehicleOrder = !!order.locationId && locations.some(l => l.id === order.locationId && l.isVehicle);

    const updatedOrderItems = order.items.map(item => {
        if (item.itemId === itemId) {
            item.receivedQuantity += quantity;
            if (commissionOnly && isVehicleOrder) {
                item.status = 'commissioned';
            } else if (item.receivedQuantity >= item.quantity) {
                item.status = 'received';
            }
        }
        return item;
    });

    let newOrderStatus: Order['status'] = 'partially-received';
    const allItemsReceived = updatedOrderItems.every(item => item.status === 'received');
    const anyItemCommissioned = updatedOrderItems.some(item => item.status === 'commissioned');
    
    if (allItemsReceived) {
        newOrderStatus = 'received';
    } else if (anyItemCommissioned) {
        newOrderStatus = 'partially-commissioned';
    }

    //mongodb
    updateDocumentNonBlocking(orderRef, { items: updatedOrderItems, status: newOrderStatus });

    // If not commissioning, book to stock
    if (!(commissionOnly && isVehicleOrder)) {
        const orderItem = order.items.find(i => i.itemId === itemId);
        const itemToUpdate = items.find(i => i.id === itemId);
        if(!itemToUpdate || !orderItem || itemToUpdate.itemType === 'machine') return;

        const itemRef = doc(firestore, 'articles', itemId);
        const currentStockInfo = itemToUpdate.stocks.find(s => s.locationId === orderItem.locationId);
        const currentStock = currentStockInfo ? currentStockInfo.quantity : 0;
        const newStock = currentStock + quantity;
        const updatedStocks = [...itemToUpdate.stocks.filter(s => s.locationId !== orderItem.locationId), { locationId: orderItem.locationId, quantity: newStock }];
        
        const now = new Date().toISOString();
        const logEntry: ChangeLogEntry = {
            id: `${now}-${Math.random()}`,
            date: now,
            userId: currentUser.id,
            userName: currentUser.name,
            type: 'in',
            quantity,
            newStock,
            details: `Wareneingang aus Bestellung ${order.orderNumber}`,
            locationId: orderItem.locationId,
        };

        const reorderStatusForLocation = itemToUpdate.reorderStatus[orderItem.locationId];
        const updatedReorderStatus = { ...itemToUpdate.reorderStatus };
        if (reorderStatusForLocation?.orderId === orderId && orderItem.receivedQuantity >= orderItem.quantity) {
            delete updatedReorderStatus[orderItem.locationId];
        }

        //mongodb
        updateDocumentNonBlocking(itemRef, { stocks: updatedStocks, changelog: [...(itemToUpdate.changelog || []), logEntry], reorderStatus: updatedReorderStatus });
    }
}, [currentUser, firestore, orders, items, locations]);


const loadCommissionedItem = useCallback((orderId: string, itemId: string) => {
    if (!currentUser || !firestore) return;
    const now = new Date().toISOString();

    const order = orders.find(o => o.id === orderId);
    const itemToUpdate = items.find(i => i.id === itemId);
    const orderItem = order?.items.find(i => i.itemId === itemId);

    if (!order || !itemToUpdate || !orderItem || orderItem.status !== 'commissioned' || itemToUpdate.itemType === 'machine') return;
    
    const orderRef = doc(firestore, 'orders', orderId);
    const itemRef = doc(firestore, 'articles', itemId);

    const updatedOrderItems = order.items.map(item => {
        if (item.itemId === itemId) {
            return { ...item, status: 'received' as const };
        }
        return item;
    });

    const allItemsReceived = updatedOrderItems.every(item => item.status === 'received');
    const newOrderStatus = allItemsReceived ? 'received' : (updatedOrderItems.some(i => i.status === 'commissioned' || i.status === 'pending') ? order.status : 'partially-received');

    //mongodb
    updateDocumentNonBlocking(orderRef, { items: updatedOrderItems, status: newOrderStatus });
    
    const currentStockInfo = itemToUpdate.stocks.find(s => s.locationId === orderItem.locationId);
    const currentStock = currentStockInfo ? currentStockInfo.quantity : 0;
    const newStock = currentStock + orderItem.quantity;
    const updatedStocks = [...itemToUpdate.stocks.filter(s => s.locationId !== orderItem.locationId), { locationId: orderItem.locationId, quantity: newStock }];

    const logEntry: ChangeLogEntry = {
        id: `${now}-${Math.random()}`,
        date: now,
        userId: currentUser.id,
        userName: currentUser.name,
        type: 'in',
        quantity: orderItem.quantity,
        newStock: newStock,
        details: `Material von Kommission auf Fahrzeug ${locations.find(l=>l.id === orderItem.locationId)?.name || ''} geladen. (Best. ${order.orderNumber})`,
        locationId: orderItem.locationId,
    };
    
    const newReorderStatus = {...itemToUpdate.reorderStatus};
    if (newReorderStatus[orderItem.locationId]?.orderId === orderId) {
        delete newReorderStatus[orderItem.locationId];
    }
    
    const updatedItemData = { 
        stocks: updatedStocks, 
        changelog: [...(itemToUpdate.changelog || []), logEntry],
        reorderStatus: newReorderStatus
    };
    //mongodb
    updateDocumentNonBlocking(itemRef, updatedItemData);

}, [currentUser, firestore, orders, items, locations]);


const removeItemFromDraftOrder = useCallback((orderId: string, itemId: string) => {
    if (!firestore) return;
    const order = orders.find(o => o.id === orderId);
    if (!order || order.status !== 'draft') return;
    
    const orderRef = doc(firestore, 'orders', orderId);
    const item = items.find(i => i.id === itemId);
    
    const itemToRemove = order.items.find(item => item.itemId === itemId);
    const locationIdToRemove = itemToRemove?.locationId;
    
    const updatedItems = order.items.filter(item => item.itemId !== itemId);

    if (updatedItems.length === 0) {
        //mongodb
        deleteDocumentNonBlocking(orderRef);
    } else {
        //mongodb
        updateDocumentNonBlocking(orderRef, { items: updatedItems });
    }

    if (locationIdToRemove && item && item.itemType === 'item') {
        const itemRef = doc(firestore, 'articles', itemId);
        if (item.reorderStatus[locationIdToRemove]?.orderId === orderId) {
            const newReorderStatus = {...item.reorderStatus};
            const reorderStatusForLocation = newReorderStatus[locationIdToRemove];

            if(reorderStatusForLocation){
                 delete newReorderStatus[locationIdToRemove];
                 //mongodb
                updateDocumentNonBlocking(itemRef, { reorderStatus: newReorderStatus });
            }
        }
    }
}, [firestore, orders, items]);

    const removeSingleItemFromArrangedOrder = useCallback((itemId: string, locationId: string) => {
        if (!currentUser || !firestore) return;

        const itemToUpdate = items.find(i => i.id === itemId);
        if (!itemToUpdate || itemToUpdate.itemType === 'machine' || !itemToUpdate.reorderStatus[locationId] || itemToUpdate.reorderStatus[locationId]?.status !== 'arranged') return;
        
        const itemRef = doc(firestore, 'articles', itemId);
        const newReorderStatus = { ...itemToUpdate.reorderStatus };
        delete newReorderStatus[locationId];

        const newLogEntry: ChangeLogEntry = {
            id: `${new Date().toISOString()}-${Math.random()}`,
            date: new Date().toISOString(),
            userId: currentUser.id,
            userName: currentUser.name,
            type: 'reorder-cancelled',
            details: `Einzelner Artikel aus Bestellvorschlag für Lagerort ${locations.find(l => l.id === locationId)?.name} entfernt.`,
            locationId: locationId,
        };

        const updatedData: Partial<InventoryItem> = {
            reorderStatus: newReorderStatus,
            changelog: [...(itemToUpdate.changelog || []), newLogEntry],
        };
        //mongodb
        updateDocumentNonBlocking(itemRef, updatedData);
    }, [currentUser, firestore, items, locations]);


  const cancelArrangedOrder = useCallback((itemIds: string[], locationId: string) => {
        if (!currentUser || !firestore) return;

        const now = new Date().toISOString();

        itemIds.forEach(itemId => {
            const itemToUpdate = items.find(i => i.id === itemId);
            if (!itemToUpdate || itemToUpdate.itemType === 'machine' || !itemToUpdate.reorderStatus[locationId] || itemToUpdate.reorderStatus[locationId]?.status !== 'arranged') return;

            const itemRef = doc(firestore, 'articles', itemId);

            const newReorderStatus = { ...itemToUpdate.reorderStatus };
            delete newReorderStatus[locationId];

            const newLogEntry: ChangeLogEntry = {
                id: `${now}-${Math.random()}`,
                date: now,
                userId: currentUser.id,
                userName: currentUser.name,
                type: 'reorder-cancelled',
                details: `Bestellvorschlag für Lagerort ${locations.find(l => l.id === locationId)?.name} storniert.`,
                locationId: locationId,
            };

            const updatedData: Partial<InventoryItem> = {
                reorderStatus: newReorderStatus,
                changelog: [...(itemToUpdate.changelog || []), newLogEntry],
            };

            //mongodb
            updateDocumentNonBlocking(itemRef, updatedData);
        });
    }, [currentUser, firestore, items, locations]);

  const removeItemFromLocation = useCallback((itemId: string, locationId: string) => {
    if (!firestore) return;
    const item = items.find(i => i.id === itemId);
    if (!item || item.itemType === 'machine') return;

    const itemRef = doc(firestore, 'articles', itemId);
    
    const newStocks = item.stocks.filter(s => s.locationId !== locationId);
    const newMinStocks = item.minStocks.filter(ms => ms.locationId !== locationId);
    const newReorderStatus = { ...item.reorderStatus };
    delete newReorderStatus[locationId];
    const newLastInventoriedAt = { ...item.lastInventoriedAt };
    delete newLastInventoriedAt[locationId];

    if (newStocks.length === 0) {
      //mongodb
      deleteDocumentNonBlocking(itemRef);
    } else {
      const updatedData = {
          stocks: newStocks,
          minStocks: newMinStocks,
          reorderStatus: newReorderStatus,
          lastInventoriedAt: newLastInventoriedAt,
      };
      //mongodb
      updateDocumentNonBlocking(itemRef, updatedData);
    }
  }, [firestore, items]);

  const addItemToLocation = useCallback((itemId: string, locationId: string) => {
    if (!currentUser || !firestore) return;
    const itemTemplate = items.find(i => i.id === itemId);
    if (!itemTemplate || itemTemplate.itemType === 'machine') return;

    const isAlreadyInLocation = itemTemplate.stocks.some(s => s.locationId === locationId);
    if (isAlreadyInLocation) return; 

    const itemRef = doc(firestore, 'articles', itemId);
    const now = new Date().toISOString();
    const logEntry: ChangeLogEntry = {
        id: `${new Date().toISOString()}-${Math.random()}`,
        date: now,
        userId: currentUser.id,
        userName: currentUser.name,
        type: 'initial',
        details: `Artikel zum Lagerort hinzugefügt.`,
        locationId: locationId,
    };

    const updatedData = {
      stocks: [...itemTemplate.stocks, { locationId, quantity: 0 }],
      minStocks: [...itemTemplate.minStocks, { locationId, quantity: 0 }],
      lastInventoriedAt: { ...itemTemplate.lastInventoriedAt, [locationId]: now },
      changelog: [...itemTemplate.changelog, logEntry],
    };
    //mongodb
    updateDocumentNonBlocking(itemRef, updatedData);
  }, [firestore, items, currentUser]);

  const transferStock = useCallback((itemId: string, fromLocationId: string, toLocationId: string, quantity: number) => {
    if (!currentUser || !firestore) return;
    const item = items.find(i => i.id === itemId);
    if (!item || item.itemType === 'machine') return;

    const itemRef = doc(firestore, 'articles', itemId);

    const fromStock = item.stocks.find(s => s.locationId === fromLocationId);
    if (!fromStock || fromStock.quantity < quantity) {
      console.error("Nicht genügend Bestand für die Umlagerung.");
      return;
    }
    
    const newStocks = [...item.stocks];
    // Decrement from source
    const fromIndex = newStocks.findIndex(s => s.locationId === fromLocationId);
    newStocks[fromIndex] = { ...newStocks[fromIndex]!, quantity: newStocks[fromIndex]!.quantity - quantity };

    // Increment destination
    const toIndex = newStocks.findIndex(s => s.locationId === toLocationId);
    if (toIndex > -1) {
      newStocks[toIndex] = { ...newStocks[toIndex]!, quantity: newStocks[toIndex]!.quantity + quantity };
    } else {
      // If item is not at destination, add it
      newStocks.push({ locationId: toLocationId, quantity });
      // Also add minStock entry if it doesn't exist
      if (!item.minStocks.some(ms => ms.locationId === toLocationId)) {
          item.minStocks.push({ locationId: toLocationId, quantity: 0 });
      }
    }
    
    const now = new Date().toISOString();
    const logEntry: ChangeLogEntry = {
        id: `${new Date().toISOString()}-${Math.random()}`,
        date: now,
        userId: currentUser.id,
        userName: currentUser.name,
        type: 'transfer',
        quantity,
        details: `Umgelagert von ${locations.find(l=>l.id===fromLocationId)?.name} nach ${locations.find(l=>l.id===toLocationId)?.name}`,
        fromLocationId,
        toLocationId,
    };
    
    const updatedItemData = {
      stocks: newStocks,
      minStocks: item.minStocks,
      changelog: [...item.changelog, logEntry],
    };

    //mongodb
    updateDocumentNonBlocking(itemRef, updatedItemData);
  }, [currentUser, firestore, items, locations]);

  const bulkImportItems = useCallback((csvData: string, locationId: string): number => {
    if (!currentUser || !firestore) {
      throw new Error("Benutzer oder Datenbank nicht initialisiert.");
    }

    const lines = csvData.trim().split('\n');
    let successfulImports = 0;

    lines.forEach((line, index) => {
      try {
        const [name, itemNumberStr, barcode, mainLocation, subLocation, stockStr, minStockStr] = line.split(',').map(s => s.trim());
        
        const itemNumber = { number: itemNumberStr };
        if (!name || !itemNumber.number) {
          throw new Error(`Fehler in Zeile ${index + 1}: Name und Artikelnummer sind Pflichtfelder.`);
        }

        const stock = parseInt(stockStr, 10);
        const minStock = parseInt(minStockStr, 10);

        if (isNaN(stock) || isNaN(minStock)) {
          throw new Error(`Fehler in Zeile ${index + 1}: Bestand und Mindestbestand müssen Zahlen sein.`);
        }

        const now = new Date();
        const itemId = `${now.toISOString()}-${Math.random()}`;
        const logEntry: ChangeLogEntry = {
          id: `${now.toISOString()}-${Math.random()}-log`,
          date: now.toISOString(),
          userId: currentUser.id,
          userName: currentUser.name,
          type: 'initial',
          quantity: stock,
          newStock: stock,
          locationId,
          details: 'Bulk-Import per CSV',
        };

        const newItem: InventoryItem = {
          id: itemId,
          name,
          manufacturerItemNumbers: [itemNumber],
          barcode: barcode || null,
          mainLocation: mainLocation || '',
          subLocation: subLocation || '',
          stocks: [{ locationId, quantity: stock }],
          minStocks: [{ locationId, quantity: minStock }],
          reorderStatus: {},
          changelog: [logEntry],
          suppliers: [],
          preferredWholesalerId: null,
          lastInventoriedAt: { [locationId]: now.toISOString() },
          imageUrl: null,
          itemType: 'item',
        };

        const itemRef = doc(firestore, 'articles', newItem.id);
        //mongodb
        setDocumentNonBlocking(itemRef, newItem, { merge: false });
        successfulImports++;
      } catch (e) {
        console.error(e);
        // We continue to the next line on error
      }
    });
    
    return successfulImports;
  }, [currentUser, firestore]);

   const handleQuickStockChange = useCallback((itemId: string, locationId: string, type: 'in' | 'out' | 'inventory', quantity: number) => {
    if (!currentUser || !firestore) {
        console.error("User or firestore not available");
        return;
    }
    
    const itemToUpdate = items.find(i => i.id === itemId);
    if (!itemToUpdate || itemToUpdate.itemType === 'machine') return;
    
    const itemRef = doc(firestore, 'articles', itemId);
    const now = new Date();

    const currentStockInfo = itemToUpdate.stocks?.find(s => s.locationId === locationId);
    const currentStock = currentStockInfo?.quantity ?? 0;
    
    let newStock;
    let logQuantity;
    let logDetails;

    if (type === 'inventory') {
        newStock = quantity;
        logQuantity = quantity;
        logDetails = `Inventur. Alter Bestand: ${currentStock}`;
    } else {
        logQuantity = quantity;
        newStock = type === 'in' ? currentStock + quantity : currentStock - quantity;
        logDetails = type === 'in' ? `Zugang gebucht` : `Abgang gebucht`;
    }

    if (newStock < 0) {
        toast({
          title: 'Fehler',
          description: 'Der Lagerbestand kann nicht negativ werden.',
          variant: 'destructive',
        });
        return;
    }

    const newLogEntry: ChangeLogEntry = {
        id: `${now.toISOString()}-${Math.random()}`,
        date: now.toISOString(),
        userId: currentUser.id,
        userName: currentUser.name,
        type: type,
        quantity: logQuantity,
        newStock: newStock,
        locationId: locationId,
        details: logDetails,
    };

    const updatedStocks = [...(itemToUpdate.stocks.filter(s => s.locationId !== locationId) || []), { locationId: locationId, quantity: newStock }];
    
    const updatedData: Partial<InventoryItem> = {
      stocks: updatedStocks,
      changelog: [...(itemToUpdate.changelog || []), newLogEntry],
    };

    if (type === 'inventory') {
        updatedData.lastInventoriedAt = { ...itemToUpdate.lastInventoriedAt, [locationId]: now.toISOString() };
    }
    
    const minStockInfo = itemToUpdate.minStocks.find(ms => ms.locationId === locationId);
    const minStock = minStockInfo?.quantity ?? 0;
    const reorderStatus = itemToUpdate.reorderStatus[locationId];
    const updatedReorderStatus = {...itemToUpdate.reorderStatus};
    const additionalLogEntries: ChangeLogEntry[] = [];
    
    const neededQuantity = minStock - newStock;

    if (reorderStatus?.status === 'arranged') {
      if (neededQuantity <= 0) {
        // Stock is sufficient again, cancel arranged reorder
        delete updatedReorderStatus[locationId];
        additionalLogEntries.push({
          id: `${new Date(now.getTime() + 1).toISOString()}-cancel`,
          date: new Date(now.getTime() + 1).toISOString(),
          userId: 'system',
          userName: 'Automatisch',
          type: 'reorder-cancelled',
          details: `Bestellvorschlag storniert, da Bestand wieder ausreichend.`,
          locationId: locationId,
          itemId: itemToUpdate.id,
          itemName: itemToUpdate.name,
        });
         toast({ title: 'Bestellvorschlag storniert', description: `Der Vorschlag für ${itemToUpdate.name} wurde entfernt, da der Bestand wieder ausreicht.` });
      } else if (neededQuantity !== reorderStatus.quantity) {
        // Stock still below min, but required quantity changed. Adjust reorder.
        updatedReorderStatus[locationId] = {
            ...reorderStatus,
            quantity: neededQuantity,
        };
        additionalLogEntries.push({
          id: `${new Date(now.getTime() + 1).toISOString()}-adjust`,
          date: new Date(now.getTime() + 1).toISOString(),
          userId: 'system',
          userName: 'Automatisch',
          type: 'update',
          details: `Bestellvorschlag angepasst auf ${neededQuantity} Stk.`,
          locationId: locationId,
          itemId: itemToUpdate.id,
          itemName: itemToUpdate.name,
        });
        toast({ title: 'Bestellvorschlag angepasst', description: `Die Bestellmenge für ${itemToUpdate.name} wurde auf ${neededQuantity} Stk. aktualisiert.` });
      }
    } else if (neededQuantity > 0 && !reorderStatus?.status) {
        // Stock fell below min and no reorder exists, create a new one.
        updatedReorderStatus[locationId] = {
            status: 'arranged',
            arrangedAt: new Date(now.getTime() + 1).toISOString(),
            orderedAt: null,
            quantity: neededQuantity,
        };
        additionalLogEntries.push({
            id: `${new Date(now.getTime() + 1).toISOString()}-arrange`,
            date: new Date(now.getTime() + 1).toISOString(),
            userId: 'system',
            userName: 'Automatisch',
            type: 'reorder-arranged',
            details: `Automatisch angeordnet. Benötigte Menge: ${neededQuantity}`,
            locationId: locationId,
            itemId: itemToUpdate.id,
            itemName: itemToUpdate.name,
        });
        toast({
            title: 'Nachbestellung angeordnet',
            description: `Bestand von ${itemToUpdate.name} ist unter dem Minimum. ${neededQuantity} Stk. wurden zur Nachbestellung angeordnet.`,
        });
    }

    updatedData.reorderStatus = updatedReorderStatus;
    if (additionalLogEntries.length > 0) {
      updatedData.changelog = [...(updatedData.changelog || []), ...additionalLogEntries];
    }
    
    //mongodb
    updateDocumentNonBlocking(itemRef, updatedData);
    
  }, [currentUser, firestore, items, toast]);

  const getAvailableYears = useCallback(() => {
    const years = new Set<number>();
    allChangelog.forEach(log => {
        years.add(new Date(log.date).getFullYear());
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [allChangelog]);

  const getStockAtDate = useCallback((item: InventoryItem, date: Date, locationId?: string | null) => {
        const stockByLocation: { [locationId: string]: number } = {};

        // Initialize with 0 for all locations the item exists in
        item.stocks.forEach(s => stockByLocation[s.locationId] = 0);

        const relevantLogs = (item.changelog || [])
            .filter(log => new Date(log.date) <= date)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        relevantLogs.forEach(log => {
            const qty = log.quantity || 0;
            const logLocationId = log.locationId;
            const fromLocationId = log.fromLocationId;
            const toLocationId = log.toLocationId;

            switch (log.type) {
                case 'initial':
                    if(logLocationId) stockByLocation[logLocationId] = qty;
                    break;
                case 'in':
                case 'received':
                    if(logLocationId) stockByLocation[logLocationId] = (stockByLocation[logLocationId] ?? 0) + qty;
                    break;
                case 'out':
                    if(logLocationId) stockByLocation[logLocationId] = (stockByLocation[logLocationId] ?? 0) - qty;
                    break;
                case 'inventory':
                    if(logLocationId) stockByLocation[logLocationId] = log.newStock ?? 0;
                    break;
                case 'transfer':
                    if (fromLocationId) stockByLocation[fromLocationId] = (stockByLocation[fromLocationId] ?? 0) - qty;
                    if (toLocationId) stockByLocation[toLocationId] = (stockByLocation[toLocationId] ?? 0) + qty;
                    break;
                default:
                    break;
            }
        });
        
        if (locationId) {
            return stockByLocation[locationId] || 0;
        }

        return Object.values(stockByLocation).reduce((sum, current) => sum + current, 0);
  }, []);

  const getYearlyInventory = useCallback((year: number) => {
    const endOfYearDate = endOfYear(new Date(year, 0, 1));
    const yearlyData: YearlyInventoryExportRow[] = [];

    items.forEach(item => {
        if(item.itemType === 'machine') return;
        item.stocks.forEach(stock => {
            const location = locations.find(l => l.id === stock.locationId);
            if (!location) return;

            const endOfYearStock = getStockAtDate(item, endOfYearDate);
            
            yearlyData.push({
                itemId: item.id,
                itemName: item.name,
                itemNumber: Array.isArray(item.manufacturerItemNumbers) && item.manufacturerItemNumbers.length > 0 ? (item.manufacturerItemNumbers[0]?.number || '') : '',
                mainLocation: item.mainLocation,
                subLocation: item.subLocation,
                locationName: location.name,
                endOfYearStock: endOfYearStock
            });
        });
    });

    return yearlyData;
  }, [items, locations, getStockAtDate]);
  
  const getAnalysisData = useCallback((year: number, locationId: string): AnalysisData => {
        const startDate = startOfYear(new Date(year, 0, 1));
        const endDate = endOfYear(new Date(year, 0, 1));
        const filterLocation = locationId !== 'all';

        const stockEvolution = items
            .filter((item): item is InventoryItem => item.itemType === 'item' && (!filterLocation || item.stocks.some(s => s.locationId === locationId)))
            .map(item => {
                const startStock = getStockAtDate(item, startDate, filterLocation ? locationId : null);
                const endStock = getStockAtDate(item, endDate, filterLocation ? locationId : null);
                return {
                    itemId: item.id,
                    itemName: item.name,
                    startStock,
                    endStock,
                    change: endStock - startStock,
                };
            });

        const logsInPeriod = allChangelog.filter(log => {
            const logDate = new Date(log.date);
            const matchesDate = logDate >= startDate && logDate <= endDate;
            if (!matchesDate) return false;
            if (!filterLocation) return true;
            // For transfers, check if either from or to matches
            return log.locationId === locationId || log.fromLocationId === locationId || log.toLocationId === locationId;
        });

        const movedItemIds = new Set(logsInPeriod.map(log => log.itemId));
        const slowMovers = items.filter(item => 
            (!filterLocation || item.stocks.some(s => s.locationId === locationId)) &&
            !movedItemIds.has(item.id)
        );
        
        const turnover = logsInPeriod.reduce((acc, log) => {
            if (!log.itemId || !log.quantity) return acc;
            
            let quantityChange = 0;
            if (log.type === 'out' && (!filterLocation || log.locationId === locationId)) {
                quantityChange = log.quantity;
            } else if (log.type === 'transfer' && filterLocation && log.fromLocationId === locationId) {
                quantityChange = log.quantity;
            }

            if (quantityChange > 0) {
                 if (!acc[log.itemId]) {
                    acc[log.itemId] = { itemId: log.itemId, itemName: log.itemName || '', turnover: 0 };
                }
                acc[log.itemId]!.turnover += quantityChange;
            }

            return acc;
        }, {} as { [itemId: string]: StockTurnover });

        const fastMovers = Object.values(turnover).sort((a, b) => b.turnover - a.turnover);

        return { stockEvolution, slowMovers, fastMovers };
    }, [allChangelog, items, getStockAtDate]);

    const openDetailView = useCallback((item: InventoryItem | Machine, tab = 'overview') => {
      setCurrentItem(item);
      setDetailViewTab(tab);
      setIsDetailViewOpen(true);
    }, []);


  const value = {
    isLoading,
    isUserSelectionRequired,
    items,
    addItem,
    updateItem,
    users,
    setUsers,
    addUser,
    wholesalers,
    setWholesalers,
    orders,
    setOrders,
    locations,
    setLocations,
    appSettings,
    updateAppSettings,
    currentUser,
    favoriteUser,
    setCurrentUser,
    setActiveUser,
    setFavoriteUser,
    updateUserSettings,
    allChangelog,
    inventoryCounts,
    latestInventoryLogs,
    createOrder,
    addItemsToOrder,
    confirmOrder,
    receiveOrderItem,
    loadCommissionedItem,
    removeItemFromDraftOrder,
    cancelArrangedOrder,
    removeSingleItemFromArrangedOrder,
    removeItemFromLocation,
    addItemToLocation,
    transferStock,
    bulkImportItems,
    handleQuickStockChange,
    getYearlyInventory,
    getAvailableYears,
    getAnalysisData,
    openDetailView,
    isDetailViewOpen,
    setIsDetailViewOpen,
    currentItem,
    detailViewTab,
    notifications,
    markNotificationsAsRead,
    dismissNotification,
    dismissAllNotifications,
    dashboardLayout: { layout: dashboardLayout, isEditing: currentUser?.isDashboardEditing ?? false },
    setDashboardLayout,
    allDashboardCards,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
