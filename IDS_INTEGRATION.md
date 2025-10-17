# Anleitung zur Implementierung der IDS-Connect Schnittstelle

Dieses Dokument beschreibt die notwendigen Schritte, um die Rebelein Lager-Anwendung mit einer IDS-Connect-Schnittstelle (z.B. von GC Online Plus) zu verbinden, wenn die Anwendung auf einem eigenen Server (lokal oder in der Cloud) betrieben wird.

## 1. Ziel

Das Ziel ist es, Artikeldaten von einem Großhändler über die IDS-Schnittstelle zu suchen und in die Lagerverwaltungs-App zu importieren. Die Kommunikation mit der IDS-Schnittstelle darf aus Sicherheitsgründen **niemals direkt vom Client (Browser)** erfolgen. Sie muss immer über einen serverseitigen Proxy (Backend-Endpunkt) laufen.

## 2. Voraussetzungen

1.  **IDS-Zugangsdaten:** Benutzername und Passwort für den IDS-Dienst des Großhändlers.
2.  **IDS-Schnittstellen-URL:** Die "UNGL-URL" des Großhändlers. Diese ist der Einstiegspunkt für alle Anfragen.
3.  **Lokale Serverumgebung:** Eine laufende Node.js-Umgebung, in der die Next.js-Anwendung betrieben wird.

## 3. Architektur: Der Backend-Proxy

Der Kern der Implementierung ist ein API-Endpunkt im Next.js-Backend. Dieser Endpunkt agiert als sicherer Vermittler (Proxy) zwischen dem Frontend der Anwendung und der externen IDS-Schnittstelle.

**Datei für den API-Endpunkt:** `src/app/api/ids-connect/route.ts`

### Funktionsweise des Endpunkts:

1.  **Anfrage vom Frontend:** Das Frontend sendet eine Anfrage an `/api/ids-connect`, z.B. mit einem Suchbegriff für einen Artikel.
2.  **Anfrage an IDS-Server:** Der API-Endpunkt auf dem Server empfängt diese Anfrage. Er verwendet die (sicher auf dem Server gespeicherten) IDS-Zugangsdaten und den Suchbegriff, um eine spezielle URL für die IDS-Schnittstelle zu generieren.
3.  **URL-Parameter (Beispiel für Artikelsuche):**
    *   `USER`: Der IDS-Benutzername.
    *   `PASSWORD`: Das IDS-Passwort.
    *   `TARGET`: `_blank` (um die Antwort in einem neuen Fenster/Tab zu erhalten, das der Server abfängt).
    *   `ACTION`: `ARTIKEL_SUCHE`.
    *   `SEARCH`: Der vom Benutzer eingegebene Suchbegriff.
    *   `ZIEL`: `WARENKORB` (damit die IDS-Schnittstelle weiß, dass die Daten zurückgegeben werden sollen).
    *   `HOOK_URL`: Eine URL zurück zu unserem eigenen Backend, an die die IDS-Schnittstelle das Ergebnis sendet.
4.  **Daten empfangen:** Der Server ruft die generierte IDS-URL auf. Die IDS-Schnittstelle verarbeitet die Anfrage und sendet die Ergebnisdaten an die `HOOK_URL`.
5.  **Daten parsen & zurückgeben:** Der Backend-Endpunkt empfängt die Daten am `HOOK_URL`, parst das (oft proprietäre) Format und wandelt es in ein sauberes JSON-Format um.
6.  **Antwort an das Frontend:** Der Endpunkt sendet das JSON-Objekt mit den Artikeldaten als Antwort an das Frontend zurück, das die Daten dann anzeigen kann.

## 4. Zu ändernde Dateien und Implementierungsschritte

### Schritt 1: Serverseitige Logik erstellen (`src/app/api/ids-connect/route.ts`)

-   Erstelle einen neuen API-Endpunkt in Next.js.
-   Implementiere eine `POST`-Funktion, die Suchanfragen entgegennimmt.
-   Speichere die IDS-Zugangsdaten sicher als Umgebungsvariablen auf dem Server (z.B. in `.env.local`). Lese sie mit `process.env.IDS_USER` etc. aus.
-   Baue die Logik, um die IDS-URL dynamisch zu generieren.
-   Verwende eine HTTP-Client-Bibliothek (wie `axios` oder `node-fetch`), um die IDS-URL aufzurufen.
-   Implementiere den `HOOK_URL`-Endpunkt, um die Antwort von der IDS-Schnittstelle zu verarbeiten.

### Schritt 2: Frontend-Integration (`src/app/(app)/settings/page.tsx`)

-   Die Eingabefelder für Benutzername und Passwort auf dieser Seite müssen tatsächlich eine Funktion auslösen.
-   Beim Klick auf "Verbinden" / "Speichern" sollten die eingegebenen Daten an einen sicheren API-Endpunkt gesendet werden (z.B. `/api/settings/save-ids-credentials`), der sie serverseitig speichert (z.B. verschlüsselt in einer Datenbank oder sicher als Umgebungsvariablen aktualisiert – **niemals im `backend.json` oder im Code!**).

### Schritt 3: Artikelsuche und -import implementieren

-   Erstelle eine neue Komponente oder einen neuen Dialog, der ein Suchfeld enthält.
-   Wenn der Benutzer eine Suche abschickt, ruft diese Komponente den `/api/ids-connect`-Endpunkt im Backend auf.
-   Die zurückgegebenen Artikeldaten werden in einer Liste angezeigt.
-   Jeder Artikel in der Liste erhält einen "Importieren"-Button.
-   Ein Klick auf "Importieren" übernimmt die Artikeldaten (Name, Artikelnummer etc.) und öffnet den "Neuen Artikel anlegen"-Dialog (`inventory-list/page.tsx`), wobei die Felder bereits ausgefüllt sind.