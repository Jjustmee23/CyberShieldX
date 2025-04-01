/**
 * Auto-update module for CyberShieldX agent
 * Handles checking for updates and performing updates with minimal disruption
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync, spawn } = require('child_process');
const os = require('os');

// Configuration
const config = {
  // Default repository for updates
  updateRepo: 'https://github.com/Jjustmee23/CyberShieldX',
  // Branch to use for updates
  branch: 'main',
  // Directory for storing update files
  updateDir: path.join(process.env.HOME || os.homedir(), '.cybershieldx', 'updates'),
  // Log file for update process
  logFile: path.join(process.env.HOME || os.homedir(), '.cybershieldx', 'logs', 'update.log'),
  // Current version file
  versionFile: path.join(process.env.HOME || os.homedir(), '.cybershieldx', 'version')
};

// Load configuration from environment or config file
function loadConfig() {
  try {
    // Check if we have a custom config file
    const configPath = path.join(process.env.HOME || os.homedir(), '.cybershieldx', 'config.json');
    if (fs.existsSync(configPath)) {
      const userConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      
      // Update configuration with user values
      config.updateRepo = userConfig.updateRepo || config.updateRepo;
      config.branch = userConfig.branch || config.branch;
      
      if (userConfig.serverUrl) {
        // Use server URL as update source
        config.serverUrl = userConfig.serverUrl;
      }
    }
    
    // Ensure update directory exists
    if (!fs.existsSync(config.updateDir)) {
      fs.mkdirSync(config.updateDir, { recursive: true });
    }
    
    // Ensure log directory exists
    const logDir = path.dirname(config.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    return true;
  } catch (error) {
    console.error('Error loading update configuration:', error);
    return false;
  }
}

// Get current agent version
function getCurrentVersion() {
  try {
    if (fs.existsSync(config.versionFile)) {
      return fs.readFileSync(config.versionFile, 'utf8').trim();
    }
    
    // If version file doesn't exist, try package.json
    const packagePath = path.join(__dirname, '..', 'package.json');
    if (fs.existsSync(packagePath)) {
      const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      return pkg.version || '0.0.0';
    }
    
    return '0.0.0';
  } catch (error) {
    console.error('Error getting current version:', error);
    return '0.0.0';
  }
}

// Get latest version from server
async function getLatestVersion() {
  return new Promise((resolve, reject) => {
    let url;
    
    if (config.serverUrl) {
      // Check version from server API
      url = `${config.serverUrl}/api/agent/version`;
    } else {
      // Fall back to GitHub API
      url = `https://api.github.com/repos/${config.updateRepo.split('/').slice(-2).join('/')}/releases/latest`;
    }
    
    https.get(url, {
      headers: {
        'User-Agent': 'CyberShieldX-Agent'
      }
    }, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          if (res.statusCode !== 200) {
            reject(new Error(`HTTP error: ${res.statusCode}`));
            return;
          }
          
          const response = JSON.parse(data);
          
          if (config.serverUrl) {
            // Server API format
            resolve(response.version);
          } else {
            // GitHub API format
            resolve(response.tag_name.replace(/^v/, ''));
          }
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', reject);
  });
}

// Compare versions (semver)
function isNewerVersion(current, latest) {
  if (!current || !latest) return false;
  
  const currentParts = current.split('.').map(Number);
  const latestParts = latest.split('.').map(Number);
  
  for (let i = 0; i < 3; i++) {
    if (latestParts[i] > currentParts[i]) return true;
    if (latestParts[i] < currentParts[i]) return false;
  }
  
  return false;
}

// Log update process
function logUpdate(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  
  console.log(message);
  
  try {
    fs.appendFileSync(config.logFile, logMessage);
  } catch (error) {
    console.error('Error writing to log file:', error);
  }
}

// Download and apply update
async function applyUpdate(version) {
  // Create a temporary directory for the update
  const tempDir = path.join(config.updateDir, `update-${version}`);
  
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  logUpdate(`Starting update to version ${version}`);
  
  try {
    // Backup current installation
    logUpdate('Backing up current installation...');
    const backupDir = path.join(config.updateDir, 'backup');
    if (fs.existsSync(backupDir)) {
      fs.rmSync(backupDir, { recursive: true, force: true });
    }
    fs.mkdirSync(backupDir, { recursive: true });
    
    // Copy important files to backup
    const installDir = path.join(__dirname, '..');
    const filesToBackup = ['config', 'data', '.env'];
    
    for (const file of filesToBackup) {
      const sourcePath = path.join(installDir, file);
      const destPath = path.join(backupDir, file);
      
      if (fs.existsSync(sourcePath)) {
        if (fs.statSync(sourcePath).isDirectory()) {
          // Copy directory recursively
          execSync(`cp -r "${sourcePath}" "${destPath}"`);
        } else {
          // Copy file
          fs.copyFileSync(sourcePath, destPath);
        }
      }
    }
    
    // Download the update
    let downloadSuccess = false;
    
    if (config.serverUrl) {
      // Download from server API
      logUpdate(`Downloading update from server: ${version}`);
      downloadSuccess = await downloadFromServer(version, tempDir);
    } else {
      // Download from GitHub
      logUpdate(`Downloading update from GitHub: ${version}`);
      downloadSuccess = await downloadFromGitHub(version, tempDir);
    }
    
    if (!downloadSuccess) {
      throw new Error('Failed to download update');
    }
    
    // Install the update
    logUpdate('Installing update...');
    const updateSuccess = await installUpdate(tempDir, installDir, backupDir);
    
    if (!updateSuccess) {
      throw new Error('Failed to install update');
    }
    
    // Update version file
    fs.writeFileSync(config.versionFile, version);
    logUpdate(`Successfully updated to version ${version}`);
    
    // Clean up
    logUpdate('Cleaning up...');
    fs.rmSync(tempDir, { recursive: true, force: true });
    
    return true;
  } catch (error) {
    logUpdate(`Error applying update: ${error.message}`);
    
    // Attempt to restore from backup
    logUpdate('Attempting to restore from backup...');
    
    try {
      const backupDir = path.join(config.updateDir, 'backup');
      const installDir = path.join(__dirname, '..');
      
      if (fs.existsSync(backupDir)) {
        // Restore important files
        const filesToRestore = ['config', 'data', '.env'];
        
        for (const file of filesToRestore) {
          const sourcePath = path.join(backupDir, file);
          const destPath = path.join(installDir, file);
          
          if (fs.existsSync(sourcePath)) {
            if (fs.statSync(sourcePath).isDirectory()) {
              // Copy directory recursively
              execSync(`cp -r "${sourcePath}" "${destPath}"`);
            } else {
              // Copy file
              fs.copyFileSync(sourcePath, destPath);
            }
          }
        }
        
        logUpdate('Restore complete');
      } else {
        logUpdate('No backup found, cannot restore');
      }
    } catch (restoreError) {
      logUpdate(`Error restoring from backup: ${restoreError.message}`);
    }
    
    return false;
  }
}

// Download update from server
async function downloadFromServer(version, tempDir) {
  return new Promise((resolve) => {
    try {
      const url = `${config.serverUrl}/api/downloads/agent/${version}.zip`;
      const zipPath = path.join(tempDir, 'update.zip');
      
      logUpdate(`Downloading from: ${url}`);
      
      const file = fs.createWriteStream(zipPath);
      
      https.get(url, (response) => {
        if (response.statusCode !== 200) {
          logUpdate(`Download failed with status: ${response.statusCode}`);
          resolve(false);
          return;
        }
        
        response.pipe(file);
        
        file.on('finish', () => {
          file.close();
          
          // Extract the zip file
          logUpdate('Extracting update...');
          
          try {
            // Use unzip if available, otherwise use Node.js unzip
            execSync(`unzip -o "${zipPath}" -d "${tempDir}"`);
            
            logUpdate('Download and extraction complete');
            resolve(true);
          } catch (error) {
            logUpdate(`Error extracting update: ${error.message}`);
            resolve(false);
          }
        });
      }).on('error', (err) => {
        fs.unlinkSync(zipPath);
        logUpdate(`Download error: ${err.message}`);
        resolve(false);
      });
    } catch (error) {
      logUpdate(`Download error: ${error.message}`);
      resolve(false);
    }
  });
}

// Download update from GitHub
async function downloadFromGitHub(version, tempDir) {
  return new Promise((resolve) => {
    try {
      const repoPath = config.updateRepo.split('/').slice(-2).join('/');
      const url = `https://github.com/${repoPath}/archive/refs/tags/v${version}.zip`;
      const zipPath = path.join(tempDir, 'update.zip');
      
      logUpdate(`Downloading from: ${url}`);
      
      const file = fs.createWriteStream(zipPath);
      
      https.get(url, (response) => {
        if (response.statusCode !== 200) {
          logUpdate(`Download failed with status: ${response.statusCode}`);
          resolve(false);
          return;
        }
        
        response.pipe(file);
        
        file.on('finish', () => {
          file.close();
          
          // Extract the zip file
          logUpdate('Extracting update...');
          
          try {
            // Use unzip if available, otherwise use Node.js unzip
            execSync(`unzip -o "${zipPath}" -d "${tempDir}"`);
            
            logUpdate('Download and extraction complete');
            resolve(true);
          } catch (error) {
            logUpdate(`Error extracting update: ${error.message}`);
            resolve(false);
          }
        });
      }).on('error', (err) => {
        fs.unlinkSync(zipPath);
        logUpdate(`Download error: ${err.message}`);
        resolve(false);
      });
    } catch (error) {
      logUpdate(`Download error: ${error.message}`);
      resolve(false);
    }
  });
}

// Install the downloaded update
async function installUpdate(tempDir, installDir, backupDir) {
  try {
    // Find the extracted update directory
    const files = fs.readdirSync(tempDir);
    let updateSourceDir = tempDir;
    
    // Look for the extracted folder
    for (const file of files) {
      const filePath = path.join(tempDir, file);
      if (fs.statSync(filePath).isDirectory() && file.includes('CyberShieldX')) {
        updateSourceDir = filePath;
        break;
      }
    }
    
    // Check for client-agent directory
    let sourceAgentDir = path.join(updateSourceDir, 'client-agent');
    if (!fs.existsSync(sourceAgentDir)) {
      sourceAgentDir = updateSourceDir;
    }
    
    if (!fs.existsSync(sourceAgentDir)) {
      logUpdate('Could not find client-agent directory in the update package');
      return false;
    }
    
    // Copy files from update to installation directory
    logUpdate('Copying new files...');
    
    const filesToCopy = ['src', 'package.json', 'package-lock.json'];
    
    for (const file of filesToCopy) {
      const sourcePath = path.join(sourceAgentDir, file);
      const destPath = path.join(installDir, file);
      
      if (fs.existsSync(sourcePath)) {
        if (fs.statSync(sourcePath).isDirectory()) {
          // Remove existing directory
          if (fs.existsSync(destPath)) {
            fs.rmSync(destPath, { recursive: true, force: true });
          }
          
          // Copy directory recursively
          execSync(`cp -r "${sourcePath}" "${destPath}"`);
        } else {
          // Copy file
          fs.copyFileSync(sourcePath, destPath);
        }
      }
    }
    
    // Restore config and data from backup
    logUpdate('Restoring configuration...');
    const filesToRestore = ['config', 'data', '.env'];
    
    for (const file of filesToRestore) {
      const sourcePath = path.join(backupDir, file);
      const destPath = path.join(installDir, file);
      
      if (fs.existsSync(sourcePath)) {
        if (fs.statSync(sourcePath).isDirectory()) {
          // Copy directory recursively, but don't overwrite
          execSync(`cp -rn "${sourcePath}" "${destPath}"`);
        } else {
          // Don't overwrite existing file
          if (!fs.existsSync(destPath)) {
            fs.copyFileSync(sourcePath, destPath);
          }
        }
      }
    }
    
    // Install dependencies
    logUpdate('Installing dependencies...');
    execSync('npm ci', { cwd: installDir, stdio: 'ignore' });
    
    return true;
  } catch (error) {
    logUpdate(`Error installing update: ${error.message}`);
    return false;
  }
}

// Check for updates
async function checkForUpdates(force = false) {
  if (!loadConfig()) {
    return { updateAvailable: false, updateFailed: true, error: 'Failed to load configuration' };
  }
  
  try {
    logUpdate('Checking for updates...');
    
    const currentVersion = getCurrentVersion();
    logUpdate(`Current version: ${currentVersion}`);
    
    const latestVersion = await getLatestVersion();
    logUpdate(`Latest version: ${latestVersion}`);
    
    if (isNewerVersion(currentVersion, latestVersion) || force) {
      logUpdate('Update available');
      
      return {
        updateAvailable: true,
        currentVersion,
        latestVersion
      };
    } else {
      logUpdate('No update available');
      
      return {
        updateAvailable: false,
        currentVersion,
        latestVersion
      };
    }
  } catch (error) {
    logUpdate(`Error checking for updates: ${error.message}`);
    
    return {
      updateAvailable: false,
      updateFailed: true,
      error: error.message
    };
  }
}

// Perform update process
async function performUpdate(force = false) {
  const updateCheck = await checkForUpdates(force);
  
  if (updateCheck.updateAvailable) {
    logUpdate(`Starting update from ${updateCheck.currentVersion} to ${updateCheck.latestVersion}`);
    
    const updateSuccess = await applyUpdate(updateCheck.latestVersion);
    
    if (updateSuccess) {
      logUpdate('Update completed successfully');
      
      // Restart the agent
      logUpdate('Restarting agent...');
      
      // In a real implementation, this would restart the agent service
      // For now, we'll just simulate it
      setTimeout(() => {
        try {
          const installDir = path.join(__dirname, '..');
          const args = process.argv.slice(2);
          
          // Spawn a new process with the same arguments
          const child = spawn(process.execPath, [path.join(installDir, 'src', 'index.js'), ...args], {
            detached: true,
            stdio: 'ignore'
          });
          
          child.unref();
          
          // Exit the current process
          process.exit(0);
        } catch (error) {
          logUpdate(`Error restarting agent: ${error.message}`);
        }
      }, 1000);
      
      return {
        success: true,
        previousVersion: updateCheck.currentVersion,
        newVersion: updateCheck.latestVersion
      };
    } else {
      logUpdate('Update failed');
      
      return {
        success: false,
        error: 'Failed to apply update'
      };
    }
  } else if (updateCheck.updateFailed) {
    return {
      success: false,
      error: updateCheck.error
    };
  } else {
    return {
      success: true,
      message: 'No update available'
    };
  }
}

module.exports = {
  checkForUpdates,
  performUpdate,
  getCurrentVersion
};