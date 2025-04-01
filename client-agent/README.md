# CyberShieldX Client Agent

Deze map bevat de bestanden voor de CyberShieldX Client Agent, een krachtige beveiligingsagent die kan worden geïnstalleerd op verschillende systemen (Windows, macOS, Linux, Raspberry Pi) om beveiligingsinformatie te verzamelen en door te sturen naar het centrale CyberShieldX platform.

## Functionaliteit

De agent bevat verschillende modules:

- **Netwerk Scanner**: Detecteert netwerkapparaten en zwakke punten
- **Systeem Scanner**: Controleert OS-beveiligingsinstellingen en patchniveau
- **Kwetsbaarheid Scanner**: Zoekt naar bekende beveiligingskwetsbaarheden
- **Malware Detectie**: Scant het systeem op malware
- **Analyse Module**: Analyseert scanresultaten om risico's te beoordelen
- **Rapport Generator**: Produceert gedetailleerde beveiligingsrapporten
- **Update Module**: Houdt de agent up-to-date met de nieuwste versie
- **Authenticatie Module**: Beveiligt de communicatie met de server

## Docker Installatie (Aanbevolen)

De eenvoudigste manier om de agent te draaien is met Docker.

### Vereisten

- Docker geïnstalleerd op uw systeem
- Client ID van het CyberShieldX webplatform

### Installatie stappen

1. **Maak een .env bestand**

Maak een `.env` bestand met de volgende inhoud:

```
CLIENT_ID=uw_client_id_hier
SERVER_URL=https://uw_server_url_hier
SCAN_INTERVAL=6h
LOG_LEVEL=info
```

2. **Start de container**

```bash
docker-compose up -d
```

3. **Controleer de status**

```bash
docker-compose ps
```

4. **Bekijk logs**

```bash
docker-compose logs -f
```

### Docker configuratie-opties

De Docker container kan worden geconfigureerd met de volgende omgevingsvariabelen:

| Variabele | Beschrijving | Standaardwaarde |
|------------|-------------|-----------------|
| CLIENT_ID | Unieke ID voor deze client (verplicht) | - |
| SERVER_URL | URL van de CyberShieldX server | https://api.cybershieldx.com |
| SCAN_INTERVAL | Interval tussen scans (1h, 6h, 12h, 24h) | 6h |
| LOG_LEVEL | Log niveau (debug, info, warn, error) | info |

### Volumes

De Docker configuratie maakt gebruik van de volgende volumes voor persistentie:

- **agent-data**: Voor het opslaan van scanresultaten en cache
- **agent-logs**: Voor logbestanden
- **agent-config**: Voor configuratiebestanden

## Handmatige bediening

Als u de agent handmatig wilt bedienen binnen de Docker container:

```bash
# Voer een handmatige scan uit
docker exec cybershieldx-agent node src/index.js --scan

# Bekijk logs
docker exec cybershieldx-agent cat /app/logs/agent.log

# Controleer de status
docker exec cybershieldx-agent node src/index.js --status

# Herstart de agent
docker restart cybershieldx-agent
```

## Probleemoplossing

### Veelvoorkomende problemen

**Container start niet op**
- Controleer of de CLIENT_ID is ingesteld in het .env bestand
- Controleer de Docker logs: `docker-compose logs`

**Agent kan niet verbinden met de server**
- Controleer of de SERVER_URL correct is
- Controleer of de server bereikbaar is: `curl -v SERVER_URL`

**Scans worden niet uitgevoerd**
- Controleer de logs op fouten: `docker-compose logs -f`
- Controleer of het scaninterval correct is ingesteld

## Netwerkvereisten

Voor netwerkscannen heeft de container toegang nodig tot het hostnetwerk of specifieke netwerkcapabilities (NET_ADMIN, NET_RAW). Dit is standaard ingesteld in de docker-compose.yml configuratie.

Voor meer informatie en traditionele installatieoptie's, raadpleeg de hoofddocumentatie.