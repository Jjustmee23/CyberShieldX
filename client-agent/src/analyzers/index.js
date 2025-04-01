/**
 * Security analyzer module for CyberShieldX agent
 * Analyzes scan results and provides risk assessments
 */

const winston = require('winston');

// Setup logging
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'analyzer-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'analyzer.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

/**
 * Analyze scan results for security issues
 * @param {Object} scanResults - Results from scanners
 * @returns {Object} Analysis results
 */
async function analyze(scanResults) {
  try {
    logger.info(`Analyzing ${scanResults.scanType} scan results`);
    
    // Initialize analysis
    const analysis = {
      timestamp: new Date().toISOString(),
      scanType: scanResults.scanType,
      riskScores: {},
      issues: {
        critical: [],
        high: [],
        medium: [],
        low: []
      },
      recommendations: [],
      summary: {}
    };
    
    // Analyze based on scan type
    switch (scanResults.scanType) {
      case 'quick':
        analyzeQuickScan(scanResults, analysis);
        break;
      case 'system':
        analyzeSystemScan(scanResults, analysis);
        break;
      case 'network':
        analyzeNetworkScan(scanResults, analysis);
        break;
      case 'full':
        analyzeFullScan(scanResults, analysis);
        break;
      default:
        logger.warn(`Unknown scan type: ${scanResults.scanType}`);
    }
    
    // Calculate overall risk score
    analysis.riskScores.overall = calculateOverallRiskScore(analysis.riskScores);
    
    // Generate risk level
    analysis.riskLevel = getRiskLevelFromScore(analysis.riskScores.overall);
    
    // Generate summary
    generateSummary(analysis);
    
    logger.info('Analysis completed');
    return analysis;
  } catch (error) {
    logger.error(`Analysis failed: ${error.message}`);
    return {
      timestamp: new Date().toISOString(),
      error: error.message,
      riskScores: { overall: 100 }, // High risk when analysis fails
      riskLevel: 'high',
      issues: { critical: [], high: [], medium: [], low: [] },
      recommendations: [
        {
          priority: 'high',
          recommendation: 'Analysis failed, manual investigation required',
          details: `Error: ${error.message}`
        }
      ],
      summary: {
        totalIssues: 0,
        criticalIssues: 0,
        highIssues: 0,
        mediumIssues: 0,
        lowIssues: 0,
        overallStatus: 'unknown'
      }
    };
  }
}

/**
 * Analyze quick scan results
 */
function analyzeQuickScan(scanResults, analysis) {
  // Initialize risk scores for different categories
  analysis.riskScores = {
    system: 0,
    network: 0
  };
  
  // Analyze system info
  if (scanResults.system) {
    // Check for indications of issues
    
    // Check disk space
    if (scanResults.system.disk) {
      scanResults.system.disk.forEach(disk => {
        if (disk.usedPercentage > 90) {
          analysis.issues.medium.push({
            category: 'system',
            title: `Critical disk space on ${disk.mount}`,
            description: `Disk usage is at ${disk.usedPercentage}% on ${disk.mount}`,
            severity: 'medium'
          });
          analysis.riskScores.system += 15;
        } else if (disk.usedPercentage > 80) {
          analysis.issues.low.push({
            category: 'system',
            title: `Low disk space on ${disk.mount}`,
            description: `Disk usage is at ${disk.usedPercentage}% on ${disk.mount}`,
            severity: 'low'
          });
          analysis.riskScores.system += 5;
        }
      });
    }
    
    // Check memory usage
    if (scanResults.system.memory && scanResults.system.memory.usedPercentage > 90) {
      analysis.issues.medium.push({
        category: 'system',
        title: 'High memory usage',
        description: `Memory usage is at ${scanResults.system.memory.usedPercentage}%`,
        severity: 'medium'
      });
      analysis.riskScores.system += 10;
    }
  }
  
  // Analyze network info
  if (scanResults.network) {
    // Check for open ports
    if (scanResults.network.localPorts && scanResults.network.localPorts.length > 0) {
      // Check for commonly exploited ports
      const sensitivePortsOpen = scanResults.network.localPorts.filter(port => 
        [21, 22, 23, 25, 135, 137, 138, 139, 445, 3389, 5900].includes(port.port)
      );
      
      if (sensitivePortsOpen.length > 0) {
        analysis.issues.high.push({
          category: 'network',
          title: 'Sensitive ports open',
          description: `${sensitivePortsOpen.length} sensitive ports are open, including ${sensitivePortsOpen.map(p => p.port).join(', ')}`,
          severity: 'high'
        });
        analysis.riskScores.network += 20;
      }
      
      // General ports
      if (scanResults.network.localPorts.length > 10) {
        analysis.issues.medium.push({
          category: 'network',
          title: 'Many open ports',
          description: `${scanResults.network.localPorts.length} ports are open on the local system`,
          severity: 'medium'
        });
        analysis.riskScores.network += 15;
      }
    }
  }
  
  // Add recommendations based on findings
  if (analysis.issues.high.length > 0 || analysis.issues.medium.length > 0) {
    analysis.recommendations.push({
      priority: 'high',
      recommendation: 'Run a full security scan',
      details: 'The quick scan found potential issues. A full scan is recommended to get a complete assessment.'
    });
  }
  
  if (analysis.issues.high.filter(i => i.category === 'network').length > 0) {
    analysis.recommendations.push({
      priority: 'high',
      recommendation: 'Close unnecessary open ports',
      details: 'Reduce your attack surface by closing ports that are not needed.'
    });
  }
  
  if (analysis.issues.medium.filter(i => i.category === 'system' && i.title.includes('disk space')).length > 0) {
    analysis.recommendations.push({
      priority: 'medium',
      recommendation: 'Free up disk space',
      details: 'Low disk space can impact system performance and stability.'
    });
  }
}

/**
 * Analyze system scan results
 */
function analyzeSystemScan(scanResults, analysis) {
  // Initialize risk scores for different categories
  analysis.riskScores = {
    system: 0,
    configuration: 0,
    vulnerabilities: 0,
    malware: 0
  };
  
  // Analyze system details
  if (scanResults.system) {
    // Check for old OS versions
    if (scanResults.system.os) {
      const osName = scanResults.system.os.distro || '';
      const osRelease = scanResults.system.os.release || '';
      
      // Check for end-of-life Windows versions
      if (osName.includes('Windows')) {
        if (osName.includes('Windows 7') || osName.includes('Windows 8') || 
            osName.includes('Windows XP') || osName.includes('Windows Vista')) {
          analysis.issues.high.push({
            category: 'system',
            title: 'End-of-life operating system',
            description: `${osName} is no longer supported with security updates`,
            severity: 'high'
          });
          analysis.riskScores.system += 25;
        } else if (osName.includes('Windows 10') && parseInt(osRelease.split('.')[2]) < 17763) {
          analysis.issues.medium.push({
            category: 'system',
            title: 'Outdated Windows 10 version',
            description: `Windows 10 build ${osRelease} may not be receiving the latest security updates`,
            severity: 'medium'
          });
          analysis.riskScores.system += 15;
        }
      }
      // Check for old macOS versions
      else if (osName.includes('macOS') || osName.includes('Mac')) {
        const versionNumber = osRelease.split('.')[0];
        if (parseInt(versionNumber) < 10 || (parseInt(versionNumber) === 10 && parseInt(osRelease.split('.')[1]) < 13)) {
          analysis.issues.high.push({
            category: 'system',
            title: 'Outdated macOS version',
            description: `macOS ${osRelease} is no longer receiving security updates`,
            severity: 'high'
          });
          analysis.riskScores.system += 25;
        }
      }
      // Check for old Linux distributions
      else if (osName.includes('Ubuntu')) {
        const versionMatch = osName.match(/\d+\.\d+/);
        if (versionMatch) {
          const version = parseFloat(versionMatch[0]);
          if (version < 18.04) {
            analysis.issues.high.push({
              category: 'system',
              title: 'Outdated Ubuntu version',
              description: `Ubuntu ${versionMatch[0]} may be past its support window`,
              severity: 'high'
            });
            analysis.riskScores.system += 25;
          }
        }
      }
    }
    
    // Check system uptime
    if (scanResults.system.os && scanResults.system.os.uptime) {
      // Check for very long uptime (over 90 days)
      if (scanResults.system.os.uptime.includes('days') && parseInt(scanResults.system.os.uptime.split(' ')[0]) > 90) {
        analysis.issues.medium.push({
          category: 'system',
          title: 'Excessive system uptime',
          description: `System has been running for ${scanResults.system.os.uptime} without a reboot`,
          severity: 'medium'
        });
        analysis.riskScores.system += 10;
      }
    }
  }
  
  // Analyze configuration
  if (scanResults.config) {
    // Check security configuration scores
    const configScores = [];
    
    // User accounts
    if (scanResults.config.users) {
      if (scanResults.config.users.isAdmin) {
        analysis.issues.high.push({
          category: 'configuration',
          title: 'Running as administrator/root',
          description: 'Regular usage with administrative privileges increases security risk',
          severity: 'high'
        });
        analysis.riskScores.configuration += 25;
      }
      
      if (scanResults.config.users.multipleUsersLoggedIn) {
        analysis.issues.medium.push({
          category: 'configuration',
          title: 'Multiple users logged in simultaneously',
          description: `${scanResults.config.users.usersLoggedIn} users are currently logged in`,
          severity: 'medium'
        });
        analysis.riskScores.configuration += 10;
      }
      
      configScores.push(scanResults.config.users.score);
    }
    
    // Authentication
    if (scanResults.config.authentication) {
      // Check password policy
      if (scanResults.config.authentication.passwordPolicy) {
        const policy = scanResults.config.authentication.passwordPolicy;
        
        if (policy.minPasswordLength < 8) {
          analysis.issues.high.push({
            category: 'configuration',
            title: 'Weak password policy',
            description: `Minimum password length is set to ${policy.minPasswordLength} characters`,
            severity: 'high'
          });
          analysis.riskScores.configuration += 20;
        }
        
        if (policy.maxPasswordAge > 180) {
          analysis.issues.medium.push({
            category: 'configuration',
            title: 'Weak password expiration policy',
            description: `Maximum password age is set to ${policy.maxPasswordAge} days`,
            severity: 'medium'
          });
          analysis.riskScores.configuration += 10;
        }
      }
      
      configScores.push(scanResults.config.authentication.score);
    }
    
    // Updates
    if (scanResults.config.updates) {
      // Check for pending updates
      if (scanResults.config.updates.updateStatus && 
          scanResults.config.updates.updateStatus.pendingUpdates > 0) {
        analysis.issues.medium.push({
          category: 'configuration',
          title: 'Pending system updates',
          description: `${scanResults.config.updates.updateStatus.pendingUpdates} updates are pending installation`,
          severity: 'medium'
        });
        analysis.riskScores.configuration += 15;
      }
      
      // Check days since last update
      if (scanResults.config.updates.updateStatus && 
          scanResults.config.updates.updateStatus.daysSinceLastUpdate > 60) {
        analysis.issues.high.push({
          category: 'configuration',
          title: 'System updates significantly delayed',
          description: `System was last updated ${scanResults.config.updates.updateStatus.daysSinceLastUpdate} days ago`,
          severity: 'high'
        });
        analysis.riskScores.configuration += 20;
      }
      
      configScores.push(scanResults.config.updates.score);
    }
    
    // Encryption
    if (scanResults.config.encryption) {
      // Check if disk encryption is enabled
      if (scanResults.config.encryption.encryptionStatus && 
          !scanResults.config.encryption.encryptionStatus.enabled) {
        analysis.issues.high.push({
          category: 'configuration',
          title: 'Disk encryption not enabled',
          description: 'System does not have full-disk encryption enabled, which puts data at risk if the device is stolen',
          severity: 'high'
        });
        analysis.riskScores.configuration += 25;
      }
      
      configScores.push(scanResults.config.encryption.score);
    }
    
    // Network configuration
    if (scanResults.config.networkConfig) {
      // Check for insecure services
      if (scanResults.config.networkConfig.insecureServices && 
          scanResults.config.networkConfig.insecureServices.length > 0) {
        analysis.issues.high.push({
          category: 'configuration',
          title: 'Insecure network services running',
          description: `${scanResults.config.networkConfig.insecureServices.length} insecure services are running`,
          severity: 'high'
        });
        analysis.riskScores.configuration += 25;
      }
      
      // Check for promiscuous interfaces
      if (scanResults.config.networkConfig.promiscuousInterfaces && 
          scanResults.config.networkConfig.promiscuousInterfaces.length > 0) {
        analysis.issues.high.push({
          category: 'configuration',
          title: 'Network interfaces in promiscuous mode',
          description: `${scanResults.config.networkConfig.promiscuousInterfaces.length} interfaces are in promiscuous mode, which could indicate network sniffing`,
          severity: 'high'
        });
        analysis.riskScores.configuration += 25;
      }
      
      configScores.push(scanResults.config.networkConfig.score);
    }
    
    // Firewall
    if (scanResults.config.firewallConfig) {
      // Check if firewall is disabled
      if (scanResults.config.firewallConfig.firewallStatus && 
          (!scanResults.config.firewallConfig.firewallStatus.enabled ||
           (typeof scanResults.config.firewallConfig.firewallStatus === 'object' &&
            scanResults.config.firewallConfig.firewallStatus.allProfilesEnabled === false))) {
        analysis.issues.high.push({
          category: 'configuration',
          title: 'Firewall disabled',
          description: 'System firewall is not enabled on all profiles',
          severity: 'high'
        });
        analysis.riskScores.configuration += 25;
      }
      
      configScores.push(scanResults.config.firewallConfig.score);
    }
    
    // Security software
    if (scanResults.config.securitySoftware) {
      // Check if security software is installed
      if (scanResults.config.securitySoftware.count === 0) {
        analysis.issues.high.push({
          category: 'configuration',
          title: 'No security software detected',
          description: 'No antivirus or security software was detected on the system',
          severity: 'high'
        });
        analysis.riskScores.configuration += 25;
      }
      
      configScores.push(scanResults.config.securitySoftware.score);
    }
    
    // Overall configuration score
    if (scanResults.config.overallScore) {
      // Add overall score to our calculation
      configScores.push(scanResults.config.overallScore);
    }
    
    // If we have config scores, calculate average
    if (configScores.length > 0) {
      const averageConfigScore = Math.round(
        configScores.reduce((sum, score) => sum + score, 0) / configScores.length
      );
      
      // Only add this to the risk score if it's not already accounted for in the individual checks
      if (!scanResults.config.overallScore) {
        analysis.riskScores.configuration = Math.max(
          analysis.riskScores.configuration,
          100 - averageConfigScore
        );
      }
    }
  }
  
  // Analyze vulnerabilities
  if (scanResults.vulnerabilities) {
    const vulnCounts = scanResults.vulnerabilities.vulnerabilityCounts || {
      high: 0,
      medium: 0,
      low: 0
    };
    
    // Add issues for each vulnerability category
    if (scanResults.vulnerabilities.osVulnerabilities) {
      scanResults.vulnerabilities.osVulnerabilities.high.forEach(vuln => {
        analysis.issues.high.push({
          category: 'vulnerabilities',
          title: vuln.name,
          description: vuln.description,
          severity: 'high'
        });
      });
      
      scanResults.vulnerabilities.osVulnerabilities.medium.forEach(vuln => {
        analysis.issues.medium.push({
          category: 'vulnerabilities',
          title: vuln.name,
          description: vuln.description,
          severity: 'medium'
        });
      });
      
      scanResults.vulnerabilities.osVulnerabilities.low.forEach(vuln => {
        analysis.issues.low.push({
          category: 'vulnerabilities',
          title: vuln.name,
          description: vuln.description,
          severity: 'low'
        });
      });
    }
    
    if (scanResults.vulnerabilities.weakConfigurations) {
      scanResults.vulnerabilities.weakConfigurations.high.forEach(vuln => {
        analysis.issues.high.push({
          category: 'vulnerabilities',
          title: vuln.name,
          description: vuln.description,
          severity: 'high'
        });
      });
      
      scanResults.vulnerabilities.weakConfigurations.medium.forEach(vuln => {
        analysis.issues.medium.push({
          category: 'vulnerabilities',
          title: vuln.name,
          description: vuln.description,
          severity: 'medium'
        });
      });
      
      scanResults.vulnerabilities.weakConfigurations.low.forEach(vuln => {
        analysis.issues.low.push({
          category: 'vulnerabilities',
          title: vuln.name,
          description: vuln.description,
          severity: 'low'
        });
      });
    }
    
    if (scanResults.vulnerabilities.outdatedSoftware) {
      scanResults.vulnerabilities.outdatedSoftware.high.forEach(vuln => {
        analysis.issues.high.push({
          category: 'vulnerabilities',
          title: vuln.name,
          description: vuln.description,
          severity: 'high'
        });
      });
      
      scanResults.vulnerabilities.outdatedSoftware.medium.forEach(vuln => {
        analysis.issues.medium.push({
          category: 'vulnerabilities',
          title: vuln.name,
          description: vuln.description,
          severity: 'medium'
        });
      });
      
      scanResults.vulnerabilities.outdatedSoftware.low.forEach(vuln => {
        analysis.issues.low.push({
          category: 'vulnerabilities',
          title: vuln.name,
          description: vuln.description,
          severity: 'low'
        });
      });
    }
    
    // Calculate vulnerability risk score
    analysis.riskScores.vulnerabilities = Math.min(100, 
      (vulnCounts.high * 25) + (vulnCounts.medium * 10) + (vulnCounts.low * 2)
    );
    
    // Add recommendations from vulnerabilities scan
    if (scanResults.vulnerabilities.recommendations) {
      scanResults.vulnerabilities.recommendations.forEach(rec => {
        analysis.recommendations.push({
          priority: rec.priority,
          recommendation: rec.recommendation,
          details: rec.issue || ''
        });
      });
    }
  }
  
  // Analyze malware findings
  if (scanResults.malware) {
    const findings = scanResults.malware.findings || {
      suspiciousProcesses: 0,
      suspiciousStartupItems: 0,
      possibleMalwareFound: 0,
      suspiciousConnections: 0
    };
    
    // Add issues for each finding
    if (findings.suspiciousProcesses > 0) {
      analysis.issues.high.push({
        category: 'malware',
        title: 'Suspicious processes detected',
        description: `${findings.suspiciousProcesses} potentially malicious processes found running`,
        severity: 'high'
      });
    }
    
    if (findings.suspiciousStartupItems > 0) {
      analysis.issues.high.push({
        category: 'malware',
        title: 'Suspicious startup items detected',
        description: `${findings.suspiciousStartupItems} potentially malicious startup items found`,
        severity: 'high'
      });
    }
    
    if (findings.possibleMalwareFound > 0) {
      analysis.issues.high.push({
        category: 'malware',
        title: 'Possible malware files detected',
        description: `${findings.possibleMalwareFound} potential malware files found`,
        severity: 'high'
      });
    }
    
    if (findings.suspiciousConnections > 0) {
      analysis.issues.high.push({
        category: 'malware',
        title: 'Suspicious network connections',
        description: `${findings.suspiciousConnections} suspicious outbound connections detected`,
        severity: 'high'
      });
    }
    
    // Calculate malware risk score
    analysis.riskScores.malware = Math.min(100, 
      (findings.suspiciousProcesses * 25) + 
      (findings.suspiciousStartupItems * 25) + 
      (findings.possibleMalwareFound * 20) + 
      (findings.suspiciousConnections * 15)
    );
    
    // Add recommendations from malware scan
    if (scanResults.malware.recommendations) {
      scanResults.malware.recommendations.forEach(rec => {
        analysis.recommendations.push({
          priority: rec.priority,
          recommendation: rec.recommendation,
          details: rec.details || ''
        });
      });
    }
  }
  
  // Add general recommendations if needed
  if (analysis.issues.high.length === 0 && analysis.issues.medium.length === 0) {
    analysis.recommendations.push({
      priority: 'low',
      recommendation: 'Maintain good security practices',
      details: 'Continue with regular updates and backups to maintain good security posture.'
    });
  }
}

/**
 * Analyze network scan results
 */
function analyzeNetworkScan(scanResults, analysis) {
  // Initialize risk scores for different categories
  analysis.riskScores = {
    devices: 0,
    services: 0,
    vulnerabilities: 0,
    firewall: 0
  };
  
  // Analyze devices
  if (scanResults.devices) {
    // Check number of devices
    if (scanResults.devices.length > 20) {
      analysis.issues.low.push({
        category: 'network',
        title: 'Large number of devices on network',
        description: `${scanResults.devices.length} devices found on the network`,
        severity: 'low'
      });
      analysis.riskScores.devices += 5;
    }
    
    // Check for unknown devices
    const unknownDevices = scanResults.devices.filter(d => 
      !d.hostname || d.hostname === 'Unknown' || !d.vendor || d.vendor === 'Unknown'
    );
    
    if (unknownDevices.length > 3) {
      analysis.issues.medium.push({
        category: 'network',
        title: 'Multiple unknown devices on network',
        description: `${unknownDevices.length} devices have missing identification details`,
        severity: 'medium'
      });
      analysis.riskScores.devices += 15;
    }
  }
  
  // Analyze services
  if (scanResults.services && scanResults.services.services) {
    // Count hosts with sensitive services
    const hostsWithSensitiveServices = [];
    
    Object.keys(scanResults.services.services).forEach(ip => {
      const host = scanResults.services.services[ip];
      const sensitivePorts = [];
      
      if (host.ports) {
        host.ports.forEach(port => {
          // Check for sensitive services
          if ([21, 22, 23, 25, 80, 135, 139, 445, 1433, 1434, 3306, 3389, 5432, 5900, 5901].includes(port.port)) {
            sensitivePorts.push(port.port);
          }
        });
      }
      
      if (sensitivePorts.length > 0) {
        hostsWithSensitiveServices.push({
          ip,
          hostname: host.hostname || 'Unknown',
          sensitivePorts
        });
      }
    });
    
    if (hostsWithSensitiveServices.length > 0) {
      analysis.issues.high.push({
        category: 'network',
        title: 'Sensitive services exposed',
        description: `${hostsWithSensitiveServices.length} hosts have sensitive services exposed`,
        severity: 'high'
      });
      analysis.riskScores.services += 25;
      
      // Add detail issues for specific problematic services
      hostsWithSensitiveServices.forEach(host => {
        if (host.sensitivePorts.includes(21)) {
          analysis.issues.high.push({
            category: 'network',
            title: `FTP service exposed on ${host.ip}`,
            description: `Host ${host.hostname} (${host.ip}) has FTP service running, which transmits credentials in cleartext`,
            severity: 'high'
          });
        }
        
        if (host.sensitivePorts.includes(23)) {
          analysis.issues.high.push({
            category: 'network',
            title: `Telnet service exposed on ${host.ip}`,
            description: `Host ${host.hostname} (${host.ip}) has Telnet service running, which transmits data in cleartext`,
            severity: 'high'
          });
        }
        
        if (host.sensitivePorts.includes(3389)) {
          analysis.issues.medium.push({
            category: 'network',
            title: `RDP service exposed on ${host.ip}`,
            description: `Host ${host.hostname} (${host.ip}) has Remote Desktop service running`,
            severity: 'medium'
          });
        }
      });
    }
  }
  
  // Analyze firewall
  if (scanResults.firewall) {
    // Check firewall status
    if (scanResults.firewall.status === 'off' || scanResults.firewall.status === 'disabled') {
      analysis.issues.high.push({
        category: 'network',
        title: 'Firewall disabled',
        description: 'The firewall is currently disabled, leaving the system exposed',
        severity: 'high'
      });
      analysis.riskScores.firewall += 25;
    } else if (scanResults.firewall.status === 'unknown') {
      analysis.issues.medium.push({
        category: 'network',
        title: 'Firewall status unknown',
        description: 'The firewall status could not be determined',
        severity: 'medium'
      });
      analysis.riskScores.firewall += 15;
    }
    
    // Check rule count - if very low, might indicate incomplete protection
    if (scanResults.firewall.rulesCount !== undefined && scanResults.firewall.rulesCount < 5 && scanResults.firewall.status !== 'off') {
      analysis.issues.medium.push({
        category: 'network',
        title: 'Few firewall rules configured',
        description: `Only ${scanResults.firewall.rulesCount} firewall rules are configured`,
        severity: 'medium'
      });
      analysis.riskScores.firewall += 15;
    }
  }
  
  // Analyze network vulnerabilities
  if (scanResults.vulnerabilities) {
    const vulnCounts = scanResults.vulnerabilities.vulnerabilityCounts || {
      high: 0,
      medium: 0,
      low: 0
    };
    
    // Add issues for each vulnerability category
    if (scanResults.vulnerabilities.openVulnerablePorts) {
      scanResults.vulnerabilities.openVulnerablePorts.high.forEach(vuln => {
        analysis.issues.high.push({
          category: 'vulnerabilities',
          title: vuln.name,
          description: vuln.description,
          severity: 'high'
        });
      });
      
      scanResults.vulnerabilities.openVulnerablePorts.medium.forEach(vuln => {
        analysis.issues.medium.push({
          category: 'vulnerabilities',
          title: vuln.name,
          description: vuln.description,
          severity: 'medium'
        });
      });
      
      scanResults.vulnerabilities.openVulnerablePorts.low.forEach(vuln => {
        analysis.issues.low.push({
          category: 'vulnerabilities',
          title: vuln.name,
          description: vuln.description,
          severity: 'low'
        });
      });
    }
    
    if (scanResults.vulnerabilities.weakEncryption) {
      scanResults.vulnerabilities.weakEncryption.high.forEach(vuln => {
        analysis.issues.high.push({
          category: 'vulnerabilities',
          title: vuln.name,
          description: vuln.description,
          severity: 'high'
        });
      });
      
      scanResults.vulnerabilities.weakEncryption.medium.forEach(vuln => {
        analysis.issues.medium.push({
          category: 'vulnerabilities',
          title: vuln.name,
          description: vuln.description,
          severity: 'medium'
        });
      });
      
      scanResults.vulnerabilities.weakEncryption.low.forEach(vuln => {
        analysis.issues.low.push({
          category: 'vulnerabilities',
          title: vuln.name,
          description: vuln.description,
          severity: 'low'
        });
      });
    }
    
    if (scanResults.vulnerabilities.defaultCredentials) {
      scanResults.vulnerabilities.defaultCredentials.high.forEach(vuln => {
        analysis.issues.high.push({
          category: 'vulnerabilities',
          title: vuln.name,
          description: vuln.description,
          severity: 'high'
        });
      });
      
      scanResults.vulnerabilities.defaultCredentials.medium.forEach(vuln => {
        analysis.issues.medium.push({
          category: 'vulnerabilities',
          title: vuln.name,
          description: vuln.description,
          severity: 'medium'
        });
      });
      
      scanResults.vulnerabilities.defaultCredentials.low.forEach(vuln => {
        analysis.issues.low.push({
          category: 'vulnerabilities',
          title: vuln.name,
          description: vuln.description,
          severity: 'low'
        });
      });
    }
    
    // Calculate vulnerability risk score
    analysis.riskScores.vulnerabilities = Math.min(100, 
      (vulnCounts.high * 25) + (vulnCounts.medium * 10) + (vulnCounts.low * 2)
    );
    
    // Add recommendations from vulnerabilities scan
    if (scanResults.vulnerabilities.recommendations) {
      scanResults.vulnerabilities.recommendations.forEach(rec => {
        analysis.recommendations.push({
          priority: rec.priority,
          recommendation: rec.recommendation,
          details: rec.issue || ''
        });
      });
    }
  }
  
  // Add network-specific recommendations
  if (analysis.issues.high.filter(i => i.category === 'network' && i.title.includes('service')).length > 0) {
    analysis.recommendations.push({
      priority: 'high',
      recommendation: 'Disable or secure sensitive network services',
      details: 'Sensitive services like FTP, Telnet, and others transmit data in cleartext and should be replaced with secure alternatives.'
    });
  }
  
  if (analysis.issues.high.filter(i => i.category === 'network' && i.title.includes('Firewall')).length > 0) {
    analysis.recommendations.push({
      priority: 'high',
      recommendation: 'Enable the firewall',
      details: 'A properly configured firewall is essential for network security.'
    });
  }
  
  if (analysis.issues.medium.filter(i => i.title.includes('unknown devices')).length > 0) {
    analysis.recommendations.push({
      priority: 'medium',
      recommendation: 'Identify all devices on your network',
      details: 'Unknown devices could be unauthorized access points or rogue devices.'
    });
  }
}

/**
 * Analyze full scan results
 */
function analyzeFullScan(scanResults, analysis) {
  // For a full scan, we'll include all the analyses from the specific scans
  
  // Initialize risk scores for all categories
  analysis.riskScores = {
    system: 0,
    configuration: 0,
    network: 0,
    services: 0,
    vulnerabilities: 0,
    malware: 0,
    firewall: 0
  };
  
  // If we have system scan data
  if (scanResults.system) {
    // Create a mock system scan result and analyze it
    const systemScanResults = {
      scanType: 'system',
      system: scanResults.system,
      config: scanResults.config,
      vulnerabilities: scanResults.vulnerabilities ? {
        osVulnerabilities: scanResults.vulnerabilities.system || {},
        weakConfigurations: scanResults.vulnerabilities.weakConfigurations || {},
        outdatedSoftware: scanResults.vulnerabilities.outdatedSoftware || {},
        insecureServices: scanResults.vulnerabilities.insecureServices || {},
        vulnerabilityCounts: {
          high: (scanResults.vulnerabilities.system?.high || []).length + 
                (scanResults.vulnerabilities.weakConfigurations?.high || []).length +
                (scanResults.vulnerabilities.outdatedSoftware?.high || []).length +
                (scanResults.vulnerabilities.insecureServices?.high || []).length,
          medium: (scanResults.vulnerabilities.system?.medium || []).length +
                  (scanResults.vulnerabilities.weakConfigurations?.medium || []).length +
                  (scanResults.vulnerabilities.outdatedSoftware?.medium || []).length +
                  (scanResults.vulnerabilities.insecureServices?.medium || []).length,
          low: (scanResults.vulnerabilities.system?.low || []).length +
               (scanResults.vulnerabilities.weakConfigurations?.low || []).length +
               (scanResults.vulnerabilities.outdatedSoftware?.low || []).length +
               (scanResults.vulnerabilities.insecureServices?.low || []).length
        }
      } : undefined,
      malware: scanResults.malware
    };
    
    // Analyze system results
    analyzeSystemScan(systemScanResults, analysis);
  }
  
  // If we have network scan data
  if (scanResults.network) {
    // Create a mock network scan result and analyze it
    const networkScanResults = {
      scanType: 'network',
      devices: scanResults.network.devices,
      services: scanResults.network.services,
      firewall: scanResults.firewall,
      vulnerabilities: scanResults.vulnerabilities ? {
        openVulnerablePorts: scanResults.vulnerabilities.network?.openVulnerablePorts || {},
        weakEncryption: scanResults.vulnerabilities.network?.weakEncryption || {},
        defaultCredentials: scanResults.vulnerabilities.network?.defaultCredentials || {},
        vulnerabilityCounts: {
          high: (scanResults.vulnerabilities.network?.openVulnerablePorts?.high || []).length +
                (scanResults.vulnerabilities.network?.weakEncryption?.high || []).length +
                (scanResults.vulnerabilities.network?.defaultCredentials?.high || []).length,
          medium: (scanResults.vulnerabilities.network?.openVulnerablePorts?.medium || []).length +
                  (scanResults.vulnerabilities.network?.weakEncryption?.medium || []).length +
                  (scanResults.vulnerabilities.network?.defaultCredentials?.medium || []).length,
          low: (scanResults.vulnerabilities.network?.openVulnerablePorts?.low || []).length +
               (scanResults.vulnerabilities.network?.weakEncryption?.low || []).length +
               (scanResults.vulnerabilities.network?.defaultCredentials?.low || []).length
        }
      } : undefined
    };
    
    // Analyze network results
    analyzeNetworkScan(networkScanResults, analysis);
  }
  
  // Additional full scan specific checks
  
  // Check for critical issues that might indicate a breach
  const criticalIndicators = [
    // Check for rootkits
    scanResults.malware?.rootkits && scanResults.malware.rootkits.length > 0,
    
    // Check for evidence of data exfiltration
    scanResults.malware?.suspiciousConnections && scanResults.malware.suspiciousConnections.length > 2,
    
    // Check for multiple high severity malware issues
    scanResults.malware?.findings && 
    (scanResults.malware.findings.suspiciousProcesses > 2 || 
     scanResults.malware.findings.possibleMalwareFound > 3),
     
    // Check for system modifications
    scanResults.malware?.systemModifications && 
    scanResults.malware.systemModifications.suspicious && 
    scanResults.malware.systemModifications.suspicious.length > 0
  ];
  
  if (criticalIndicators.filter(Boolean).length >= 2) {
    analysis.issues.critical.push({
      category: 'security',
      title: 'Possible security breach detected',
      description: 'Multiple indicators of compromise detected, system may be actively compromised',
      severity: 'critical'
    });
    
    analysis.recommendations.unshift({
      priority: 'critical',
      recommendation: 'Isolate this system immediately',
      details: 'Multiple indicators suggest this system may be compromised. Disconnect from the network and perform forensic analysis.'
    });
  }
  
  // Check for data protection issues
  const sensitiveDataIssues = [
    // Encryption disabled
    scanResults.config?.encryption?.encryptionStatus && 
    !scanResults.config.encryption.encryptionStatus.enabled,
    
    // Firewall disabled
    scanResults.firewall?.status === 'off',
    
    // Sensitive services exposed
    analysis.issues.high.some(issue => 
      issue.category === 'network' && issue.title.includes('service')
    )
  ];
  
  if (sensitiveDataIssues.filter(Boolean).length >= 2) {
    analysis.issues.high.push({
      category: 'security',
      title: 'Data protection weaknesses',
      description: 'Multiple data protection mechanisms are disabled or misconfigured',
      severity: 'high'
    });
    
    analysis.recommendations.unshift({
      priority: 'high',
      recommendation: 'Strengthen data protection measures',
      details: 'Enable disk encryption, configure firewall properly, and secure or disable sensitive services.'
    });
  }
  
  // Ensure we don't have duplicate recommendations
  analysis.recommendations = deduplicateRecommendations(analysis.recommendations);
}

/**
 * Calculate overall risk score based on category scores
 */
function calculateOverallRiskScore(riskScores) {
  // Remove the overall score if it exists
  const { overall, ...categoryScores } = riskScores;
  
  // Get the scores as an array
  const scores = Object.values(categoryScores);
  
  if (scores.length === 0) {
    return 0; // No risk if no scores
  }
  
  // Weight the scores - higher scores have more impact
  const weightedScores = scores.map(score => score * score);
  const totalWeight = scores.reduce((sum, score) => sum + score, 0);
  
  if (totalWeight === 0) {
    return 0; // No risk if all zeros
  }
  
  // Calculate weighted average, biased towards higher scores
  return Math.round(
    weightedScores.reduce((sum, score) => sum + score, 0) / totalWeight
  );
}

/**
 * Get risk level from score
 */
function getRiskLevelFromScore(score) {
  if (score >= 75) {
    return 'high';
  } else if (score >= 40) {
    return 'medium';
  } else {
    return 'low';
  }
}

/**
 * Generate summary of analysis
 */
function generateSummary(analysis) {
  // Count issues by severity
  const criticalCount = analysis.issues.critical.length;
  const highCount = analysis.issues.high.length;
  const mediumCount = analysis.issues.medium.length;
  const lowCount = analysis.issues.low.length;
  const totalCount = criticalCount + highCount + mediumCount + lowCount;
  
  // Determine overall status
  let overallStatus;
  if (criticalCount > 0) {
    overallStatus = 'critical';
  } else if (highCount > 0) {
    overallStatus = 'at risk';
  } else if (mediumCount > 0) {
    overallStatus = 'warning';
  } else if (lowCount > 0) {
    overallStatus = 'good';
  } else {
    overallStatus = 'excellent';
  }
  
  // Set summary
  analysis.summary = {
    totalIssues: totalCount,
    criticalIssues: criticalCount,
    highIssues: highCount,
    mediumIssues: mediumCount,
    lowIssues: lowCount,
    overallStatus
  };
}

/**
 * Remove duplicate recommendations
 */
function deduplicateRecommendations(recommendations) {
  const uniqueRecommendations = [];
  const recommendationTexts = new Set();
  
  for (const rec of recommendations) {
    // Create a key from the recommendation text
    const key = rec.recommendation.toLowerCase();
    
    if (!recommendationTexts.has(key)) {
      recommendationTexts.add(key);
      uniqueRecommendations.push(rec);
    }
  }
  
  return uniqueRecommendations;
}

// Export the analyze function
module.exports = {
  analyze
};