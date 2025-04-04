#!/usr/bin/env node

/**
 * Script om een admin-gebruiker aan te maken of te herstellen in de database
 * Gebruik: node ensure-admin-fixed.js
 * 
 * Dit script voegt een admin-gebruiker toe aan de database als deze nog niet bestaat.
 * Je kunt dit script gebruiken om de admin-toegang te herstellen of om te zorgen dat de 
 * standaard inloggegevens werken op je privéserver.
 */

const { Pool } = require('pg');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Vraag naar database credentials
async function getDatabaseConfig() {
  return new Promise((resolve) => {
    console.log("Voer de database-verbindingsgegevens in (druk op Enter voor standaardwaarden):");
    
    rl.question("Hostnaam [localhost]: ", (host) => {
      rl.question("Poort [5432]: ", (port) => {
        rl.question("Database naam [cybershieldx]: ", (database) => {
          rl.question("Gebruikersnaam [postgres]: ", (user) => {
            rl.question("Wachtwoord: ", (password) => {
              resolve({
                host: host || 'localhost',
                port: port || 5432,
                database: database || 'cybershieldx',
                user: user || 'postgres',
                password: password
              });
            });
          });
        });
      });
    });
  });
}

// Vraag naar admin account gegevens
async function getAdminConfig() {
  return new Promise((resolve) => {
    console.log("\nVoer de admin-accountgegevens in (druk op Enter voor standaardwaarden):");
    
    rl.question("Admin gebruikersnaam [admin]: ", (username) => {
      rl.question("Admin wachtwoord [password123]: ", (password) => {
        rl.question("Admin naam [Admin User]: ", (name) => {
          rl.question("Admin e-mail [admin@cybershieldx.com]: ", (email) => {
            resolve({
              username: username || 'admin',
              password: password || 'password123',
              name: name || 'Admin User',
              email: email || 'admin@cybershieldx.com',
              role: 'admin'
            });
          });
        });
      });
    });
  });
}

// Hoofdfunctie
async function main() {
  console.log("=== CyberShieldX Admin Herstel Tool ===");
  console.log("Dit script maakt een admin-gebruiker aan of herstelt deze in de database.");
  
  try {
    const dbConfig = await getDatabaseConfig();
    const adminConfig = await getAdminConfig();
    
    // Maak verbinding met de database
    const pool = new Pool(dbConfig);
    
    // Controleer of de users tabel bestaat
    const tableCheckResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename = 'users'
      );
    `);
    
    if (!tableCheckResult.rows[0].exists) {
      console.error("Fout: De 'users' tabel bestaat niet in de database.");
      console.error("Zorg ervoor dat de database correct is geïnitialiseerd.");
      process.exit(1);
    }
    
    // Controleer of de admin-gebruiker al bestaat
    const userCheckResult = await pool.query(`
      SELECT * FROM users WHERE username = $1
    `, [adminConfig.username]);
    
    if (userCheckResult.rows.length > 0) {
      // Update de bestaande admin
      console.log(`Admin-gebruiker '${adminConfig.username}' bestaat al. Wachtwoord wordt bijgewerkt...`);
      
      await pool.query(`
        UPDATE users
        SET password = $1, name = $2, email = $3, role = $4, require_password_change = $6
        WHERE username = $5
      `, [
        adminConfig.password,
        adminConfig.name,
        adminConfig.email,
        adminConfig.role,
        adminConfig.username,
        true // Verplicht wachtwoord wijzigen bij volgende login
      ]);
      
      console.log("Admin-gebruiker succesvol bijgewerkt!");
    } else {
      // Maak een nieuwe admin-gebruiker
      console.log(`Admin-gebruiker '${adminConfig.username}' bestaat niet. Nieuwe gebruiker wordt aangemaakt...`);
      
      await pool.query(`
        INSERT INTO users (username, password, name, email, role, require_password_change)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        adminConfig.username,
        adminConfig.password,
        adminConfig.name,
        adminConfig.email,
        adminConfig.role,
        true // Verplicht wachtwoord wijzigen bij eerste login
      ]);
      
      console.log("Admin-gebruiker succesvol aangemaakt!");
    }
    
    console.log("\n=== Inloggegevens ===");
    console.log(`Gebruikersnaam: ${adminConfig.username}`);
    console.log(`Wachtwoord: ${adminConfig.password}`);
    console.log("\nJe kunt nu inloggen op het platform met deze gegevens.");
    
    await pool.end();
  } catch (error) {
    console.error("Er is een fout opgetreden:", error.message);
  } finally {
    rl.close();
  }
}

main();