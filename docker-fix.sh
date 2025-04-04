#!/bin/bash

# CyberShieldX Docker Fix Script
# ==============================
# Dit script lost problemen op met de Docker-setup van CyberShieldX.
# Het configureert de database en initialiseert een admin gebruiker automatisch.

# Kleuren voor output
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================================="
echo -e " CyberShieldX Docker Fix Script"
echo -e "==================================================${NC}"
echo ""
echo -e "Dit script lost problemen op met de Docker setup van CyberShieldX."
echo -e "Het zal automatisch:"
echo -e "  1. De database initialiseren"
echo -e "  2. Een admin gebruiker aanmaken"
echo -e "  3. De configuratie opslaan"
echo ""

# Controleer of Node.js is geïnstalleerd
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js is niet geïnstalleerd. Installeer dit eerst met:${NC}"
    echo "apt update && apt install -y nodejs npm"
    exit 1
fi

# Controleer of het init-database.js script bestaat
if [ ! -f "init-database.js" ]; then
    echo -e "${RED}Het init-database.js script bestaat niet.${NC}"
    echo "Zorg ervoor dat je dit script uitvoert vanuit de hoofdmap van het project."
    exit 1
fi

# Maak het script uitvoerbaar
chmod +x init-database.js

# Voer het initalisatie script uit
echo -e "${BLUE}Database en admin initialiseren...${NC}"
if ! node init-database.js; then
    echo -e "${RED}De database initialisatie is mislukt.${NC}"
    echo "Controleer de foutmelding hierboven voor meer informatie."
    exit 1
fi

# Herstart de applicatie indien nodig
echo -e "${BLUE}De applicatie herstarten...${NC}"
if [ -f "docker-compose.yml" ]; then
    # Als docker-compose beschikbaar is, gebruik dit om te herstarten
    if command -v docker-compose &> /dev/null; then
        docker-compose restart app
        echo -e "${GREEN}Applicatie succesvol herstart met docker-compose.${NC}"
    else
        # Gebruik de Docker Compose plugin als fallback
        if command -v docker &> /dev/null; then
            docker compose restart app
            echo -e "${GREEN}Applicatie succesvol herstart met docker compose.${NC}"
        else
            echo -e "${YELLOW}Docker niet gevonden. Herstart de applicatie handmatig:${NC}"
            echo "docker-compose restart app"
        fi
    fi
else
    echo -e "${YELLOW}docker-compose.yml niet gevonden. Herstart de applicatie handmatig.${NC}"
fi

echo ""
echo -e "${GREEN}Fix voltooid!${NC}"
echo -e "Je zou nu moeten kunnen inloggen in CyberShieldX met:"
echo -e "Gebruiker: ${BLUE}admin${NC}"
echo -e "Wachtwoord: ${BLUE}password123${NC}"
echo ""
echo -e "Je wordt gevraagd om het wachtwoord te wijzigen bij de eerste login."
echo ""

exit 0