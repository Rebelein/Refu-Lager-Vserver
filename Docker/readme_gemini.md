Projektplan: Selbstgehostete Echtzeit-Lagerverwaltungs-App

1. Projektziel

Das Ziel dieses Projekts ist die Erstellung einer voll funktionsfähigen, webbasierten Lagerverwaltungsanwendung für einen Handwerksbetrieb. Die Anwendung soll in Echtzeit funktionieren, d.h. Änderungen an Daten (z.B. Lagerbeständen) werden sofort auf allen verbundenen Geräten ohne Neuladen der Seite sichtbar.

Die Entwicklung erfolgt in zwei Hauptphasen:

Prototyping: Schnelle Entwicklung einer funktionalen App in einer voll-gemanagten Umgebung (Firebase Studio).

Migration & Deployment: Umstellung der App auf eine selbstgehostete, DSGVO-konforme Infrastruktur auf einem lokalen Linux-Server mithilfe von Docker.

2. Technologischer Stack

Frontend: Single-Page Application (SPA), entwickelt mit einem JavaScript-Framework (z.B. React/Vite). Das Rendering findet ausschließlich im Browser statt (Client-Side Rendering).

Backend-API: Node.js mit dem Express.js-Framework.

Datenbank: MongoDB.

Echtzeit-Kommunikation: Socket.IO für die WebSocket-basierte Push-Kommunikation.

Containerisierung: Docker & Docker Compose.

Verwaltung: Portainer für eine grafische Docker-Verwaltung.

Deployment-Automatisierung: GitHub Actions für Continuous Integration/Continuous Deployment (CI/CD).

Netzwerk & Sicherheit: Nginx Proxy Manager als Reverse Proxy für SSL-Terminierung (Let's Encrypt) und Routing.

Erreichbarkeit: Ein kostenloser DynDNS-Dienst (z.B. DuckDNS) für den externen Zugriff über eine feste IP-Adresse.

3. Entwicklungs- und Migrations-Workflow

Phase A: Prototyping in Firebase Studio

Entwicklung der Kernlogik: Die komplette Benutzeroberfläche und Anwendungslogik wird in Firebase Studio entwickelt.

Datenbank (temporär): Firebase Firestore wird als Echtzeit-Datenbank für das Prototyping verwendet.

Vorbereitung der Migration: An jeder Stelle im Code, an der eine Lese- oder Schreiboperation auf die Firestore-Datenbank stattfindet, wird der Kommentar //mongodb hinzugefügt. Dies dient als Marker für die spätere Migration.

Versionierung: Der fertige Prototypen-Code wird in ein GitHub-Repository gepusht.

Phase B: Migration zu MongoDB & Socket.IO

Code-Basis: Der Code aus dem GitHub-Repository wird in eine lokale Entwicklungsumgebung (VS Code) geklont.

Datenbank-Logik ersetzen: Die Firestore-spezifischen SDK-Aufrufe an den //mongodb Markern werden durch die neue Logik ersetzt:

Datenbank-Interaktion: Für die Kommunikation mit der MongoDB-Datenbank wird die Bibliothek Mongoose verwendet.

Echtzeit-Funktionalität: Um die Echtzeit-Fähigkeit von Firestore nachzubauen, wird Socket.IO implementiert. Nach jeder erfolgreichen Schreiboperation in die MongoDB (Erstellen, Aktualisieren, Löschen) sendet der Server über Socket.IO ein Event an alle verbundenen Clients, um deren Ansicht zu aktualisieren.

4. Deployment-Architektur mit Docker

Die gesamte Anwendung wird als Multi-Container-Anwendung über einen Docker Stack (definiert in einer docker-compose.yml Datei) betrieben.

Benötigte Services im Docker Stack:

app: Der Container für die Node.js-Anwendung (Backend-API und Socket.IO-Server). Das Image hierfür wird automatisch via GitHub Actions gebaut.

mongodb: Der Container für die MongoDB-Datenbank.

nginx-proxy-manager: Der Container, der als Reverse Proxy fungiert. Er nimmt alle Anfragen aus dem Internet auf den Ports 80/443 entgegen, besorgt automatisch SSL-Zertifikate und leitet die Anfragen sicher an den app-Container weiter.

Persistente Daten:

Für mongodb und nginx-proxy-manager werden Docker Volumes verwendet, um sicherzustellen, dass die Datenbankinhalte sowie die Proxy-Konfiguration und SSL-Zertifikate einen Neustart des Servers überleben.

5. Automatisierung (CI/CD mit GitHub Actions)

Dockerfile: Im Hauptverzeichnis der Anwendung wird ein Dockerfile erstellt, das die Bauanleitung für das Anwendungs-Image enthält.

GitHub Workflow: Es wird ein Workflow eingerichtet, der bei jedem push auf den main-Branch automatisch ausgelöst wird.

Workflow-Schritte:

Der Code wird ausgecheckt.

Ein neues Docker-Image wird gemäß dem Dockerfile gebaut.

Das fertige Image wird in eine Container Registry (z.B. GitHub Container Registry oder Docker Hub) hochgeladen.

Update-Prozess: Um die Anwendung auf dem Server zu aktualisieren, wird in Portainer der App-Container mit einem Klick auf "Recreate" neu erstellt. Portainer zieht dabei automatisch das neueste Image aus der Registry.

6. Backup- und Restore-Strategie

Die Sicherung und Wiederherstellung erfolgt über Shell-Skripte auf dem Linux-Host, um eine vollständige und konsistente Sicherung zu gewährleisten.

Backup-Skript (backup.sh)

Dieses Skript wird auf dem Server ausgeführt, um ein vollständiges Backup zu erstellen.

#!/bin/bash
# --- Konfiguration ---
STACK_NAME="mein-stack"
BACKUP_DIR="/home/dein-benutzer/backups"
VOLUMES_DIR="/var/lib/docker/volumes"
COMPOSE_FILE_PATH="/pfad/zu/deiner/docker-compose.yml"

# --- Skript-Logik ---
echo "Backup wird gestartet..."
mkdir -p $BACKUP_DIR
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_FILENAME="$BACKUP_DIR/backup-$TIMESTAMP.tar.gz"

echo "Stoppe den Docker-Stack ($STACK_NAME)..."
docker-compose -f $COMPOSE_FILE_PATH -p $STACK_NAME stop

echo "Erstelle Backup-Archiv (Volumes + Konfiguration)..."
sudo tar -czvf $BACKUP_FILENAME -C $VOLUMES_DIR . -C $(dirname $COMPOSE_FILE_PATH) $(basename $COMPOSE_FILE_PATH)

echo "Starte den Docker-Stack ($STACK_NAME) erneut..."
docker-compose -f $COMPOSE_FILE_PATH -p $STACK_NAME start

echo "Backup erfolgreich erstellt: $BACKUP_FILENAME"


Restore-Skript (restore.sh)

Dieses Skript wird auf einem neuen Server ausgeführt, um ein System aus einer Backup-Datei wiederherzustellen.

#!/bin/bash
# --- Konfiguration ---
BACKUP_FILE=$1
VOLUMES_DIR="/var/lib/docker/volumes"

# --- Skript-Logik ---
if [ -z "$BACKUP_FILE" ]; then
    echo "Fehler: Bitte den Namen der Backup-Datei als Argument angeben."
    exit 1
fi

echo "Wiederherstellung wird gestartet..."
echo "Stoppe alle laufenden Container..."
docker stop $(docker ps -q) || true

echo "Entpacke Volumes und Konfigurationsdatei..."
sudo tar -xzvf $BACKUP_FILE -C /

# Passe Pfad und Name an deine Konfiguration an
COMPOSE_FILE_PATH="/pfad/zu/deiner/docker-compose.yml"
STACK_NAME="mein-stack"

echo "Starte den Docker-Stack aus der wiederhergestellten Konfiguration..."
docker-compose -f $COMPOSE_FILE_PATH -p $STACK_NAME up -d

echo "Wiederherstellung abgeschlossen."
