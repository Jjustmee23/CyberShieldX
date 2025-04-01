#!/bin/bash
# CyberShieldX Automatisch Installatiescript
# Dit script installeert en configureert automatisch CyberShieldX op een Ubuntu 22.04 server

# Kleuren voor de output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
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

success() {
  echo -e "${GREEN}[SUCCES]${NC} $1"
}

# Check of script als root draait
if [ "$EUID" -ne 0 ]; then
  error "Dit script moet als root worden uitgevoerd. Probeer 'sudo ./install.sh'"
  exit 1
fi

# Welkom bericht
echo -e "${CYAN}=================================================${NC}"
echo -e "${CYAN}    CyberShieldX Automatisch Installatiescript    ${NC}"
echo -e "${CYAN}=================================================${NC}"
echo ""
echo "Dit script installeert de volledige CyberShieldX applicatie op uw server:"
echo "✓ Docker & Docker Compose"
echo "✓ PostgreSQL database"
echo "✓ CyberShieldX webplatform"
echo "✓ Traefik reverse proxy met automatische SSL certificaten"
echo "✓ PgAdmin voor database beheer"
echo ""
echo -e "De installatie neemt ongeveer 5-10 minuten in beslag."
echo ""
read -p "Druk op ENTER om door te gaan of Ctrl+C om te annuleren..."

# Variabelen instellen
INSTALL_DIR="/opt/cybershieldx"
DOMAIN=""
EMAIL=""

# Vraag om hostname en email voor SSL certificaat
read -p "Voer uw domein in (bijv. cybershieldx.example.com): " DOMAIN
read -p "Voer uw email adres in (voor SSL certificaat en admin): " EMAIL

# Controleer invoer
if [ -z "$DOMAIN" ]; then
  error "Geen domein ingevoerd. Een domein is vereist voor deze installatie."
  exit 1
fi

if [ -z "$EMAIL" ]; then
  error "Geen email ingevoerd. Een geldig email adres is vereist voor SSL certificaten."
  exit 1
fi

# Check domein formaat
if ! echo "$DOMAIN" | grep -qE '^([a-zA-Z0-9](([a-zA-Z0-9-]){0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$'; then
  warn "Het domein formaat lijkt niet correct. Zorg ervoor dat u een volledig gekwalificeerd domeinnaam gebruikt."
  read -p "Wilt u toch doorgaan? (j/n): " continue_anyway
  if [ "$continue_anyway" != "j" ] && [ "$continue_anyway" != "J" ]; then
    error "Installatie afgebroken. Voer opnieuw uit met een geldig domein."
    exit 1
  fi
fi

# PostgreSQL wachtwoord genereren
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
    ufw \
    jq

# Docker installeren
log "Docker installeren..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    
    # Als SUDO_USER bestaat, voeg deze gebruiker toe aan docker groep
    if [ ! -z "$SUDO_USER" ]; then
        usermod -aG docker $SUDO_USER
    fi
    
    success "Docker succesvol geïnstalleerd"
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
    success "Docker Compose succesvol geïnstalleerd"
else
    log "Docker Compose is al geïnstalleerd, installatie overgeslagen"
fi

# Firewall configureren
log "Firewall configureren..."
ufw allow ssh
ufw allow http
ufw allow https
echo "y" | ufw enable
success "Firewall geconfigureerd en ingeschakeld"

# Directories aanmaken
log "Directories aanmaken..."
mkdir -p $INSTALL_DIR
chmod -R 755 $INSTALL_DIR

# Clone de repository
log "CyberShieldX code ophalen..."
cd $INSTALL_DIR
if [ -d "$INSTALL_DIR/.git" ]; then
    git pull
    log "Code bijgewerkt naar laatste versie"
else
    git clone https://github.com/Jjustmee23/CyberShieldX.git .
    success "CyberShieldX repository succesvol gekloond"
fi

# DNS A records controleren
log "DNS instellingen controleren voor domein $DOMAIN..."
IP_ADDRESS=$(curl -s https://api.ipify.org)
DOMAIN_IP=$(dig +short $DOMAIN)
SUBDOMAIN_IP=$(dig +short pgadmin.$DOMAIN)

if [ -z "$DOMAIN_IP" ]; then
    warn "Kon DNS A record voor $DOMAIN niet vinden."
    warn "Zorg ervoor dat er een A record bestaat dat wijst naar $IP_ADDRESS"
fi

if [ -z "$SUBDOMAIN_IP" ]; then
    warn "Kon DNS A record voor pgadmin.$DOMAIN niet vinden."
    warn "Zorg ervoor dat er een A record bestaat voor pgadmin.$DOMAIN dat wijst naar $IP_ADDRESS"
    warn "Of maak een wildcard record *.${DOMAIN} dat wijst naar $IP_ADDRESS"
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

# Domain en email instellingen
DOMAIN=$DOMAIN
EMAIL=$EMAIL
EOF

success ".env bestand aangemaakt op $INSTALL_DIR/.env"

# Start de containers
log "CyberShieldX starten..."
cd $INSTALL_DIR
docker-compose down &> /dev/null # voor het geval er al iets draait
docker-compose up -d

# Wacht tot de containers draaien
log "Wachten tot de services beschikbaar zijn..."

# Functie om te controleren of een container draait
check_container() {
    local container_name=$1
    local max_attempts=$2
    local attempt=1
    
    echo -n "  Wachten op $container_name container..."
    while [ $attempt -le $max_attempts ]; do
        if docker ps | grep -q "$container_name"; then
            echo -e "\r  ${GREEN}$container_name container is actief${NC}             "
            return 0
        fi
        echo -n "."
        sleep 2
        attempt=$((attempt+1))
    done
    echo -e "\r  ${RED}$container_name container kon niet worden gestart${NC}      "
    return 1
}

# Containers controleren
check_container "traefik" 30
check_container "db" 30
check_container "app" 30
check_container "pgadmin" 30

# Server toegankelijkheid testen
log "SSL certificaat ophalen en website bereikbaarheid testen..."
echo "Dit kan enkele minuten duren, vooral voor het eerste SSL certificaat."

# Functie om te controleren of een domein bereikbaar is
check_domain() {
    local domain=$1
    local max_attempts=$2
    local attempt=1
    
    echo -n "  Testen van $domain bereikbaarheid..."
    while [ $attempt -le $max_attempts ]; do
        if curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 https://$domain | grep -q -E '(200|301|302|307|308)'; then
            echo -e "\r  ${GREEN}$domain is bereikbaar${NC}                  "
            return 0
        fi
        echo -n "."
        sleep 10
        attempt=$((attempt+1))
    done
    echo -e "\r  ${YELLOW}$domain kon niet worden bereikt, DNS en certificaat kunnen nog propageren${NC}"
    return 1
}

# Controleer de domeinen
check_domain "$DOMAIN" 18  # ongeveer 3 minuten wachten
check_domain "pgadmin.$DOMAIN" 6  # nog 1 minuut extra voor subdomain

# Post-installatie info tonen
echo -e "${GREEN}=================================================${NC}"
echo -e "${GREEN}    CyberShieldX Installatie Voltooid!    ${NC}"
echo -e "${GREEN}=================================================${NC}"
echo ""
echo -e "${CYAN}Toegangsgegevens:${NC}"
echo "Webplatform: https://$DOMAIN"
echo "PgAdmin: https://pgadmin.$DOMAIN"
echo ""
echo -e "${CYAN}Database inloggegevens:${NC}"
echo "  - Gebruiker: cybershieldx"
echo "  - Wachtwoord: $PG_PASSWORD"
echo ""
echo -e "${CYAN}Initiële platform inloggegevens:${NC}"
echo "  - Gebruiker: admin"
echo "  - Wachtwoord: $ADMIN_PASSWORD"
echo ""
echo -e "${YELLOW}BELANGRIJK: Wijzig het standaard admin wachtwoord onmiddellijk!${NC}"
echo ""
echo -e "${CYAN}Installatie informatie:${NC}"
echo "  - Installatiemap: $INSTALL_DIR"
echo "  - Docker compose configuratie: $INSTALL_DIR/docker-compose.yml"
echo "  - Omgevingsvariabelen: $INSTALL_DIR/.env"
echo ""
echo -e "${CYAN}Beheer commando's:${NC}"
echo "  - Status controleren: docker-compose -f $INSTALL_DIR/docker-compose.yml ps"
echo "  - Logs bekijken: docker-compose -f $INSTALL_DIR/docker-compose.yml logs -f"
echo "  - Herstarten: docker-compose -f $INSTALL_DIR/docker-compose.yml restart"
echo ""
echo -e "${CYAN}DNS Instellingen:${NC}"
echo "  Zorg ervoor dat de volgende DNS records bestaan:"
echo "  - $DOMAIN: A record wijzend naar $IP_ADDRESS"
echo "  - pgadmin.$DOMAIN: A record wijzend naar $IP_ADDRESS"
echo ""
echo -e "Voor ondersteuning: support@cybershieldx.com"
echo -e "${GREEN}=================================================${NC}"

# Sla installatiegegevens op
cat > $INSTALL_DIR/installation_info.txt << EOF
# CyberShieldX Installatie Informatie
# HOUD DIT BESTAND VEILIG - Bevat gevoelige gegevens

Installatiedatum: $(date)
Server IP: $IP_ADDRESS
Domein: $DOMAIN
Email: $EMAIL

# Database inloggegevens
Database gebruiker: cybershieldx
Database wachtwoord: $PG_PASSWORD
Database naam: cybershieldx

# Admin inloggegevens
Gebruikersnaam: admin
Wachtwoord: $ADMIN_PASSWORD (wijzig dit direct!)

# Toegangslinks
Webplatform: https://$DOMAIN
PgAdmin: https://pgadmin.$DOMAIN

# JWT Secret
JWT Secret: $JWT_SECRET
EOF

chmod 600 $INSTALL_DIR/installation_info.txt
success "Installatiegegevens opgeslagen in $INSTALL_DIR/installation_info.txt"

log "Om uw CyberShieldX platform te gebruiken, ga naar https://$DOMAIN"