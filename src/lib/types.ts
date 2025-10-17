

export type ReorderStatus = {
  status: 'arranged' | 'ordered' | null;
  arrangedAt?: string | null;
  orderedAt?: string | null;
  quantity?: number | null;
  orderId?: string | null;
};

export type Stock = {
  locationId: string;
  quantity: number;
}

export type RentalStatus = 'available' | 'rented' | 'in_repair' | 'reserved';

export type RentedBy = {
  type: 'user' | 'customer' | 'other';
  id: string; // user ID or customer name
  name: string;
}

export type RentalHistoryEntry = {
    id: string;
    type: 'rented' | 'returned' | 'created' | 'updated' | 'repaired' | 'reserved' | 'reservation_cancelled';
    date: string;
    userId: string;
    userName: string;
    details: string;
}

export type Reservation = {
  id: string;
  startDate: string;
  endDate: string;
  reservedFor: string;
  userId: string;
  userName: string;
}

export type ManufacturerItemNumber = {
  number: string;
  manufacturer?: string;
};


export type InventoryItem = {
  id: string;
  name: string;
  manufacturerItemNumbers: ManufacturerItemNumber[];
  preferredManufacturerItemNumber?: string | null;
  barcode?: string | null;
  mainLocation: string;
  subLocation: string;
  stocks: Stock[];
  minStocks: { locationId: string; quantity: number }[];
  changelog: ChangeLogEntry[];
  suppliers: ItemSupplier[];
  preferredWholesalerId: string | null;
  reorderStatus: { [locationId: string]: ReorderStatus };
  lastInventoriedAt: { [locationId: string]: string | null };
  imageUrl?: string | null;
  linkedImageUrl?: string | null; // URL of another item's image
  labelLastPrintedAt?: string | null;
  itemType: 'item';
};

export type Machine = {
  id: string;
  name: string;
  imageUrl?: string | null;
  
  itemType: 'machine';
  rentalStatus?: RentalStatus;
  rentedBy?: RentedBy | null;
  rentalHistory?: RentalHistoryEntry[];
  needsConsumables?: boolean;
  manufacturer?: string;
  model?: string;
  yearOfConstruction?: number;
  lastRepair?: string;
  nextInspection?: string;
  reservations?: Reservation[];
  // Diese Felder sind für Maschinen nicht relevant, aber für die Kompatibilität mit einigen UI-Komponenten nützlich
  stocks: [];
  minStocks: [];
  mainLocation: string;
  subLocation: string;
  manufacturerItemNumbers: [];
  changelog: [];
};


export type User = {
    id: string;
    name: string;
    showInventoryStatusBorder?: boolean;
    visibleNavItems?: string[];
    favoriteLocationId?: string;
    navItemOrder?: string[];
    isNavSortable?: boolean;
    isDashboardEditing?: boolean;
};

export type Location = {
  id: string;
  name: string;
  isVehicle: boolean;
};

export type ChangeLogEntry = {
    id: string;
    date: string;
    userId: string;
    userName: string;
    type: 'in' | 'out' | 'initial' | 'reorder-arranged' | 'reordered' | 'received' | 'update' | 'reorder-cancelled' | 'inventory' | 'transfer' | 'label-printed';
    quantity?: number | null;
    newStock?: number;
    details?: string;
    itemId?: string;
    itemName?: string;
    locationId?: string;
    fromLocationId?: string;
    toLocationId?: string;
};


export type MaskArea = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type WholesalerMask = {
  id: string;
  name: string;
  areas: MaskArea[];
  backgroundImage?: string;
}

export type Wholesaler = {
    id: string;
    name: string;
    masks?: WholesalerMask[];
};

export type ItemSupplier = {
    wholesalerId: string;
    wholesalerItemNumber: string;
    url?: string;
};

export type OrderItem = {
  itemId: string;
  itemName: string;
  itemNumber: string;
  wholesalerItemNumber?: string;
  quantity: number;
  receivedQuantity: number;
  status: 'pending' | 'commissioned' | 'received';
  locationId: string;
}

export type Order = {
  id: string;
  orderNumber: string;
  date: string;
  wholesalerId: string;
  wholesalerName: string;
  items: OrderItem[];
  status: 'draft' | 'ordered' | 'partially-received' | 'received' | 'partially-commissioned';
  locationId: string | null;
  initiatedBy?: { userId: string; userName: string; } | null;
}

export type AppSettings = {
  ai?: {
    provider: 'google' | 'openrouter';
    model: string;
    apiKey: string;
  };
  deliveryNoteAi?: {
    provider: 'google' | 'openrouter';
    model: string;
    apiKey: string;
  }
};


export type YearlyInventoryExportRow = {
  itemId: string;
  itemName: string;
  itemNumber: string;
  mainLocation: string;
  subLocation: string;
  locationName: string;
  endOfYearStock: number;
};

export type StockTurnover = {
    itemId: string;
    itemName: string;
    turnover: number;
};

export type AnalysisData = {
    stockEvolution: {
        itemId: string;
        itemName: string;
        startStock: number;
        endStock: number;
        change: number;
    }[];
    slowMovers: (InventoryItem | Machine)[];
    fastMovers: StockTurnover[];
};

export type Notification = {
    id: string;
    type: 'orderSuggestion' | 'rentedMachine' | 'orderStatus' | 'newItem' | 'minStock' | 'delivery';
    title: string;
    description: string;
    date: string;
    href: string;
    read: boolean;
    userId?: string | null; // For user-specific notifications
};

export type DashboardCardLayout = {
    id: string;
    size: 'small' | 'default' | 'wide';
    hidden?: boolean;
};


export type DashboardLayout = {
    layout: DashboardCardLayout[];
    isEditing: boolean;
}
