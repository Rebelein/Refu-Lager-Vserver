Füge zum Plan einen weiteren schritt hinzu:
ich habe einen neuen vserver eingerichtet auf diesem müsste noch docker mit portainer installiert werden. verbinde dich mit ssh auf den server und führe die installation durch, hier die server infos:

debian 13

Benutzer
root

Host
217.154.223.78

ssh root@217.154.223.78
(falls passwort benötigt: adminrebeleingoettfert2025 )

GitHub-Repo: 
Rebelein/Refu-Lager-Vserver (wurde bereits neu erstellt)
GHCR nutzen

Eigentümer: Rebelein
Refu-Lager-Vserver/.github/workflows/image_app.yml


name: CI

permissions:
  contents: read
  packages: write

on:
  push:
    branches: [ "main" ]
    tags: [ 'v*.*.*' ]
  pull_request:
    branches: [ "main" ]
  workflow_dispatch:

jobs:
  build-and-push-backend:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract Docker metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ghcr.io/${{ github.repository_owner }}/lagerrebelein-backend
          tags: |
            type=raw,value=latest,enable={{is_default_branch}}
            type=ref,event=branch
            type=ref,event=tag
            type=sha,prefix=sha-,format=short

      - name: Build and push Docker image (server)
        uses: docker/build-push-action@v6
        with:
          context: ./server
          file: ./server/Dockerfile
          push: ${{ github.event_name != 'pull_request' }}
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

Infrastruktur:
MongoDB-Verbindungsstring produktiv

Domain(s) und Kontakt-Email für Nginx Proxy Manager / Let’s Encrypt
Domain: rebelein-lager.duckdns.org Email: rebelein.app@gmail.com

Migration “big bang”
Datentransfer-Skript (Firestore → MongoDB) ja


Duckdns daten:
Duck DNS
account
Rebelein@github

type
free

token
f12be1d8-7faf-4052-8064-31f84b177525

domain		
rebelein-lager

current ip
217.154.223.78

ipv6
2a01:239:3ae:200::1


 





