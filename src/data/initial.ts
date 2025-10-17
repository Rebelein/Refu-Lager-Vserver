import type { InventoryItem, User, Wholesaler, Order, Location } from '../lib/types';
import { navItems } from '@/components/layout/app-shell';

const allNavItems = navItems.map(item => item.href);

export const initialUsers: User[] = [
    { id: '1', name: 'Max Mustermann', visibleNavItems: allNavItems, navItemOrder: allNavItems },
    { id: '2', name: 'Erika Mustermann', visibleNavItems: allNavItems, navItemOrder: allNavItems },
    { id: '3', name: 'Werkstatt-Tablet', visibleNavItems: allNavItems, navItemOrder: allNavItems },
];

export const initialWholesalers: Wholesaler[] = [
    { id: '1', name: 'GC-Gruppe' },
    { id: '2', name: 'Pfeiffer & May' },
    { id: '3', name: 'Reisser' },
];

export const initialLocations: Location[] = [
  { id: 'main', name: 'Hauptlager', isVehicle: false },
  { id: 'car-1', name: 'KD Wagen Meier', isVehicle: true },
]

export const initialOrders: Order[] = [];

const now = new Date();
const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();


export const initialInventory: InventoryItem[] = [
  { id: '1', name: 'Kupferrohr 15mm (2.5m)', manufacturerItemNumbers: [{ number: 'KR15-25' }], mainLocation: "Rohre", subLocation: 'Ebene 1', stocks: [{locationId: 'main', quantity: 50}], minStocks: [{locationId: 'main', quantity: 10}], changelog: [], suppliers: [], preferredWholesalerId: null, reorderStatus: {}, lastInventoriedAt: {'main': daysAgo(5)}, imageUrl: null, itemType: 'item' },
  { id: '2', name: 'Pressfitting Bogen 90° 15mm', manufacturerItemNumbers: [{ number: 'PFB90-15' }], mainLocation: "Fittinge", subLocation: 'Fach 3', stocks: [{locationId: 'main', quantity: 150}], minStocks: [{locationId: 'main', quantity: 50}], changelog: [], suppliers: [], preferredWholesalerId: null, reorderStatus: {}, lastInventoriedAt: {'main': daysAgo(10)}, imageUrl: null, itemType: 'item' },
  { id: '3', name: 'Waschtischarmatur "Classic"', manufacturerItemNumbers: [{ number: 'WTA-C' }], mainLocation: "Armaturen", subLocation: 'Ebene 2', stocks: [{locationId: 'main', quantity: 25}], minStocks: [{locationId: 'main', quantity: 5}], changelog: [], suppliers: [], preferredWholesalerId: null, reorderStatus: {}, lastInventoriedAt: {'main': daysAgo(40)}, imageUrl: null, itemType: 'item' },
  { id: '4', name: 'Heizkörperthermostat "Smart"', manufacturerItemNumbers: [{ number: 'HKT-S' }], mainLocation: "Heizung", subLocation: 'Fach 1', stocks: [{locationId: 'main', quantity: 40}], minStocks: [{locationId: 'main', quantity: 15}], changelog: [], suppliers: [], preferredWholesalerId: null, reorderStatus: {'main': { status: 'ordered', arrangedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), orderedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), orderId: 'dummy-order-1' }}, lastInventoriedAt: {'main': daysAgo(2)}, imageUrl: null, itemType: 'item' },
  { id: '5', name: 'Abflussrohr DN 50 (2m)', manufacturerItemNumbers: [{ number: 'AR50-20' }], mainLocation: "Abfluss", subLocation: 'Ebene 2', stocks: [{locationId: 'main', quantity: 30}], minStocks: [{locationId: 'main', quantity: 10}], changelog: [], suppliers: [], preferredWholesalerId: null, reorderStatus: {}, lastInventoriedAt: {'main': daysAgo(15)}, imageUrl: null, itemType: 'item' },
  { id: '6', name: 'Hanf (Rolle)', manufacturerItemNumbers: [{ number: 'HF-R01' }], mainLocation: "Dichtmittel", subLocation: 'Schublade 1', stocks: [{locationId: 'main', quantity: 75}], minStocks: [{locationId: 'main', quantity: 20}], changelog: [], suppliers: [], preferredWholesalerId: null, reorderStatus: {}, lastInventoriedAt: {'main': daysAgo(80)}, imageUrl: null, itemType: 'item' },
  { id: '7', name: 'Dichtpaste "Fermit"', manufacturerItemNumbers: [{ number: 'DP-F01' }], mainLocation: "Dichtmittel", subLocation: 'Schublade 2', stocks: [{locationId: 'main', quantity: 18}], minStocks: [{locationId: 'main', quantity: 5}], changelog: [], suppliers: [], preferredWholesalerId: null, reorderStatus: {}, lastInventoriedAt: {}, imageUrl: null, itemType: 'item' },
  { id: '8', name: 'Eckventil 1/2"', manufacturerItemNumbers: [{ number: 'EV-12' }], mainLocation: "Ventile", subLocation: 'Fach 4', stocks: [{locationId: 'main', quantity: 85}], minStocks: [{locationId: 'main', quantity: 30}], changelog: [], suppliers: [], preferredWholesalerId: null, reorderStatus: {}, lastInventoriedAt: {'main': daysAgo(1)}, imageUrl: null, itemType: 'item' },
  { id: '9', name: 'Flexschlauch 30cm', manufacturerItemNumbers: [{ number: 'FS-30' }], mainLocation: "Schläuche", subLocation: 'Fach 5', stocks: [{locationId: 'main', quantity: 60}], minStocks: [{locationId: 'main', quantity: 20}], changelog: [], suppliers: [], preferredWholesalerId: null, reorderStatus: {}, lastInventoriedAt: {'main': daysAgo(25)}, imageUrl: null, itemType: 'item' },
  { id: '10', name: 'Wand-WC-Set "Modern"', manufacturerItemNumbers: [{ number: 'WWC-M' }], mainLocation: "Sanitärobjekte", subLocation: 'Palette 1', stocks: [{locationId: 'main', quantity: 12}], minStocks: [{locationId: 'main', quantity: 3}], changelog: [], suppliers: [], preferredWholesalerId: null, reorderStatus: {'main': { status: 'arranged', quantity: 3, arrangedAt: new Date().toISOString() }}, lastInventoriedAt: {'main': daysAgo(3)}, imageUrl: null, itemType: 'item' },
  { id: '11', name: 'Duschrinne "Line"', manufacturerItemNumbers: [{ number: 'DR-L' }], mainLocation: "Sanitärobjekte", subLocation: 'Palette 2', stocks: [{locationId: 'main', quantity: 8}], minStocks: [{locationId: 'main', quantity: 2}], changelog: [], suppliers: [], preferredWholesalerId: null, reorderStatus: {}, lastInventoriedAt: {'main': daysAgo(60)}, imageUrl: null, itemType: 'item' },
  { id: '12', name: 'Presszange "Profi"', manufacturerItemNumbers: [{ number: 'WZ-PZ01' }], mainLocation: "Werkzeug", subLocation: 'Halterung 5', stocks: [{locationId: 'main', quantity: 2}], minStocks: [{locationId: 'main', quantity: 1}], changelog: [], suppliers: [], preferredWholesalerId: null, reorderStatus: {}, lastInventoriedAt: {}, imageUrl: null, itemType: 'item' },
];
