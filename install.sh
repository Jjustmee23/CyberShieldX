#!/bin/bash
# CyberShieldX Automatisch Installatiescript
# Dit script installeert en configureert automatisch CyberShieldX op een Ubuntu 22.04 server

# Kleuren voor de output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Log functie
log() {
  echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
  echo -e "${YELLOW}[WAARSCHUWING]${NC} $1"
}

error() {
  echo -e "${RED}[FOUT]${NC} $1"
}

# Check of script als root draait
if [ "$EUID" -ne 0 ]; then
  error "Dit script moet als root worden uitgevoerd. Probeer 'sudo ./install.sh'"
  exit 1
fi

# Welkom bericht
echo -e "${GREEN}=================================================${NC}"
echo -e "${GREEN}    CyberShieldX Automatisch Installatiescript    ${NC}"
echo -e "${GREEN}=================================================${NC}"
echo ""
echo "Dit script zal automatisch alle benodigde componenten installeren:"
echo "- Docker & Docker Compose"
echo "- PostgreSQL database (in Docker)"
echo "- CyberShieldX webplatform"
echo "- Downloads map voor clients"
echo ""
echo -e "De installatie neemt ongeveer 5-10 minuten in beslag."
echo ""
read -p "Druk op ENTER om door te gaan of Ctrl+C om te annuleren..."

# Variabelen instellen
INSTALL_DIR="/opt/cybershieldx"
DATA_DIR="/var/lib/cybershieldx"
LOG_DIR="/var/log/cybershieldx"
DOWNLOAD_DIR="${INSTALL_DIR}/downloads"
DOMAIN=""
EMAIL=""

# Vraag om hostname en email voor SSL certificaat
read -p "Voer uw domein in (bv. cybershieldx.uwbedrijf.nl) of laat leeg voor localhost: " DOMAIN
read -p "Voer uw email adres in (voor SSL certificaat en admin): " EMAIL

# Als er geen email is ingevoerd, gebruik een standaard
if [ -z "$EMAIL" ]; then
  EMAIL="admin@cybershieldx.com"
  warn "Geen email ingevoerd, gebruik standaard: $EMAIL"
fi

# Als er geen domein is ingevoerd, gebruik localhost
if [ -z "$DOMAIN" ]; then
  DOMAIN="localhost"
  warn "Geen domein ingevoerd, gebruik localhost. Let op: SSL wordt niet opgezet."
fi

# PostgreSQL wachtwoord genereren als het niet is opgegeven
PG_PASSWORD=$(cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 16 | head -n 1)
log "PostgreSQL wachtwoord gegenereerd: $PG_PASSWORD"

# JWT Secret genereren
JWT_SECRET=$(cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1)
log "JWT secret sleutel gegenereerd"

# Admin standaard wachtwoord
ADMIN_PASSWORD="password123"
log "Standaard admin wachtwoord: $ADMIN_PASSWORD (wijzig dit direct na installatie!)"

# Update het systeem
log "Het systeem updaten..."
apt-get update && apt-get upgrade -y

# Installeer benodigde pakketten
log "Benodigde pakketten installeren..."
apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    git \
    ufw

# Docker installeren
log "Docker installeren..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    usermod -aG docker $SUDO_USER
    log "Docker succesvol geïnstalleerd"
else
    log "Docker is al geïnstalleerd, installatie overgeslagen"
fi

# Docker compose installeren
log "Docker Compose installeren..."
if ! command -v docker-compose &> /dev/null; then
    mkdir -p ~/.docker/cli-plugins/
    curl -SL https://github.com/docker/compose/releases/download/v2.17.2/docker-compose-linux-x86_64 -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose
    log "Docker Compose succesvol geïnstalleerd"
else
    log "Docker Compose is al geïnstalleerd, installatie overgeslagen"
fi

# Firewall configureren
log "Firewall configureren..."
ufw allow ssh
ufw allow http
ufw allow https
ufw allow 3000
ufw allow 5432
ufw allow 5050
echo "y" | ufw enable
log "Firewall geconfigureerd en ingeschakeld"

# Directories aanmaken
log "Directories aanmaken..."
mkdir -p $INSTALL_DIR $DATA_DIR $LOG_DIR $DOWNLOAD_DIR
chmod -R 755 $INSTALL_DIR
chmod -R 755 $DATA_DIR
chmod -R 755 $LOG_DIR
chmod -R 755 $DOWNLOAD_DIR

# Clone de repository
log "CyberShieldX code ophalen..."
cd $INSTALL_DIR
if [ -d "$INSTALL_DIR/.git" ]; then
    cd $INSTALL_DIR
    git pull
    log "Code bijgewerkt naar laatste versie"
else
    git clone https://github.com/Jjustmee23/CyberShieldX.git .
    log "CyberShieldX repository succesvol gekloond"
fi

# .env bestand aanmaken
log "Configuratiebestand aanmaken..."
cat > $INSTALL_DIR/.env << EOF
# PostgreSQL database instellingen
POSTGRES_USER=cybershieldx
POSTGRES_PASSWORD=$PG_PASSWORD
POSTGRES_DB=cybershieldx

# JWT authenticatie instellingen
JWT_SECRET=$JWT_SECRET
JWT_EXPIRATION=24h

# PgAdmin instellingen
PGADMIN_EMAIL=$EMAIL
PGADMIN_PASSWORD=$PG_PASSWORD

# Domain voor het platform
DOMAIN=$DOMAIN
EOF

log ".env bestand aangemaakt op $INSTALL_DIR/.env"

# Docker compose bestand aanpassen als er een domein is ingesteld
if [ "$DOMAIN" != "localhost" ]; then
    log "Docker-compose bestand configureren voor $DOMAIN..."
    # Voeg Traefik als reverse proxy toe aan docker-compose.yml
    # Dit is een vereenvoudigde versie, in een echte setup zou dit uitgebreider zijn
    cat > $INSTALL_DIR/docker-compose.yml << EOF
version: '3.8'

services:
  # Web platform
  app:
    build: .
    volumes:
      - ${DOWNLOAD_DIR}:/app/public/downloads
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DATABASE_URL=postgresql://\${POSTGRES_USER:-cybershieldx}:\${POSTGRES_PASSWORD:-cybershieldx}@db:5432/\${POSTGRES_DB:-cybershieldx}
      - JWT_SECRET=\${JWT_SECRET:-cybershieldxsecretchangethis}
      - JWT_EXPIRATION=\${JWT_EXPIRATION:-24h}
    depends_on:
      - db
    restart: unless-stopped
    networks:
      - cybershieldx-network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.cybershieldx.rule=Host(\`${DOMAIN}\`)"
      - "traefik.http.routers.cybershieldx.entrypoints=websecure"
      - "traefik.http.routers.cybershieldx.tls.certresolver=letsencrypt"
      - "traefik.http.services.cybershieldx.loadbalancer.server.port=3000"

  # PostgreSQL database
  db:
    image: postgres:14-alpine
    environment:
      - POSTGRES_USER=\${POSTGRES_USER:-cybershieldx}
      - POSTGRES_PASSWORD=\${POSTGRES_PASSWORD:-cybershieldx}
      - POSTGRES_DB=\${POSTGRES_DB:-cybershieldx}
    volumes:
      - postgres-data:/var/lib/postgresql/data
    restart: unless-stopped
    networks:
      - cybershieldx-network

  # pgAdmin (optional - for database management)
  pgadmin:
    image: dpage/pgadmin4
    environment:
      - PGADMIN_DEFAULT_EMAIL=\${PGADMIN_EMAIL:-admin@cybershieldx.com}
      - PGADMIN_DEFAULT_PASSWORD=\${PGADMIN_PASSWORD:-cybershieldx}
    depends_on:
      - db
    restart: unless-stopped
    networks:
      - cybershieldx-network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.pgadmin.rule=Host(\`pgadmin.${DOMAIN}\`)"
      - "traefik.http.routers.pgadmin.entrypoints=websecure"
      - "traefik.http.routers.pgadmin.tls.certresolver=letsencrypt"
      - "traefik.http.services.pgadmin.loadbalancer.server.port=80"

  # Traefik reverse proxy
  traefik:
    image: traefik:v2.9
    command:
      - "--api.insecure=false"
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge=true"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web"
      - "--certificatesresolvers.letsencrypt.acme.email=${EMAIL}"
      - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - "/var/run/docker.sock:/var/run/docker.sock:ro"
      - "letsencrypt-data:/letsencrypt"
    restart: unless-stopped
    networks:
      - cybershieldx-network

networks:
  cybershieldx-network:
    driver: bridge

volumes:
  postgres-data:
  letsencrypt-data:
EOF

else
    # Standaard docker-compose zonder traefik
    log "Docker-compose bestand gebruiken voor lokale installatie..."
    # Zorg ervoor dat de downloads map wordt gekoppeld aan de container
    sed -i '/app:/a\    volumes:\n      - ${DOWNLOAD_DIR}:/app/public/downloads' $INSTALL_DIR/docker-compose.yml
fi

# Start de containers
log "CyberShieldX starten..."
cd $INSTALL_DIR
docker-compose up -d

# Wacht tot de database klaar is
log "Wachten tot de database is geïnitialiseerd..."
sleep 30

# Voeg admin gebruiker toe (Dit zou in een seed script moeten gebeuren in de container)
log "Admin gebruiker instellen..."
# In een echte setup zou dit in een seed script moeten gebeuren

# Post-installatie info tonen
echo -e "${GREEN}=================================================${NC}"
echo -e "${GREEN}    CyberShieldX Installatie Voltooid!    ${NC}"
echo -e "${GREEN}=================================================${NC}"
echo ""
echo "Webplatform: http://$DOMAIN"
if [ "$DOMAIN" != "localhost" ]; then
    echo "PgAdmin: http://pgadmin.$DOMAIN"
else 
    echo "PgAdmin: http://localhost:5050"
fi
echo ""
echo "Database inloggegevens:"
echo "  - Gebruiker: cybershieldx"
echo "  - Wachtwoord: $PG_PASSWORD"
echo ""
echo "Initiële platform inloggegevens:"
echo "  - Gebruiker: admin"
echo "  - Wachtwoord: $ADMIN_PASSWORD"
echo ""
echo -e "${YELLOW}BELANGRIJK: Wijzig het standaard admin wachtwoord onmiddellijk!${NC}"
echo ""
echo "Installatiemap: $INSTALL_DIR"
echo "Downloads map: $DOWNLOAD_DIR"
echo ""
echo "Om status te controleren, gebruik:"
echo "  cd $INSTALL_DIR && docker-compose ps"
echo ""
echo "Om logs te bekijken, gebruik:"
echo "  cd $INSTALL_DIR && docker-compose logs -f"
echo ""
echo -e "Voor ondersteuning: support@cybershieldx.com"
echo -e "${GREEN}=================================================${NC}"