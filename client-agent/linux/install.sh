#!/bin/bash
# CyberShieldX Agent Linux/RPi Installatiescript
# Dit script installeert de CyberShieldX agent op Linux of Raspberry Pi systemen

# Kleuren voor de output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color
CYAN='\033[0;36m'

# Log bestand
LOG_FILE="/tmp/cybershieldx_install.log"

# Log functie
log() {
  local timestamp=$(date "+%Y-%m-%d %H:%M:%S")
  echo -e "${GREEN}[INFO]${NC} $1"
  echo "[$timestamp] [INFO] $1" >> $LOG_FILE
}

warn() {
  local timestamp=$(date "+%Y-%m-%d %H:%M:%S")
  echo -e "${YELLOW}[WAARSCHUWING]${NC} $1"
  echo "[$timestamp] [WAARSCHUWING] $1" >> $LOG_FILE
}

error() {
  local timestamp=$(date "+%Y-%m-%d %H:%M:%S")
  echo -e "${RED}[FOUT]${NC} $1"
  echo "[$timestamp] [FOUT] $1" >> $LOG_FILE
}

success() {
  local timestamp=$(date "+%Y-%m-%d %H:%M:%S")
  echo -e "${GREEN}[SUCCES]${NC} $1"
  echo "[$timestamp] [SUCCES] $1" >> $LOG_FILE
}

# Help tonen
show_help() {
    echo "CyberShieldX Agent Linux/RPi Installatiescript"
    echo ""
    echo "Gebruik: sudo ./install.sh [opties]"
    echo ""
    echo "Opties:"
    echo "  --clientid=ID         Client ID (verplicht)"
    echo "  --server=URL          Server URL (standaard: https://api.cybershieldx.com)"
    echo "  --installdir=DIR      Installatiemap (standaard: /opt/cybershieldx)"
    echo "  --loglevel=LEVEL      Log niveau (debug, info, warn, error) (standaard: info)"
    echo "  --interval=INTERVAL   Scan interval (1h, 6h, 12h, 24h) (standaard: 6h)"
    echo "  --noautostart         Niet automatisch starten bij systeemstart"
    echo "  --silent              Stille installatie (geen interactie)"
    echo "  --help                Toon deze help"
    echo ""
    echo "Voorbeeld:"
    echo "  sudo ./install.sh --clientid=abc123 --server=https://cybershieldx.uwbedrijf.com"
    exit 0
}

# Standaardwaarden
CLIENT_ID=""
SERVER_URL="https://api.cybershieldx.com"
INSTALL_DIR="/opt/cybershieldx"
LOG_LEVEL="info"
SCAN_INTERVAL="6h"
AUTO_START="true"
SILENT="false"

# Argumenten verwerken
for arg in "$@"; do
    case $arg in
        --clientid=*)
        CLIENT_ID="${arg#*=}"
        shift
        ;;
        --server=*)
        SERVER_URL="${arg#*=}"
        shift
        ;;
        --installdir=*)
        INSTALL_DIR="${arg#*=}"
        shift
        ;;
        --loglevel=*)
        LOG_LEVEL="${arg#*=}"
        shift
        ;;
        --interval=*)
        SCAN_INTERVAL="${arg#*=}"
        shift
        ;;
        --noautostart)
        AUTO_START="false"
        shift
        ;;
        --silent)
        SILENT="true"
        shift
        ;;
        --help)
        show_help
        ;;
        *)
        # Onbekende optie
        ;;
    esac
done

# Header weergeven
echo -e "${CYAN}=================================================${NC}"
echo -e "${CYAN}   CyberShieldX Agent Linux/RPi Installatiescript   ${NC}"
echo -e "${CYAN}=================================================${NC}"
echo ""

# Check of script als root draait
if [ "$EUID" -ne 0 ]; then
  error "Dit script moet als root worden uitgevoerd. Probeer 'sudo ./install.sh'"
  exit 1
fi

# Controleer en vraag om ClientID als die niet is opgegeven
if [ -z "$CLIENT_ID" ] && [ "$SILENT" = "false" ]; then
    read -p "Voer uw Client ID in (verplicht, te vinden in het CyberShieldX webplatform): " CLIENT_ID
    if [ -z "$CLIENT_ID" ]; then
        error "Geen Client ID opgegeven. Installatie wordt afgebroken."
        exit 1
    fi
fi

if [ -z "$CLIENT_ID" ]; then
    error "Geen Client ID opgegeven. Gebruik --clientid parameter of voer interactieve installatie uit."
    exit 1
fi

# Controleer en vraag om ServerUrl als die niet de standaard is
if [ "$SERVER_URL" = "https://api.cybershieldx.com" ] && [ "$SILENT" = "false" ]; then
    read -p "Voer server URL in (druk op Enter voor standaard: $SERVER_URL): " customServer
    if [ ! -z "$customServer" ]; then
        SERVER_URL=$customServer
    fi
fi

log "Installatie wordt gestart met de volgende instellingen:"
log "  - Client ID: $CLIENT_ID"
log "  - Server URL: $SERVER_URL"
log "  - Installatie map: $INSTALL_DIR"
log "  - Log niveau: $LOG_LEVEL"
log "  - Scan interval: $SCAN_INTERVAL"
log "  - Automatisch starten: $AUTO_START"

if [ "$SILENT" = "false" ]; then
    echo ""
    read -p "Wilt u doorgaan met de installatie? (J/N) " confirmation
    if [ "$confirmation" != "J" ] && [ "$confirmation" != "j" ]; then
        warn "Installatie geannuleerd door gebruiker."
        exit 0
    fi
fi

# Begin installatie
log "CyberShieldX Agent installatie gestart..."

# Detecteer besturingssysteem
if [ -f /etc/os-release ]; then
    # freedesktop.org and systemd
    . /etc/os-release
    OS=$NAME
    VER=$VERSION_ID
elif type lsb_release >/dev/null 2>&1; then
    # linuxbase.org
    OS=$(lsb_release -si)
    VER=$(lsb_release -sr)
elif [ -f /etc/lsb-release ]; then
    # Sommige Ubuntu/Debian versies
    . /etc/lsb-release
    OS=$DISTRIB_ID
    VER=$DISTRIB_RELEASE
else
    # Fallback
    OS=$(uname -s)
    VER=$(uname -r)
fi

log "Gedetecteerd besturingssysteem: $OS $VER"

# Controleer en installeer vereiste pakketten
log "Vereiste pakketten controleren en installeren..."

# Bepaal package manager
PKG_MANAGER=""
if command -v apt-get &> /dev/null; then
    PKG_MANAGER="apt-get"
    log "Package manager: apt-get (Debian/Ubuntu/Raspbian)"
elif command -v yum &> /dev/null; then
    PKG_MANAGER="yum"
    log "Package manager: yum (CentOS/RHEL/Fedora)"
elif command -v dnf &> /dev/null; then
    PKG_MANAGER="dnf"
    log "Package manager: dnf (Newer Fedora/RHEL)"
else
    warn "Geen ondersteunde package manager gevonden. Mogelijk zijn handmatige stappen nodig."
fi

# Update package lijst
if [ "$PKG_MANAGER" = "apt-get" ]; then
    log "Package lijsten updaten..."
    apt-get update -y >> $LOG_FILE 2>&1
fi

# Installeer benodigde pakketten
required_packages=("curl" "wget" "net-tools" "nmap" "nodejs" "npm")
for pkg in "${required_packages[@]}"; do
    if ! command -v $pkg &> /dev/null; then
        if [ "$pkg" = "nodejs" ] || [ "$pkg" = "npm" ]; then
            if ! command -v node &> /dev/null; then
                log "Node.js niet gevonden. Installatie wordt gestart..."
                
                # Node.js installeren
                if [ "$PKG_MANAGER" = "apt-get" ]; then
                    # Voeg NodeSource repository toe
                    curl -fsSL https://deb.nodesource.com/setup_16.x | bash - >> $LOG_FILE 2>&1
                    apt-get install -y nodejs >> $LOG_FILE 2>&1
                elif [ "$PKG_MANAGER" = "yum" ] || [ "$PKG_MANAGER" = "dnf" ]; then
                    # Voeg NodeSource repository toe
                    curl -fsSL https://rpm.nodesource.com/setup_16.x | bash - >> $LOG_FILE 2>&1
                    $PKG_MANAGER install -y nodejs >> $LOG_FILE 2>&1
                else
                    # Fallback voor andere distro's
                    warn "Geen ondersteunde package manager voor Node.js. Installeer Node.js 16.x of nieuwer handmatig."
                fi
                
                if command -v node &> /dev/null; then
                    success "Node.js succesvol geïnstalleerd."
                else
                    error "Node.js installatie mislukt. Installeer Node.js 16.x of nieuwer handmatig."
                    exit 1
                fi
            fi
        else
            log "$pkg niet gevonden. Installatie wordt gestart..."
            if [ ! -z "$PKG_MANAGER" ]; then
                $PKG_MANAGER install -y $pkg >> $LOG_FILE 2>&1
                if [ $? -eq 0 ]; then
                    success "$pkg succesvol geïnstalleerd."
                else
                    warn "$pkg installatie mislukt."
                fi
            fi
        fi
    else
        log "$pkg is reeds geïnstalleerd."
    fi
done

# Maak installatiemap
log "Installatiemap voorbereiden..."
mkdir -p $INSTALL_DIR
mkdir -p $INSTALL_DIR/config
mkdir -p $INSTALL_DIR/data
mkdir -p $INSTALL_DIR/logs

# Download agent bestanden
log "Agent bestanden downloaden..."

try_download_agent() {
    # Probeer agent te downloaden van server
    wget -q --spider $SERVER_URL/downloads/linux/agent.tar.gz
    if [ $? -eq 0 ]; then
        log "Agent zip beschikbaar op server, bezig met downloaden..."
        wget -O /tmp/cybershieldx_agent.tar.gz $SERVER_URL/downloads/linux/agent.tar.gz >> $LOG_FILE 2>&1
        
        if [ $? -eq 0 ]; then
            log "Agent succesvol gedownload, bezig met uitpakken..."
            tar -xzf /tmp/cybershieldx_agent.tar.gz -C $INSTALL_DIR
            rm /tmp/cybershieldx_agent.tar.gz
            return 0
        fi
    fi
    
    return 1
}

if ! try_download_agent; then
    warn "Download van server mislukt, proberen van GitHub repository..."
    
    # Fallback: Probeer GitHub als alternatief
    wget -O /tmp/cybershieldx_repo.zip https://github.com/Jjustmee23/CyberShieldX/archive/refs/heads/main.zip >> $LOG_FILE 2>&1
    
    if [ $? -eq 0 ]; then
        log "Repository succesvol gedownload, bezig met uitpakken..."
        
        # Installeer unzip indien nodig
        if ! command -v unzip &> /dev/null; then
            if [ ! -z "$PKG_MANAGER" ]; then
                $PKG_MANAGER install -y unzip >> $LOG_FILE 2>&1
            fi
        fi
        
        mkdir -p /tmp/cybershieldx_temp
        unzip -q /tmp/cybershieldx_repo.zip -d /tmp/cybershieldx_temp
        
        # Kopieer alleen de client-agent map
        cp -r /tmp/cybershieldx_temp/CyberShieldX-main/client-agent/* $INSTALL_DIR/
        
        # Opruimen
        rm /tmp/cybershieldx_repo.zip
        rm -rf /tmp/cybershieldx_temp
        
        success "Agent bestanden succesvol via alternatieve bron gedownload."
    else
        error "Kon agent bestanden niet downloaden. Installatie wordt afgebroken."
        exit 1
    fi
fi

# Installeer NPM dependencies
log "Node.js dependencies installeren..."
cd $INSTALL_DIR
npm install --production >> $LOG_FILE 2>&1

if [ $? -eq 0 ]; then
    success "Dependencies succesvol geïnstalleerd."
else
    error "Fout bij installeren van dependencies."
    exit 1
fi

# Maak configuratiebestand
log "Configuratiebestand aanmaken..."
CONFIG_FILE="$INSTALL_DIR/config/config.json"

cat > $CONFIG_FILE << EOF
{
  "clientId": "$CLIENT_ID",
  "server": "$SERVER_URL",
  "logLevel": "$LOG_LEVEL",
  "scanInterval": "$SCAN_INTERVAL",
  "autoStart": $AUTO_START,
  "telemetry": true,
  "autoUpdate": true,
  "installDir": "$INSTALL_DIR"
}
EOF

success "Configuratiebestand aangemaakt op $CONFIG_FILE"

# Maak systemd service voor automatisch starten
if [ "$AUTO_START" = "true" ]; then
    log "Systemd service aanmaken..."
    
    SERVICE_FILE="/etc/systemd/system/cybershieldx-agent.service"
    
    cat > $SERVICE_FILE << EOF
[Unit]
Description=CyberShieldX Security Agent
After=network.target

[Service]
ExecStart=/usr/bin/node $INSTALL_DIR/src/index.js --config=$CONFIG_FILE
WorkingDirectory=$INSTALL_DIR
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=cybershieldx-agent
User=root

[Install]
WantedBy=multi-user.target
EOF

    # Start en enable service
    systemctl daemon-reload
    systemctl enable cybershieldx-agent
    systemctl start cybershieldx-agent
    
    if [ $? -eq 0 ]; then
        success "Service succesvol aangemaakt en gestart."
    else
        warn "Fout bij aanmaken of starten van service."
        warn "U kunt de agent handmatig starten met: node $INSTALL_DIR/src/index.js"
    fi
fi

# Maak een desktop bestand aan (voor GUI omgevingen)
if [ -d "/usr/share/applications" ]; then
    log "Desktop bestand aanmaken..."
    
    DESKTOP_FILE="/usr/share/applications/cybershieldx-agent.desktop"
    
    cat > $DESKTOP_FILE << EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=CyberShieldX Agent
Comment=CyberShieldX Security Agent
Exec=sh -c "cd $INSTALL_DIR && npm start"
Icon=$INSTALL_DIR/assets/icon.png
Terminal=false
Categories=System;Security;
EOF

    success "Desktop bestand aangemaakt."
fi

# Maak uninstaller script
log "Uninstaller script aanmaken..."

UNINSTALL_SCRIPT="$INSTALL_DIR/uninstall.sh"

cat > $UNINSTALL_SCRIPT << EOF
#!/bin/bash
# CyberShieldX Agent uninstaller

echo "CyberShieldX Agent wordt verwijderd..."

# Stop en verwijder service
if [ -f "/etc/systemd/system/cybershieldx-agent.service" ]; then
    systemctl stop cybershieldx-agent
    systemctl disable cybershieldx-agent
    rm /etc/systemd/system/cybershieldx-agent.service
    systemctl daemon-reload
fi

# Verwijder desktop bestand
if [ -f "/usr/share/applications/cybershieldx-agent.desktop" ]; then
    rm /usr/share/applications/cybershieldx-agent.desktop
fi

# Verwijder installatiemap
rm -rf $INSTALL_DIR

echo "CyberShieldX Agent is succesvol verwijderd."
EOF

chmod +x $UNINSTALL_SCRIPT
success "Uninstaller script aangemaakt op $UNINSTALL_SCRIPT"

# Installatie voltooien
echo ""
echo -e "${GREEN}=================================================${NC}"
echo -e "${GREEN}   CyberShieldX Agent Installatie Voltooid!      ${NC}"
echo -e "${GREEN}=================================================${NC}"
echo ""
success "Installatie voltooid op: $(date)"
log "Installatiemap: $INSTALL_DIR"
log "Log bestand: $LOG_FILE"
echo ""

if [ "$AUTO_START" = "true" ]; then
    log "De agent draait nu als een systemd service en zal automatisch starten bij opstarten."
    log "Gebruik 'systemctl status cybershieldx-agent' om de status te controleren."
else
    log "U kunt de agent handmatig starten met: node $INSTALL_DIR/src/index.js"
fi

echo ""
log "Voor ondersteuning, neem contact op met support@cybershieldx.com"
echo -e "${GREEN}=================================================${NC}"

# Als we op een Raspberry Pi draaien, toon extra informatie
if [ -f /proc/device-tree/model ] && grep -q "Raspberry Pi" /proc/device-tree/model; then
    echo ""
    log "Gedetecteerd: Raspberry Pi"
    log "Voor optimale werking op Raspberry Pi:"
    log "1. Zorg voor voldoende koeling"
    log "2. Gebruik een geschikte voeding (min. 2.5A voor Pi 3, 3A voor Pi 4)"
    log "3. Overweeg een microSD kaart van klasse 10 met minimaal 16GB"
    echo ""
fi

exit 0