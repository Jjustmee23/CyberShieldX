# CyberShieldX Docker Installatie en Opzetgids

Deze handleiding biedt een uitgebreide stap-voor-stap instructie voor het installeren en opzetten van het volledige CyberShieldX platform en de client agents met Docker.

## Inhoudsopgave

1. [Voorbereiding](#voorbereiding)
2. [Webplatform installatie](#webplatform-installatie)
3. [Client Agent installatie](#client-agent-installatie)
4. [Integratie tussen platform en agent](#integratie-tussen-platform-en-agent)
5. [Voortgezet beheer](#voortgezet-beheer)
6. [Probleemoplossing](#probleemoplossing)

## Voorbereiding

### Vereisten

Zorg ervoor dat u het volgende geïnstalleerd heeft:

- Docker Engine (versie 20.10 of nieuwer)
- Docker Compose (versie 2.0 of nieuwer)
- Git (voor het klonen van de repository)

Controleer de installatie met:

```bash
docker --version
docker-compose --version
git --version
```

### Repository klonen

```bash
git clone https://github.com/Jjustmee23/CyberShieldX.git
cd CyberShieldX
```

## Webplatform installatie

### 1. Configuratie instellen

Maak een `.env` bestand in de hoofdmap van het project:

```bash
cat > .env << EOF
# PostgreSQL database instellingen
POSTGRES_USER=cybershieldx
POSTGRES_PASSWORD=cybershieldx_secure_password
POSTGRES_DB=cybershieldx

# JWT authenticatie instellingen
JWT_SECRET=voorzieuwsystemeenuniekejwtsecretsleutel
JWT_EXPIRATION=24h

# PgAdmin instellingen
PGADMIN_EMAIL=admin@uwbedrijf.nl
PGADMIN_PASSWORD=pgadmin_secure_password

# Optionele mail instellingen voor notificaties
MAIL_HOST=smtp.uwbedrijf.nl
MAIL_PORT=587
MAIL_USER=noreply@uwbedrijf.nl
MAIL_PASSWORD=mail_wachtwoord
MAIL_FROM=CyberShieldX <noreply@uwbedrijf.nl>
EOF
```

> **Belangrijk**: Wijzig de wachtwoorden en geheime sleutel voor gebruik in productie!

### 2. Docker netwerk aanmaken (optioneel)

```bash
docker network create cybershieldx-network
```

### 3. Webplatform starten

```bash
docker-compose up -d
```

### 4. Controleer of alle containers draaien

```bash
docker-compose ps
```

Controleer of alle services (app, db, pgadmin) de status "Up" hebben.

### 5. Toegang tot het platform

- **Webinterface**: Open http://localhost:5000 in uw browser
- **Database beheer**: Open http://localhost:5050 in uw browser (pgAdmin)

Log in op het platform met de standaard administrator account:
- Gebruikersnaam: `admin`
- Wachtwoord: `password123`

> **Belangrijk**: Wijzig onmiddellijk het standaard admin wachtwoord!

## Client Agent installatie

Voor elk systeem dat u wilt monitoren, moet u een client agent installeren:

### 1. Client aanmaken in het Webplatform

1. Log in op het webplatform (http://localhost:5000)
2. Ga naar "Clients" in de zijbalk
3. Klik op "Nieuwe client toevoegen"
4. Vul de vereiste gegevens in
5. Kopieer de gegenereerde Client ID - u heeft deze nodig voor elke agent

### 2. Agent Docker-configuratie op het doelsysteem

Op elk systeem dat u wilt monitoren:

1. Maak een nieuwe map voor de agent

```bash
mkdir -p cybershieldx-agent
cd cybershieldx-agent
```

2. Download de Docker-configuratiebestanden

```bash
# Download Dockerfile
curl -O https://raw.githubusercontent.com/Jjustmee23/CyberShieldX/main/client-agent/Dockerfile

# Download docker-compose.yml
curl -O https://raw.githubusercontent.com/Jjustmee23/CyberShieldX/main/client-agent/docker-compose.yml

# Download .dockerignore
curl -O https://raw.githubusercontent.com/Jjustmee23/CyberShieldX/main/client-agent/.dockerignore
```

3. Maak een `.env` bestand met de client-ID en server URL

```bash
cat > .env << EOF
# Verplichte instelling - vervang door de client-ID van het webplatform
CLIENT_ID=uw_client_id_hier

# URL naar het CyberShieldX webplatform (vervang door uw server-URL)
SERVER_URL=http://uw_server_ip:5000

# Optionele instellingen
SCAN_INTERVAL=6h
LOG_LEVEL=info
EOF
```

4. Start de agent container

```bash
docker-compose up -d
```

5. Controleer of de agent draait

```bash
docker-compose ps
docker-compose logs
```

## Integratie tussen platform en agent

Nadat beide componenten zijn opgestart:

1. Controleer de verbinding in het webplatform:
   - Ga naar de "Clients" pagina
   - De status van de client moet "Online" worden

2. Voer een testsscan uit:
   - Ga naar "Scans" in de zijbalk
   - Klik op "Nieuwe scan"
   - Selecteer het scantype en de client
   - Klik op "Scan starten"

3. Bekijk de resultaten:
   - Ga naar "Rapportages" voor gedetailleerde scanresultaten
   - Het dashboard toont een overzicht van recente activiteiten

## Voortgezet beheer

### Updates uitvoeren

#### Webplatform bijwerken

```bash
# In de hoofdmap van het project
git pull
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

#### Agent bijwerken

```bash
# In de map van de agent
docker-compose down
docker-compose pull
# of als u lokale wijzigingen heeft:
docker-compose build --no-cache
docker-compose up -d
```

### Database back-up maken

```bash
# Maak een back-up van de PostgreSQL database
docker exec -t $(docker-compose ps -q db) pg_dumpall -c -U cybershieldx > cybershieldx_backup_$(date +%Y-%m-%d).sql
```

### Logs bekijken

#### Webplatform logs

```bash
docker-compose logs -f app
```

#### Agent logs

```bash
docker-compose logs -f
```

## Probleemoplossing

### Webplatform problemen

**Probleem: Container start niet op**
```bash
# Controleer de logs
docker-compose logs app

# Controleer de container status
docker-compose ps

# Herstart de container
docker-compose restart app
```

**Probleem: Database connectie fout**
```bash
# Controleer of de database draait
docker-compose ps db

# Controleer database logs
docker-compose logs db

# Controleer de verbinding van buitenaf
docker exec -it $(docker-compose ps -q app) curl -v db:5432
```

### Agent problemen

**Probleem: Agent kan niet verbinden met server**
```bash
# Controleer agent logs
docker-compose logs

# Test de verbinding met de server
docker exec -it cybershieldx-agent curl -v $SERVER_URL

# Controleer of de CLIENT_ID correct is ingesteld
docker exec -it cybershieldx-agent env | grep CLIENT_ID
```

**Probleem: Scans werken niet**
```bash
# Start een handmatige scan
docker exec -it cybershieldx-agent node src/index.js --scan

# Controleer de logs voor fouten
docker exec -it cybershieldx-agent cat /app/logs/agent.log
```

---

Voor aanvullende ondersteuning of vragen, raadpleeg de volledige documentatie in de README.md of neem contact op via support@cybershieldx.com.