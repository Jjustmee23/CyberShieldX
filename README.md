# CyberShieldX Platform

CyberShieldX is een compleet cybersecurity platform voor organisaties die hun netwerken en systemen willen beveiligen met geavanceerde monitoring en scanning tools. Het platform bestaat uit twee hoofdcomponenten:

1. **CyberShieldX Webplatform** - Een centrale beheeromgeving voor consultants en beheerders
2. **CyberShieldX Agent** - Een cross-platform applicatie die op client systemen draait voor beveiliging en monitoring

![CyberShieldX Logo](./client/public/logo-full.png)

## Inhoudsopgave

- [Functionaliteiten](#functionaliteiten)
- [Installatie en Setup](#installatie-en-setup)
  - [Automatische installatie](#automatische-installatie)
  - [Handmatige installatie](#handmatige-installatie)
  - [Docker installatie](#docker-installatie)
  - [Agent installatie](#agent-installatie)
- [Systeemvereisten](#systeemvereisten)
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
- **Downloads Centrum** - Centrale locatie voor het downloaden van client agents en installatiebestanden

### Agent

- **Cross-platform** - Werkt op Windows, MacOS, Linux en Raspberry Pi
- **Netwerk scanning** - Detecteert alle apparaten op het netwerk en kwetsbaarheden
- **Systeem scanning** - Controleert lokale systemen op beveiligingsinstellingen
- **Malware detectie** - Identificeert mogelijke malware en verdachte activiteiten
- **Kwetsbaarheidsscanning** - Identificeert bekende kwetsbaarheden in besturingssystemen en software
- **Automatische updates** - Houdt zichzelf up-to-date met de nieuwste beveiligingsdefinities
- **Realtime monitoring** - Doorlopende beveiliging en incidentdetectie

## Installatie en Setup

### Automatische installatie

CyberShieldX kan gemakkelijk worden geïnstalleerd op een Ubuntu 22.04 server met het automatische installatiescript:

1. **Download het installatiescript**

```bash
wget https://raw.githubusercontent.com/Jjustmee23/CyberShieldX/main/install.sh
```

2. **Maak het uitvoerbaar**

```bash
chmod +x install.sh
```

3. **Voer het script uit als root**

```bash
sudo ./install.sh
```

4. **Volg de instructies op het scherm**

Het script installeert automatisch:
- Docker en Docker Compose
- PostgreSQL database
- Het CyberShieldX webplatform
- Alle benodigde componenten en configuratie

Het script zal vragen naar een domein (optioneel) en email. Als je een domein opgeeft, wordt er automatisch SSL opgezet met Let's Encrypt.

Na de installatie kun je inloggen:
- **Webinterface**: http://je-server-ip of je opgegeven domein
- **Standaard login**: admin / password123 (wijzig dit direct na eerste login!)

### Handmatige installatie

Als je liever handmatig installeert of meer controle wilt, volg dan deze stappen:

#### 1. Installeer de vereisten

```bash
# Update het systeem
sudo apt update && sudo apt upgrade -y

# Installeer Docker en andere vereisten
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common git
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
sudo curl -L "https://github.com/docker/compose/releases/download/v2.17.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

#### 2. Kloon de repository

```bash
git clone https://github.com/Jjustmee23/CyberShieldX.git
cd CyberShieldX
```

#### 3. Configureer environment variabelen

```bash
cp .env.example .env
# Bewerk het .env bestand en pas de instellingen aan
nano .env
```

#### 4. Start de containers

```bash
docker-compose up -d
```

#### 5. Open de webinterface

Open http://je-server-ip:3000 in je browser en log in met de standaard credentials:
- Gebruikersnaam: admin
- Wachtwoord: password123

### Docker installatie

Een gedetailleerde Docker installatie handleiding is beschikbaar in [DOCKER_SETUP.md](DOCKER_SETUP.md).

### Agent installatie

De CyberShieldX Agent kan op verschillende manieren worden geïnstalleerd, afhankelijk van het besturingssysteem.

#### Via de Downloads pagina (aanbevolen)

De eenvoudigste manier om de agent te installeren is via de Downloads pagina in het webplatform:

1. Log in op het CyberShieldX webplatform
2. Ga naar "Downloads" in de zijbalk
3. Kies de juiste versie voor het doelsysteem (Windows, Linux, Raspberry Pi)
4. Download en volg de installatie-instructies voor dat platform

#### Windows installatie

1. **Download het installatiescript**

Het script is beschikbaar op de Downloads pagina of direct vanuit de repository:
```
https://raw.githubusercontent.com/Jjustmee23/CyberShieldX/main/client-agent/install.ps1
```

2. **Voer PowerShell uit als Administrator**

3. **Voer het script uit met parameters**

```powershell
.\install.ps1 -ClientId "jouw_client_id" -ServerUrl "https://je-server-url"
```

Vervang "jouw_client_id" met de client ID die je hebt aangemaakt in het webplatform.

#### Linux en Raspberry Pi installatie

1. **Download het installatiescript**

```bash
wget https://raw.githubusercontent.com/Jjustmee23/CyberShieldX/main/client-agent/linux/install.sh
```

2. **Maak het uitvoerbaar**

```bash
chmod +x install.sh
```

3. **Voer het script uit als root**

```bash
sudo ./install.sh --clientid=jouw_client_id --server=https://je-server-url
```

Vervang "jouw_client_id" met de client ID die je hebt aangemaakt in het webplatform.

## Systeemvereisten

### Webplatform

- **Besturingssysteem**: Ubuntu 20.04/22.04 LTS of gelijkwaardig
- **CPU**: Minimaal 2 cores (aanbevolen: 4+ cores)
- **RAM**: Minimaal 4GB (aanbevolen: 8GB of meer)
- **Opslag**: Minimaal 20GB beschikbare schijfruimte
- **Netwerk**: Stabiele internetverbinding met publiek IP of domein
- **Software**: Docker en Docker Compose

### Agent

#### Windows
- Windows 10/11 of Windows Server 2016/2019/2022
- 2GB RAM (minimaal), 4GB aanbevolen
- 500MB beschikbare schijfruimte
- Administrator rechten voor installatie

#### MacOS
- macOS 10.15 (Catalina) of hoger
- 2GB RAM (minimaal), 4GB aanbevolen
- 500MB beschikbare schijfruimte

#### Linux
- Ubuntu 18.04/20.04/22.04, Debian 10/11, CentOS 8/9, of vergelijkbare distributies
- 1GB RAM (minimaal), 2GB aanbevolen
- 500MB beschikbare schijfruimte
- Root rechten voor installatie

#### Raspberry Pi
- Raspberry Pi 3B+ of nieuwer
- Raspberry Pi OS (32-bit of 64-bit)
- 1GB RAM minimaal
- 2GB beschikbare schijfruimte

## Configuratie

### Webplatform Configuratie

De configuratie gebeurt via environment variabelen in het `.env` bestand:

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

# Domein configuratie (indien van toepassing)
DOMAIN=cybershieldx.uwbedrijf.nl
```

### Agent Configuratie

De agent kan worden geconfigureerd via command line parameters tijdens installatie of via het webplatform:

#### Windows

```powershell
.\install.ps1 -ClientId "client_id" -ServerUrl "https://server_url" -LogLevel "info" -ScanInterval "6h"
```

#### Linux/Raspberry Pi

```bash
./install.sh --clientid=client_id --server=https://server_url --loglevel=info --interval=6h
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

6. **Agent downloads beheren**
   - Ga naar "Downloads" in de zijbalk
   - Bekijk alle beschikbare installatiebestanden voor de agent
   - Download een installatiebestand voor het gewenste besturingssysteem
   - Deel de installatielink met uw clients

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
A: Het webplatform kan worden bijgewerkt met `git pull` gevolgd door `docker-compose down && docker-compose up -d`. De agent wordt automatisch bijgewerkt, tenzij deze functie is uitgeschakeld.

**V: Kan ik CyberShieldX gebruiken in een omgeving zonder internet?**
A: Ja, het platform kan worden geconfigureerd voor gebruik in een afgesloten netwerk. Neem contact op met ondersteuning voor speciale installatie-instructies.

## Probleemoplossing

### Webplatform problemen

**Probleem: Containers starten niet na installatie**
- Controleer Docker logs: `docker-compose logs`
- Controleer of de PostgreSQL container draait: `docker ps`
- Controleer of de database URL correct is in het .env bestand

**Probleem: Kan niet inloggen op het webplatform**
- Controleer of de juiste URL wordt gebruikt (http/https)
- Reset het admin wachtwoord met: `docker-compose exec app npm run reset-admin-password`
- Controleer de server logs: `docker-compose logs app`

**Probleem: Database connectie fout**
- Controleer de database configuratie in .env
- Controleer of de database container draait
- Controleer de database logs: `docker-compose logs db`

### Agent problemen

**Probleem: Agent kan niet verbinden met de server**
- Controleer de internetverbinding
- Verifieer de server URL in de agent configuratie
- Controleer of de Client ID correct is
- Controleer firewalls en netwerkregels

**Probleem: Scans worden niet uitgevoerd**
- Controleer of de agent service actief is
- Controleer de logbestanden
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