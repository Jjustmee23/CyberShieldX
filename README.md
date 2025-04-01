# CyberShieldX Platform

CyberShieldX is een compleet cybersecurity platform voor organisaties die hun netwerken en systemen willen beveiligen met geavanceerde monitoring en scanning tools. Het platform bestaat uit twee hoofdcomponenten:

1. **CyberShieldX Webplatform** - Een centrale beheeromgeving voor consultants en beheerders
2. **CyberShieldX Agent** - Een cross-platform applicatie die op client systemen draait voor beveiliging en monitoring

![CyberShieldX Logo](./client/public/logo-full.png)

## Inhoudsopgave

- [Functionaliteiten](#functionaliteiten)
- [Installatie op Eigen Server en Domein](#installatie-op-eigen-server-en-domein)
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

## Installatie op Eigen Server en Domein

### Voorbereidingen

Voordat u begint, zorg ervoor dat u het volgende hebt:

1. Een VPS of dedicated server met Ubuntu 22.04 LTS
2. Een geregistreerd domein dat wijst naar uw server (A-record)
3. SSH toegang tot uw server
4. Root of sudo-rechten op uw server

### DNS configuratie

1. Stel de volgende DNS records in bij uw domeinregistrar:
   - `uwdomein.com` → A-record naar het IP-adres van uw server
   - `pgadmin.uwdomein.com` → A-record naar hetzelfde IP-adres van uw server
   - Optioneel: `*.uwdomein.com` → A-record naar hetzelfde IP-adres (wildcard voor toekomstige subdomeinen)

2. Wacht tot de DNS-wijzigingen zijn doorgevoerd (kan tot 24 uur duren)

### One-Click Installatie

CyberShieldX kan nu eenvoudig op uw eigen domein worden geïnstalleerd met het automatische installatiescript:

1. **Connect met uw server via SSH**

```bash
ssh root@uw-server-ip
```

2. **Download het installatiescript**

```bash
wget https://raw.githubusercontent.com/Jjustmee23/CyberShieldX/main/install.sh
```

3. **Maak het uitvoerbaar**

```bash
chmod +x install.sh
```

4. **Voer het script uit**

```bash
./install.sh
```

5. **Volg de instructies**

Het script zal vragen om:
- Uw domeinnaam (bijv. cybershieldx.uwbedrijf.com)
- Uw e-mailadres (voor SSL certificaten en admin account)

Het script installeert automatisch:
- Docker en Docker Compose
- PostgreSQL database met veilige configuratie
- Het volledige CyberShieldX webplatform
- Traefik als reverse proxy met SSL certificaten
- PgAdmin voor databasebeheer

Het script controleert ook de DNS-configuratie en geeft waarschuwingen als er problemen zijn.

### Na de installatie

Nadat de installatie is voltooid, kunt u toegang krijgen tot uw CyberShieldX platform via:

- **Webplatform**: `https://uwdomein.com`
- **PgAdmin**: `https://pgadmin.uwdomein.com`

Gebruik de volgende standaard inloggegevens (wijzig deze direct na uw eerste inlogpoging):
- **Gebruikersnaam**: admin
- **Wachtwoord**: password123

### Certificaten en beveiliging

De installatie maakt gebruik van Let's Encrypt om automatisch SSL-certificaten te genereren voor uw domein en subdomein. Deze certificaten worden automatisch vernieuwd.

### Updates installeren

Om uw CyberShieldX installatie bij te werken naar de nieuwste versie:

```bash
cd /opt/cybershieldx
git pull
docker-compose down
docker-compose up -d
```

## Systeemvereisten

### Server vereisten

- **Besturingssysteem**: Ubuntu 22.04 LTS (aanbevolen) of 20.04 LTS
- **CPU**: Minimaal 2 cores (aanbevolen: 4+ cores)
- **RAM**: Minimaal 4GB (aanbevolen: 8GB of meer)
- **Opslag**: Minimaal 20GB SSD opslag
- **Netwerk**: Stabiele internetverbinding met vast IP-adres
- **Poorten**: 80 en 443 moeten openstaand en bereikbaar zijn

### Domein vereisten

- Geregistreerd domein
- Mogelijkheid om A-records en subdomeinen te configureren
- Gevalideerd e-mailadres voor Let's Encrypt verificatie

### Agent vereisten

#### Windows
- Windows 10/11 of Windows Server 2016/2019/2022
- 2GB RAM (minimaal), 4GB aanbevolen
- 500MB beschikbare schijfruimte
- Administrator rechten voor installatie

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

### Geavanceerde configuratie

De serveromgeving is geconfigureerd met Docker Compose en maakt gebruik van de volgende services:
- **app**: De hoofdapplicatie (CyberShieldX webplatform)
- **db**: PostgreSQL database voor gegevensopslag
- **pgadmin**: PgAdmin interface voor databasebeheer
- **traefik**: Reverse proxy voor SSL en routering

U kunt deze configuratie aanpassen door het bewerken van:
- `/opt/cybershieldx/.env` - Omgevingsvariabelen
- `/opt/cybershieldx/docker-compose.yml` - Docker configuratie

### Database backups

Het wordt aanbevolen om regelmatig backups te maken van uw database:

```bash
# Database backup maken
cd /opt/cybershieldx
docker-compose exec db pg_dump -U cybershieldx -Fc cybershieldx > cybershieldx_backup_$(date +%Y-%m-%d).dump

# Database backup herstellen (indien nodig)
docker-compose exec db pg_restore -U cybershieldx -d cybershieldx /path/to/backup.dump
```

### Server logs bekijken

```bash
# Alle logs
cd /opt/cybershieldx
docker-compose logs -f

# Specifieke container logs
docker-compose logs -f app  # Webplatform logs
docker-compose logs -f db   # Database logs
docker-compose logs -f traefik  # Reverse proxy logs
```

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

### Agent installatie

Nadat het platform is geïnstalleerd, kunt u agents installeren op client systemen:

#### Windows installatie

1. **Download het installatiescript van uw platform**
   - Log in op uw CyberShieldX platform
   - Ga naar Downloads
   - Download het Windows installatiescript

2. **Voer PowerShell uit als Administrator**

3. **Voer het script uit met parameters**

```powershell
.\install.ps1 -ClientId "jouw_client_id" -ServerUrl "https://uwdomein.com"
```

Vervang "jouw_client_id" met de client ID die je hebt aangemaakt in het webplatform.

#### Linux en Raspberry Pi installatie

1. **Download het installatiescript van uw platform**
   - Log in op uw CyberShieldX platform
   - Ga naar Downloads
   - Download het Linux/Raspberry Pi installatiescript

2. **Maak het uitvoerbaar**

```bash
chmod +x install.sh
```

3. **Voer het script uit als root**

```bash
sudo ./install.sh --clientid=jouw_client_id --server=https://uwdomein.com
```

Vervang "jouw_client_id" met de client ID die je hebt aangemaakt in het webplatform.

## Veelgestelde vragen (FAQ)

**V: Is mijn data veilig op mijn eigen server?**
A: Ja, door CyberShieldX op uw eigen server te draaien, blijft alle data binnen uw eigen infrastructuur. SSL-certificaten zorgen voor versleutelde communicatie.

**V: Hoe vaak moet ik updates uitvoeren?**
A: We raden aan om maandelijks updates uit te voeren om de nieuwste beveiligingspatches en functies te krijgen.

**V: Kan ik het platform aanpassen aan mijn eigen huisstijl?**
A: Ja, het platform kan worden aangepast door het bewerken van het theme.json bestand in de root directory.

**V: Werkt CyberShieldX met meerdere domeinen of subdomains?**
A: Ja, u kunt meerdere domeinen configureren door de Traefik configuratie aan te passen in docker-compose.yml.

**V: Hoe vaak worden automatische scans uitgevoerd?**
A: Standaard worden scans elke 6 uur uitgevoerd, maar dit kan worden aangepast in de configuratie van 1 uur tot 24 uur.

**V: Hoe worden gevoelige gegevens beschermd?**
A: Alle communicatie tussen de agent en de server wordt versleuteld via TLS. Gevoelige gegevens zoals IP-adressen en MAC-adressen worden geanonimiseerd voordat ze worden opgeslagen.

## Probleemoplossing

### SSL certificaat problemen

**Probleem: SSL certificaat wordt niet uitgegeven**
- Controleer of de DNS A-records correct zijn ingesteld
- Controleer of poort 80 en 443 open staan op uw firewall
- Controleer de Traefik logs: `docker-compose logs traefik`
- Probeer certificaatuitgifte handmatig opnieuw: `docker-compose restart traefik`

### Connectiviteitsproblemen

**Probleem: Website niet bereikbaar**
- Controleer of alle containers draaien: `docker ps`
- Controleer of Traefik correct is geconfigureerd: `docker-compose logs traefik`
- Controleer firewall instellingen: `ufw status`
- Test lokale verbinding: `curl localhost`

### Database problemen

**Probleem: Database fouten**
- Controleer database logs: `docker-compose logs db`
- Controleer database verbinding: `docker-compose exec db psql -U cybershieldx -d cybershieldx -c "SELECT 1"`
- Controleer database volume: `docker volume inspect cybershieldx_postgres-data`

### Webplatform problemen

**Probleem: Kan niet inloggen op het webplatform**
- Controleer server logs: `docker-compose logs app`
- Reset admin wachtwoord: `docker-compose exec app npm run reset-admin-password`
- Herstart de applicatie: `docker-compose restart app`

### Agent problemen

**Probleem: Agent kan niet verbinden met de server**
- Controleer of de serverURL correct is (inclusief https://)
- Controleer of de client ID correct is en bestaat in het platform
- Controleer firewalls en netwerkregels

## Licentie

CyberShieldX is gelicenseerd onder de MIT licentie. Zie het [LICENSE](LICENSE) bestand voor details.

---

© 2025 CyberShieldX. Alle rechten voorbehouden.

Voor ondersteuning, neem contact op met support@cybershieldx.com