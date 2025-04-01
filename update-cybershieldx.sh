#!/bin/bash
# CyberShieldX Server Project Update Script
# Dit script werkt het volledige CyberShieldX project bij vanaf GitHub
# zonder gegevensverlies - kunt u uitvoeren als: 
# sudo ./update-cybershieldx.sh

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

# Controles vooraf
if [ "$EUID" -ne 0 ]; then
  error "Dit script moet als root worden uitgevoerd. Probeer 'sudo ./update-cybershieldx.sh'"
  exit 1
fi

# Parameters
INSTALL_DIR=${INSTALL_DIR:-"/opt/cybershieldx"}
BACKUP_DIR="${INSTALL_DIR}/backups/$(date +%Y%m%d_%H%M%S)"
BRANCH=${BRANCH:-"main"}
REPO=${REPO:-"https://github.com/Jjustmee23/CyberShieldX.git"}

# Welkom bericht
echo -e "${CYAN}=================================================${NC}"
echo -e "${CYAN}   CyberShieldX Server Project Update Script      ${NC}"
echo -e "${CYAN}=================================================${NC}"
echo ""
echo "Dit script zal het CyberShieldX project bijwerken vanaf GitHub."
echo "Het maakt een backup van uw huidige installatie en behoudt alle"
echo "configuraties en gegevens."
echo ""
echo -e "${YELLOW}BELANGRIJK: Zorg ervoor dat u een backup heeft van uw database!${NC}"
echo ""
read -p "Wilt u doorgaan met de update? (j/n): " CONTINUE

if [ "$CONTINUE" != "j" ] && [ "$CONTINUE" != "J" ]; then
  log "Update geannuleerd."
  exit 0
fi

# Controleren of het installatiemap bestaat
if [ ! -d "$INSTALL_DIR" ]; then
  error "Installatiemap $INSTALL_DIR niet gevonden. Is CyberShieldX correct geïnstalleerd?"
  exit 1
fi

# Backup maken
log "Backup maken van de huidige installatie in $BACKUP_DIR..."
mkdir -p "$BACKUP_DIR"

# Belangrijk: eerst containers stoppen
cd "$INSTALL_DIR"
log "Docker containers stoppen..."
docker-compose down || warn "Kon Docker containers niet stoppen. Mogelijk zijn ze al gestopt."

# Kopieer configuratiebestanden
log "Configuratiebestanden veiligstellen..."
if [ -f "$INSTALL_DIR/.env" ]; then
  cp "$INSTALL_DIR/.env" "$BACKUP_DIR/.env"
  success "Backup gemaakt van .env bestand"
fi

if [ -f "$INSTALL_DIR/docker-compose.yml" ]; then
  cp "$INSTALL_DIR/docker-compose.yml" "$BACKUP_DIR/docker-compose.yml"
  success "Backup gemaakt van docker-compose.yml"
fi

# Backup database maken via Docker container
if docker-compose ps | grep -q "db" && docker-compose ps | grep -q "Up"; then
  log "Database container is actief, maak een database backup..."
  mkdir -p "$BACKUP_DIR/database"
  docker-compose exec -T db pg_dump -U cybershieldx -Fc cybershieldx > "$BACKUP_DIR/database/cybershieldx_$(date +%Y%m%d).dump"
  success "Database backup gemaakt"
else
  warn "Database container is niet actief. Kan geen automatische database backup maken."
  warn "Als u doorgaat, wordt de database niet gebackupt!"
  read -p "Wilt u toch doorgaan? (j/n): " CONTINUE_WITHOUT_DB
  if [ "$CONTINUE_WITHOUT_DB" != "j" ] && [ "$CONTINUE_WITHOUT_DB" != "J" ]; then
    log "Update geannuleerd."
    exit 0
  fi
fi

# Backup docker volumes
log "Docker volumes backuppen..."
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p "$BACKUP_DIR/volumes"

# We halen de volume namen op en maken een backup van elk volume
for VOLUME in $(docker volume ls -q | grep cybershield); do
  log "Backup maken van volume: $VOLUME"
  
  # Maak een tijdelijke container om de volume data te kopieren
  docker run --rm -v $VOLUME:/source -v $BACKUP_DIR/volumes:/backup alpine ash -c "cd /source && tar -czf /backup/$VOLUME-$TIMESTAMP.tar.gz ."
done

success "Backup van Docker volumes is voltooid"

# Huidige git configuratie opslaan
if [ -d "$INSTALL_DIR/.git" ]; then
  log "Huidige git configuratie opslaan..."
  cd "$INSTALL_DIR"
  GIT_REMOTE=$(git remote -v | grep fetch | awk '{print $2}')
  GIT_BRANCH=$(git branch --show-current)
  
  if [ -n "$GIT_REMOTE" ]; then
    log "Huidige git remote: $GIT_REMOTE"
    echo "$GIT_REMOTE" > "$BACKUP_DIR/git_remote"
  fi
  
  if [ -n "$GIT_BRANCH" ]; then
    log "Huidige git branch: $GIT_BRANCH"
    echo "$GIT_BRANCH" > "$BACKUP_DIR/git_branch"
  fi
fi

# Code bijwerken
log "Code bijwerken naar de nieuwste versie..."
cd "$INSTALL_DIR"

# Als het een git repository is, pull
if [ -d "$INSTALL_DIR/.git" ]; then
  # Reset mogelijke lokale wijzigingen
  git checkout -- .
  git clean -fd
  
  # Fetch en reset naar de gevraagde branch
  git fetch origin
  git checkout $BRANCH
  git reset --hard origin/$BRANCH
  
  if [ $? -ne 0 ]; then
    error "Git update mislukt. Terugdraaien..."
    # Instellingen terugzetten
    if [ -f "$BACKUP_DIR/.env" ]; then
      cp "$BACKUP_DIR/.env" "$INSTALL_DIR/.env"
    fi
    if [ -f "$BACKUP_DIR/docker-compose.yml" ]; then
      cp "$BACKUP_DIR/docker-compose.yml" "$INSTALL_DIR/docker-compose.yml"
    fi
    exit 1
  fi
  
  success "Code bijgewerkt via Git"
else
  # Als het geen git repository is, kloon opnieuw
  warn "Geen git repository gevonden. Clone een nieuwe kopie..."
  
  # Verplaats de huidige directory tijdelijk
  mv "$INSTALL_DIR" "${INSTALL_DIR}_old"
  mkdir -p "$INSTALL_DIR"
  
  # Kloon de repository
  git clone --depth 1 -b $BRANCH $REPO "$INSTALL_DIR"
  
  if [ $? -ne 0 ]; then
    error "Git clone mislukt. Terugdraaien..."
    rm -rf "$INSTALL_DIR"
    mv "${INSTALL_DIR}_old" "$INSTALL_DIR"
    exit 1
  fi
  
  # Configuratiebestanden terugzetten
  if [ -f "$BACKUP_DIR/.env" ]; then
    cp "$BACKUP_DIR/.env" "$INSTALL_DIR/.env"
  fi
  if [ -f "$BACKUP_DIR/docker-compose.yml" ]; then
    cp "$BACKUP_DIR/docker-compose.yml" "$INSTALL_DIR/docker-compose.yml"
  fi
  
  # Verwijder de oude directory
  rm -rf "${INSTALL_DIR}_old"
  
  success "Code bijgewerkt via Git clone"
fi

# Containers opnieuw starten
log "Docker containers opnieuw starten..."
cd "$INSTALL_DIR"
docker-compose pull  # Pull nieuwe Docker images indien beschikbaar
docker-compose build --no-cache app  # Herbouw de app container
docker-compose up -d

if [ $? -ne 0 ]; then
  error "Docker containers starten mislukt. Terugdraaien..."
  
  # Stop de containers
  docker-compose down
  
  # Instellingen terugzetten
  if [ -f "$BACKUP_DIR/.env" ]; then
    cp "$BACKUP_DIR/.env" "$INSTALL_DIR/.env"
  fi
  if [ -f "$BACKUP_DIR/docker-compose.yml" ]; then
    cp "$BACKUP_DIR/docker-compose.yml" "$INSTALL_DIR/docker-compose.yml"
  fi
  
  # Probeer de oude containers te starten
  docker-compose up -d
  
  exit 1
fi

# Controleren of de containers draaien
log "Controleren of de containers succesvol zijn gestart..."
sleep 10

if docker-compose ps | grep -q "Exit"; then
  warn "Eén of meer containers zijn gestopt na het starten."
  warn "Controleer de container logs met: docker-compose logs"
else
  success "Alle containers zijn succesvol gestart"
fi

# Update voltooid
echo -e "${GREEN}=================================================${NC}"
echo -e "${GREEN}     CyberShieldX Project Update Voltooid!        ${NC}"
echo -e "${GREEN}=================================================${NC}"
echo ""
echo "Uw CyberShieldX project is bijgewerkt naar de nieuwste versie."
echo "Een backup van uw vorige installatie is gemaakt in:"
echo "  $BACKUP_DIR"
echo ""
echo "Om de status te controleren:"
echo "  cd $INSTALL_DIR && docker-compose ps"
echo ""
echo "Om de logs te bekijken:"
echo "  cd $INSTALL_DIR && docker-compose logs -f"
echo ""
echo -e "Bij problemen kunt u de backup herstellen of contact opnemen met support."
echo -e "${GREEN}=================================================${NC}"

exit 0