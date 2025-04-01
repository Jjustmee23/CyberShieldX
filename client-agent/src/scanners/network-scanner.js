/**
 * Network scanner module for CyberShieldX agent
 * Provides functionality for scanning networks and devices
 */

const { promisify } = require('util');
const exec = promisify(require('child_process').exec);
const os = require('os');
const nmap = require('node-nmap');
const winston = require('winston');
const si = require('systeminformation');

// Setup logging
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'network-scanner-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'network-scanner.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Platform-specific command detection
const isWindows = process.platform === 'win32';
const isMac = process.platform === 'darwin';
const isLinux = process.platform === 'linux';

/**
 * Get the local IP network range
 * @returns {string} Network range in CIDR notation
 */
async function getLocalNetworkRange() {
  const networkInterfaces = os.networkInterfaces();
  let ipAddress, networkMask;
  
  // Find active non-loopback interface
  Object.keys(networkInterfaces).forEach(interfaceName => {
    const interfaces = networkInterfaces[interfaceName];
    interfaces.forEach(interfaceData => {
      // Skip loopback and non-IPv4 addresses
      if (!interfaceData.internal && interfaceData.family === 'IPv4') {
        ipAddress = interfaceData.address;
        networkMask = interfaceData.netmask;
      }
    });
  });
  
  if (!ipAddress || !networkMask) {
    throw new Error('Could not determine local network address');
  }
  
  // Convert netmask to CIDR notation
  const cidr = calculateCIDR(networkMask);
  
  // Extract base network address
  const ipParts = ipAddress.split('.');
  const baseIP = `${ipParts[0]}.${ipParts[1]}.${ipParts[2]}.0`;
  
  return `${baseIP}/${cidr}`;
}

/**
 * Calculate CIDR prefix from netmask
 */
function calculateCIDR(netmask) {
  const parts = netmask.split('.');
  let binary = '';
  
  // Convert to binary string
  parts.forEach(part => {
    binary += parseInt(part).toString(2).padStart(8, '0');
  });
  
  // Count 1s
  return binary.split('1').length - 1;
}

/**
 * Run a quick network scan
 * @returns {Object} Results of the quick scan
 */
async function quickScan() {
  try {
    logger.info('Running quick network scan');
    
    // Get local network info
    const networkInterfaces = await si.networkInterfaces();
    const defaultGateway = await si.networkGatewayDefault();
    
    // Scan common ports on localhost
    const localScan = new nmap.QuickScan('127.0.0.1');
    
    return new Promise((resolve, reject) => {
      localScan.on('complete', data => {
        logger.info('Quick network scan completed');
        
        resolve({
          interfaces: networkInterfaces,
          defaultGateway,
          localPorts: data
        });
      });
      
      localScan.on('error', error => {
        logger.error(`Quick scan error: ${error}`);
        reject(error);
      });
      
      localScan.startScan();
    });
  } catch (error) {
    logger.error(`Network quick scan failed: ${error.message}`);
    
    // Fallback to basic info if nmap fails
    return {
      interfaces: await si.networkInterfaces(),
      defaultGateway: await si.networkGatewayDefault(),
      localPorts: [],
      error: error.message
    };
  }
}

/**
 * Discover devices on the local network
 * @returns {Array} Array of discovered devices
 */
async function discoverDevices() {
  try {
    logger.info('Discovering network devices');
    
    const networkRange = await getLocalNetworkRange();
    logger.info(`Scanning network range: ${networkRange}`);
    
    // Use nmap for device discovery
    const scan = new nmap.NmapScan(networkRange, '-sn');
    
    return new Promise((resolve, reject) => {
      scan.on('complete', async data => {
        try {
          logger.info(`Discovered ${data.length} devices on the network`);
          
          // Enhance with device info
          const enhancedData = await enhanceDeviceInfo(data);
          resolve(enhancedData);
        } catch (err) {
          reject(err);
        }
      });
      
      scan.on('error', error => {
        logger.error(`Device discovery error: ${error}`);
        reject(error);
      });
      
      scan.startScan();
    });
  } catch (error) {
    logger.error(`Device discovery failed: ${error.message}`);
    
    // Try alternative methods if nmap fails
    return discoverDevicesAlternative();
  }
}

/**
 * Alternative method for device discovery when nmap fails
 */
async function discoverDevicesAlternative() {
  logger.info('Using alternative device discovery method');
  
  try {
    const devices = [];
    const networkData = await si.networkConnections();
    const arpTable = await getARPTable();
    
    // Combine data
    devices.push(...arpTable);
    
    logger.info(`Discovered ${devices.length} devices using alternative method`);
    return devices;
  } catch (error) {
    logger.error(`Alternative device discovery failed: ${error.message}`);
    return [];
  }
}

/**
 * Get ARP table
 */
async function getARPTable() {
  try {
    let command = 'arp -a';
    
    const { stdout } = await exec(command);
    const devices = [];
    
    // Parse output based on platform
    if (isWindows) {
      // Windows format
      const lines = stdout.split('\n');
      for (const line of lines) {
        const match = line.match(/^\s*(\d+\.\d+\.\d+\.\d+)\s+([0-9a-f-]+)\s+/i);
        if (match) {
          devices.push({
            ip: match[1],
            mac: match[2].replace(/-/g, ':'),
            vendor: 'Unknown'
          });
        }
      }
    } else {
      // Linux/Mac format
      const lines = stdout.split('\n');
      for (const line of lines) {
        const match = line.match(/^\S+\s+\((\d+\.\d+\.\d+\.\d+)\)\s+at\s+([0-9a-f:]+)/i);
        if (match) {
          devices.push({
            ip: match[1],
            mac: match[2],
            vendor: 'Unknown'
          });
        }
      }
    }
    
    return devices;
  } catch (error) {
    logger.error(`Failed to get ARP table: ${error.message}`);
    return [];
  }
}

/**
 * Enhance device info with vendor and hostname data
 */
async function enhanceDeviceInfo(devices) {
  // Try to get hostnames for devices
  for (const device of devices) {
    try {
      if (device.ip) {
        // Try to get hostname
        const { stdout } = await exec(`nslookup ${device.ip}`);
        const nameMatch = stdout.match(/name\s*=\s*([^\s]+)/i);
        if (nameMatch) {
          device.hostname = nameMatch[1].replace(/\.$/, '');
        }
        
        // If MAC exists, try to get vendor info (simplified implementation)
        if (device.mac) {
          const prefix = device.mac.replace(/:/g, '').substring(0, 6).toUpperCase();
          // In a real implementation, we would look up this prefix in a MAC vendor database
          // For now, we'll just mark it as "Unknown Vendor"
          device.vendor = "Unknown Vendor";
        }
      }
    } catch (error) {
      logger.debug(`Could not enhance device ${device.ip}: ${error.message}`);
    }
  }
  
  return devices;
}

/**
 * Scan network services
 * @param {boolean} deepScan - Whether to perform a thorough scan
 * @returns {Object} Services found on the network
 */
async function scanServices(deepScan = false) {
  try {
    logger.info(`Scanning network services (deepScan: ${deepScan})`);
    
    const networkRange = await getLocalNetworkRange();
    const portOptions = deepScan ? '-sV -p 1-1000' : '-F'; // -F is fast scan (common ports)
    
    const scan = new nmap.NmapScan(networkRange, portOptions);
    
    return new Promise((resolve, reject) => {
      scan.on('complete', data => {
        logger.info('Network service scan completed');
        
        // Process services data
        const services = {};
        
        data.forEach(host => {
          if (host.ip) {
            services[host.ip] = {
              hostname: host.hostname || '',
              ports: host.openPorts || []
            };
          }
        });
        
        resolve({
          services,
          timestamp: new Date().toISOString()
        });
      });
      
      scan.on('error', error => {
        logger.error(`Service scan error: ${error}`);
        reject(error);
      });
      
      scan.startScan();
    });
  } catch (error) {
    logger.error(`Service scan failed: ${error.message}`);
    
    // Return empty results on failure
    return {
      services: {},
      timestamp: new Date().toISOString(),
      error: error.message
    };
  }
}

/**
 * Check firewall configuration
 * @returns {Object} Firewall status and configuration info
 */
async function checkFirewall() {
  try {
    logger.info('Checking firewall configuration');
    
    let firewallStatus = 'unknown';
    let firewallRules = [];
    let command = '';
    
    if (isWindows) {
      // Windows firewall
      command = 'netsh advfirewall show allprofiles';
      const { stdout } = await exec(command);
      
      // Parse state
      const stateMatch = stdout.match(/State\s+(ON|OFF)/i);
      firewallStatus = stateMatch ? stateMatch[1].toLowerCase() : 'unknown';
      
      // Get rules summary (just count in this simplified version)
      const rulesOutput = await exec('netsh advfirewall firewall show rule name=all | find "Rule Name"');
      firewallRules = rulesOutput.stdout.split('\n').filter(line => line.trim() !== '').length;
    } else if (isMac) {
      // macOS firewall
      command = '/usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate';
      const { stdout } = await exec(command);
      firewallStatus = stdout.includes('enabled') ? 'on' : 'off';
      
      // Get rules
      const rulesOutput = await exec('/usr/libexec/ApplicationFirewall/socketfilterfw --listapps');
      firewallRules = rulesOutput.stdout.split('\n').filter(line => line.includes('Allow')).length;
    } else if (isLinux) {
      // Linux firewall (iptables/ufw)
      try {
        // Try ufw first
        const { stdout } = await exec('ufw status');
        firewallStatus = stdout.includes('Status: active') ? 'on' : 'off';
        
        // Get rules count
        const ruleLines = stdout.split('\n').filter(line => line.includes('ALLOW') || line.includes('DENY'));
        firewallRules = ruleLines.length;
      } catch (error) {
        // Fall back to iptables
        const { stdout } = await exec('iptables -L -n');
        const rules = stdout.split('\n').filter(line => line.startsWith('ACCEPT') || line.startsWith('DROP') || line.startsWith('REJECT'));
        firewallRules = rules.length;
        firewallStatus = rules.length > 0 ? 'on' : 'unknown';
      }
    }
    
    logger.info(`Firewall status: ${firewallStatus}`);
    
    return {
      status: firewallStatus,
      rulesCount: typeof firewallRules === 'number' ? firewallRules : firewallRules.length,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error(`Firewall check failed: ${error.message}`);
    
    return {
      status: 'unknown',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = {
  quickScan,
  discoverDevices,
  scanServices,
  checkFirewall,
  getLocalNetworkRange // export for use by other modules
};