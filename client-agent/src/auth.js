/**
 * Authentication module for CyberShieldX agent
 * Handles secure authentication with the main server
 */

const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const winston = require('winston');
const config = require('./utils/config');

// Setup logging
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'auth-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'auth.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

/**
 * Generate or retrieve authentication token
 * @returns {string} Authentication token
 */
async function getAuthToken() {
  try {
    // Check if we already have a token
    const token = config.get('serverToken');
    
    if (token) {
      logger.debug('Using existing authentication token');
      return token;
    }
    
    // If no token, generate a new device token that will be registered with the server
    logger.info('No authentication token found, generating a new one');
    
    const deviceToken = generateDeviceToken();
    
    // Save the token for future use
    config.set('tempDeviceToken', deviceToken);
    
    logger.debug('Generated temporary device token for initial authentication');
    
    return deviceToken;
  } catch (error) {
    logger.error(`Failed to get authentication token: ${error.message}`);
    throw error;
  }
}

/**
 * Generate a device token using hardware info
 * @returns {string} Generated device token
 */
function generateDeviceToken() {
  try {
    // Get hardware identifiers
    const hostname = os.hostname();
    const cpuInfo = JSON.stringify(os.cpus()[0]);
    const totalMem = os.totalmem().toString();
    const macAddress = getMacAddress();
    
    // Combine the information with a timestamp and agent ID
    const agentId = config.get('agentId');
    const timestamp = Date.now().toString();
    
    // Create a unique string based on hardware info
    const uniqueString = `${agentId}-${hostname}-${macAddress}-${cpuInfo}-${totalMem}-${timestamp}`;
    
    // Hash the string to create a device token
    const hash = crypto.createHash('sha256').update(uniqueString).digest('hex');
    
    return hash;
  } catch (error) {
    logger.error(`Failed to generate device token: ${error.message}`);
    
    // Fallback to a simpler token generation
    const fallbackString = `${os.hostname()}-${Date.now()}-${Math.random()}`;
    return crypto.createHash('sha256').update(fallbackString).digest('hex');
  }
}

/**
 * Get MAC address for the main network interface
 * @returns {string} MAC address or empty string if not found
 */
function getMacAddress() {
  try {
    const interfaces = os.networkInterfaces();
    
    // Find the first non-internal interface with IPv4 address
    for (const name of Object.keys(interfaces)) {
      const iface = interfaces[name];
      
      for (const addr of iface) {
        if (!addr.internal && addr.family === 'IPv4' && addr.mac) {
          return addr.mac;
        }
      }
    }
    
    return '';
  } catch (error) {
    logger.error(`Failed to get MAC address: ${error.message}`);
    return '';
  }
}

/**
 * Save a permanent authentication token received from the server
 * @param {string} token - Token from server
 * @returns {boolean} Success status
 */
function saveAuthToken(token) {
  try {
    logger.info('Saving authentication token');
    
    if (!token) {
      throw new Error('No token provided');
    }
    
    // Save the token in the config
    config.set('serverToken', token);
    
    // Clear temporary device token if it exists
    if (config.get('tempDeviceToken')) {
      config.delete('tempDeviceToken');
    }
    
    logger.info('Authentication token saved successfully');
    return true;
  } catch (error) {
    logger.error(`Failed to save authentication token: ${error.message}`);
    return false;
  }
}

/**
 * Verify if a token is valid (not expired)
 * @param {string} token - Token to verify
 * @returns {boolean} Is token valid
 */
function verifyToken(token) {
  try {
    // In a real implementation, this would verify if the token has expired or is revoked
    // For now, we'll just check if it exists
    
    if (!token) {
      logger.warn('No token provided for verification');
      return false;
    }
    
    // Simple validation - check if token has correct format
    // In a real implementation, this would perform JWT validation or similar
    if (token.length < 32) {
      logger.warn('Token has invalid format');
      return false;
    }
    
    logger.debug('Token verified');
    return true;
  } catch (error) {
    logger.error(`Failed to verify token: ${error.message}`);
    return false;
  }
}

/**
 * Clear authentication token (logout)
 * @returns {boolean} Success status
 */
function clearToken() {
  try {
    logger.info('Clearing authentication token');
    
    // Remove the token from config
    if (config.get('serverToken')) {
      config.delete('serverToken');
    }
    
    if (config.get('tempDeviceToken')) {
      config.delete('tempDeviceToken');
    }
    
    logger.info('Authentication token cleared successfully');
    return true;
  } catch (error) {
    logger.error(`Failed to clear authentication token: ${error.message}`);
    return false;
  }
}

module.exports = {
  getAuthToken,
  saveAuthToken,
  verifyToken,
  clearToken
};