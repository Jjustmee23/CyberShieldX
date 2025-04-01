/**
 * Self-update module for CyberShieldX agent
 * Enables the agent to update itself to new versions
 */

const { promisify } = require('util');
const exec = promisify(require('child_process').exec);
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const winston = require('winston');
const axios = require('axios');
const config = require('./utils/config');

// Platform detection
const isWindows = process.platform === 'win32';
const isMac = process.platform === 'darwin';
const isLinux = process.platform === 'linux';

// Setup logging
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'updater-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'updater.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

/**
 * Check for updates
 * @returns {Object} Update information
 */
async function checkForUpdate() {
  try {
    logger.info('Checking for updates');
    
    // Get current version from package.json
    const currentVersion = require('../package.json').version;
    logger.debug(`Current version: ${currentVersion}`);
    
    // Get update URL from config or use default
    const updateUrl = config.get('updateUrl') || 'https://api.cybershieldx.com/agent/updates';
    
    // Check if auto-updates are enabled
    const autoUpdateEnabled = config.get('autoUpdate') !== false;
    if (!autoUpdateEnabled) {
      logger.info('Auto-updates are disabled');
      return {
        currentVersion,
        available: false,
        autoUpdateEnabled: false
      };
    }
    
    // Get update info from server
    const updateInfo = await getUpdateInfo(updateUrl, currentVersion);
    
    if (updateInfo.available) {
      logger.info(`Update available: ${updateInfo.version}`);
    } else {
      logger.info('No updates available');
    }
    
    return {
      currentVersion,
      ...updateInfo,
      autoUpdateEnabled
    };
  } catch (error) {
    logger.error(`Failed to check for updates: ${error.message}`);
    return {
      currentVersion: require('../package.json').version,
      available: false,
      error: error.message
    };
  }
}

/**
 * Get update information from the server
 */
async function getUpdateInfo(updateUrl, currentVersion) {
  try {
    // Get agent ID and token for authentication
    const agentId = config.get('agentId');
    const serverToken = config.get('serverToken');
    
    if (!agentId) {
      throw new Error('Agent ID not found');
    }
    
    // Platform-specific update channel
    const platform = process.platform;
    const arch = process.arch;
    
    // Make API request to update server
    const response = await axios({
      method: 'GET',
      url: `${updateUrl}?version=${currentVersion}&platform=${platform}&arch=${arch}`,
      headers: {
        'Authorization': serverToken ? `Bearer ${serverToken}` : undefined,
        'X-Agent-Id': agentId,
        'User-Agent': `CyberShieldX-Agent/${currentVersion} (${platform}; ${arch})`
      },
      timeout: 10000 // 10 second timeout
    });
    
    if (response.status === 200 && response.data) {
      return {
        available: response.data.updateAvailable || false,
        version: response.data.latestVersion || currentVersion,
        url: response.data.downloadUrl,
        changelog: response.data.changelog,
        releaseDate: response.data.releaseDate,
        mandatory: response.data.mandatory || false
      };
    } else {
      logger.warn('Received invalid response from update server');
      return { available: false };
    }
  } catch (error) {
    // If server is unreachable, we'll simulate no updates available
    // In a real implementation, this would connect to an actual update server
    logger.warn(`Could not reach update server: ${error.message}`);
    
    // For development/demo purposes, we'll return no updates available
    return { 
      available: false,
      error: error.message
    };
  }
}

/**
 * Update the agent to the latest version
 * @param {string} targetVersion - Specific version to update to (optional)
 * @returns {Object} Update result
 */
async function update(targetVersion = null) {
  try {
    logger.info(`Starting update${targetVersion ? ` to version ${targetVersion}` : ''}`);
    
    // Check for updates first
    const updateInfo = await checkForUpdate();
    
    // If no updates are available and no specific version requested
    if (!updateInfo.available && !targetVersion) {
      logger.info('No updates available');
      return {
        success: false,
        message: 'No updates available'
      };
    }
    
    // Get download URL
    const downloadUrl = updateInfo.url;
    
    if (!downloadUrl) {
      logger.error('No download URL provided for update');
      return {
        success: false,
        message: 'No download URL provided'
      };
    }
    
    // Create a backup of the current installation
    await createBackup();
    
    // Download and install the update
    const installed = await downloadAndInstall(downloadUrl, updateInfo.version);
    
    if (installed) {
      // Update configuration with new version
      config.set('lastUpdateCheck', new Date().toISOString());
      
      return {
        success: true,
        version: updateInfo.version,
        message: `Successfully updated to version ${updateInfo.version}`
      };
    } else {
      throw new Error('Failed to install update');
    }
  } catch (error) {
    logger.error(`Update failed: ${error.message}`);
    
    // Try to restore from backup if update failed
    try {
      await restoreFromBackup();
      logger.info('Restored from backup after failed update');
    } catch (restoreError) {
      logger.error(`Failed to restore from backup: ${restoreError.message}`);
    }
    
    return {
      success: false,
      message: `Update failed: ${error.message}`
    };
  }
}

/**
 * Create a backup of the current installation
 */
async function createBackup() {
  try {
    logger.info('Creating backup of current installation');
    
    const installDir = config.get('installDir') || process.cwd();
    const backupDir = path.join(os.homedir(), '.cybershieldx', 'backups');
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const backupPath = path.join(backupDir, `backup-${timestamp}`);
    
    // Create backup directory if it doesn't exist
    await fs.mkdir(backupDir, { recursive: true });
    await fs.mkdir(backupPath, { recursive: true });
    
    // Create a list of files to backup (excluding node_modules, etc.)
    const filesToBackup = [
      'package.json',
      'src'
    ];
    
    // Copy each file/directory to the backup
    for (const file of filesToBackup) {
      const sourcePath = path.join(installDir, file);
      const destPath = path.join(backupPath, file);
      
      try {
        // Check if the source exists
        await fs.access(sourcePath);
        
        // Get source file stats
        const stats = await fs.stat(sourcePath);
        
        if (stats.isDirectory()) {
          // For directories, use copy command appropriate for the platform
          if (isWindows) {
            await exec(`xcopy "${sourcePath}" "${destPath}" /E /I /H /Y`);
          } else {
            await exec(`cp -R "${sourcePath}" "${destPath}"`);
          }
        } else {
          // For regular files
          await fs.copyFile(sourcePath, destPath);
        }
      } catch (e) {
        logger.warn(`Could not backup ${file}: ${e.message}`);
      }
    }
    
    // Save the backup path for potential restore
    config.set('lastBackupPath', backupPath);
    
    logger.info(`Backup created at: ${backupPath}`);
    return backupPath;
  } catch (error) {
    logger.error(`Failed to create backup: ${error.message}`);
    throw error;
  }
}

/**
 * Download and install the update
 */
async function downloadAndInstall(downloadUrl, version) {
  try {
    logger.info(`Downloading update from: ${downloadUrl}`);
    
    const installDir = config.get('installDir') || process.cwd();
    const downloadDir = path.join(os.homedir(), '.cybershieldx', 'downloads');
    
    // Create download directory if it doesn't exist
    await fs.mkdir(downloadDir, { recursive: true });
    
    // Download file path
    const downloadFilePath = path.join(downloadDir, `update-${version}.zip`);
    
    // Download the update
    if (isWindows) {
      await exec(`powershell -Command "Invoke-WebRequest -Uri '${downloadUrl}' -OutFile '${downloadFilePath}'"`);
    } else {
      await exec(`curl -L "${downloadUrl}" -o "${downloadFilePath}"`);
    }
    
    logger.info('Download completed, extracting files');
    
    // Create a temporary directory for extraction
    const extractDir = path.join(downloadDir, `extract-${version}`);
    await fs.mkdir(extractDir, { recursive: true });
    
    // Extract the update
    if (isWindows) {
      await exec(`powershell -Command "Expand-Archive -Path '${downloadFilePath}' -DestinationPath '${extractDir}' -Force"`);
    } else {
      await exec(`unzip -o "${downloadFilePath}" -d "${extractDir}"`);
    }
    
    logger.info('Extraction completed, installing update');
    
    // Install the update by copying files to installation directory
    if (isWindows) {
      await exec(`xcopy "${extractDir}\\*" "${installDir}" /E /I /H /Y`);
    } else {
      await exec(`cp -R "${extractDir}/"* "${installDir}/"`);
    }
    
    // Clean up
    try {
      await fs.unlink(downloadFilePath);
      await fs.rmdir(extractDir, { recursive: true });
    } catch (e) {
      logger.warn(`Could not clean up temporary files: ${e.message}`);
    }
    
    logger.info(`Update to version ${version} installed successfully`);
    return true;
  } catch (error) {
    logger.error(`Failed to download and install update: ${error.message}`);
    throw error;
  }
}

/**
 * Restore from backup after failed update
 */
async function restoreFromBackup() {
  try {
    logger.info('Attempting to restore from backup');
    
    const installDir = config.get('installDir') || process.cwd();
    const backupPath = config.get('lastBackupPath');
    
    if (!backupPath) {
      throw new Error('No backup path found');
    }
    
    // Check if backup exists
    await fs.access(backupPath);
    
    // Copy backup files back to installation directory
    if (isWindows) {
      await exec(`xcopy "${backupPath}\\*" "${installDir}" /E /I /H /Y`);
    } else {
      await exec(`cp -R "${backupPath}/"* "${installDir}/"`);
    }
    
    logger.info('Restore from backup completed successfully');
    return true;
  } catch (error) {
    logger.error(`Failed to restore from backup: ${error.message}`);
    throw error;
  }
}

module.exports = {
  checkForUpdate,
  update
};