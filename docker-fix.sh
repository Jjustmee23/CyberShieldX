#!/bin/bash

# Dit script corrigeert poortproblemen in de Docker-configuratie
# Door de poort 3000 te wijzigen naar 5000 in zowel Dockerfile als docker-compose.yml

# Kleuren voor betere leesbaarheid
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}===============================================${NC}"
echo -e "${GREEN}    CyberShieldX Docker Port Fix Script        ${NC}"
echo -e "${GREEN}===============================================${NC}"
echo ""
echo "Dit script past de poortconfiguratie in de Docker-configuratiebestanden aan"
echo "van poort 3000 naar poort 5000 om te matchen met de server-configuratie."
echo ""

# Aanpassen Dockerfile
if [ -f "Dockerfile" ]; then
  echo -e "${GREEN}Updaten van poort in Dockerfile...${NC}"
  sed -i 's/ENV PORT=3000/ENV PORT=5000/g' Dockerfile
  sed -i 's/EXPOSE 3000/EXPOSE 5000/g' Dockerfile
  echo "Dockerfile succesvol aangepast."
else
  echo -e "${RED}Dockerfile niet gevonden!${NC}"
fi

# Aanpassen docker-compose.yml
if [ -f "docker-compose.yml" ]; then
  echo -e "${GREEN}Updaten van poort in docker-compose.yml...${NC}"
  sed -i 's/PORT=3000/PORT=5000/g' docker-compose.yml
  sed -i 's/traefik.http.services.app.loadbalancer.server.port=3000/traefik.http.services.app.loadbalancer.server.port=5000/g' docker-compose.yml
  echo "docker-compose.yml succesvol aangepast."
else
  echo -e "${RED}docker-compose.yml niet gevonden!${NC}"
fi

echo -e "${GREEN}===============================================${NC}"
echo -e "${GREEN}    Poortconfiguratie aangepast!              ${NC}"
echo -e "${GREEN}===============================================${NC}"
echo ""
echo "Voer de volgende commando's uit om de Docker-containers opnieuw te bouwen en te starten:"
echo "docker-compose down"
echo "docker-compose build"
echo "docker-compose up -d"
echo ""

exit 0
