## Refu-Lager Deployment (Debian 13)

Diese Anleitung installiert Docker, Docker Compose, Portainer, Nginx Proxy Manager und DuckDNS auf deinem V-Server und startet anschließend die App (MongoDB + Backend).

Voraussetzungen:
- Server: Debian 13 (root Zugriff)
- Domain: rebelein-lager.duckdns.org (DuckDNS konfiguriert)

### 1) SSH einloggen
```bash
ssh root@217.154.223.78
```

### 2) Docker Engine + Compose installieren
```bash
apt-get update -y && apt-get install -y ca-certificates curl gnupg
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian $(. /etc/os-release && echo $VERSION_CODENAME) stable" > /etc/apt/sources.list.d/docker.list
apt-get update -y && apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker
```

### 3) Verzeichnisse für Deploy anlegen
```bash
mkdir -p /opt/refu-lager/infra
mkdir -p /opt/refu-lager/app
```

### 4) Dateien auf den Server kopieren
Kopiere `deploy/infra/docker-compose.infra.yml` nach `/opt/refu-lager/infra/docker-compose.yml` und `deploy/app/docker-compose.app.yml` nach `/opt/refu-lager/app/docker-compose.yml` (z. B. mit scp oder Portainer).

DuckDNS Token in `/opt/refu-lager/infra/docker-compose.yml` ersetzen:
```
TOKEN=REPLACE_WITH_DUCKDNS_TOKEN
```

### 5) Infrastruktur-Stack starten (NPM, DuckDNS, Portainer)
```bash
cd /opt/refu-lager/infra
docker compose up -d
```

Nach dem Start:
- Portainer: https://SERVER_IP:9443 (Erstsetup Admin anlegen)
- NPM UI: http://SERVER_IP:81 (Default: admin@example.com / changeme beim ersten Login setzen)

### 6) App-Stack starten (MongoDB + Backend)
```bash
cd /opt/refu-lager/app
docker compose up -d
```

Backend läuft intern auf Port 4000 im `proxy` Netzwerk (exposed). In NPM einen Proxy Host anlegen:
- Domain Names: `rebelein-lager.duckdns.org`
- Scheme: `http`
- Forward Hostname / IP: `refu-lager-backend` oder `mongo`? → Backend-Container-Name: `refu-lager-backend`
- Forward Port: `4000`
- Cache Assets: off
- SSL: Request a new SSL Certificate (Let’s Encrypt), E-Mail: `rebelein.app@gmail.com`, Force SSL aktivieren

### 7) CI/CD (GHCR Image)
Der Workflow `.github/workflows/ci.yml` baut und pusht bei Push auf `main` nach GHCR: `ghcr.io/Rebelein/refu-lager-backend`.

Auf dem Server kannst du Updates ziehen via:
```bash
cd /opt/refu-lager/app
docker compose pull && docker compose up -d
```

### 8) Backups
Empfehlung: Volumes sichern (`mongo_data`, `npm_data`, `npm_letsencrypt`, `portainer_data`). Backup/Restore-Skripte folgen im Repo.
