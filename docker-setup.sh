#!/bin/bash

# CyberShieldX Docker Setup Script
# =================================
# Dit script moet worden uitgevoerd nadat de Docker-container is gestart.
# Het zorgt voor een automatische setup van de database en admin gebruiker.

# Kleuren voor output
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================================"
echo -e " CyberShieldX Docker Setup Script"
echo -e "================================================${NC}"
echo ""
echo -e "Dit script maakt automatisch een database en admin gebruiker aan."
echo ""

# Controleer of we in een Docker-omgeving zijn
if [ ! -f "/.dockerenv" ]; then
  echo -e "${YELLOW}Waarschuwing: Het lijkt erop dat dit script niet in een Docker-container wordt uitgevoerd.${NC}"
  echo -e "Dit script is ontworpen om binnen de CyberShieldX Docker-container te werken."
  
  read -p "Wil je toch doorgaan? [y/N] " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Setup afgebroken.${NC}"
    exit 1
  fi
fi

# Automatische setup uitvoeren met Node.js script
echo -e "${BLUE}[1/2] Start automatische database en admin setup...${NC}"
if ! node setup-database-admin.js; then
  echo -e "${RED}De Node.js setup is mislukt. Probeer het handmatig opnieuw uit te voeren:${NC}"
  echo "node setup-database-admin.js"
  exit 1
fi

# Setup voltooid markeren met environment variabele
echo -e "${BLUE}[2/2] Setup als voltooid markeren...${NC}"
if [ -f ".env" ]; then
  if grep -q "SKIP_SETUP=" .env; then
    sed -i 's/SKIP_SETUP=.*/SKIP_SETUP=true/' .env
  else
    echo "SKIP_SETUP=true" >> .env
  fi
else
  echo "SKIP_SETUP=true" > .env
fi

# Stel de omgevingsvariabele direct in
export SKIP_SETUP=true

echo -e "${GREEN}Setup voltooid!${NC}"
echo -e "Je kunt nu inloggen met:"
echo -e "Gebruiker: ${BLUE}admin${NC}"
echo -e "Wachtwoord: ${BLUE}password123${NC}"
echo ""
echo -e "Je zult gevraagd worden om het wachtwoord te wijzigen bij de eerste login."
echo ""
echo -e "${GREEN}De server zou nu automatisch moeten starten. Als dat niet gebeurt, start handmatig met:${NC}"
echo "npm start"
echo ""

exit 0