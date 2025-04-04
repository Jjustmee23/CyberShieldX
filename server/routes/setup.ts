import { Router, Request, Response } from 'express';
import pkg from 'pg';
const { Pool } = pkg;
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { log } from '../vite';
import fs from 'fs';
import path from 'path';
import { users } from '../../shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();

// Store if setup is completed
let isSetupCompleted = false;

// Check if setup is needed
router.get('/check', async (req: Request, res: Response) => {
  try {
    // Als de omgevingsvariabele SKIP_SETUP bestaat en true is, dan slaan we de setup over
    if (process.env.SKIP_SETUP === 'true') {
      isSetupCompleted = true;
      return res.json({ setupNeeded: false, reason: 'Setup skipped by environment variable' });
    }
    
    // Controleer of we verbinding kunnen maken met de database en of de users tabel records bevat
    if (process.env.DATABASE_URL) {
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        connectionTimeoutMillis: 5000 // Voeg een timeout toe
      });
      
      try {
        // Controleer of we verbinding kunnen maken
        await pool.query('SELECT NOW()');
        
        // Controleer of users tabel bestaat en ten minste één gebruiker heeft
        const tableCheckResult = await pool.query(`
          SELECT EXISTS (
            SELECT FROM pg_tables
            WHERE schemaname = 'public'
            AND tablename = 'users'
          );
        `);
        
        if (tableCheckResult.rows[0].exists) {
          // Tabel bestaat, controleer of deze gebruikers bevat
          const usersCountResult = await pool.query('SELECT COUNT(*) FROM users');
          const userCount = parseInt(usersCountResult.rows[0].count);
          
          if (userCount > 0) {
            isSetupCompleted = true;
            log('Setup is niet nodig: Database is geconfigureerd en gebruikers bestaan', 'setup');
            return res.json({ setupNeeded: false, reason: 'Database configured and users exist' });
          } else {
            log('Setup is nodig: Geen gebruikers gevonden', 'setup');
          }
        } else {
          log('Setup is nodig: Users tabel bestaat niet', 'setup');
        }
      } catch (err) {
        // Als er een fout is, is setup nodig
        log(`Database verbindingsfout: ${err}`, 'setup');
      } finally {
        pool.end();
      }
    } else {
      log('Setup is nodig: Geen DATABASE_URL omgevingsvariabele gevonden', 'setup');
    }
    
    // Als we hier komen, is setup nodig
    return res.json({ setupNeeded: true, reason: 'Database or users not configured' });
  } catch (error) {
    log(`Fout bij het controleren van setup status: ${error}`, 'setup');
    return res.status(500).json({ error: 'Failed to check setup status' });
  }
});

// Setup database
router.post('/database', async (req: Request, res: Response) => {
  try {
    const { host, port, database, user, password } = req.body;
    
    if (!host || !port || !database || !user) {
      return res.status(400).json({ error: 'Missing required database configuration parameters' });
    }
    
    // Create connection string
    const connectionString = `postgres://${user}:${password}@${host}:${port}/${database}`;
    
    // Try to connect
    const pool = new Pool({ 
      connectionString,
      // Add connection timeout to prevent hanging
      connectionTimeoutMillis: 5000,
      // Add more detailed logging
      log: (msg) => log(`DB Connection: ${msg}`, 'setup')
    });
    
    try {
      await pool.query('SELECT NOW()');
      
      // Write connection string to .env file
      const envPath = path.join(process.cwd(), '.env');
      let envContent = '';
      
      try {
        if (fs.existsSync(envPath)) {
          envContent = fs.readFileSync(envPath, 'utf8');
          
          // Replace DATABASE_URL if it exists
          if (envContent.includes('DATABASE_URL=')) {
            envContent = envContent.replace(/DATABASE_URL=.*(\r\n|\r|\n|$)/g, `DATABASE_URL=${connectionString}$1`);
          } else {
            envContent += `\nDATABASE_URL=${connectionString}`;
          }
        } else {
          envContent = `DATABASE_URL=${connectionString}\n`;
        }
        
        fs.writeFileSync(envPath, envContent);
        log(`Database connection string written to .env file`, 'setup');
      } catch (fsErr) {
        log(`Error writing to .env file: ${fsErr}. Will proceed with setup anyway.`, 'setup');
        // Set the environment variable directly for this session
        process.env.DATABASE_URL = connectionString;
      }
      
      // Run migrations
      try {
        const db = drizzle(pool);
        await migrate(db, { migrationsFolder: './drizzle' });
        
        log('Database configured and migrations applied successfully', 'setup');
        return res.json({ success: true, message: 'Database configured successfully' });
      } catch (migrateErr) {
        log(`Migration error: ${migrateErr}`, 'setup');
        return res.status(500).json({ error: `Failed to apply migrations: ${migrateErr}` });
      }
    } catch (dbErr) {
      log(`Database connection error: ${dbErr}`, 'setup');
      return res.status(500).json({ error: `Failed to connect to database: ${dbErr}` });
    } finally {
      pool.end();
    }
  } catch (error) {
    log(`Database setup error: ${error}`, 'setup');
    return res.status(500).json({ error: 'Failed to setup database' });
  }
});

// Setup admin user
router.post('/admin', async (req: Request, res: Response) => {
  try {
    const { username, password, name, email } = req.body;
    
    if (!username || !password || !name || !email) {
      return res.status(400).json({ error: 'Missing required admin user parameters' });
    }
    
    // Check if we have a database connection
    if (!process.env.DATABASE_URL) {
      return res.status(400).json({ error: 'Database connection not configured' });
    }
    
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      // Add connection timeout to prevent hanging
      connectionTimeoutMillis: 5000
    });
    
    try {
      const db = drizzle(pool);
      
      // Check if user already exists
      const existingUser = await db.select().from(users).where(eq(users.username, username));
      
      if (existingUser.length > 0) {
        // Update existing user
        await db.update(users)
          .set({
            password,
            name,
            email,
            role: 'admin',
            requirePasswordChange: true
          })
          .where(eq(users.username, username));
      } else {
        // Create new user
        await db.insert(users).values({
          username,
          password,
          name,
          email,
          role: 'admin',
          requirePasswordChange: true
        });
      }
      
      isSetupCompleted = true;
      log(`Admin user '${username}' created/updated successfully`, 'setup');
      return res.json({ success: true, message: 'Admin user created successfully' });
    } catch (dbErr) {
      log(`Admin user creation error: ${dbErr}`, 'setup');
      return res.status(500).json({ error: `Failed to create admin user: ${dbErr}` });
    } finally {
      pool.end();
    }
  } catch (error) {
    log(`Admin setup error: ${error}`, 'setup');
    return res.status(500).json({ error: 'Failed to setup admin user' });
  }
});

export default router;