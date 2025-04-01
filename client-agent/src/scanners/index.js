/**
 * Scanner module for the CyberShieldX agent
 * Provides different types of security scans
 */

const networkScanner = require('./network-scanner');
const systemScanner = require('./system-scanner');
const vulnScanner = require('./vulnerability-scanner');
const malwareScanner = require('./malware-scanner');
const winston = require('winston');

// Get logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'scanner-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'scanner.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

/**
 * Run a quick scan of the system
 * This is a lightweight scan that runs quickly
 */
async function quickScan() {
  logger.info('Starting quick scan');
  
  const results = {
    timestamp: new Date().toISOString(),
    scanType: 'quick',
    system: {},
    network: {}
  };
  
  try {
    // Get basic system info
    results.system = await systemScanner.getBasicInfo();
    
    // Run quick network port scan (common ports only)
    results.network = await networkScanner.quickScan();
    
    return results;
  } catch (error) {
    logger.error(`Quick scan failed: ${error.message}`);
    throw error;
  }
}

/**
 * Run a more comprehensive system scan
 * This scan focuses on the local system
 */
async function systemScan() {
  logger.info('Starting system scan');
  
  const results = {
    timestamp: new Date().toISOString(),
    scanType: 'system',
    system: {},
    vulnerabilities: {},
    malware: {},
    config: {}
  };
  
  try {
    // Get detailed system info
    results.system = await systemScanner.getDetailedInfo();
    
    // Check system configuration
    results.config = await systemScanner.checkConfiguration();
    
    // Scan for local vulnerabilities
    results.vulnerabilities = await vulnScanner.scanLocalSystem();
    
    // Scan for malware
    results.malware = await malwareScanner.quickScan();
    
    return results;
  } catch (error) {
    logger.error(`System scan failed: ${error.message}`);
    throw error;
  }
}

/**
 * Run a network-focused scan
 * This scan focuses on the network environment
 */
async function networkScan() {
  logger.info('Starting network scan');
  
  const results = {
    timestamp: new Date().toISOString(),
    scanType: 'network',
    devices: [],
    services: {},
    vulnerabilities: {},
    firewall: {}
  };
  
  try {
    // Discover network devices
    results.devices = await networkScanner.discoverDevices();
    
    // Scan for open services
    results.services = await networkScanner.scanServices();
    
    // Check firewall configuration
    results.firewall = await networkScanner.checkFirewall();
    
    // Scan for network vulnerabilities
    results.vulnerabilities = await vulnScanner.scanNetwork();
    
    return results;
  } catch (error) {
    logger.error(`Network scan failed: ${error.message}`);
    throw error;
  }
}

/**
 * Run a full comprehensive security scan
 * This is the most thorough scan and will take the longest
 */
async function fullScan() {
  logger.info('Starting full security scan');
  
  const results = {
    timestamp: new Date().toISOString(),
    scanType: 'full',
    system: {},
    network: {
      devices: [],
      services: {}
    },
    vulnerabilities: {
      system: {},
      network: {}
    },
    malware: {},
    config: {},
    firewall: {}
  };
  
  try {
    // Get detailed system info
    results.system = await systemScanner.getDetailedInfo();
    
    // Run full network scan
    results.network.devices = await networkScanner.discoverDevices();
    results.network.services = await networkScanner.scanServices(true); // true = deep scan
    
    // Check system configuration
    results.config = await systemScanner.checkConfiguration();
    
    // Check firewall configuration
    results.firewall = await networkScanner.checkFirewall();
    
    // Scan for local vulnerabilities
    results.vulnerabilities.system = await vulnScanner.scanLocalSystem(true); // true = thorough
    
    // Scan for network vulnerabilities
    results.vulnerabilities.network = await vulnScanner.scanNetwork(true); // true = thorough
    
    // Scan for malware
    results.malware = await malwareScanner.fullScan();
    
    return results;
  } catch (error) {
    logger.error(`Full scan failed: ${error.message}`);
    throw error;
  }
}

// Export scanner functions
module.exports = {
  quickScan,
  systemScan,
  networkScan,
  fullScan
};