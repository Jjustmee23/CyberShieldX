/**
 * System scanner module for CyberShieldX agent
 * Provides functionality for scanning system security configuration
 */

const si = require('systeminformation');
const os = require('os');
const fs = require('fs').promises;
const path = require('path');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);
const winston = require('winston');

// Platform detection
const isWindows = process.platform === 'win32';
const isMac = process.platform === 'darwin';
const isLinux = process.platform === 'linux';
const isRaspberryPi = isLinux && (os.arch() === 'arm' || os.arch() === 'arm64');

// Setup logging
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'system-scanner-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'system-scanner.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

/**
 * Get basic system information
 * @returns {Object} Basic system info
 */
async function getBasicInfo() {
  try {
    logger.info('Getting basic system information');
    
    // Get system information
    const [osInfo, cpu, mem, disk] = await Promise.all([
      si.osInfo(),
      si.cpu(),
      si.mem(),
      si.fsSize()
    ]);
    
    return {
      os: {
        platform: osInfo.platform,
        distro: osInfo.distro,
        release: osInfo.release,
        arch: os.arch(),
        hostname: os.hostname()
      },
      cpu: {
        manufacturer: cpu.manufacturer,
        brand: cpu.brand,
        cores: cpu.cores,
        speed: cpu.speed
      },
      memory: {
        total: mem.total,
        free: mem.free,
        used: mem.used,
        usedPercentage: Math.round((mem.used / mem.total) * 100)
      },
      disk: disk.map(d => ({
        fs: d.fs,
        type: d.type,
        size: d.size,
        used: d.used,
        usedPercentage: Math.round((d.used / d.size) * 100),
        mount: d.mount
      })),
      user: {
        username: os.userInfo().username,
        uid: os.userInfo().uid
      }
    };
  } catch (error) {
    logger.error(`Failed to get basic system info: ${error.message}`);
    
    // Return minimal info in case of failure
    return {
      os: {
        platform: process.platform,
        arch: os.arch(),
        hostname: os.hostname()
      },
      error: error.message
    };
  }
}

/**
 * Get detailed system information
 * @returns {Object} Detailed system info
 */
async function getDetailedInfo() {
  try {
    logger.info('Getting detailed system information');
    
    // Get system information
    const [osInfo, cpu, mem, disk, network, users, processes, services] = await Promise.all([
      si.osInfo(),
      si.cpu(),
      si.mem(),
      si.fsSize(),
      si.networkInterfaces(),
      si.users(),
      si.processes(),
      si.services('*')
    ]);
    
    // Get system uptime
    const uptime = os.uptime();
    const uptimeFormatted = formatUptime(uptime);
    
    // Get installed software (platform-specific)
    const installedSoftware = await getInstalledSoftware();
    
    return {
      os: {
        platform: osInfo.platform,
        distro: osInfo.distro,
        release: osInfo.release,
        arch: os.arch(),
        kernel: osInfo.kernel,
        hostname: os.hostname(),
        uptime: uptimeFormatted,
        logofile: osInfo.logofile
      },
      cpu: {
        manufacturer: cpu.manufacturer,
        brand: cpu.brand,
        cores: cpu.cores,
        physicalCores: cpu.physicalCores,
        processors: cpu.processors,
        speed: cpu.speed,
        speedMax: cpu.speedMax
      },
      memory: {
        total: mem.total,
        free: mem.free,
        used: mem.used,
        usedPercentage: Math.round((mem.used / mem.total) * 100),
        swapTotal: mem.swapTotal,
        swapUsed: mem.swapUsed,
        swapFree: mem.swapFree
      },
      disk: disk.map(d => ({
        fs: d.fs,
        type: d.type,
        size: d.size,
        used: d.used,
        usedPercentage: Math.round((d.used / d.size) * 100),
        mount: d.mount
      })),
      network: network.filter(n => !n.internal).map(n => ({
        iface: n.iface,
        mac: n.mac,
        ip4: n.ip4,
        ip6: n.ip6,
        speed: n.speed,
        type: n.type,
        operstate: n.operstate
      })),
      users: users.map(u => ({
        user: u.user,
        terminal: u.terminal,
        date: u.date,
        time: u.time,
        ip: u.ip
      })),
      processes: {
        all: processes.all,
        running: processes.running,
        blocked: processes.blocked,
        sleeping: processes.sleeping,
        list: processes.list.slice(0, 10).map(p => ({
          pid: p.pid,
          name: p.name,
          cpu: p.cpu,
          mem: p.mem
        }))
      },
      services: services.slice(0, 20).map(s => ({
        name: s.name,
        running: s.running,
        startmode: s.startmode
      })),
      software: {
        count: installedSoftware.length,
        list: installedSoftware.slice(0, 30) // Limit to 30 apps for brevity
      }
    };
  } catch (error) {
    logger.error(`Failed to get detailed system info: ${error.message}`);
    
    // Fall back to basic info in case of error
    return getBasicInfo();
  }
}

/**
 * Format uptime in human-readable format
 */
function formatUptime(uptime) {
  const days = Math.floor(uptime / 86400);
  const hours = Math.floor((uptime % 86400) / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  
  let result = '';
  if (days > 0) {
    result += `${days} days, `;
  }
  
  result += `${hours} hours, ${minutes} minutes`;
  return result;
}

/**
 * Get list of installed software (platform-specific)
 */
async function getInstalledSoftware() {
  try {
    let command = '';
    let softwareList = [];
    
    if (isWindows) {
      // Windows
      command = 'powershell -Command "Get-ItemProperty HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\* | Select-Object DisplayName, DisplayVersion, Publisher | ConvertTo-Json"';
      const { stdout } = await exec(command);
      
      try {
        const parsed = JSON.parse(stdout);
        if (Array.isArray(parsed)) {
          softwareList = parsed
            .filter(item => item.DisplayName) // Filter out null entries
            .map(item => ({
              name: item.DisplayName,
              version: item.DisplayVersion,
              publisher: item.Publisher
            }));
        } else {
          // Single item case
          if (parsed.DisplayName) {
            softwareList = [{
              name: parsed.DisplayName,
              version: parsed.DisplayVersion,
              publisher: parsed.Publisher
            }];
          }
        }
      } catch (e) {
        logger.error(`Failed to parse Windows software list: ${e.message}`);
      }
    } else if (isMac) {
      // macOS
      command = 'ls -la /Applications | grep ".app$"';
      const { stdout } = await exec(command);
      
      softwareList = stdout.split('\n')
        .filter(line => line.trim() !== '')
        .map(line => {
          const appName = line.substring(line.lastIndexOf(' ') + 1).replace('.app', '');
          return {
            name: appName,
            version: 'Unknown', // Would need to read Info.plist for each app to get version
            publisher: 'Unknown'
          };
        });
    } else if (isLinux) {
      // Linux
      if (await fileExists('/usr/bin/dpkg')) {
        // Debian/Ubuntu
        command = 'dpkg-query -W -f=\'${Package} ${Version} ${Maintainer}\\n\'';
      } else if (await fileExists('/usr/bin/rpm')) {
        // Red Hat/CentOS/Fedora
        command = 'rpm -qa --queryformat "%{NAME} %{VERSION} %{VENDOR}\\n"';
      } else {
        // Fallback - try to use apt
        command = 'apt list --installed 2>/dev/null';
      }
      
      const { stdout } = await exec(command);
      
      softwareList = stdout.split('\n')
        .filter(line => line.trim() !== '')
        .map(line => {
          const parts = line.split(' ');
          return {
            name: parts[0],
            version: parts[1] || 'Unknown',
            publisher: parts[2] || 'Unknown'
          };
        });
    }
    
    return softwareList;
  } catch (error) {
    logger.error(`Failed to get installed software: ${error.message}`);
    return [];
  }
}

/**
 * Helper to check if a file exists
 */
async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check system security configuration
 * @returns {Object} Security configuration assessment
 */
async function checkConfiguration() {
  try {
    logger.info('Checking system security configuration');
    
    const securityChecks = {
      users: await checkUsers(),
      authentication: await checkAuthentication(),
      updates: await checkUpdates(),
      encryption: await checkEncryption(),
      networkConfig: await checkNetworkConfig(),
      firewallConfig: await checkFirewallConfig(),
      securitySoftware: await checkSecuritySoftware()
    };
    
    // Calculate overall security score
    const scores = Object.values(securityChecks)
      .filter(check => typeof check.score === 'number')
      .map(check => check.score);
    
    const overallScore = scores.length > 0
      ? Math.round(scores.reduce((acc, score) => acc + score, 0) / scores.length)
      : 0;
    
    return {
      ...securityChecks,
      overallScore,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error(`Failed to check system configuration: ${error.message}`);
    
    return {
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Check user accounts and permissions
 */
async function checkUsers() {
  try {
    const users = await si.users();
    
    // Check if multiple users are logged in
    const multipleUsersLoggedIn = users.length > 1;
    
    // Get current username
    const currentUser = os.userInfo().username;
    
    // Check if running as admin/root
    let isAdmin = false;
    
    if (isWindows) {
      // Windows admin check
      try {
        await exec('net localgroup administrators | findstr /i "' + currentUser + '"');
        isAdmin = true;
      } catch {
        isAdmin = false;
      }
    } else {
      // Unix-based root check
      isAdmin = os.userInfo().uid === 0;
    }
    
    // Score calculation - 100 is best, 0 is worst
    // Running as admin is -50 points
    // Multiple users logged in is -25 points
    let score = 100;
    if (isAdmin) score -= 50;
    if (multipleUsersLoggedIn) score -= 25;
    
    return {
      currentUser,
      isAdmin,
      usersLoggedIn: users.length,
      multipleUsersLoggedIn,
      issues: [
        isAdmin ? 'Running as administrator/root is a security risk' : null,
        multipleUsersLoggedIn ? 'Multiple users logged in simultaneously' : null
      ].filter(Boolean),
      score,
      rating: score >= 80 ? 'good' : score >= 50 ? 'fair' : 'poor'
    };
  } catch (error) {
    logger.error(`Failed to check users: ${error.message}`);
    return {
      error: error.message,
      score: 0,
      rating: 'unknown'
    };
  }
}

/**
 * Check authentication settings
 */
async function checkAuthentication() {
  try {
    let passwordPolicy = {};
    let score = 50; // Default score
    
    if (isWindows) {
      // Windows password policy
      try {
        const { stdout } = await exec('net accounts');
        
        // Extract password policy details
        const maxPwdAge = stdout.match(/Maximum password age \(days\):\s+(\d+)/i);
        const minPwdAge = stdout.match(/Minimum password age \(days\):\s+(\d+)/i);
        const minPwdLength = stdout.match(/Minimum password length:\s+(\d+)/i);
        const pwdHistory = stdout.match(/Length of password history maintained:\s+(\d+)/i);
        
        passwordPolicy = {
          maxPasswordAge: maxPwdAge ? parseInt(maxPwdAge[1]) : 0,
          minPasswordAge: minPwdAge ? parseInt(minPwdAge[1]) : 0,
          minPasswordLength: minPwdLength ? parseInt(minPwdLength[1]) : 0,
          passwordHistorySize: pwdHistory ? parseInt(pwdHistory[1]) : 0
        };
        
        // Score based on policy strength
        // Good min length is >= 12
        // Good max age is <= 90 days
        // Good history is >= 10 passwords
        score = 0;
        if (passwordPolicy.minPasswordLength >= 12) score += 40;
        else if (passwordPolicy.minPasswordLength >= 8) score += 20;
        else score += 10;
        
        if (passwordPolicy.maxPasswordAge <= 90 && passwordPolicy.maxPasswordAge > 0) score += 30;
        else if (passwordPolicy.maxPasswordAge <= 180) score += 15;
        else score += 5;
        
        if (passwordPolicy.passwordHistorySize >= 10) score += 30;
        else if (passwordPolicy.passwordHistorySize >= 5) score += 15;
        else score += 5;
      } catch (e) {
        logger.error(`Failed to get Windows password policy: ${e.message}`);
      }
    } else if (isMac) {
      // macOS authentication check
      try {
        // Check FileVault status
        const { stdout: filevaultOutput } = await exec('fdesetup status');
        const filevaultEnabled = filevaultOutput.includes('FileVault is On');
        
        // Check if screensaver password is enabled
        const { stdout: screensaverOutput } = await exec('defaults read com.apple.screensaver askForPassword');
        const screensaverPasswordEnabled = screensaverOutput.trim() === '1';
        
        passwordPolicy = {
          filevaultEnabled,
          screensaverPasswordEnabled
        };
        
        // Score
        score = 0;
        if (filevaultEnabled) score += 50;
        if (screensaverPasswordEnabled) score += 50;
      } catch (e) {
        logger.error(`Failed to get macOS authentication settings: ${e.message}`);
      }
    } else if (isLinux) {
      // Linux authentication check
      try {
        // Check PAM config
        const { stdout: pamOutput } = await exec('grep -i "password" /etc/pam.d/common-password');
        
        // Look for password complexity requirements
        const passwordComplexity = pamOutput.includes('pam_pwquality.so') || pamOutput.includes('pam_cracklib.so');
        
        // Check failed login lockout
        const { stdout: loginOutput } = await exec('grep -i "deny=" /etc/pam.d/system-auth || grep -i "deny=" /etc/pam.d/password-auth');
        const loginLockoutEnabled = loginOutput.length > 0;
        
        passwordPolicy = {
          passwordComplexityEnabled: passwordComplexity,
          loginLockoutEnabled
        };
        
        // Score
        score = 0;
        if (passwordComplexity) score += 50;
        if (loginLockoutEnabled) score += 50;
      } catch (e) {
        logger.error(`Failed to get Linux authentication settings: ${e.message}`);
      }
    }
    
    return {
      passwordPolicy,
      score,
      rating: score >= 80 ? 'good' : score >= 50 ? 'fair' : 'poor'
    };
  } catch (error) {
    logger.error(`Failed to check authentication: ${error.message}`);
    return {
      error: error.message,
      score: 0,
      rating: 'unknown'
    };
  }
}

/**
 * Check for system updates
 */
async function checkUpdates() {
  try {
    let updateStatus = {};
    let score = 50; // Default score
    
    if (isWindows) {
      // Windows updates
      try {
        const { stdout } = await exec('powershell -Command "Get-HotFix | Sort-Object -Property InstalledOn -Descending | Select-Object -First 1 | Select-Object HotFixID, InstalledOn | ConvertTo-Json"');
        
        try {
          const latestUpdate = JSON.parse(stdout);
          updateStatus = {
            latestUpdate: latestUpdate.HotFixID,
            installedOn: latestUpdate.InstalledOn,
            daysSinceLastUpdate: daysSince(new Date(latestUpdate.InstalledOn))
          };
          
          // Score based on recency of updates
          if (updateStatus.daysSinceLastUpdate <= 30) score = 100;
          else if (updateStatus.daysSinceLastUpdate <= 90) score = 75;
          else if (updateStatus.daysSinceLastUpdate <= 180) score = 50;
          else score = 25;
        } catch (e) {
          logger.error(`Failed to parse Windows update info: ${e.message}`);
        }
      } catch (e) {
        logger.error(`Failed to get Windows update status: ${e.message}`);
      }
    } else if (isMac) {
      // macOS updates
      try {
        const { stdout } = await exec('softwareupdate -l');
        
        // Check if updates are available
        const updatesAvailable = !stdout.includes('No new software available');
        
        // Try to get OS version
        const { stdout: swVers } = await exec('sw_vers -productVersion');
        const osVersion = swVers.trim();
        
        updateStatus = {
          osVersion,
          updatesAvailable
        };
        
        // Score
        score = updatesAvailable ? 50 : 100;
      } catch (e) {
        logger.error(`Failed to get macOS update status: ${e.message}`);
      }
    } else if (isLinux) {
      // Linux updates
      try {
        let updates = [];
        
        if (await fileExists('/usr/bin/apt')) {
          // Debian/Ubuntu
          const { stdout } = await exec('apt-get -s upgrade | grep -i "upgraded,"');
          const match = stdout.match(/(\d+) upgraded/);
          
          if (match) {
            const updateCount = parseInt(match[1]);
            updates = Array(updateCount).fill({ type: 'apt package' });
          }
        } else if (await fileExists('/usr/bin/yum')) {
          // Red Hat/CentOS/Fedora
          const { stdout } = await exec('yum check-update -q | wc -l');
          const updateCount = parseInt(stdout.trim());
          
          if (updateCount > 0) {
            updates = Array(updateCount).fill({ type: 'yum package' });
          }
        }
        
        updateStatus = {
          pendingUpdates: updates.length,
          updatesAvailable: updates.length > 0
        };
        
        // Score
        score = updates.length === 0 ? 100 : (updates.length < 5 ? 75 : 50);
      } catch (e) {
        logger.error(`Failed to get Linux update status: ${e.message}`);
      }
    }
    
    return {
      updateStatus,
      score,
      rating: score >= 80 ? 'good' : score >= 50 ? 'fair' : 'poor'
    };
  } catch (error) {
    logger.error(`Failed to check updates: ${error.message}`);
    return {
      error: error.message,
      score: 0,
      rating: 'unknown'
    };
  }
}

/**
 * Calculate days since a given date
 */
function daysSince(date) {
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Check disk encryption status
 */
async function checkEncryption() {
  try {
    let encryptionStatus = {};
    let score = 0; // Default score
    
    if (isWindows) {
      // Windows BitLocker
      try {
        const { stdout } = await exec('powershell -Command "Get-BitLockerVolume | Select-Object MountPoint, VolumeStatus, EncryptionPercentage | ConvertTo-Json"');
        
        try {
          const parsed = JSON.parse(stdout);
          const volumes = Array.isArray(parsed) ? parsed : [parsed];
          
          // Filter to only system volumes
          const systemVolumes = volumes.filter(v => v.MountPoint === 'C:');
          
          if (systemVolumes.length > 0) {
            const encrypted = systemVolumes.every(v => v.VolumeStatus === 'FullyEncrypted');
            encryptionStatus = {
              enabled: encrypted,
              volumes: systemVolumes.map(v => ({
                mountPoint: v.MountPoint,
                status: v.VolumeStatus,
                encryptionPercentage: v.EncryptionPercentage
              }))
            };
            
            score = encrypted ? 100 : 0;
          }
        } catch (e) {
          logger.error(`Failed to parse BitLocker info: ${e.message}`);
        }
      } catch (e) {
        logger.error(`Failed to get BitLocker status: ${e.message}`);
      }
    } else if (isMac) {
      // macOS FileVault
      try {
        const { stdout } = await exec('fdesetup status');
        const enabled = stdout.includes('FileVault is On');
        
        encryptionStatus = {
          enabled,
          type: 'FileVault'
        };
        
        score = enabled ? 100 : 0;
      } catch (e) {
        logger.error(`Failed to get FileVault status: ${e.message}`);
      }
    } else if (isLinux) {
      // Linux encryption check
      try {
        // Try to detect LUKS encryption
        const { stdout: luksOutput } = await exec('lsblk -f | grep -i "crypto_LUKS"');
        const luksEncryption = luksOutput.length > 0;
        
        // Try to detect eCryptfs
        const { stdout: cryptfsOutput } = await exec('mount | grep -i "ecryptfs"');
        const ecryptfsEncryption = cryptfsOutput.length > 0;
        
        encryptionStatus = {
          enabled: luksEncryption || ecryptfsEncryption,
          luksEncryption,
          ecryptfsEncryption
        };
        
        score = (luksEncryption || ecryptfsEncryption) ? 100 : 0;
      } catch (e) {
        logger.error(`Failed to get Linux encryption status: ${e.message}`);
      }
    }
    
    return {
      encryptionStatus,
      score,
      rating: score >= 80 ? 'good' : score >= 50 ? 'fair' : 'poor'
    };
  } catch (error) {
    logger.error(`Failed to check encryption: ${error.message}`);
    return {
      error: error.message,
      score: 0,
      rating: 'unknown'
    };
  }
}

/**
 * Check network configuration
 */
async function checkNetworkConfig() {
  try {
    // Get network interfaces
    const networkData = await si.networkInterfaces();
    
    // Get network connections
    const connections = await si.networkConnections();
    
    // Check for potentially insecure services
    const insecureServices = [];
    const highPorts = [];
    
    // Check listening ports
    connections.forEach(conn => {
      // Check for listening sockets
      if (conn.state === 'LISTEN') {
        // Check for common insecure services
        if ([21, 23, 25, 110, 143].includes(conn.localPort)) {
          insecureServices.push({
            port: conn.localPort,
            service: getServiceNameByPort(conn.localPort),
            pid: conn.pid
          });
        }
        
        // High ports might be fine but log them for visibility
        if (conn.localPort >= 1024 && conn.localPort <= 49151) {
          highPorts.push({
            port: conn.localPort,
            pid: conn.pid
          });
        }
      }
    });
    
    // Check for network interfaces in promiscuous mode
    const promiscuousInterfaces = networkData.filter(iface => 
      iface.operstate === 'up' && iface.type !== 'virtual' && iface.internal === false
    ).map(async iface => {
      try {
        if (isWindows) {
          const { stdout } = await exec(`powershell -Command "Get-NetAdapter -Name '${iface.iface}' | Select-Object -ExpandProperty PromiscuousMode"`);
          return { iface: iface.iface, promiscuous: stdout.trim() === 'True' };
        } else {
          const { stdout } = await exec(`ifconfig ${iface.iface} | grep -i promisc`);
          return { iface: iface.iface, promiscuous: stdout.length > 0 };
        }
      } catch (e) {
        return { iface: iface.iface, promiscuous: false };
      }
    });
    
    const promiscResults = await Promise.all(promiscuousInterfaces);
    const isAnyPromiscuous = promiscResults.some(r => r.promiscuous);
    
    // Calculate score - 100 is best
    let score = 100;
    
    // Deduct points for insecure services
    score -= (insecureServices.length * 20);
    
    // Deduct points for promiscuous interfaces
    if (isAnyPromiscuous) score -= 30;
    
    // Ensure score is in range 0-100
    score = Math.max(0, Math.min(100, score));
    
    return {
      activeInterfaces: networkData.filter(iface => iface.operstate === 'up').length,
      listeningPorts: connections.filter(conn => conn.state === 'LISTEN').length,
      insecureServices,
      promiscuousInterfaces: promiscResults.filter(r => r.promiscuous),
      score,
      rating: score >= 80 ? 'good' : score >= 50 ? 'fair' : 'poor',
      issues: [
        insecureServices.length > 0 ? `Found ${insecureServices.length} potentially insecure services running` : null,
        isAnyPromiscuous ? 'Found network interfaces in promiscuous mode, which is a security risk' : null
      ].filter(Boolean)
    };
  } catch (error) {
    logger.error(`Failed to check network configuration: ${error.message}`);
    return {
      error: error.message,
      score: 0,
      rating: 'unknown'
    };
  }
}

/**
 * Get service name by common port number
 */
function getServiceNameByPort(port) {
  const portMap = {
    21: 'FTP',
    22: 'SSH',
    23: 'Telnet',
    25: 'SMTP',
    53: 'DNS',
    80: 'HTTP',
    110: 'POP3',
    143: 'IMAP',
    443: 'HTTPS',
    3389: 'RDP'
  };
  
  return portMap[port] || 'Unknown';
}

/**
 * Check firewall configuration
 */
async function checkFirewallConfig() {
  try {
    let firewallStatus = 'unknown';
    let score = 50; // Default score
    
    if (isWindows) {
      // Windows firewall
      try {
        const { stdout } = await exec('netsh advfirewall show allprofiles');
        
        // Check if any profile has firewall disabled
        const domainState = stdout.match(/Domain Profile Settings:\s*-+\s*State\s*(ON|OFF)/i);
        const privateState = stdout.match(/Private Profile Settings:\s*-+\s*State\s*(ON|OFF)/i);
        const publicState = stdout.match(/Public Profile Settings:\s*-+\s*State\s*(ON|OFF)/i);
        
        const domainEnabled = domainState && domainState[1] === 'ON';
        const privateEnabled = privateState && privateState[1] === 'ON';
        const publicEnabled = publicState && publicState[1] === 'ON';
        
        const allEnabled = domainEnabled && privateEnabled && publicEnabled;
        const anyEnabled = domainEnabled || privateEnabled || publicEnabled;
        
        firewallStatus = {
          enabled: anyEnabled,
          allProfilesEnabled: allEnabled,
          profiles: {
            domain: domainEnabled,
            private: privateEnabled,
            public: publicEnabled
          }
        };
        
        // Score based on profile coverage
        if (allEnabled) score = 100;
        else if (anyEnabled) score = 50;
        else score = 0;
      } catch (e) {
        logger.error(`Failed to check Windows firewall: ${e.message}`);
      }
    } else if (isMac) {
      // macOS firewall
      try {
        const { stdout } = await exec('/usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate');
        const enabled = stdout.includes('enabled');
        
        firewallStatus = {
          enabled,
          type: 'Application Firewall'
        };
        
        score = enabled ? 100 : 0;
      } catch (e) {
        logger.error(`Failed to check macOS firewall: ${e.message}`);
      }
    } else if (isLinux) {
      // Linux firewall
      try {
        // Try ufw first
        try {
          const { stdout: ufwOutput } = await exec('ufw status');
          const ufwEnabled = ufwOutput.includes('Status: active');
          
          firewallStatus = {
            enabled: ufwEnabled,
            type: 'ufw'
          };
          
          score = ufwEnabled ? 100 : 0;
        } catch (ufwError) {
          // Try iptables
          const { stdout: iptablesOutput } = await exec('iptables -L');
          const hasRules = iptablesOutput.split('\n').some(line => 
            line.startsWith('ACCEPT') || line.startsWith('DROP') || line.startsWith('REJECT')
          );
          
          firewallStatus = {
            enabled: hasRules,
            type: 'iptables'
          };
          
          score = hasRules ? 100 : 0;
        }
      } catch (e) {
        logger.error(`Failed to check Linux firewall: ${e.message}`);
      }
    }
    
    return {
      firewallStatus,
      score,
      rating: score >= 80 ? 'good' : score >= 50 ? 'fair' : 'poor'
    };
  } catch (error) {
    logger.error(`Failed to check firewall configuration: ${error.message}`);
    return {
      error: error.message,
      score: 0,
      rating: 'unknown'
    };
  }
}

/**
 * Check for security software
 */
async function checkSecuritySoftware() {
  try {
    const securitySoftware = [];
    let score = 0;
    
    if (isWindows) {
      // Windows security software
      try {
        // Check for Windows Defender
        const { stdout: defenderOutput } = await exec('powershell -Command "Get-MpComputerStatus | ConvertTo-Json"');
        
        try {
          const defender = JSON.parse(defenderOutput);
          const defenderEnabled = defender.RealTimeProtectionEnabled;
          
          if (defenderEnabled) {
            securitySoftware.push({
              name: 'Windows Defender',
              status: 'enabled',
              type: 'antivirus'
            });
          } else {
            securitySoftware.push({
              name: 'Windows Defender',
              status: 'disabled',
              type: 'antivirus'
            });
          }
        } catch (e) {
          logger.error(`Failed to parse Windows Defender status: ${e.message}`);
        }
        
        // Check for third-party antivirus using WMI
        const { stdout: antivirusOutput } = await exec('powershell -Command "Get-WmiObject -Namespace \'root\\SecurityCenter2\' -Class AntiVirusProduct | Select-Object displayName | ConvertTo-Json"');
        
        try {
          const antivirus = JSON.parse(antivirusOutput);
          
          if (Array.isArray(antivirus)) {
            antivirus.forEach(av => {
              if (av.displayName && !av.displayName.includes('Windows Defender')) {
                securitySoftware.push({
                  name: av.displayName,
                  status: 'installed',
                  type: 'antivirus'
                });
              }
            });
          } else if (antivirus && antivirus.displayName && !antivirus.displayName.includes('Windows Defender')) {
            securitySoftware.push({
              name: antivirus.displayName,
              status: 'installed',
              type: 'antivirus'
            });
          }
        } catch (e) {
          logger.error(`Failed to parse third-party antivirus status: ${e.message}`);
        }
      } catch (e) {
        logger.error(`Failed to check Windows security software: ${e.message}`);
      }
    } else if (isMac) {
      // macOS security software
      try {
        // Check for Gatekeeper
        const { stdout: gatekeeperOutput } = await exec('spctl --status');
        const gatekeeperEnabled = !gatekeeperOutput.includes('disabled');
        
        if (gatekeeperEnabled) {
          securitySoftware.push({
            name: 'Gatekeeper',
            status: 'enabled',
            type: 'system security'
          });
        }
        
        // Check for XProtect
        if (await fileExists('/Library/Apple/System/Library/CoreServices/XProtect.bundle')) {
          securitySoftware.push({
            name: 'XProtect',
            status: 'installed',
            type: 'antivirus'
          });
        }
        
        // Check for common macOS antivirus
        const antivirusApps = [
          '/Applications/Sophos/Sophos Antivirus.app',
          '/Applications/Avast.app',
          '/Applications/AVG.app',
          '/Applications/ClamXAV.app',
          '/Applications/Norton Security.app',
          '/Applications/McAfee Endpoint Security.app'
        ];
        
        for (const app of antivirusApps) {
          if (await fileExists(app)) {
            securitySoftware.push({
              name: app.split('/').pop().replace('.app', ''),
              status: 'installed',
              type: 'antivirus'
            });
          }
        }
      } catch (e) {
        logger.error(`Failed to check macOS security software: ${e.message}`);
      }
    } else if (isLinux) {
      // Linux security software
      try {
        // Check for common Linux security tools
        const securityTools = [
          { command: 'clamav', name: 'ClamAV', type: 'antivirus' },
          { command: 'rkhunter', name: 'RootKit Hunter', type: 'rootkit detector' },
          { command: 'chkrootkit', name: 'chkrootkit', type: 'rootkit detector' },
          { command: 'snort', name: 'Snort', type: 'intrusion detection' },
          { command: 'aide', name: 'AIDE', type: 'file integrity' },
          { command: 'lynis', name: 'Lynis', type: 'security auditing' },
          { command: 'selinux', checkCommand: 'sestatus', name: 'SELinux', type: 'access control' },
          { command: 'apparmor', checkCommand: 'aa-status', name: 'AppArmor', type: 'access control' }
        ];
        
        for (const tool of securityTools) {
          try {
            const checkCommand = tool.checkCommand || `command -v ${tool.command}`;
            await exec(checkCommand);
            
            // Tool exists
            securitySoftware.push({
              name: tool.name,
              status: 'installed',
              type: tool.type
            });
          } catch {
            // Tool not found, skip
          }
        }
      } catch (e) {
        logger.error(`Failed to check Linux security software: ${e.message}`);
      }
    }
    
    // Calculate score based on security software presence
    if (securitySoftware.length >= 2) {
      score = 100;
    } else if (securitySoftware.length === 1) {
      score = 75;
    } else {
      score = 0;
    }
    
    return {
      securitySoftware,
      count: securitySoftware.length,
      score,
      rating: score >= 80 ? 'good' : score >= 50 ? 'fair' : 'poor'
    };
  } catch (error) {
    logger.error(`Failed to check security software: ${error.message}`);
    return {
      error: error.message,
      score: 0,
      rating: 'unknown'
    };
  }
}

module.exports = {
  getBasicInfo,
  getDetailedInfo,
  checkConfiguration
};