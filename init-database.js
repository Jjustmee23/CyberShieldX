#!/usr/bin/env node

/**
 * CyberShieldX Database Initialisatie Script
 * ==========================================
 * 
 * Dit script initialiseert de database structuur en maakt de admin gebruiker aan.
 * Te gebruiken bij de eerste installatie of als er problemen zijn met de database.
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Configuratie
const DEFAULT_CONFIG = {
  // Docker postgres container configuratie
  db: {
    host: 'postgres',
    port: 5432,
    database: 'cybershieldx',
    user: 'postgres',
    password: 'BU5hRWexFrMxCCfY'
  },
  // Admin gebruiker configuratie
  admin: {
    username: 'admin',
    password: 'password123',
    name: 'Admin User',
    email: 'admin@cybershieldx.com',
    role: 'admin'
  }
};

// Kleuren voor console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Schrijf een DATABASE_URL omgevingsvariabele naar het .env bestand
function writeEnvFile(config) {
  try {
    const connectionString = `postgres://${config.user}:${config.password}@${config.host}:${config.port}/${config.database}`;
    const envPath = path.join(process.cwd(), '.env');
    let content = `DATABASE_URL=${connectionString}\nSKIP_SETUP=true\n`;
    
    fs.writeFileSync(envPath, content);
    console.log(`${colors.green}✓ .env bestand aangemaakt met database configuratie${colors.reset}`);
    
    // Stel ook de huidige omgevingsvariabele in
    process.env.DATABASE_URL = connectionString;
    process.env.SKIP_SETUP = 'true';
    
    return true;
  } catch (error) {
    console.error(`${colors.red}✗ Fout bij aanmaken .env bestand: ${error.message}${colors.reset}`);
    return false;
  }
}

// Creëer een database als deze nog niet bestaat
async function createDatabase(config) {
  try {
    // Verbinding maken met postgres database om een nieuwe database aan te maken
    const pool = new Pool({
      host: config.host,
      port: config.port,
      database: 'postgres', // Standaard postgres database voor beheer
      user: config.user,
      password: config.password,
      connectionTimeoutMillis: 5000
    });
    
    try {
      // Controleer of database al bestaat
      const checkResult = await pool.query(`
        SELECT 1 FROM pg_database WHERE datname = $1
      `, [config.database]);
      
      if (checkResult.rows.length > 0) {
        console.log(`${colors.yellow}! Database '${config.database}' bestaat al${colors.reset}`);
      } else {
        // Maak de database aan
        await pool.query(`CREATE DATABASE ${config.database}`);
        console.log(`${colors.green}✓ Database '${config.database}' succesvol aangemaakt${colors.reset}`);
      }
      
      await pool.end();
      return true;
    } catch (error) {
      console.error(`${colors.red}✗ Database fout: ${error.message}${colors.reset}`);
      await pool.end();
      return false;
    }
  } catch (error) {
    console.error(`${colors.red}✗ Kon geen verbinding maken met Postgres: ${error.message}${colors.reset}`);
    return false;
  }
}

// Voer migraties uit om tabellen aan te maken
async function runMigrations() {
  return new Promise((resolve, reject) => {
    console.log(`${colors.blue}> Drizzle migraties uitvoeren om tabellen aan te maken...${colors.reset}`);
    
    // Probeer eerst npx drizzle-kit push:pg
    exec('npx drizzle-kit push:pg', (error, stdout, stderr) => {
      if (error) {
        console.error(`${colors.yellow}! Fout bij drizzle-kit push: ${error.message}${colors.reset}`);
        console.log(`${colors.blue}> Probeer alternatieve npm run db:push...${colors.reset}`);
        
        // Probeer npm run db:push als alternatief
        exec('npm run db:push', (error2, stdout2, stderr2) => {
          if (error2) {
            console.error(`${colors.red}✗ Migratie mislukt: ${error2.message}${colors.reset}`);
            reject(error2);
            return;
          }
          console.log(`${colors.green}✓ Migratie succesvol uitgevoerd via npm run db:push${colors.reset}`);
          resolve(true);
        });
      } else {
        console.log(`${colors.green}✓ Migratie succesvol uitgevoerd via drizzle-kit${colors.reset}`);
        resolve(true);
      }
    });
  });
}

// Maak een admin gebruiker aan
async function createAdminUser(config) {
  const pool = new Pool({
    host: config.db.host,
    port: config.db.port,
    database: config.db.database,
    user: config.db.user,
    password: config.db.password,
    connectionTimeoutMillis: 5000
  });
  
  try {
    // Controleer of users tabel bestaat
    const tableCheckResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename = 'users'
      );
    `);
    
    if (!tableCheckResult.rows[0].exists) {
      console.error(`${colors.red}✗ Users tabel bestaat niet. Run eerst de migraties.${colors.reset}`);
      await pool.end();
      return false;
    }
    
    // Controleer of admin gebruiker al bestaat
    const userCheckResult = await pool.query(`
      SELECT * FROM users WHERE username = $1
    `, [config.admin.username]);
    
    if (userCheckResult.rows.length > 0) {
      // Update bestaande admin
      await pool.query(`
        UPDATE users
        SET password = $1, name = $2, email = $3, role = $4, require_password_change = true
        WHERE username = $5
      `, [
        config.admin.password,
        config.admin.name,
        config.admin.email,
        config.admin.role,
        config.admin.username
      ]);
      
      console.log(`${colors.yellow}! Admin gebruiker '${config.admin.username}' bijgewerkt${colors.reset}`);
    } else {
      // Maak nieuwe admin
      await pool.query(`
        INSERT INTO users (username, password, name, email, role, require_password_change)
        VALUES ($1, $2, $3, $4, $5, true)
      `, [
        config.admin.username,
        config.admin.password,
        config.admin.name,
        config.admin.email,
        config.admin.role
      ]);
      
      console.log(`${colors.green}✓ Admin gebruiker '${config.admin.username}' aangemaakt${colors.reset}`);
    }
    
    await pool.end();
    return true;
  } catch (error) {
    console.error(`${colors.red}✗ Fout bij aanmaken/bijwerken admin: ${error.message}${colors.reset}`);
    await pool.end();
    return false;
  }
}

// Hoofdfunctie om alle stappen uit te voeren
async function main() {
  console.log(`
${colors.cyan}=================================================
 CyberShieldX Database Initialisatie Script 
=================================================
${colors.reset}
Dit script voert de volgende stappen uit:
1. Database omgevingsvariabele instellen
2. Database aanmaken als deze nog niet bestaat
3. Database tabellen aanmaken (migraties)
4. Admin gebruiker aanmaken

`);

  try {
    // Stap 1: .env bestand aanmaken met DATABASE_URL
    console.log(`${colors.blue}[Stap 1/4] Database omgevingsvariabele instellen...${colors.reset}`);
    if (!writeEnvFile(DEFAULT_CONFIG.db)) {
      throw new Error('Kon .env bestand niet aanmaken');
    }
    
    // Stap 2: Database aanmaken
    console.log(`\n${colors.blue}[Stap 2/4] Database '${DEFAULT_CONFIG.db.database}' aanmaken...${colors.reset}`);
    if (!await createDatabase(DEFAULT_CONFIG.db)) {
      throw new Error('Kon database niet aanmaken');
    }
    
    // Stap 3: Tabellen aanmaken met migraties
    console.log(`\n${colors.blue}[Stap 3/4] Database tabellen aanmaken...${colors.reset}`);
    await runMigrations();
    
    // Stap 4: Admin gebruiker aanmaken
    console.log(`\n${colors.blue}[Stap 4/4] Admin gebruiker aanmaken...${colors.reset}`);
    if (!await createAdminUser(DEFAULT_CONFIG)) {
      throw new Error('Kon admin gebruiker niet aanmaken');
    }
    
    console.log(`\n${colors.green}✓ Database initialisatie succesvol afgerond!${colors.reset}
    
Je kunt nu inloggen met:
Gebruiker: ${colors.cyan}${DEFAULT_CONFIG.admin.username}${colors.reset}
Wachtwoord: ${colors.cyan}${DEFAULT_CONFIG.admin.password}${colors.reset}

Je wordt gevraagd om het wachtwoord te wijzigen bij de eerste login.
`);

  } catch (error) {
    console.error(`\n${colors.red}Er is een fout opgetreden: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

// Start het script
main();