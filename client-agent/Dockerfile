# CyberShieldX Client Agent Dockerfile
FROM node:20-alpine

# Installeer benodigde systeempakketten
RUN apk add --no-cache \
    nmap \
    tcpdump \
    net-tools \
    openssl \
    bash \
    procps \
    curl \
    ca-certificates \
    python3 \
    clamav \
    clamav-daemon \
    tzdata

# Maak werkdirectory
WORKDIR /app

# Kopieer package bestanden
COPY package.json package-lock.json ./

# Installeer dependencies
RUN npm ci

# Kopieer broncode
COPY . .

# Creëer benodigde mappen
RUN mkdir -p /app/data /app/logs /app/config

# Maak default configuratiebestand
RUN echo '{"server": "https://api.cybershieldx.com", "interval": "6h", "loglevel": "info", "autostart": true, "telemetry": true, "autoupdate": true}' > /app/config/default.json

# Poort voor API server
EXPOSE 8080

# Volume voor persistentie
VOLUME ["/app/data", "/app/logs", "/app/config"]

# Standaard omgevingsvariabelen
ENV NODE_ENV=production \
    LOG_LEVEL=info \
    SCAN_INTERVAL=6h \
    SERVER_URL=https://api.cybershieldx.com

# Entrypoint script
RUN echo '#!/bin/sh \n\
if [ -z "$CLIENT_ID" ]; then \n\
  echo "ERROR: CLIENT_ID omgevingsvariabele is niet ingesteld" \n\
  exit 1 \n\
fi \n\
echo "Starting CyberShieldX Agent..." \n\
node src/index.js --clientid=$CLIENT_ID --server=$SERVER_URL --interval=$SCAN_INTERVAL' > /app/entrypoint.sh && \
chmod +x /app/entrypoint.sh

# Start de agent
CMD ["/app/entrypoint.sh"]