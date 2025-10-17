
export type ChangeType = 'NEU' | 'VERBESSERT' | 'BEHOBEN';

export interface Change {
  type: ChangeType;
  description: string;
}

export interface ChangelogEntry {
  date: string;
  title: string;
  changes: Change[];
}

export const changelogData: ChangelogEntry[] = [
    {
    date: '2025-10-10',
    title: 'Workflow-Verbesserungen, Sicherheit & KI-Optimierungen',
    changes: [
      {
        type: 'NEU',
        description: 'Die Anwendung ist nun durch ein Passwort geschützt. Der Zugang wird erst nach erfolgreicher Eingabe gewährt, was die Sicherheit erhöht und Startfehler (Hydration Errors) behebt.',
      },
      {
        type: 'NEU',
        description: 'Bestehende Artikelbilder können jetzt beim Anlegen neuer Artikel über einen Dialog wiederverwendet und verknüpft werden, um die Datenbank schlank zu halten.',
      },
       {
        type: 'VERBESSERT',
        description: 'Die KI kann nun aus Screenshots von Produktseiten die URL extrahieren und automatisch in das Lieferanten-Feld eintragen.',
      },
       {
        type: 'VERBESSERT',
        description: 'Die KI extrahiert jetzt nur noch das reine Produktbild aus einem Screenshot und nicht mehr den gesamten Bildschirminhalt.',
      },
       {
        type: 'VERBESSERT',
        description: 'Der Großhändlername in der Artikelliste ist nun ein direkter Link zur Produktseite, sofern eine URL hinterlegt ist.',
      },
       {
        type: 'VERBESSERT',
        description: 'Artikel können nun direkt aus einem geöffneten Lagerplatz heraus erstellt werden, wobei der Lagerplatz automatisch im Formular eingetragen wird.',
      },
       {
        type: 'BEHOBEN',
        description: 'Ein kritischer Fehler, der durch zu viele Schreibvorgänge die Datenbankverbindung überlastete ("Write stream exhausted"), wurde behoben.',
      },
    ],
  },
   {
    date: '2025-10-10',
    title: 'UI-Struktur, Sortierung & mobile Bedienung',
    changes: [
      {
        type: 'NEU',
        description: 'Das Dialogfenster zum Anlegen und Bearbeiten von Artikeln wurde neugestaltet. Felder sind nun logisch gruppiert und der erste Lieferant ist sofort sichtbar.',
      },
      {
        type: 'NEU',
        description: 'Bilder können nun auf mobilen Geräten per Schaltfläche aus der Zwischenablage eingefügt werden.',
      },
      {
        type: 'VERBESSERT',
        description: 'Die Sortierung im Lagerbestand wurde erweitert. Lagerplätze (Gruppen) und Artikel (nach Name, Fach, Bestand) können nun unabhängig voneinander sortiert werden.',
      },
      {
        type: 'BEHOBEN',
        description: 'Ein Fehler wurde behoben, bei dem das Benachrichtigungs-Symbol auf dem Desktop nicht angezeigt wurde.',
      },
      {
        type: 'BEHOBEN',
        description: 'Der Filter für Lagerbereiche auf der Etikettendruck-Seite zeigt nun korrekt nur die Bereiche des ausgewählten Lagerorts an.',
      },
    ],
  },
   {
    date: '2025-10-10',
    title: 'Benutzerfreundlichkeit & Design-Optimierungen',
    changes: [
      {
        type: 'NEU',
        description: 'Das Dialogfenster zum Anlegen und Bearbeiten von Artikeln wurde komplett neugestaltet. Felder sind nun logisch gruppiert und der erste Lieferant ist sofort sichtbar, was die Dateneingabe beschleunigt.',
      },
      {
        type: 'NEU',
        description: 'Bilder können nun auf mobilen Geräten durch einen Klick auf eine Schaltfläche aus der Zwischenablage eingefügt werden.',
      },
      {
        type: 'VERBESSERT',
        description: 'Die Sortierfunktion im Lagerbestand wurde erweitert. Die Sortierung der Lagerplätze (Gruppen) und der Artikel darin ist nun komplett unabhängig voneinander steuerbar.',
      },
      {
        type: 'BEHOBEN',
        description: 'Ein Anzeigefehler im Etikettendruck-Filter wurde behoben. Die Auswahl des Lagerbereichs wird nun korrekt auf den zuvor ausgewählten Lagerort eingeschränkt.',
      },
    ],
  },
  {
    date: '2025-10-09',
    title: 'Zentrales Benachrichtigungssystem & UI-Verbesserungen',
    changes: [
      {
        type: 'NEU',
        description: 'Ein neues Benachrichtigungssystem wurde über ein Glocken-Symbol in der Kopfzeile eingeführt. Es informiert proaktiv über neue Bestellvorschläge, ausgeliehene Maschinen und Statusänderungen bei eigenen Bestellungen.',
      },
      {
        type: 'NEU',
        description: 'Benachrichtigungen können nun einzeln oder alle auf einmal gelöscht werden. Die rote Zähler-Anzeige wird beim Öffnen der Liste automatisch zurückgesetzt.',
      },
      {
        type: 'VERBESSERT',
        description: 'Die Anleitungs-Sektion wurde in ein interaktives, aufklappbares FAQ-Format umgewandelt, um die Übersichtlichkeit zu verbessern und detailliertere Erklärungen zu ermöglichen.',
      },
      {
        type: 'BEHOBEN',
        description: 'Ein wiederkehrender Fehler wurde endgültig behoben, der durch eine Endlosschleife bei der Zustands-Aktualisierung zu Abstürzen führte ("Maximum update depth exceeded").',
      },
    ],
  },
  {
    date: '2025-10-08',
    title: 'Dashboard-Erweiterung und Bestell-Optimierungen',
    changes: [
      {
        type: 'NEU',
        description: 'Dashboard-Kacheln für "Angeordnete Bestellungen" und "Bestellte Artikel" zeigen nun im aufgeklappten Zustand eine detaillierte, scrollbare Liste der jeweiligen Artikel an.',
      },
      {
        type: 'VERBESSERT',
        description: 'Die Tab-Leiste auf der Bestellseite ist nun auf mobilen Geräten responsiv und bricht bei Bedarf um, um ein horizontales Scrollen der gesamten Seite zu verhindern.',
      },
       {
        type: 'VERBESSERT',
        description: 'Die Beschriftungen der Tabs auf der Bestellseite ("Vorschläge", "Kom.", "Offene") wurden auf kleinen Bildschirmen verkürzt und passen sich auf größeren Bildschirmen dynamisch an, um Platz zu sparen.',
      },
    ],
  },
   {
    date: '2025-10-07',
    title: 'Kommissionierung & Bestellverlauf-Filter',
    changes: [
      {
        type: 'NEU',
        description: 'Für Fahrzeug-Bestellungen wurde ein Kommissionierungs-Schritt eingeführt. Ware kann nun als "Kommissioniert" markiert werden, bevor sie final auf das Fahrzeug gebucht wird.',
      },
       {
        type: 'NEU',
        description: 'Die Seite "Bestellverlauf" wurde um umfangreiche Filter- und Suchfunktionen erweitert. Es kann nun nach Lagerort, Zeitraum (mit Presets und benutzerdefiniertem Kalender) und per Textsuche gefiltert werden.',
      },
      {
        type: 'VERBESSERT',
        description: 'Die Kalenderansicht für die Datumsauswahl ist nun auf mobilen Geräten optimiert und zeigt nur einen Monat an.',
      },
      {
        type: 'BEHOBEN',
        description: 'Ein Fehler wurde behoben, bei dem die App auf der Bestellverlauf-Seite aufgrund eines fehlenden Imports abstürzte.',
      }
    ],
  },
];
