/**
 * Configuration management module for the CyberShieldX agent
 * Handles persistent configuration storage across agent restarts
 */

const Conf = require('conf');
const path = require('path');
const os = require('os');

// Create config directory in user's home directory
const configDir = path.join(os.homedir(), '.cybershieldx');

// Create config store
const config = new Conf({
  cwd: configDir,
  encryptionKey: 'cybershieldx-secure-storage', // Basic encryption
  projectName: 'cybershieldx-agent',
  fileExtension: 'data',
  clearInvalidConfig: true,
  defaults: {
    // Default configuration values
    serverUrl: 'wss://api.cybershieldx.com',
    scanInterval: '0 */6 * * *', // Every 6 hours
    autoUpdate: true,
    installDir: process.cwd(),
    telemetryEnabled: true,
    // Dynamic values (will be set during runtime)
    agentId: null,
    clientId: null,
    serverToken: null,
    localApiToken: null,
    setupComplete: false,
    lastScan: null,
    systemInfo: null
  }
});

/**
 * Get configuration value
 * @param {string} key - Configuration key
 * @param {any} defaultValue - Default value if not found
 * @returns {any} Configuration value
 */
function get(key, defaultValue = null) {
  return config.get(key, defaultValue);
}

/**
 * Set configuration value
 * @param {string} key - Configuration key
 * @param {any} value - Value to set
 */
function set(key, value) {
  config.set(key, value);
}

/**
 * Delete configuration value
 * @param {string} key - Configuration key to delete
 */
function deleteKey(key) {
  config.delete(key);
}

/**
 * Get all configuration values
 * @returns {Object} All configuration values
 */
function getAll() {
  return config.store;
}

/**
 * Reset configuration to defaults
 */
function resetToDefaults() {
  config.clear();
  return config.store;
}

module.exports = {
  get,
  set,
  delete: deleteKey, // Export as delete for convenience
  getAll,
  resetToDefaults
};