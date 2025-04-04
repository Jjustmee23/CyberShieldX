#!/usr/bin/env node

/**
 * CyberShieldX Automatische Database en Admin Setup
 * ================================================
 * 
 * Dit script maakt automatisch de database aan en configureert een admin gebruiker
 * voor CyberShieldX. Het is ontworpen om uitgevoerd te worden tijdens de eerste installatie
 * en zorgt ervoor dat het systeem direct bruikbaar is zonder handmatige configuratie.
 * 
 * Gebruik: node setup-database-admin.js
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const readline = require('readline');

// Configuratie
const DEFAULT_CONFIG = {
  // Database connectie instellingen
  db: {
    host: 'postgres',  // Docker-compose servicenaam
    port: 5432,
    database: 'cybershieldx',
    user: 'postgres',
    password: 'BU5hRWexFrMxCCfY'  // Standaard wachtwoord uit logs
  },
  // Admin gebruiker instellingen
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

// Hulpfunctie voor het maken van een SQL verbinding
async function createDbConnection(config, createDb = false) {
  const connectionString = createDb 
    ? `postgres://${config.user}:${config.password}@${config.host}:${config.port}/postgres`
    : `postgres://${config.user}:${config.password}@${config.host}:${config.port}/${config.database}`;
  
  const pool = new Pool({
    connectionString,
    connectionTimeoutMillis: 5000
  });
  
  try {
    await pool.query('SELECT NOW()');
    console.log(`${colors.green}✓ Verbinding met PostgreSQL succesvol${colors.reset}`);
    return pool;
  } catch (error) {
    console.error(`${colors.red}✗ Kon geen verbinding maken met PostgreSQL: ${error.message}${colors.reset}`);
    throw error;
  }
}

// Maak de database aan als deze nog niet bestaat
async function createDatabase(pool, config) {
  try {
    // Controleer of database al bestaat
    const dbCheckResult = await pool.query(`
      SELECT 1 FROM pg_database WHERE datname = $1
    `, [config.database]);
    
    if (dbCheckResult.rows.length > 0) {
      console.log(`${colors.yellow}! Database '${config.database}' bestaat al${colors.reset}`);
      return true;
    }
    
    // Database aanmaken
    await pool.query(`CREATE DATABASE ${config.database}`);
    console.log(`${colors.green}✓ Database '${config.database}' succesvol aangemaakt${colors.reset}`);
    return true;
  } catch (error) {
    console.error(`${colors.red}✗ Kon database niet aanmaken: ${error.message}${colors.reset}`);
    return false;
  }
}

// Maak tabellen aan als ze nog niet bestaan
async function createTables(pool) {
  try {
    // Controleer of users tabel al bestaat
    const tableCheckResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename = 'users'
      );
    `);
    
    if (tableCheckResult.rows[0].exists) {
      console.log(`${colors.yellow}! Tabellen bestaan al${colors.reset}`);
      return true;
    }
    
    // Voer de Drizzle migraties uit via het npm script 
    return new Promise((resolve, reject) => {
      console.log(`${colors.blue}i Voer database migraties uit...${colors.reset}`);
      exec('npm run db:push', (error, stdout, stderr) => {
        if (error) {
          console.error(`${colors.red}✗ Fout bij uitvoeren van migraties: ${error.message}${colors.reset}`);
          // Probeer het nogmaals met het volledige pad
          exec('npx drizzle-kit push:pg', (err2, stdout2, stderr2) => {
            if (err2) {
              console.error(`${colors.red}✗ Kon migraties niet uitvoeren: ${err2.message}${colors.reset}`);
              reject(err2);
              return;
            }
            console.log(`${colors.green}✓ Database migraties uitgevoerd${colors.reset}`);
            resolve(true);
          });
          return;
        }
        console.log(`${colors.green}✓ Database migraties succesvol uitgevoerd${colors.reset}`);
        resolve(true);
      });
    });
  } catch (error) {
    console.error(`${colors.red}✗ Kon tabellen niet aanmaken: ${error.message}${colors.reset}`);
    return false;
  }
}

// Maak een admin gebruiker aan
async function createAdminUser(pool, adminConfig) {
  try {
    // Controleer of de admin gebruiker al bestaat
    const userCheckResult = await pool.query(`
      SELECT * FROM users WHERE username = $1
    `, [adminConfig.username]);
    
    if (userCheckResult.rows.length > 0) {
      // Update bestaande gebruiker
      await pool.query(`
        UPDATE users
        SET password = $1, name = $2, email = $3, role = $4, require_password_change = true
        WHERE username = $5
      `, [
        adminConfig.password,
        adminConfig.name,
        adminConfig.email,
        adminConfig.role,
        adminConfig.username
      ]);
      
      console.log(`${colors.yellow}! Admin gebruiker '${adminConfig.username}' bestaat al, wachtwoord bijgewerkt${colors.reset}`);
    } else {
      // Create new user
      await pool.query(`
        INSERT INTO users (username, password, name, email, role, require_password_change)
        VALUES ($1, $2, $3, $4, $5, true)
      `, [
        adminConfig.username,
        adminConfig.password,
        adminConfig.name,
        adminConfig.email,
        adminConfig.role
      ]);
      
      console.log(`${colors.green}✓ Admin gebruiker '${adminConfig.username}' succesvol aangemaakt${colors.reset}`);
    }
    
    return true;
  } catch (error) {
    console.error(`${colors.red}✗ Kon admin gebruiker niet aanmaken/bijwerken: ${error.message}${colors.reset}`);
    return false;
  }
}

// Sla de database configuratie op in een .env bestand
function saveConnectionConfig(config) {
  try {
    const envPath = path.join(process.cwd(), '.env');
    const connectionString = `postgres://${config.user}:${config.password}@${config.host}:${config.port}/${config.database}`;
    
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
      
      // Vervang DATABASE_URL als deze al bestaat
      if (envContent.includes('DATABASE_URL=')) {
        envContent = envContent.replace(/DATABASE_URL=.*(\r\n|\r|\n|$)/g, `DATABASE_URL=${connectionString}$1`);
      } else {
        envContent += `\nDATABASE_URL=${connectionString}`;
      }
    } else {
      envContent = `DATABASE_URL=${connectionString}\n`;
    }
    
    fs.writeFileSync(envPath, envContent);
    console.log(`${colors.green}✓ Database configuratie succesvol opgeslagen in .env bestand${colors.reset}`);
    
    // Stel ook de omgevingsvariabele direct in
    process.env.DATABASE_URL = connectionString;
    
    return true;
  } catch (error) {
    console.error(`${colors.red}✗ Kon database configuratie niet opslaan: ${error.message}${colors.reset}`);
    console.log(`${colors.yellow}! Stel de DATABASE_URL omgevingsvariabele handmatig in op:${colors.reset}`);
    console.log(`${colors.cyan}${connectionString}${colors.reset}`);
    return false;
  }
}

// Hoofdfunctie
async function main() {
  console.log(`
${colors.cyan}================================================
 CyberShieldX Automatische Database en Admin Setup
================================================${colors.reset}

Dit script zal automatisch:
1. Verbinding maken met de PostgreSQL database
2. Een 'cybershieldx' database aanmaken (indien nodig)
3. De benodigde tabellen aanmaken 
4. Een admin gebruiker aanmaken of bijwerken
5. De database configuratie opslaan

`);

  try {
    // 1. Verbinding maken met PostgreSQL
    console.log(`${colors.blue}[1/5] Verbinding maken met PostgreSQL...${colors.reset}`);
    const mainPool = await createDbConnection(DEFAULT_CONFIG.db, true);
    
    // 2. Database aanmaken
    console.log(`\n${colors.blue}[2/5] Database aanmaken...${colors.reset}`);
    const dbCreated = await createDatabase(mainPool, DEFAULT_CONFIG.db);
    if (!dbCreated) {
      throw new Error('Kon database niet aanmaken');
    }
    
    // Sluit de verbinding met de postgres database
    await mainPool.end();
    
    // 3. Verbinding maken met de nieuwe database en tabellen aanmaken
    console.log(`\n${colors.blue}[3/5] Tabellen aanmaken...${colors.reset}`);
    const dbPool = await createDbConnection(DEFAULT_CONFIG.db, false);
    await createTables(dbPool);
    
    // 4. Admin gebruiker aanmaken
    console.log(`\n${colors.blue}[4/5] Admin gebruiker aanmaken...${colors.reset}`);
    await createAdminUser(dbPool, DEFAULT_CONFIG.admin);
    
    // Sluit de database verbinding
    await dbPool.end();
    
    // 5. Configuratie opslaan
    console.log(`\n${colors.blue}[5/5] Configuratie opslaan...${colors.reset}`);
    saveConnectionConfig(DEFAULT_CONFIG.db);
    
    console.log(`\n${colors.green}✓ Setup compleet!${colors.reset}
    
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

main();