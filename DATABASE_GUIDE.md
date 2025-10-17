# Anleitung für die Datenbank-Migration von Firestore zu MongoDB

**An:** Sprachmodell für Code-Generierung
**Von:** Gemini (Firebase-Studio-Prototyper)
**Betreff:** Technische Anleitung zur 1:1-Migration der Datenbank von Firebase Firestore zu MongoDB.

## 1. Zielsetzung

Dieses Dokument ist eine detaillierte technische Blaupause für die Migration der bestehenden Anwendungsdatenbank von **Google Firebase Firestore** zu **MongoDB**. Das oberste Ziel ist eine **exakte 1:1-Abbildung** der Datenstruktur und -logik. Die neue MongoDB-Implementierung muss funktional identisch mit der aktuellen Firestore-Implementierung sein.

## 2. Grundprinzip: Spiegelung der Firestore-Struktur

Firestore verwendet eine Struktur aus Collections und Documents. MongoDB verwendet ebenfalls Collections und Documents. Deine Aufgabe ist es, für jede Firestore-Collection eine äquivalente MongoDB-Collection zu erstellen.

- **Firestore Collection** `'/articles'` → **MongoDB Collection** `'articles'`
- **Firestore Document** in `'/articles'` → **MongoDB Document** in der `'articles'` Collection

Die aktuellen Datenbankzugriffe sind im gesamten Code mit dem Kommentar `//mongodb` markiert. Diese Markierungen zeigen dir genau, wo die Firestore-spezifische Logik (Lese- und Schreibzugriffe) durch die entsprechende MongoDB-Logik ersetzt werden muss.

## 3. `backend.json`: Deine Quelle der Wahrheit

Die Datei `docs/backend.json` ist die **maßgebliche Quelle** für die Definition der Datenstrukturen ("Entities"). Du musst diese Datei als Blaupause für die Schemata deiner MongoDB-Dokumente verwenden.

-   Das `entities`-Objekt in `backend.json` definiert die Struktur für `Article`, `Machine` und `AppSettings`.
-   Die anderen Entitäten (`User`, `Order`, `Location`, `Wholesaler`) sind implizit durch die TypeScript-Typen in `src/lib/types.ts` definiert. Beziehe dich für diese auf die Typ-Definitionen.

## 4. Detaillierte Collection- und Dokument-Spezifikationen

Die MongoDB-Datenbank **MUSS** die folgenden Collections enthalten. Die Struktur der Dokumente innerhalb dieser Collections **MUSS** exakt den angegebenen Schemata entsprechen.

---

### Collection: `articles`

-   **Zweck:** Speichert alle Lagerartikel.
-   **Dokumenten-Schema (`Article`):**
    -   `id`: `string` (Eindeutiger Identifier, sollte als `_id` in MongoDB abgebildet werden)
    -   `name`: `string` (Name des Artikels)
    -   `manufacturerItemNumbers`: `Array` von Objekten `{ number: string, manufacturer: string }`
    -   `preferredManufacturerItemNumber`: `string | null`
    -   `barcode`: `string | null`
    -   `mainLocation`: `string` (z.B. "Regal A")
    -   `subLocation`: `string` (z.B. "Fach 3")
    -   `stocks`: `Array` von Objekten `{ locationId: string, quantity: number }`
    -   `minStocks`: `Array` von Objekten `{ locationId: string, quantity: number }`
    -   `suppliers`: `Array` von Objekten `{ wholesalerId: string, wholesalerItemNumber: string, url: string }`
    -   `preferredWholesalerId`: `string | null`
    -   `imageUrl`: `string | null`
    -   `linkedImageUrl`: `string | null`
    -   `labelLastPrintedAt`: `string` (ISO-Datumsformat) `| null`
    -   `itemType`: `string` (Muss immer den Wert `"item"` haben)
    -   `changelog`: `Array` von `ChangeLogEntry`-Objekten (siehe `src/lib/types.ts`)
    -   `reorderStatus`: `Object` mit `locationId` als Key und `ReorderStatus`-Objekt als Wert (siehe `src/lib/types.ts`)
    -   `lastInventoriedAt`: `Object` mit `locationId` als Key und einem ISO-Datumsstring als Wert.

---

### Collection: `machines`

-   **Zweck:** Speichert alle Maschinen und Werkzeuge.
-   **Dokumenten-Schema (`Machine`):**
    -   `id`: `string` (als `_id` in MongoDB)
    -   `name`: `string`
    -   `imageUrl`: `string | null`
    -   `itemType`: `string` (Muss immer den Wert `"machine"` haben)
    -   `rentalStatus`: `string` (Enum: "available", "rented", "in_repair", "reserved")
    -   `rentedBy`: `Object | null` (Schema: `{ type: 'user' | 'customer' | 'other', id: string, name: string }`)
    -   `rentalHistory`: `Array` von `RentalHistoryEntry`-Objekten
    -   `needsConsumables`: `boolean | null`
    -   `manufacturer`: `string | null`
    -   `model`: `string | null`
    -   `yearOfConstruction`: `number | null`
    -   `lastRepair`: `string` (ISO-Datum) `| null`
    -   `nextInspection`: `string` (ISO-Datum) `| null`
    -   `reservations`: `Array` von `Reservation`-Objekten

---

### Collection: `users`

-   **Zweck:** Speichert alle Benutzerprofile.
-   **Dokumenten-Schema (`User`):**
    -   `id`: `string` (als `_id` in MongoDB)
    -   `name`: `string`
    -   `showInventoryStatusBorder`: `boolean | null`
    -   `visibleNavItems`: `Array` von `string`
    -   `favoriteLocationId`: `string | null`
    -   `navItemOrder`: `Array` von `string`
    -   `isNavSortable`: `boolean | null`
    -   `isDashboardEditing`: `boolean | null`

---

### Collection: `locations`

-   **Zweck:** Speichert alle Lagerorte (Hauptlager, Fahrzeuge).
-   **Dokumenten-Schema (`Location`):**
    -   `id`: `string` (als `_id` in MongoDB)
    -   `name`: `string`
    -   `isVehicle`: `boolean`

---

### Collection: `wholesalers`

-   **Zweck:** Speichert alle Großhändler.
-   **Dokumenten-Schema (`Wholesaler`):**
    -   `id`: `string` (als `_id` in MongoDB)
    -   `name`: `string`
    -   `masks`: `Array` von `WholesalerMask`-Objekten (für Lieferschein-Analyse)

---

### Collection: `orders`

-   **Zweck:** Speichert alle Bestellungen (Entwürfe und abgeschickte).
-   **Dokumenten-Schema (`Order`):**
    -   `id`: `string` (als `_id` in MongoDB)
    -   `orderNumber`: `string`
    -   `date`: `string` (ISO-Datum)
    -   `wholesalerId`: `string`
    -   `wholesalerName`: `string`
    -   `items`: `Array` von `OrderItem`-Objekten
    -   `status`: `string` (Enum: "draft", "ordered", "partially-received", "received", "partially-commissioned")
    -   `locationId`: `string | null` (Wichtig für Fahrzeugbestellungen)
    -   `initiatedBy`: `Object | null` (Schema: `{ userId: string, userName: string }`)

---

### Collection: `app_settings`

-   **Zweck:** Speichert globale Anwendungseinstellungen. Diese Collection sollte **nur ein einziges Dokument** enthalten.
-   **Dokumenten-ID:** Verwende eine feste ID, z.B. `"global"`.
-   **Dokumenten-Schema (`AppSettings`):**
    -   `ai`: `Object` (Schema: `{ provider: string, model: string, apiKey: string }`)
    -   `deliveryNoteAi`: `Object` (Schema: `{ provider: string, model: string, apiKey: string }`)

## 5. Implementierungs-Anweisungen

1.  **Hooks ersetzen:**
    -   Die Logik in `src/firebase/firestore/use-collection.tsx` und `use-doc.tsx` muss durch MongoDB-Äquivalente ersetzt werden. Für Echtzeit-Updates musst du die **MongoDB Change Streams** verwenden, um das `onSnapshot`-Verhalten von Firestore zu spiegeln.
2.  **Schreiboperationen ersetzen:**
    -   Die Funktionen in `src/firebase/non-blocking-updates.tsx` (`setDoc`, `addDoc`, etc.) müssen durch die entsprechenden MongoDB-Treiber-Befehle (`insertOne`, `updateOne`, `deleteOne`, `replaceOne`) ersetzt werden.
3.  **Zentralen Context anpassen:**
    -   Der `AppContext` (`src/context/AppContext.tsx`) ist der zentrale Punkt. Hier werden die neuen Hooks und Schreibfunktionen aufgerufen. Die komplexe Geschäftslogik (z.B. `getAnalysisData`) sollte idealerweise unverändert bleiben, solange die Daten aus den neuen Hooks im exakt gleichen Format wie zuvor ankommen.

Diese Anleitung stellt sicher, dass die neue MongoDB-Datenbank eine exakte Kopie der Funktionalität der Firestore-Datenbank ist. Halte dich strikt an die vorgegebenen Schemata und Collection-Namen.