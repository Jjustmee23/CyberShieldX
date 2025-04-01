#!/bin/bash
# CyberShieldX Server Update Script
# Dit script werkt de CyberShieldX server bij en behoudt je data

# Kleuren voor betere leesbaarheid
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Controleer of script als root wordt uitgevoerd
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}Voer dit script uit als root (gebruik sudo)${NC}"
  exit 1
fi

echo -e "${GREEN}===============================================${NC}"
echo -e "${GREEN}    CyberShieldX Server Update Script         ${NC}"
echo -e "${GREEN}===============================================${NC}"
echo ""
echo "Dit script werkt je CyberShieldX server bij naar de nieuwste versie"
echo "zonder je bestaande gegevens te verliezen."
echo ""
echo -e "${YELLOW}BELANGRIJK: Maak een backup voordat je doorgaat.${NC}"
echo ""

# Vraag om bevestiging
read -p "Wil je doorgaan met de update? (j/n): " confirm
if [ "$confirm" != "j" ] && [ "$confirm" != "J" ]; then
  echo "Update geannuleerd."
  exit 0
fi

# Controle of Docker beschikbaar is
if ! command -v docker &> /dev/null; then
  echo -e "${RED}Docker is niet geïnstalleerd. Installeer Docker eerst.${NC}"
  exit 1
fi

if ! command -v docker-compose &> /dev/null; then
  echo -e "${RED}Docker Compose is niet geïnstalleerd. Installeer Docker Compose eerst.${NC}"
  exit 1
fi

# Backup functie
create_backup() {
  echo -e "${GREEN}Maak backup van de huidige configuratie...${NC}"
  
  # Maak backup directory
  BACKUP_DIR="/opt/cybershieldx-backup/$(date +%Y%m%d-%H%M%S)"
  mkdir -p $BACKUP_DIR
  
  # Kopieer configuratiebestanden
  if [ -f "/opt/cybershieldx/.env" ]; then
    cp /opt/cybershieldx/.env $BACKUP_DIR/
  fi
  
  if [ -f "/opt/cybershieldx/docker-compose.yml" ]; then
    cp /opt/cybershieldx/docker-compose.yml $BACKUP_DIR/
  fi
  
  # Database backup via docker
  if docker ps | grep -q "cybershieldx-db"; then
    echo -e "${GREEN}Maak database backup...${NC}"
    docker exec cybershieldx-db pg_dump -U cybershieldx cybershieldx > $BACKUP_DIR/database-backup.sql
  else
    echo -e "${YELLOW}Database container is niet actief, kan geen backup maken.${NC}"
  fi
  
  echo -e "${GREEN}Backup gemaakt in $BACKUP_DIR${NC}"
}

# Update functie
update_server() {
  echo -e "${GREEN}Download de nieuwste versie...${NC}"
  
  # Controleer of de installatiemap bestaat
  if [ ! -d "/opt/cybershieldx" ]; then
    echo -e "${RED}CyberShieldX installatiemap niet gevonden.${NC}"
    echo -e "${RED}Zorg ervoor dat het geïnstalleerd is in /opt/cybershieldx${NC}"
    exit 1
  fi
  
  # Navigeer naar de installatiemap
  cd /opt/cybershieldx
  
  # Controleer of het een git repository is
  if [ ! -d ".git" ]; then
    echo -e "${YELLOW}Geen git repository gevonden. Update via Git niet mogelijk.${NC}"
    echo -e "${YELLOW}Schakel over naar handmatige update...${NC}"
    
    # Handmatige update - Download nieuwste versie en bewaar configuratie
    TMP_DIR=$(mktemp -d)
    cd $TMP_DIR
    
    echo "Download nieuwste versie van GitHub..."
    git clone --depth 1 https://github.com/Jjustmee23/CyberShieldX.git
    
    if [ ! -d "CyberShieldX" ]; then
      echo -e "${RED}Download mislukt.${NC}"
      exit 1
    fi
    
    # Bewaar configuratie
    if [ -f "/opt/cybershieldx/.env" ]; then
      cp /opt/cybershieldx/.env CyberShieldX/
    fi
    
    # Stop de huidige containers
    cd /opt/cybershieldx
    docker-compose down
    
    # Verplaats nieuwe bestanden
    cp -r $TMP_DIR/CyberShieldX/* /opt/cybershieldx/
    
    # Opruimen
    rm -rf $TMP_DIR
  else
    # Update via Git
    echo "Update via Git..."
    
    # Stop de huidige containers
    docker-compose down
    
    # Pull de nieuwste versie
    git fetch --all
    git reset --hard origin/main
    
    if [ $? -ne 0 ]; then
      echo -e "${RED}Git update mislukt. Probeer handmatige update.${NC}"
      exit 1
    fi
  fi
  
  # Voer database migraties uit indien nodig
  echo -e "${GREEN}Start containers opnieuw...${NC}"
  docker-compose pull
  docker-compose up -d
  
  # Wacht tot de database gestart is
  echo "Wacht tot de database gestart is..."
  sleep 10
  
  # Controleer of containers draaien
  if ! docker-compose ps | grep -q "Up"; then
    echo -e "${RED}Containers zijn niet correct gestart. Controleer de logs met:${NC}"
    echo "docker-compose logs"
    exit 1
  fi
  
  echo -e "${GREEN}CyberShieldX server succesvol bijgewerkt!${NC}"
}

# Voer de backup en update uit
create_backup
update_server

echo -e "${GREEN}===============================================${NC}"
echo -e "${GREEN}    CyberShieldX Update Voltooid!             ${NC}"
echo -e "${GREEN}===============================================${NC}"
echo ""
echo "Je kunt de logs controleren met:"
echo "docker-compose -f /opt/cybershieldx/docker-compose.yml logs -f"
echo ""
echo "Bij problemen kun je de backup herstellen vanuit:"
echo "$BACKUP_DIR"
echo ""

exit 0