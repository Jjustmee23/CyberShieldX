/**
 * Reporter module for CyberShieldX agent
 * Generates formatted security reports from scan results and analysis
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const winston = require('winston');

// Setup logging
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'reporter-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'reporter.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

/**
 * Generate a comprehensive security report
 * @param {string} scanId - ID of the scan
 * @param {string} scanType - Type of scan performed
 * @param {Object} scanResults - Results from the scan
 * @param {Object} analysis - Analysis of the scan results
 * @returns {Object} Formatted report
 */
function generateReport(scanId, scanType, scanResults, analysis) {
  try {
    logger.info(`Generating report for scan ${scanId} (${scanType})`);
    
    // Basic report structure
    const report = {
      reportId: `${scanId}-${Date.now()}`,
      scanId,
      scanType,
      timestamp: new Date().toISOString(),
      summary: {
        riskLevel: analysis.riskLevel || 'unknown',
        riskScore: analysis.riskScores?.overall || 0,
        issueCount: {
          critical: analysis.issues?.critical?.length || 0,
          high: analysis.issues?.high?.length || 0,
          medium: analysis.issues?.medium?.length || 0,
          low: analysis.issues?.low?.length || 0,
          total: (analysis.issues?.critical?.length || 0) + 
                 (analysis.issues?.high?.length || 0) + 
                 (analysis.issues?.medium?.length || 0) + 
                 (analysis.issues?.low?.length || 0)
        },
        systemInfo: generateSystemSummary(scanResults),
        overallStatus: analysis.summary?.overallStatus || 'unknown'
      },
      details: {
        issues: {
          critical: formatIssues(analysis.issues?.critical || []),
          high: formatIssues(analysis.issues?.high || []),
          medium: formatIssues(analysis.issues?.medium || []),
          low: formatIssues(analysis.issues?.low || [])
        },
        recommendations: analysis.recommendations || [],
        riskScores: analysis.riskScores || {}
      },
      systemDetails: extractSystemDetails(scanResults),
      scanData: sanitizeScanResults(scanResults),
      agentInfo: {
        version: process.env.AGENT_VERSION || require('../package.json').version,
        platform: process.platform,
        hostname: os.hostname()
      }
    };
    
    // Save report to file
    saveReportToFile(report);
    
    return report;
  } catch (error) {
    logger.error(`Failed to generate report: ${error.message}`);
    
    // Return a minimal report in case of failure
    return {
      reportId: `error-${scanId}-${Date.now()}`,
      scanId,
      scanType,
      timestamp: new Date().toISOString(),
      error: error.message,
      summary: {
        riskLevel: 'unknown',
        riskScore: 0,
        issueCount: { critical: 0, high: 0, medium: 0, low: 0, total: 0 },
        overallStatus: 'error'
      },
      details: { issues: {}, recommendations: [] },
      agentInfo: {
        version: process.env.AGENT_VERSION || require('../package.json').version,
        platform: process.platform,
        hostname: os.hostname()
      }
    };
  }
}

/**
 * Generate a summary of system information
 */
function generateSystemSummary(scanResults) {
  const summary = {};
  
  try {
    if (scanResults.system && scanResults.system.os) {
      summary.os = `${scanResults.system.os.distro} ${scanResults.system.os.release}`;
      summary.hostname = scanResults.system.os.hostname;
      summary.uptime = scanResults.system.os.uptime;
    }
    
    if (scanResults.system && scanResults.system.cpu) {
      summary.cpu = `${scanResults.system.cpu.manufacturer} ${scanResults.system.cpu.brand}`;
      summary.cores = scanResults.system.cpu.cores;
    }
    
    if (scanResults.system && scanResults.system.memory) {
      summary.memory = formatBytes(scanResults.system.memory.total);
      summary.memoryUsage = `${scanResults.system.memory.usedPercentage}%`;
    }
    
    if (scanResults.network && scanResults.network.devices) {
      summary.deviceCount = scanResults.network.devices.length;
    }
    
    if (scanResults.network && scanResults.network.interfaces) {
      const primaryInterface = scanResults.network.interfaces.find(i => !i.internal && i.ip4);
      if (primaryInterface) {
        summary.ipAddress = primaryInterface.ip4;
      }
    }
  } catch (error) {
    logger.error(`Failed to generate system summary: ${error.message}`);
  }
  
  return summary;
}

/**
 * Format issues for the report
 */
function formatIssues(issues) {
  return issues.map(issue => ({
    title: issue.title,
    description: issue.description,
    category: issue.category,
    severity: issue.severity
  }));
}

/**
 * Extract key system details for the report
 */
function extractSystemDetails(scanResults) {
  const details = {};
  
  try {
    // Extract OS details
    if (scanResults.system && scanResults.system.os) {
      details.os = {
        platform: scanResults.system.os.platform,
        distro: scanResults.system.os.distro,
        release: scanResults.system.os.release,
        arch: scanResults.system.os.arch,
        kernel: scanResults.system.os.kernel,
        hostname: scanResults.system.os.hostname,
        uptime: scanResults.system.os.uptime
      };
    }
    
    // Extract hardware details
    if (scanResults.system) {
      details.hardware = {};
      
      if (scanResults.system.cpu) {
        details.hardware.cpu = {
          manufacturer: scanResults.system.cpu.manufacturer,
          brand: scanResults.system.cpu.brand,
          cores: scanResults.system.cpu.cores,
          speed: scanResults.system.cpu.speed
        };
      }
      
      if (scanResults.system.memory) {
        details.hardware.memory = {
          total: formatBytes(scanResults.system.memory.total),
          free: formatBytes(scanResults.system.memory.free),
          used: formatBytes(scanResults.system.memory.used),
          usedPercentage: scanResults.system.memory.usedPercentage
        };
      }
      
      if (scanResults.system.disk) {
        details.hardware.disk = scanResults.system.disk.map(disk => ({
          mount: disk.mount,
          size: formatBytes(disk.size),
          used: formatBytes(disk.used),
          usedPercentage: disk.usedPercentage
        }));
      }
    }
    
    // Extract network details
    if (scanResults.network) {
      details.network = {};
      
      if (scanResults.network.interfaces) {
        details.network.interfaces = scanResults.network.interfaces.map(iface => ({
          name: iface.iface,
          mac: iface.mac,
          ip4: iface.ip4,
          ip6: iface.ip6,
          status: iface.operstate
        }));
      }
      
      if (scanResults.network.devices) {
        details.network.devices = scanResults.network.devices.length;
      }
      
      if (scanResults.firewall) {
        details.network.firewall = {
          status: scanResults.firewall.status,
          rulesCount: scanResults.firewall.rulesCount
        };
      }
    }
    
    // Extract security details
    details.security = {};
    
    if (scanResults.config) {
      if (scanResults.config.users) {
        details.security.users = {
          currentUser: scanResults.config.users.currentUser,
          isAdmin: scanResults.config.users.isAdmin,
          multipleUsers: scanResults.config.users.multipleUsersLoggedIn,
          score: scanResults.config.users.score
        };
      }
      
      if (scanResults.config.authentication) {
        details.security.authentication = {
          score: scanResults.config.authentication.score,
          rating: scanResults.config.authentication.rating
        };
      }
      
      if (scanResults.config.encryption) {
        details.security.encryption = {
          enabled: scanResults.config.encryption.encryptionStatus?.enabled,
          score: scanResults.config.encryption.score
        };
      }
      
      if (scanResults.config.firewallConfig) {
        details.security.firewall = {
          enabled: scanResults.config.firewallConfig.firewallStatus?.enabled,
          score: scanResults.config.firewallConfig.score
        };
      }
      
      if (scanResults.config.securitySoftware) {
        details.security.securitySoftware = {
          count: scanResults.config.securitySoftware.count,
          score: scanResults.config.securitySoftware.score
        };
      }
    }
  } catch (error) {
    logger.error(`Failed to extract system details: ${error.message}`);
  }
  
  return details;
}

/**
 * Sanitize scan results to remove sensitive data
 */
function sanitizeScanResults(scanResults) {
  try {
    // Deep clone the scan results
    const sanitized = JSON.parse(JSON.stringify(scanResults));
    
    // Remove potentially sensitive information
    if (sanitized.system) {
      // Remove user names
      if (sanitized.system.users) {
        delete sanitized.system.users;
      }
      
      // Remove local network paths
      if (sanitized.system.software && sanitized.system.software.list) {
        sanitized.system.software.list = sanitized.system.software.list.map(sw => ({
          name: sw.name,
          version: sw.version
        }));
      }
    }
    
    if (sanitized.network) {
      // Remove MAC addresses (might be traceable)
      if (sanitized.network.interfaces) {
        sanitized.network.interfaces.forEach(iface => {
          iface.mac = iface.mac ? maskMacAddress(iface.mac) : iface.mac;
        });
      }
      
      // Remove device MACs
      if (sanitized.network.devices) {
        sanitized.network.devices.forEach(device => {
          device.mac = device.mac ? maskMacAddress(device.mac) : device.mac;
        });
      }
    }
    
    // Remove potential credentials or token data
    if (sanitized.vulnerabilities) {
      if (sanitized.vulnerabilities.defaultCredentials) {
        delete sanitized.vulnerabilities.defaultCredentials;
      }
    }
    
    return sanitized;
  } catch (error) {
    logger.error(`Failed to sanitize scan results: ${error.message}`);
    return { error: 'Failed to sanitize scan results' };
  }
}

/**
 * Mask MAC address for privacy
 */
function maskMacAddress(mac) {
  if (!mac) return mac;
  
  // Keep only the first 3 octets (manufacturer part) and mask the rest
  const parts = mac.split(':');
  if (parts.length === 6) {
    return `${parts[0]}:${parts[1]}:${parts[2]}:XX:XX:XX`;
  }
  return mac;
}

/**
 * Format bytes to human-readable sizes
 */
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Save report to file
 */
function saveReportToFile(report) {
  try {
    // Create reports directory if it doesn't exist
    const reportsDir = path.join(os.homedir(), '.cybershieldx', 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    // Create a filename with the scan ID and timestamp
    const filename = `report-${report.scanId}-${new Date().toISOString().replace(/:/g, '-')}.json`;
    const filePath = path.join(reportsDir, filename);
    
    // Write the report to file
    fs.writeFileSync(filePath, JSON.stringify(report, null, 2));
    logger.info(`Report saved to ${filePath}`);
    
    return filePath;
  } catch (error) {
    logger.error(`Failed to save report to file: ${error.message}`);
    return null;
  }
}

module.exports = {
  generateReport
};