#!/bin/bash

# CyberShieldX Update and Admin Reset Script
#
# Dit script helpt bij het updaten van CyberShieldX en het herstellen van admin-toegang.
# Het zorgt ook voor de installatie van benodigde afhankelijkheden.

# Kleuren voor output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functie voor foutafhandeling
handle_error() {
  echo -e "${RED}Fout: $1${NC}"
  exit 1
}

# Controleer of we root-rechten hebben
check_root() {
  if [ "$EUID" -ne 0 ]; then
    echo -e "${YELLOW}Dit script wordt niet uitgevoerd als root.${NC}"
    echo -e "${YELLOW}Sommige functies kunnen mogelijk niet werken zonder sudo-rechten.${NC}"
    read -p "Doorgaan? (j/n): " choice
    case "$choice" in 
      j|J ) echo "Doorgaan als niet-root gebruiker...";;
      * ) echo "Script wordt afgebroken."; exit 1;;
    esac
  fi
}

# Afhankelijkheden installeren
install_dependencies() {
  echo -e "${GREEN}Benodigde afhankelijkheden installeren...${NC}"
  
  # Controleer welk pakketbeheersysteem beschikbaar is
  if command -v apt-get &> /dev/null; then
    sudo apt-get update
    sudo apt-get install -y nodejs npm postgresql-client libpq-dev
  elif command -v yum &> /dev/null; then
    sudo yum update
    sudo yum install -y nodejs npm postgresql-devel
  elif command -v dnf &> /dev/null; then
    sudo dnf update
    sudo dnf install -y nodejs npm postgresql-devel
  elif command -v pacman &> /dev/null; then
    sudo pacman -Syu
    sudo pacman -S nodejs npm postgresql
  else
    echo -e "${YELLOW}Waarschuwing: Kon geen ondersteund pakketbeheersysteem vinden.${NC}"
    echo -e "${YELLOW}Je moet handmatig Node.js en PostgreSQL client installeren.${NC}"
  fi
  
  # Installeer node packages
  npm install pg
}

# Admin-gebruiker herstellen
reset_admin() {
  echo -e "${GREEN}Admin-gebruiker herstellen...${NC}"
  
  # Controleer of ensure-admin-fixed.js bestaat
  if [ ! -f "ensure-admin-fixed.js" ]; then
    echo -e "${RED}ensure-admin-fixed.js niet gevonden!${NC}"
    echo -e "${YELLOW}Het bestand wordt nu gedownload...${NC}"
    
    # Download het bestand van GitHub of een andere bron
    curl -s https://raw.githubusercontent.com/yourusername/cybershieldx/main/ensure-admin-fixed.js -o ensure-admin-fixed.js || handle_error "Kon ensure-admin-fixed.js niet downloaden."
    
    chmod +x ensure-admin-fixed.js
  fi
  
  # Voer het admin herstel script uit
  node ensure-admin-fixed.js || handle_error "Uitvoeren van ensure-admin-fixed.js mislukt."
}

# Hoofdprogramma
echo -e "${GREEN}=== CyberShieldX Update & Admin Reset Tool ===${NC}"
echo -e "${GREEN}Deze tool helpt bij het updaten van CyberShieldX en het herstellen van admin-toegang.${NC}"
echo

# Controleer root-rechten
check_root

# Toon menu
echo "Kies een optie:"
echo "1. Installeer afhankelijkheden"
echo "2. Herstel admin-toegang"
echo "3. Voer beide acties uit"
echo "4. Afsluiten"

read -p "Jouw keuze (1-4): " option

case $option in
  1)
    install_dependencies
    echo -e "${GREEN}Afhankelijkheden succesvol geïnstalleerd!${NC}"
    ;;
  2)
    reset_admin
    echo -e "${GREEN}Admin-toegang hersteld!${NC}"
    ;;
  3)
    install_dependencies
    reset_admin
    echo -e "${GREEN}Alle acties succesvol uitgevoerd!${NC}"
    ;;
  4)
    echo "Afsluiten..."
    exit 0
    ;;
  *)
    handle_error "Ongeldige optie geselecteerd."
    ;;
esac

echo
echo -e "${GREEN}Script succesvol uitgevoerd!${NC}"
exit 0