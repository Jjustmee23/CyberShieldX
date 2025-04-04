#!/bin/bash

# CyberShieldX Admin Setup Script
# -------------------------------
# Dit script helpt bij het instellen van de admin-gebruiker voor CyberShieldX.
# Het installeert Node.js, npm en de benodigde modules, en voert vervolgens
# het admin-herstelscript uit.

echo "=== CyberShieldX Admin Setup ==="
echo "Dit script helpt bij het instellen van een admin-gebruiker voor CyberShieldX."
echo ""

# Controleer of script wordt uitgevoerd als root
if [[ $EUID -ne 0 ]]; then
   echo "Dit script moet worden uitgevoerd als root (sudo)."
   echo "Probeer opnieuw met: sudo ./admin-setup.sh"
   exit 1
fi

# Installeer Node.js en npm als ze nog niet zijn geïnstalleerd
echo "Controleren of Node.js en npm zijn geïnstalleerd..."
if ! command -v node &> /dev/null || ! command -v npm &> /dev/null; then
    echo "Node.js en npm worden geïnstalleerd..."
    apt update
    apt install -y nodejs npm
    echo "Node.js en npm zijn geïnstalleerd."
else
    echo "Node.js en npm zijn al geïnstalleerd."
fi

# Installeer de benodigde pg module
echo "De PostgreSQL module 'pg' wordt geïnstalleerd..."
npm install -g pg

# Controleer of het admin script bestaat
SCRIPT_PATH="./ensure-admin-fixed.js"
if [ ! -f "$SCRIPT_PATH" ]; then
    echo "FOUT: Het admin script '${SCRIPT_PATH}' kon niet worden gevonden."
    echo "Zorg ervoor dat je dit setup script uitvoert vanuit dezelfde map als ensure-admin-fixed.js."
    exit 1
fi

# Maak het script uitvoerbaar
chmod +x "$SCRIPT_PATH"

echo ""
echo "Alles is gereed. Het admin herstelscript wordt nu gestart..."
echo "Volg de instructies op het scherm om de admin-gebruiker in te stellen."
echo ""

# Voer het admin script uit
node "$SCRIPT_PATH"

echo ""
echo "Setup voltooid. Je kunt nu inloggen op het CyberShieldX platform met de zojuist ingestelde gegevens."