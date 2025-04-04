/**
 * CyberShieldX Automated Database Initialization
 * 
 * This script automatically initializes the PostgreSQL database on server startup
 * - Creates the database if it doesn't exist
 * - Creates tables using Drizzle migrations
 * - Creates admin user if not exists
 * - Provides backup and restore capabilities
 */

import pkg from 'pg';
const { Pool } = pkg;
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { log } from './vite';

const execAsync = promisify(exec);

// Database configuration
// If DATABASE_URL is provided, use it directly
// Otherwise use the individual settings
const DATABASE_URL = process.env.DATABASE_URL;

const defaultDbConfig = {
  host: process.env.PGHOST || 'db', // Use Replit PGHOST or default
  port: parseInt(process.env.PGPORT || '5432'),
  database: process.env.PGDATABASE || 'cybershieldx',
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'BU5hRWexFrMxCCfY'
};

// Admin user configuration
const defaultAdminConfig = {
  username: process.env.ADMIN_USERNAME || 'admin',
  password: process.env.ADMIN_PASSWORD || 'password123',
  name: process.env.ADMIN_NAME || 'Admin User',
  email: process.env.ADMIN_EMAIL || 'admin@cybershieldx.com'
};

// Initialize the database
export async function initializeDatabase(): Promise<boolean> {
  log('Starting automatic database initialization...', 'db-init');
  
  try {
    // If we have a DATABASE_URL, we're using a managed database (like Neon)
    // that's already set up, so we can skip some of the initialization steps
    if (DATABASE_URL) {
      log('Using existing DATABASE_URL for managed database', 'db-init');
      
      // Connect to the database and run migrations
      try {
        const dbPool = new Pool({
          connectionString: DATABASE_URL,
          connectionTimeoutMillis: 10000
        });
        
        try {
          // Test connection
          await dbPool.query('SELECT NOW()');
          log('Successfully connected to managed database', 'db-init');
          
          // Run migrations using Drizzle
          try {
            const db = drizzle(dbPool);
            log('Running database migrations...', 'db-init');
            await migrate(db, { migrationsFolder: './migrations' });
            log('Database migrations completed successfully', 'db-init');
            
            // Check if admin user exists, create if not
            try {
              const adminUser = await db.select()
                .from(users)
                .where(eq(users.username, defaultAdminConfig.username))
                .limit(1);
              
              if (adminUser.length === 0) {
                log('Admin user not found, creating it...', 'db-init');
                
                try {
                  await db.insert(users).values({
                    username: defaultAdminConfig.username,
                    password: defaultAdminConfig.password,
                    name: defaultAdminConfig.name,
                    email: defaultAdminConfig.email,
                    role: 'admin',
                    requirePasswordChange: true
                  });
                  
                  log('Admin user created successfully', 'db-init');
                } catch (createUserError) {
                  log(`Failed to create admin user: ${createUserError}`, 'db-init');
                  // Continue anyway, as tables are created
                }
              } else {
                log('Admin user already exists', 'db-init');
              }
            } catch (userCheckError) {
              log(`Error checking admin user: ${userCheckError}`, 'db-init');
              // Continue anyway, as tables are created
            }
            
            log('Database initialization completed successfully', 'db-init');
            return true;
          } catch (migrateError) {
            log(`Database migration error: ${migrateError}`, 'db-init');
            return false;
          }
        } catch (error) {
          log(`Error connecting to database: ${error}`, 'db-init');
          return false;
        } finally {
          await dbPool.end();
        }
      } catch (error) {
        log(`Database initialization error: ${error}`, 'db-init');
        return false;
      }
    }
    
    // Create database connection string (for self-hosted setup)
    const connectionStringBase = `postgres://${defaultDbConfig.user}:${defaultDbConfig.password}@${defaultDbConfig.host}:${defaultDbConfig.port}`;
    const connectionString = `${connectionStringBase}/${defaultDbConfig.database}`;
    
    // First check if we can connect to PostgreSQL server
    try {
      // Connect to postgres database to check server availability
      const isProduction = process.env.NODE_ENV === 'production';
      const basePool = new Pool({
        connectionString: `${connectionStringBase}/postgres`,
        connectionTimeoutMillis: 5000,
        ssl: isProduction ? { rejectUnauthorized: false } : false
      });
      
      try {
        await basePool.query('SELECT NOW()');
        log('Successfully connected to PostgreSQL server', 'db-init');
      } catch (error) {
        log(`Failed to connect to PostgreSQL server: ${error}`, 'db-init');
        return false;
      } finally {
        await basePool.end();
      }
    } catch (error) {
      log(`PostgreSQL server connection error: ${error}`, 'db-init');
      return false;
    }
    
    // Check if database exists, create if not
    try {
      // Connect to postgres database to check/create our database
      const isProduction = process.env.NODE_ENV === 'production';
      const setupPool = new Pool({
        connectionString: `${connectionStringBase}/postgres`,
        connectionTimeoutMillis: 5000,
        ssl: isProduction ? { rejectUnauthorized: false } : false
      });
      
      try {
        // Check if our database exists
        const dbCheckResult = await setupPool.query(
          `SELECT 1 FROM pg_database WHERE datname = $1`, 
          [defaultDbConfig.database]
        );
        
        if (dbCheckResult.rows.length === 0) {
          log(`Database '${defaultDbConfig.database}' not found, creating it...`, 'db-init');
          
          try {
            // Create the database
            await setupPool.query(`CREATE DATABASE ${defaultDbConfig.database}`);
            log(`Successfully created database '${defaultDbConfig.database}'`, 'db-init');
          } catch (createError) {
            log(`Failed to create database: ${createError}`, 'db-init');
            return false;
          }
        } else {
          log(`Database '${defaultDbConfig.database}' already exists`, 'db-init');
        }
      } catch (error) {
        log(`Error checking database existence: ${error}`, 'db-init');
        return false;
      } finally {
        await setupPool.end();
      }
    } catch (error) {
      log(`Database setup error: ${error}`, 'db-init');
      return false;
    }
    
    // Connect to our database and run migrations
    try {
      const isProduction = process.env.NODE_ENV === 'production';
      const dbPool = new Pool({
        connectionString,
        connectionTimeoutMillis: 10000,
        ssl: isProduction ? { rejectUnauthorized: false } : false
      });
      
      try {
        // Test connection to our database
        await dbPool.query('SELECT NOW()');
        log(`Successfully connected to database '${defaultDbConfig.database}'`, 'db-init');
        
        // Run migrations using Drizzle
        try {
          const db = drizzle(dbPool);
          log('Running database migrations...', 'db-init');
          await migrate(db, { migrationsFolder: './migrations' });
          log('Database migrations completed successfully', 'db-init');
          
          // Check if admin user exists, create if not
          try {
            const adminUser = await db.select()
              .from(users)
              .where(eq(users.username, defaultAdminConfig.username))
              .limit(1);
            
            if (adminUser.length === 0) {
              log('Admin user not found, creating it...', 'db-init');
              
              try {
                await db.insert(users).values({
                  username: defaultAdminConfig.username,
                  password: defaultAdminConfig.password,
                  name: defaultAdminConfig.name,
                  email: defaultAdminConfig.email,
                  role: 'admin',
                  requirePasswordChange: true
                });
                
                log('Admin user created successfully', 'db-init');
              } catch (createUserError) {
                log(`Failed to create admin user: ${createUserError}`, 'db-init');
                // Continue anyway, as tables are created
              }
            } else {
              log('Admin user already exists', 'db-init');
            }
          } catch (userCheckError) {
            log(`Error checking admin user: ${userCheckError}`, 'db-init');
            // Continue anyway, as tables are created
          }
        } catch (migrateError) {
          log(`Database migration error: ${migrateError}`, 'db-init');
          return false;
        }
      } catch (error) {
        log(`Error connecting to database: ${error}`, 'db-init');
        return false;
      } finally {
        await dbPool.end();
      }
    } catch (error) {
      log(`Database initialization error: ${error}`, 'db-init');
      return false;
    }
    
    // Write configuration to .env file
    try {
      const envPath = path.join(process.cwd(), '.env');
      const envVars = {
        DATABASE_URL: `postgres://${defaultDbConfig.user}:${defaultDbConfig.password}@${defaultDbConfig.host}:${defaultDbConfig.port}/${defaultDbConfig.database}`,
        SKIP_SETUP: 'true'
      };
      
      let envContent = '';
      
      // Read existing .env if it exists
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
        
        // Update values
        for (const [key, value] of Object.entries(envVars)) {
          if (envContent.includes(`${key}=`)) {
            envContent = envContent.replace(new RegExp(`${key}=.*(\r\n|\r|\n|$)`, 'g'), `${key}=${value}$1`);
          } else {
            envContent += `\n${key}=${value}`;
          }
        }
      } else {
        // Create new .env file
        envContent = Object.entries(envVars)
          .map(([key, value]) => `${key}=${value}`)
          .join('\n');
      }
      
      fs.writeFileSync(envPath, envContent);
      log('Database configuration written to .env file', 'db-init');
      
      // Also set environment variables for current process
      for (const [key, value] of Object.entries(envVars)) {
        process.env[key] = value;
      }
    } catch (error) {
      log(`Error writing configuration to .env file: ${error}`, 'db-init');
      // Continue anyway as we've set the environment variables
    }
    
    log('Database initialization completed successfully', 'db-init');
    return true;
  } catch (error) {
    log(`Unexpected error during database initialization: ${error}`, 'db-init');
    return false;
  }
}

// Backup the database
export async function backupDatabase(backupPath?: string): Promise<string | null> {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = backupPath || path.join(process.cwd(), 'backups');
    const backupFile = path.join(backupDir, `cybershieldx-backup-${timestamp}.sql`);
    
    // Create backup directory if it doesn't exist
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    // Use DATABASE_URL if available, otherwise use individual config
    let pgDumpCmd;
    
    if (DATABASE_URL) {
      // Extract DB connection info from DATABASE_URL
      const url = new URL(DATABASE_URL);
      const host = url.hostname;
      const port = url.port || '5432';
      const user = url.username;
      const password = url.password;
      const database = url.pathname.substring(1); // Remove leading /
      
      pgDumpCmd = `PGPASSWORD=${password} pg_dump -h ${host} -p ${port} -U ${user} -F c -b -v -f "${backupFile}" ${database}`;
    } else {
      pgDumpCmd = `PGPASSWORD=${defaultDbConfig.password} pg_dump -h ${defaultDbConfig.host} -p ${defaultDbConfig.port} -U ${defaultDbConfig.user} -F c -b -v -f "${backupFile}" ${defaultDbConfig.database}`;
    }
    
    log(`Creating database backup at ${backupFile}...`, 'db-backup');
    
    try {
      await execAsync(pgDumpCmd);
      log(`Database backup created successfully at ${backupFile}`, 'db-backup');
      return backupFile;
    } catch (error) {
      log(`Failed to create database backup: ${error}`, 'db-backup');
      return null;
    }
  } catch (error) {
    log(`Unexpected error during database backup: ${error}`, 'db-backup');
    return null;
  }
}

// Restore the database from backup
export async function restoreDatabase(backupFile: string): Promise<boolean> {
  try {
    if (!fs.existsSync(backupFile)) {
      log(`Backup file does not exist: ${backupFile}`, 'db-restore');
      return false;
    }
    
    // Use DATABASE_URL if available, otherwise use individual config
    let pgRestoreCmd;
    
    if (DATABASE_URL) {
      // Extract DB connection info from DATABASE_URL
      const url = new URL(DATABASE_URL);
      const host = url.hostname;
      const port = url.port || '5432';
      const user = url.username;
      const password = url.password;
      const database = url.pathname.substring(1); // Remove leading /
      
      pgRestoreCmd = `PGPASSWORD=${password} pg_restore -h ${host} -p ${port} -U ${user} -d ${database} -c -v "${backupFile}"`;
    } else {
      pgRestoreCmd = `PGPASSWORD=${defaultDbConfig.password} pg_restore -h ${defaultDbConfig.host} -p ${defaultDbConfig.port} -U ${defaultDbConfig.user} -d ${defaultDbConfig.database} -c -v "${backupFile}"`;
    }
    
    log(`Restoring database from backup ${backupFile}...`, 'db-restore');
    
    try {
      await execAsync(pgRestoreCmd);
      log('Database restored successfully', 'db-restore');
      return true;
    } catch (error) {
      log(`Failed to restore database: ${error}`, 'db-restore');
      return false;
    }
  } catch (error) {
    log(`Unexpected error during database restore: ${error}`, 'db-restore');
    return false;
  }
}