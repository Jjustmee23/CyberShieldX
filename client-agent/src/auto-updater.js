/**
 * Automatische update module voor CyberShieldX agent
 * 
 * Dit script controleert en installeert updates voor de CyberShieldX client-agent.
 * Het is ontworpen om automatisch te werken en kan worden opgeroepen vanuit het hoofdprogramma
 * of als een geplande taak worden uitgevoerd.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');
const { exec, spawn } = require('child_process');
const os = require('os');

// Configuratie
const CONFIG = {
  // Server informatie
  updateServer: 'https://server.cybershieldx.com/api/updates',
  apiKey: process.env.CYBERSHIELDX_API_KEY || '',
  
  // Lokale paden
  installDir: process.env.AGENT_INSTALL_DIR || path.join(os.homedir(), '.cybershieldx'),
  backupDir: process.env.AGENT_BACKUP_DIR || path.join(os.homedir(), '.cybershieldx-backups'),
  logFile: process.env.AGENT_LOG_FILE || path.join(os.homedir(), '.cybershieldx', 'updates.log'),
  
  // Update instellingen
  checkIntervalHours: 12,
  autoRestart: true,
  forcedUpdateDays: 7,
};

// Logger functie
function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}`;
  
  console.log(logMessage);
  
  // Zorg dat de map bestaat
  const logDir = path.dirname(CONFIG.logFile);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  
  // Schrijf naar logbestand
  fs.appendFileSync(CONFIG.logFile, logMessage + '\n');
}

// Huidige versie ophalen
function getCurrentVersion() {
  try {
    const packagePath = path.join(CONFIG.installDir, 'package.json');
    if (fs.existsSync(packagePath)) {
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      return packageJson.version || '0.0.0';
    }
  } catch (error) {
    log(`Fout bij het ophalen van de huidige versie: ${error.message}`, 'ERROR');
  }
  return '0.0.0';
}

// Bestand downloaden van de server
function downloadFile(url, destination) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destination);
    
    https.get(url, { 
      headers: { 
        'Authorization': `Bearer ${CONFIG.apiKey}`,
        'User-Agent': `CyberShieldX-Agent/${getCurrentVersion()}`
      } 
    }, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Download mislukt met status ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (error) => {
      fs.unlink(destination, () => {});
      reject(error);
    });
  });
}

// Controleer op updates
async function checkForUpdates() {
  log('Controleren op updates...');
  
  try {
    const currentVersion = getCurrentVersion();
    
    // Informatie van server ophalen
    const updateInfo = await fetchUpdateInfo(currentVersion);
    
    if (!updateInfo.hasUpdate) {
      log(`Geen update beschikbaar. Huidige versie (${currentVersion}) is up-to-date.`);
      return { hasUpdate: false };
    }
    
    log(`Update beschikbaar: ${updateInfo.version} (huidige versie: ${currentVersion})`);
    
    return {
      hasUpdate: true,
      currentVersion,
      ...updateInfo
    };
  } catch (error) {
    log(`Fout bij het controleren op updates: ${error.message}`, 'ERROR');
    return { hasUpdate: false, error: error.message };
  }
}

// Update informatie ophalen van de server
function fetchUpdateInfo(currentVersion) {
  return new Promise((resolve, reject) => {
    const systemInfo = {
      platform: os.platform(),
      arch: os.arch(),
      version: currentVersion,
      hostname: os.hostname(),
    };
    
    const requestData = JSON.stringify(systemInfo);
    
    const options = {
      hostname: new URL(CONFIG.updateServer).hostname,
      path: new URL(CONFIG.updateServer).pathname,
      port: 443,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': requestData.length,
        'Authorization': `Bearer ${CONFIG.apiKey}`,
        'User-Agent': `CyberShieldX-Agent/${currentVersion}`
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`Server responded with status code ${res.statusCode}`));
          return;
        }
        
        try {
          const updateInfo = JSON.parse(data);
          resolve(updateInfo);
        } catch (error) {
          reject(new Error(`Ongeldige JSON response: ${error.message}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.write(requestData);
    req.end();
  });
}

// Backup maken van huidige installatie
function createBackup() {
  log('Backup maken van huidige installatie...');
  
  try {
    // Zorg dat de backup map bestaat
    if (!fs.existsSync(CONFIG.backupDir)) {
      fs.mkdirSync(CONFIG.backupDir, { recursive: true });
    }
    
    // Maak een timestamped backup map
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupVersionDir = path.join(CONFIG.backupDir, `backup-${timestamp}`);
    fs.mkdirSync(backupVersionDir, { recursive: true });
    
    // Kopieer bestanden (behalve grote data mappen)
    const excludeDirs = ['node_modules', 'logs', 'data/temp'];
    
    // Recursieve kopieerfunctie
    const copyRecursive = (src, dest) => {
      const exists = fs.existsSync(src);
      const stats = exists && fs.statSync(src);
      const isDirectory = exists && stats.isDirectory();
      
      if (isDirectory) {
        const dirName = path.basename(src);
        if (excludeDirs.includes(dirName)) {
          return;
        }
        
        fs.mkdirSync(dest, { recursive: true });
        fs.readdirSync(src).forEach(childItemName => {
          copyRecursive(
            path.join(src, childItemName),
            path.join(dest, childItemName)
          );
        });
      } else {
        fs.copyFileSync(src, dest);
      }
    };
    
    copyRecursive(CONFIG.installDir, backupVersionDir);
    
    log(`Backup gemaakt in ${backupVersionDir}`);
    return backupVersionDir;
  } catch (error) {
    log(`Fout bij het maken van backup: ${error.message}`, 'ERROR');
    throw error;
  }
}

// Herstel vanuit backup
async function restoreFromBackup(backupDir) {
  log(`Herstellen vanuit backup: ${backupDir}...`, 'WARN');
  
  try {
    // Verwijder huidige installatie (behalve de configuraties)
    const filesToKeep = ['config.json', '.env', 'user-data'];
    
    fs.readdirSync(CONFIG.installDir).forEach(item => {
      const itemPath = path.join(CONFIG.installDir, item);
      
      // Skip bestanden/mappen die we willen behouden
      if (filesToKeep.includes(item)) {
        return;
      }
      
      if (fs.lstatSync(itemPath).isDirectory()) {
        fs.rmdirSync(itemPath, { recursive: true });
      } else {
        fs.unlinkSync(itemPath);
      }
    });
    
    // Kopieer bestanden terug van backup
    const copyRecursive = (src, dest) => {
      const exists = fs.existsSync(src);
      const stats = exists && fs.statSync(src);
      const isDirectory = exists && stats.isDirectory();
      
      if (isDirectory) {
        fs.mkdirSync(dest, { recursive: true });
        fs.readdirSync(src).forEach(childItemName => {
          // Skip bestanden die we willen behouden
          if (filesToKeep.includes(childItemName) && fs.existsSync(path.join(dest, childItemName))) {
            return;
          }
          
          copyRecursive(
            path.join(src, childItemName),
            path.join(dest, childItemName)
          );
        });
      } else {
        // Skip bestanden die we willen behouden
        if (filesToKeep.includes(path.basename(dest)) && fs.existsSync(dest)) {
          return;
        }
        
        fs.copyFileSync(src, dest);
      }
    };
    
    copyRecursive(backupDir, CONFIG.installDir);
    
    log('Herstel vanuit backup voltooid.');
    
    // Installeer dependencies opnieuw
    await new Promise((resolve, reject) => {
      log('Opnieuw installeren van dependencies...');
      
      const npmInstall = spawn('npm', ['install', '--production'], {
        cwd: CONFIG.installDir,
        stdio: 'pipe'
      });
      
      npmInstall.stdout.on('data', (data) => {
        log(`npm install output: ${data}`);
      });
      
      npmInstall.stderr.on('data', (data) => {
        log(`npm install error: ${data}`, 'ERROR');
      });
      
      npmInstall.on('close', (code) => {
        if (code !== 0) {
          log(`npm install failed with code ${code}`, 'ERROR');
          reject(new Error(`npm install failed with code ${code}`));
        } else {
          log('Dependencies succesvol geïnstalleerd.');
          resolve();
        }
      });
    });
    
    return true;
  } catch (error) {
    log(`Fout bij het herstellen vanuit backup: ${error.message}`, 'ERROR');
    return false;
  }
}

// Update uitvoeren
async function performUpdate() {
  try {
    // Controleer op updates
    const updateInfo = await checkForUpdates();
    
    if (!updateInfo.hasUpdate) {
      return { success: true, updated: false, message: 'Geen update beschikbaar.' };
    }
    
    log(`Update starten naar versie ${updateInfo.version}...`);
    
    // Backup maken
    const backupDir = createBackup();
    
    // Tijdelijke directory voor de update
    const tempDir = path.join(os.tmpdir(), `cybershieldx-update-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
    
    // Download update package
    const downloadPath = path.join(tempDir, 'update.zip');
    log(`Downloaden van update naar ${downloadPath}...`);
    
    try {
      await downloadFile(updateInfo.downloadUrl, downloadPath);
      log('Download voltooid.');
      
      // Verifieer checksum
      if (updateInfo.checksum) {
        log('Verifiëren van download checksum...');
        const fileBuffer = fs.readFileSync(downloadPath);
        const hashSum = crypto.createHash('sha256');
        hashSum.update(fileBuffer);
        const downloadChecksum = hashSum.digest('hex');
        
        if (downloadChecksum !== updateInfo.checksum) {
          throw new Error(`Checksum verificatie mislukt: ${downloadChecksum} !== ${updateInfo.checksum}`);
        }
        log('Checksum verificatie succesvol.');
      }
      
      // Extract package
      log('Uitpakken van update package...');
      
      await new Promise((resolve, reject) => {
        // Gebruik OS-specifieke unzip methodes
        let extractProcess;
        
        if (os.platform() === 'win32') {
          // Windows - gebruik PowerShell
          extractProcess = spawn('powershell', [
            '-command',
            `Expand-Archive -Path "${downloadPath}" -DestinationPath "${tempDir}" -Force`
          ]);
        } else {
          // Linux/macOS - gebruik unzip
          extractProcess = spawn('unzip', ['-o', downloadPath, '-d', tempDir]);
        }
        
        extractProcess.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`Uitpakken mislukt met code ${code}`));
          }
        });
      });
      
      log('Update package uitgepakt.');
      
      // Installeer de update
      log('Installeren van update...');
      
      // Stop huidige processen indien nodig
      if (CONFIG.autoRestart) {
        log('Stoppen van actieve processen...');
        // Implementeer hier het stoppen van processen
        // Dit zal afhangen van hoe de agent is gestart
      }
      
      // Kopieer bestanden naar installatie directory
      const extractedDir = path.join(tempDir, updateInfo.extractDir || '');
      
      const copyRecursive = (src, dest) => {
        if (!fs.existsSync(src)) {
          throw new Error(`Bron map bestaat niet: ${src}`);
        }
        
        const exists = fs.existsSync(src);
        const stats = exists && fs.statSync(src);
        const isDirectory = exists && stats.isDirectory();
        
        if (isDirectory) {
          fs.mkdirSync(dest, { recursive: true });
          fs.readdirSync(src).forEach(childItemName => {
            copyRecursive(
              path.join(src, childItemName),
              path.join(dest, childItemName)
            );
          });
        } else {
          fs.copyFileSync(src, dest);
        }
      };
      
      try {
        copyRecursive(extractedDir, CONFIG.installDir);
        log('Update bestanden gekopieerd.');
      } catch (copyError) {
        log(`Fout bij het kopiëren van bestanden: ${copyError.message}`, 'ERROR');
        throw copyError;
      }
      
      // Installeer dependencies
      log('Installeren van dependencies...');
      
      await new Promise((resolve, reject) => {
        const npmInstall = spawn('npm', ['install', '--production'], {
          cwd: CONFIG.installDir,
          stdio: 'pipe'
        });
        
        npmInstall.stdout.on('data', (data) => {
          log(`npm install output: ${data}`);
        });
        
        npmInstall.stderr.on('data', (data) => {
          log(`npm install error: ${data}`, 'ERROR');
        });
        
        npmInstall.on('close', (code) => {
          if (code !== 0) {
            log(`npm install failed with code ${code}`, 'ERROR');
            reject(new Error(`npm install failed with code ${code}`));
          } else {
            log('Dependencies succesvol geïnstalleerd.');
            resolve();
          }
        });
      });
      
      // Cleanup
      log('Opruimen tijdelijke bestanden...');
      fs.rmdirSync(tempDir, { recursive: true });
      
      // Herstart de service indien nodig
      if (CONFIG.autoRestart) {
        log('Herstarten van de service...');
        // Implementeer hier de herstart van de service
        // Dit hangt af van hoe de agent is gestart
      }
      
      log(`Update naar versie ${updateInfo.version} succesvol!`);
      
      return { 
        success: true, 
        updated: true, 
        version: updateInfo.version,
        previousVersion: updateInfo.currentVersion
      };
      
    } catch (error) {
      log(`Fout tijdens update: ${error.message}`, 'ERROR');
      
      // Probeer terug te zetten vanuit backup
      log('Proberen te herstellen vanuit backup...');
      const restored = await restoreFromBackup(backupDir);
      
      if (restored) {
        log('Herstel vanuit backup succesvol.');
      } else {
        log('Herstel vanuit backup mislukt.', 'ERROR');
      }
      
      throw error;
    }
  } catch (error) {
    log(`Update mislukt: ${error.message}`, 'ERROR');
    return { 
      success: false, 
      error: error.message 
    };
  }
}

// Functie om te bepalen of update verplicht is
function isUpdateMandatory(updateInfo) {
  if (!updateInfo || !updateInfo.hasUpdate) {
    return false;
  }
  
  // Controleer of update kritiek is
  if (updateInfo.mandatory) {
    return true;
  }
  
  // Controleer of de laatste update langer geleden is dan forcedUpdateDays
  try {
    const lastUpdateFile = path.join(CONFIG.installDir, '.last_update');
    
    if (!fs.existsSync(lastUpdateFile)) {
      // Als er geen record is van de laatste update, beschouw het als verplicht
      return true;
    }
    
    const lastUpdateTime = new Date(fs.readFileSync(lastUpdateFile, 'utf8'));
    const now = new Date();
    
    // Bereken tijdsverschil in dagen
    const diffDays = (now - lastUpdateTime) / (1000 * 60 * 60 * 24);
    
    return diffDays >= CONFIG.forcedUpdateDays;
  } catch (error) {
    log(`Fout bij het controleren van verplichte update: ${error.message}`, 'ERROR');
    return false;
  }
}

// Update laatst uitgevoerde update timestamp
function updateLastUpdateTime() {
  try {
    const lastUpdateFile = path.join(CONFIG.installDir, '.last_update');
    fs.writeFileSync(lastUpdateFile, new Date().toISOString());
  } catch (error) {
    log(`Fout bij het bijwerken van update timestamp: ${error.message}`, 'ERROR');
  }
}

// Hoofdfunctie
async function main() {
  log('CyberShieldX auto-update proces gestart.');
  
  try {
    // Zorg dat de nodige mappen bestaan
    if (!fs.existsSync(CONFIG.installDir)) {
      log(`Installatiemap ${CONFIG.installDir} bestaat niet.`, 'ERROR');
      return { success: false, error: 'Installatiemap bestaat niet' };
    }
    
    // Controleer op updates
    const updateInfo = await checkForUpdates();
    
    if (!updateInfo.hasUpdate) {
      return { success: true, updated: false };
    }
    
    // Bepaal of update verplicht is
    const mandatory = isUpdateMandatory(updateInfo);
    
    // Als update niet verplicht is en we zijn in automatische modus,
    // dan alleen updaten volgens de geplande routine
    if (!mandatory && process.argv.includes('--scheduled')) {
      log('Niet-verplichte update beschikbaar, maar wordt overgeslagen in scheduled modus.');
      return { success: true, updated: false, updateAvailable: true };
    }
    
    // Voer update uit
    const result = await performUpdate();
    
    if (result.success && result.updated) {
      updateLastUpdateTime();
    }
    
    return result;
  } catch (error) {
    log(`Onverwachte fout: ${error.message}`, 'ERROR');
    return { success: false, error: error.message };
  }
}

// Controleer of script direct wordt uitgevoerd
if (require.main === module) {
  main().then((result) => {
    if (!result.success) {
      log(`Update proces eindigde met fout: ${result.error}`, 'ERROR');
      process.exit(1);
    } else if (result.updated) {
      log(`Update succesvol uitgevoerd naar versie ${result.version}`);
      process.exit(0);
    } else {
      log('Geen update uitgevoerd.');
      process.exit(0);
    }
  }).catch((error) => {
    log(`Fatale fout in update proces: ${error.message}`, 'ERROR');
    process.exit(1);
  });
}

// Exporteer functies voor gebruik in de client-agent
module.exports = {
  checkForUpdates,
  performUpdate,
  getCurrentVersion,
  isUpdateMandatory
};