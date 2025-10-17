import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { differenceInDays } from 'date-fns';
import type { ChangeLogEntry, Order, MaskArea, InventoryItem, Machine } from './types';


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getChangeLogActionText = (log: ChangeLogEntry) => {
    switch (log.type) {
      case 'in': return 'Zugang';
      case 'out': return 'Abgang';
      case 'initial': return 'Artikel erstellt';
      case 'reorder-arranged': return 'Nachbestellung angeordnet';
      case 'reordered': return 'Nachbestellt';
      case 'reorder-cancelled': return 'Bestellung storniert';
      case 'received': return 'Lieferung erhalten';
      case 'update': return 'Bearbeitet';
      case 'inventory': return 'Inventur';
      case 'transfer': return 'Umgelagert';
      case 'label-printed': return 'Etikett gedruckt';
      default: return 'Unbekannt';
    }
};

export const getInventoryStatusColor = (lastInventoriedAt?: string | null) => {
    if (!lastInventoriedAt) {
      return 'hsl(var(--destructive))';
    }
    const daysSinceInventory = differenceInDays(new Date(), new Date(lastInventoriedAt));
    if (daysSinceInventory <= 7) {
      return 'hsl(var(--chart-2))';
    } else if (daysSinceInventory <= 30) {
      return 'hsl(var(--chart-3))';
    } else {
      return 'hsl(var(--destructive))';
    }
};

export const getInventoryStatusClass = (lastInventoriedAt?: string | null) => {
    if (!lastInventoriedAt) {
      return 'border-red-500'; // Rot
    }
    const daysSinceInventory = differenceInDays(new Date(), new Date(lastInventoriedAt));
    if (daysSinceInventory <= 7) {
      return 'border-green-500'; // Grün
    } else if (daysSinceInventory <= 30) {
      return 'border-yellow-500'; // Gelb
    } else {
      return 'border-red-500'; // Rot
    }
};

export const getOrderStatusBadgeVariant = (status: Order['status']) => {
    switch (status) {
        case 'draft':
            return 'outline';
        case 'ordered':
            return 'secondary';
        case 'partially-received':
            return 'default';
         case 'partially-commissioned':
            return 'default';
        case 'received':
            return 'default'; // Success variant would be better
        default:
            return 'outline';
    }
};

export const getOrderStatusText = (status: Order['status']) => {
    switch (status) {
        case 'draft':
            return 'In Vorbereitung';
        case 'ordered':
            return 'Bestellt';
        case 'partially-received':
            return 'Teilweise erhalten';
        case 'partially-commissioned':
            return 'Teilweise kommissioniert';
        case 'received':
            return 'Vollständig erhalten';
        default:
            return 'Unbekannt';
    }
};

export const resizeImage = (file: File | Blob, maxWidth: number, maxHeight: number, zoom: number = 1): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      if (!event.target?.result) {
        return reject(new Error("FileReader did not return a result."));
      }
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = maxWidth;
        canvas.height = maxHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Could not get canvas context'));
        }
        
        const sourceZoomedWidth = img.width / zoom;
        const sourceZoomedHeight = img.height / zoom;
        const sourceZoomedX = (img.width - sourceZoomedWidth) / 2;
        const sourceZoomedY = (img.height - sourceZoomedHeight) / 2;

        ctx.drawImage(
            img, 
            sourceZoomedX, 
            sourceZoomedY, 
            sourceZoomedWidth, 
            sourceZoomedHeight, 
            0, 
            0, 
            maxWidth, 
            maxHeight
        );
        
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      };
      img.onerror = reject;
      img.src = event.target.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const applyMaskToImage = (imageDataUrl: string, maskAreas: MaskArea[]): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return reject(new Error("Could not get canvas context"));
      }

      // Fill the entire canvas with black
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // "Cut out" the visible areas from the original image
      maskAreas.forEach(area => {
        const sx = (area.x / 100) * img.width;
        const sy = (area.y / 100) * img.height;
        const sWidth = (area.width / 100) * img.width;
        const sHeight = (area.height / 100) * img.height;
        
        ctx.drawImage(img, sx, sy, sWidth, sHeight, sx, sy, sWidth, sHeight);
      });

      resolve(canvas.toDataURL('image/jpeg'));
    };
    img.onerror = () => {
      reject(new Error("Failed to load image for masking."));
    };
    img.src = imageDataUrl;
  });
};

export function isInventoryItem(item: InventoryItem | Machine): item is InventoryItem {
  return item.itemType === 'item';
}

export function isMachine(item: InventoryItem | Machine): item is Machine {
  return item.itemType === 'machine';
}
