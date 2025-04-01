# CyberShieldX Platform

CyberShieldX is een compleet cybersecurity platform voor organisaties die hun netwerken en systemen willen beveiligen met geavanceerde monitoring en scanning tools. Het platform bestaat uit twee hoofdcomponenten:

1. **CyberShieldX Webplatform** - Een centrale beheeromgeving voor consultants en beheerders
2. **CyberShieldX Agent** - Een cross-platform applicatie die op client systemen draait voor beveiliging en monitoring

![CyberShieldX Logo](./client/public/logo-full.png)

## Inhoudsopgave

- [Functionaliteiten](#functionaliteiten)
- [Systeemvereisten](#systeemvereisten)
- [Installatie](#installatie)
  - [Webplatform Installatie](#webplatform-installatie)
  - [Agent Installatie](#agent-installatie)
- [Configuratie](#configuratie)
- [Gebruik](#gebruik)
- [Veelgestelde vragen (FAQ)](#veelgestelde-vragen-faq)
- [Probleemoplossing](#probleemoplossing)
- [Licentie](#licentie)

## Functionaliteiten

### Webplatform

- **Dashboard** - Realtime overzicht van alle beveiligingsincidenten en systeemstatus
- **Client Management** - Beheer van alle clients, met individuele instellingen en rapportages
- **Incident Management** - Vastleggen, opvolgen en afhandelen van beveiligingsincidenten
- **Scan Management** - Plannen en uitvoeren van beveiligingsscans
- **Rapportages** - Gedetailleerde rapportages en risico-analyses
- **Security Training** - Beveiligingstrainingen en bewustwording voor eindgebruikers
- **Notificaties** - Realtime notificaties voor kritieke beveiligingsgebeurtenissen

### Agent

- **Cross-platform** - Werkt op Windows, MacOS, Linux en Raspberry Pi
- **Netwerk scanning** - Detecteert alle apparaten op het netwerk en kwetsbaarheden
- **Systeem scanning** - Controleert lokale systemen op beveiligingsinstellingen
- **Malware detectie** - Identificeert mogelijke malware en verdachte activiteiten
- **Kwetsbaarheidsscanning** - Identificeert bekende kwetsbaarheden in besturingssystemen en software
- **Automatische updates** - Houdt zichzelf up-to-date met de nieuwste beveiligingsdefinities
- **Realtime monitoring** - Doorlopende beveiliging en incidentdetectie

## Systeemvereisten

### Webplatform

- **Node.js**: 18.x of hoger
- **PostgreSQL**: 14.x of hoger
- **Webbrowser**: Chrome, Firefox, Edge of Safari (laatste versies)
- **Opslag**: Minimaal 1GB beschikbare schijfruimte
- **RAM**: Minimaal 2GB (aanbevolen: 4GB)

### Agent

#### Windows
- Windows 10/11 of Windows Server 2016/2019/2022
- 2GB RAM (minimaal), 4GB aanbevolen
- 500MB beschikbare schijfruimte
- Node.js 16.x of hoger

#### MacOS
- macOS 10.15 (Catalina) of hoger
- 2GB RAM (minimaal), 4GB aanbevolen
- 500MB beschikbare schijfruimte
- Node.js 16.x of hoger

#### Linux
- Ubuntu 18.04/20.04/22.04, Debian 10/11, CentOS 8/9, of vergelijkbare distributies
- 1GB RAM (minimaal), 2GB aanbevolen
- 500MB beschikbare schijfruimte
- Node.js 16.x of hoger

#### Raspberry Pi
- Raspberry Pi 3B+ of nieuwer
- Raspberry Pi OS (32-bit of 64-bit)
- 1GB RAM minimaal
- 2GB beschikbare schijfruimte
- Node.js 16.x of hoger

## Installatie

### Webplatform Installatie

1. **Kloon de repository**

```bash
git clone https://github.com/yourusername/cybershieldx.git
cd cybershieldx
```

2. **Installeer dependencies**

```bash
npm install
```

3. **Configureer de database**

- Maak een nieuwe PostgreSQL database aan
- Kopieer het `.env.example` bestand naar `.env`
- Werk de database configuratie bij in het `.env` bestand:

```
DATABASE_URL=postgresql://username:password@localhost:5432/cybershieldx
```

4. **Initialiseer de database**

```bash
npm run db:push
```

5. **Start de applicatie**

```bash
npm run dev
```

6. Open uw browser en ga naar `http://localhost:3000`

7. Log in met de standaard administrator account:
   - Gebruikersnaam: `admin`
   - Wachtwoord: `password123`

8. **Wijzig onmiddellijk het standaard wachtwoord** via het instellingen menu

### Agent Installatie

De CyberShieldX Agent kan op meerdere manieren worden geïnstalleerd, afhankelijk van het doelsysteem.

#### Windows Installatie

1. **Download het installatiepakket**

Download het nieuwste Windows installatiepakket van de [releases pagina](https://github.com/yourusername/cybershieldx/releases) of vanuit het CyberShieldX webplatform.

2. **Voer het installatieprogramma uit**

- Dubbelklik op het `.exe` bestand
- Volg de instructies in de installatiewizard
- Voer de client-ID in die is gegenereerd op het webplatform

3. **Installatie via Command Line (optioneel)**

Voor stille installatie of automatische deployment:

```cmd
cybershieldx-agent-setup.exe /S /clientid=UWCLIENTID /server=https://uwserver.com
```

#### MacOS Installatie

1. **Download het installatiepakket**

Download het `.dmg` bestand van de [releases pagina](https://github.com/yourusername/cybershieldx/releases) of vanuit het CyberShieldX webplatform.

2. **Voer het installatieprogramma uit**

- Open het `.dmg` bestand
- Sleep de CyberShieldX Agent naar de Applications map
- Open de applicatie vanuit de Applications map
- Voer de client-ID in die is gegenereerd op het webplatform

3. **Installatie via Terminal (optioneel)**

```bash
# Installeer Homebrew als u dit nog niet heeft
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Installeer de agent via Homebrew
brew tap cybershieldx/agent
brew install cybershieldx-agent

# Configureer de agent
cybershieldx-agent --configure --clientid=UWCLIENTID --server=https://uwserver.com
```

#### Linux Installatie

1. **Via installatiescript**

```bash
# Download het installatiescript
curl -fsSL https://raw.githubusercontent.com/yourusername/cybershieldx/main/install.sh -o install.sh

# Maak het uitvoerbaar
chmod +x install.sh

# Voer het uit met uw client-ID
./install.sh --clientid=UWCLIENTID --server=https://uwserver.com
```

2. **Via package manager**

Voor Ubuntu/Debian:

```bash
# Voeg de repository toe
curl -fsSL https://repo.cybershieldx.com/apt/gpg | sudo apt-key add -
echo "deb [arch=amd64] https://repo.cybershieldx.com/apt stable main" | sudo tee /etc/apt/sources.list.d/cybershieldx.list

# Installeer de agent
sudo apt update
sudo apt install cybershieldx-agent

# Configureer de agent
sudo cybershieldx-agent --configure --clientid=UWCLIENTID --server=https://uwserver.com
```

Voor CentOS/RHEL:

```bash
# Voeg de repository toe
sudo tee /etc/yum.repos.d/cybershieldx.repo << EOF
[cybershieldx]
name=CyberShieldX Repository
baseurl=https://repo.cybershieldx.com/rpm
enabled=1
gpgcheck=1
gpgkey=https://repo.cybershieldx.com/rpm/gpg
EOF

# Installeer de agent
sudo yum install cybershieldx-agent

# Configureer de agent
sudo cybershieldx-agent --configure --clientid=UWCLIENTID --server=https://uwserver.com
```

#### Raspberry Pi Installatie

1. **Via installatiescript**

```bash
# Download het installatiescript
curl -fsSL https://raw.githubusercontent.com/yourusername/cybershieldx/main/install-rpi.sh -o install-rpi.sh

# Maak het uitvoerbaar
chmod +x install-rpi.sh

# Voer het uit met uw client-ID
./install-rpi.sh --clientid=UWCLIENTID --server=https://uwserver.com
```

2. **Handmatige installatie (voor gevorderde gebruikers)**

```bash
# Installeer Node.js als u dit nog niet heeft
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt-get install -y nodejs

# Installeer vereiste pakketten
sudo apt-get install -y nmap net-tools

# Kloon de repository
git clone https://github.com/yourusername/cybershieldx-agent.git
cd cybershieldx-agent

# Installeer dependencies
npm install

# Configureer de agent
node src/index.js --configure --clientid=UWCLIENTID --server=https://uwserver.com

# Maak een service voor automatisch opstarten
sudo tee /etc/systemd/system/cybershieldx.service << EOF
[Unit]
Description=CyberShieldX Security Agent
After=network.target

[Service]
ExecStart=/usr/bin/node $(pwd)/src/index.js
WorkingDirectory=$(pwd)
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=cybershieldx
User=pi

[Install]
WantedBy=multi-user.target
EOF

# Activeer en start de service
sudo systemctl enable cybershieldx
sudo systemctl start cybershieldx
```

## Configuratie

### Webplatform Configuratie

De belangrijkste configuratie-instellingen voor het webplatform bevinden zich in het `.env` bestand:

```env
# Server configuratie
PORT=3000
NODE_ENV=production

# Database configuratie
DATABASE_URL=postgresql://username:password@localhost:5432/cybershieldx

# JWT Secret voor authenticatie
JWT_SECRET=uw_zeer_geheime_sleutel_hier
JWT_EXPIRATION=24h

# Mail server instellingen (voor notificaties)
MAIL_HOST=smtp.example.com
MAIL_PORT=587
MAIL_USER=noreply@uwbedrijf.nl
MAIL_PASSWORD=uwmailwachtwoord
MAIL_FROM=CyberShieldX <noreply@uwbedrijf.nl>

# Agent update server instellingen
UPDATE_SERVER_ENABLED=true
UPDATE_SERVER_PATH=/updates
```

### Agent Configuratie

De agent kan worden geconfigureerd via de command line interface of via het webplatform:

```bash
# Handmatige configuratie
cybershieldx-agent --configure

# Command line configuratie
cybershieldx-agent --configure --clientid=UWCLIENTID --server=https://uwserver.com --interval=6h
```

Beschikbare configuratieopties:

| Optie | Beschrijving | Standaardwaarde |
|-------|-------------|-----------------|
| clientid | De unieke ID voor deze client | (verplicht) |
| server | URL van de CyberShieldX server | https://api.cybershieldx.com |
| interval | Interval tussen scans (1h, 6h, 12h, 24h) | 6h |
| loglevel | Log niveau (debug, info, warn, error) | info |
| autostart | Automatisch starten bij systeemopstart | true |
| telemetry | Telemetrie gegevens verzenden | true |
| autoupdate | Automatische updates inschakelen | true |

## Gebruik

### Webplatform

1. **Dashboard navigatie**
   - Het dashboard toont een overzicht van alle systemen, incidenten en recente scans
   - Gebruik de zijbalk om naar verschillende secties te navigeren

2. **Client toevoegen**
   - Ga naar "Clients" in de zijbalk
   - Klik op "Nieuwe client toevoegen"
   - Vul de vereiste gegevens in
   - Kopieer de gegenereerde Client ID voor gebruik bij de agent installatie

3. **Scans uitvoeren**
   - Ga naar "Scans" in de zijbalk
   - Klik op "Nieuwe scan"
   - Selecteer het scantype (Netwerk, Systeem, Kwetsbaarheid, Volledig)
   - Selecteer de doelclient(s)
   - Klik op "Scan starten"

4. **Rapportages bekijken**
   - Ga naar "Rapportages" in de zijbalk
   - Selecteer een client en een rapport
   - Gebruik de exportfunctie voor PDF of CSV export

5. **Incidenten beheren**
   - Ga naar "Incidenten" in de zijbalk
   - Klik op een incident om details te bekijken
   - Wijs een incident toe aan een gebruiker
   - Werk de status bij (Nieuw, In behandeling, Opgelost)
   - Voeg notities toe aan het incident

### Agent

De agent werkt grotendeels automatisch na de installatie en configuratie. Voor handmatige bediening:

**Windows**:
- Open de CyberShieldX Agent vanuit het systeemvak
- Klik rechts en selecteer "Open Beheer Console"

**MacOS**:
- Open de CyberShieldX Agent vanuit de menubalk
- Selecteer "Open Beheer Console"

**Linux/Raspberry Pi**:
- Open een terminal
- Voer uit: `cybershieldx-agent --console`

Vanuit de console kunt u:
- Handmatige scans starten
- De configuratie bekijken en wijzigen
- Logs bekijken
- Statistieken en status controleren
- Agent herstarten of stoppen

## Veelgestelde vragen (FAQ)

**V: Hoe vaak worden automatische scans uitgevoerd?**
A: Standaard worden scans elke 6 uur uitgevoerd, maar dit kan worden aangepast in de configuratie van 1 uur tot 24 uur.

**V: Wat zijn de vereisten voor een netwerkscan?**
A: Voor een netwerkscan vereist de agent beheerdersrechten (Administrator/root) en in sommige gevallen moeten firewallregels worden aangepast om uitgaand verkeer toe te staan. Op Windows is de installatie van Npcap vereist.

**V: Welke data wordt verzonden naar de CyberShieldX server?**
A: De agent verzendt scan resultaten, systeeminformatie (besturingssysteem, hardware specs), en beveiligingsincidenten. Persoonlijke bestanden of gebruikersgegevens worden NIET verzonden.

**V: Hoe worden gevoelige gegevens beschermd?**
A: Alle communicatie tussen de agent en de server wordt versleuteld via TLS. Gevoelige gegevens zoals IP-adressen en MAC-adressen worden geanonimiseerd voordat ze worden opgeslagen.

**V: Hoe update ik het platform?**
A: Het webplatform kan worden bijgewerkt met `git pull` gevolgd door `npm install` en `npm run db:push`. De agent wordt automatisch bijgewerkt, tenzij deze functie is uitgeschakeld.

## Probleemoplossing

### Webplatform problemen

**Probleem: Kan niet verbinden met de database**
- Controleer of de PostgreSQL server draait
- Verifieer de database inloggegevens in `.env`
- Controleer of de database bestaat

**Probleem: Webinterface laadt niet**
- Controleer of de server draait (`npm run dev`)
- Controleer op JavaScript fouten in de browser console
- Wis de browsercache en probeer opnieuw

### Agent problemen

**Probleem: Agent kan niet verbinden met de server**
- Controleer de internetverbinding
- Verifieer de server URL in de agent configuratie
- Controleer of de Client ID correct is

**Probleem: Scans worden niet uitgevoerd**
- Controleer of de agent service actief is
- Controleer de logbestanden op fouten (`~/.cybershieldx/logs/`)
- Controleer of de agent beheerdersrechten heeft

**Probleem: Agent crasht bij het scannen**
- Controleer of alle vereiste afhankelijkheden zijn geïnstalleerd
- Zorg voor voldoende geheugen en schijfruimte
- Update de agent naar de nieuwste versie

## Licentie

CyberShieldX is gelicenseerd onder de MIT licentie. Zie het [LICENSE](LICENSE) bestand voor details.

---

© 2025 CyberShieldX. Alle rechten voorbehouden.

Voor ondersteuning, neem contact op met support@cybershieldx.com