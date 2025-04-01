#!/bin/bash
# CyberShieldX Docker Configuratie Fix
# Dit script lost de poortconflicten op uit het foutenoverzicht

# Kleuren voor betere leesbaarheid
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}===============================================${NC}"
echo -e "${GREEN}    CyberShieldX Docker Configuratie Fix      ${NC}"
echo -e "${GREEN}===============================================${NC}"
echo ""
echo "Dit script past de docker-compose.yml aan om de poortproblemen op te lossen"
echo "die zijn gerapporteerd in het foutenoverzicht."
echo ""
echo -e "${YELLOW}Let op: Voor deze fix moet je de docker-compose.yml bewerken.${NC}"
echo ""

# Vraag voor bevestiging
read -p "Wil je doorgaan met de configuratie fix? (j/n): " confirm
if [ "$confirm" != "j" ] && [ "$confirm" != "J" ]; then
  echo "Configuratie fix geannuleerd."
  exit 0
fi

# Controleer of docker-compose.yml bestaat
if [ ! -f "docker-compose.yml" ]; then
  echo -e "${RED}Error: docker-compose.yml niet gevonden in de huidige map.${NC}"
  exit 1
fi

echo "Maak backup van huidige docker-compose.yml..."
cp docker-compose.yml docker-compose.yml.backup

# Lees docker-compose.yml en pas de poortconfiguratie aan
echo "Aanpassen van docker-compose.yml om poort 5000 te gebruiken..."

# Vervang poort 3000 door 5000 in de Docker-configuratie
sed -i 's/- "3000:3000"/- "5000:5000"/' docker-compose.yml
sed -i 's/traefik.http.services.app.loadbalancer.server.port=3000/traefik.http.services.app.loadbalancer.server.port=5000/' docker-compose.yml
sed -i 's/PORT=3000/PORT=5000/' docker-compose.yml
sed -i 's/server.port=3000/server.port=5000/' docker-compose.yml

# Controleer of de wijzigingen zijn toegepast
if grep -q "5000:5000" docker-compose.yml && grep -q "server.port=5000" docker-compose.yml; then
  echo -e "${GREEN}Docker configuratie succesvol aangepast!${NC}"
  echo "Poort 3000 is gewijzigd naar poort 5000."
else
  echo -e "${RED}Kon de wijzigingen niet doorvoeren. Controleer docker-compose.yml handmatig.${NC}"
  exit 1
fi

# Vraag of de gebruiker de Docker containers wil herstarten
echo ""
echo "Voor deze wijzigingen is het nodig om de Docker containers te herstarten."
read -p "Wil je de containers nu herstarten? (j/n): " restart
if [ "$restart" == "j" ] || [ "$restart" == "J" ]; then
  echo "Stoppen van Docker containers..."
  docker-compose down
  
  echo "Starten van Docker containers met nieuwe configuratie..."
  docker-compose up -d
  
  echo -e "${GREEN}Docker containers zijn herstart met de nieuwe configuratie!${NC}"
  echo "Wacht een paar momenten tot alles is opgestart en controleer dan de toegang."
else
  echo -e "${YELLOW}Je hebt ervoor gekozen om de containers niet te herstarten.${NC}"
  echo "Voer 'docker-compose down && docker-compose up -d' uit wanneer je klaar bent."
fi

echo ""
echo -e "${GREEN}Configuratieproblemen zijn opgelost!${NC}"
echo "De docker-compose.yml is aangepast om poort 5000 te gebruiken in plaats van 3000."
echo "Een backup van je originele configuratie is opgeslagen als docker-compose.yml.backup"
echo ""
echo "Als je problemen ondervindt met het inloggen als admin, run dan het ensure-admin.js script:"
echo "    node ensure-admin.js"
echo ""

exit 0