/**
 * Detailed Security Analyzer for CyberShieldX
 * Provides in-depth analysis of security scan results with detailed remediation plans
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');

// Load the report template
const reportTemplatePath = path.join(__dirname, '../scanners/detailed-report-template.json');
const reportTemplate = JSON.parse(fs.readFileSync(reportTemplatePath, 'utf8'));

/**
 * Analyze scan results and create detailed report with remediation steps
 * @param {Object} scanResults - Combined results from all scanners
 * @param {string} clientId - Unique client identifier
 * @param {Object} options - Analysis options
 * @returns {Object} Detailed security report with remediation plans
 */
async function analyzeResults(scanResults, clientId, options = {}) {
  const startTime = Date.now();
  
  // Initialize the report based on template
  const report = JSON.parse(JSON.stringify(reportTemplate.reportStructure));
  
  // Fill general information
  report.summary.scanDate = new Date().toISOString();
  report.summary.clientInfo.id = clientId;
  report.summary.clientInfo.name = scanResults.systemInfo?.hostname || 'Unknown';
  report.summary.clientInfo.ipAddress = maskSensitiveData(scanResults.networkInfo?.ipAddress || 'Unknown');
  report.summary.clientInfo.macAddress = maskSensitiveData(scanResults.networkInfo?.macAddress || 'Unknown', 'mac');
  report.summary.clientInfo.osInfo = scanResults.systemInfo?.osDetails || 'Unknown';
  report.summary.clientInfo.systemType = scanResults.systemInfo?.systemType || 'Unknown';
  
  // Process each scan type and populate the report
  await processNetworkScan(report, scanResults);
  await processSystemScan(report, scanResults);
  await processVulnerabilityScan(report, scanResults);
  await processMalwareScan(report, scanResults);
  await processComplianceCheck(report, scanResults);
  
  // Build remediation plan based on found issues
  buildRemediationPlan(report);
  
  // Update summary statistics
  calculateRiskScore(report);
  updateSummaryIssueCount(report);
  
  // Record scan duration
  report.summary.scanDuration = formatDuration(Date.now() - startTime);
  
  return report;
}

/**
 * Process network scan results and populate report
 * @param {Object} report - The report object to populate
 * @param {Object} scanResults - Combined scan results
 */
async function processNetworkScan(report, scanResults) {
  const networkResults = scanResults.networkScan || {};
  
  // Process open ports
  if (networkResults.openPorts) {
    report.networkScan.openPorts = networkResults.openPorts.map(port => ({
      port: port.port,
      service: port.service,
      state: port.state,
      protocol: port.protocol
    }));
    
    // Identify potentially vulnerable services
    const vulnerableServices = networkResults.openPorts.filter(port => {
      // Common vulnerable services if not properly secured
      const potentiallyRiskyServices = [
        'telnet', 'ftp', 'rsh', 'rexec', 'tftp', 'smtp', 
        'smb', 'netbios', 'vnc', 'redis', 'mongodb', 'cassandra',
        'elasticsearch', 'memcached', 'ms-sql-s', 'mysql', 'postgresql'
      ];
      
      return potentiallyRiskyServices.some(service => 
        port.service && port.service.toLowerCase().includes(service)
      );
    });
    
    report.networkScan.vulnerableServices = vulnerableServices;
    
    // Create issues for vulnerable services
    vulnerableServices.forEach(service => {
      const issue = createIssue({
        title: `Potentially insecure service running: ${service.service} on port ${service.port}`,
        description: `The service ${service.service} running on port ${service.port}/${service.protocol} could pose a security risk if not properly secured.`,
        impact: `Unauthorized access to systems, data exfiltration, and potential for service exploitation.`,
        severity: service.service.toLowerCase().includes('telnet') || service.service.toLowerCase().includes('ftp') ? 'critical' : 'high',
        category: 'Insecure Services',
        location: `Port ${service.port}/${service.protocol}`,
        recommendation: `Close the port if the service is unused. If needed, implement proper authentication, encryption, and access controls.`,
        remediationSteps: [
          `Verify if this service is necessary for business operations.`,
          `If unnecessary, disable the service and close the port in your firewall.`,
          `If required, update to the latest secure version and enable encryption.`,
          `Implement strong authentication and restrict access by IP.`,
          `Configure proper logging to monitor access attempts.`
        ]
      });
      
      report.networkScan.issues.push(issue);
    });
  }
  
  // Process network devices
  if (networkResults.devices) {
    report.networkScan.networkDevices = networkResults.devices.map(device => ({
      hostname: device.hostname || 'Unknown',
      ipAddress: maskSensitiveData(device.ipAddress || 'Unknown'),
      macAddress: maskSensitiveData(device.macAddress || 'Unknown', 'mac'),
      vendor: device.vendor || 'Unknown',
      status: device.status || 'Unknown'
    }));
    
    // Identify potentially unauthorized devices
    const unauthorizedDevices = networkResults.devices.filter(device => 
      !device.authorized && device.status === 'up'
    );
    
    if (unauthorizedDevices.length > 0) {
      const issue = createIssue({
        title: `Detected ${unauthorizedDevices.length} potentially unauthorized devices on the network`,
        description: `Devices without explicit authorization were detected on the network. These could represent security risks.`,
        impact: `Unauthorized devices may introduce vulnerabilities or be used for malicious purposes such as data theft or network monitoring.`,
        severity: 'medium',
        category: 'Network Access Control',
        location: 'Local Network',
        recommendation: `Implement network access control (NAC) to prevent unauthorized devices from connecting to the network.`,
        remediationSteps: [
          `Document all authorized devices in a network inventory.`,
          `Implement 802.1X authentication for network access.`,
          `Configure DHCP to only assign IP addresses to known MAC addresses.`,
          `Segment the network to isolate unknown devices.`,
          `Consider implementing a network access control solution.`
        ]
      });
      
      report.networkScan.issues.push(issue);
    }
  }
  
  // Process wireless security
  if (networkResults.wirelessSecurity) {
    report.networkScan.wirelessSecurity = {
      encryptionType: networkResults.wirelessSecurity.encryption || 'Unknown',
      signalStrength: networkResults.wirelessSecurity.signalStrength || 'Unknown',
      vulnerabilities: networkResults.wirelessSecurity.vulnerabilities || []
    };
    
    // Check for weak wireless security
    if (networkResults.wirelessSecurity.encryption) {
      const weakEncryption = ['WEP', 'WPA', 'Open', 'None'];
      if (weakEncryption.some(type => networkResults.wirelessSecurity.encryption.includes(type))) {
        const issue = createIssue({
          title: `Weak wireless network encryption`,
          description: `The wireless network is using ${networkResults.wirelessSecurity.encryption} encryption, which is considered insecure.`,
          impact: `Weak encryption can be broken, allowing attackers to intercept network traffic, steal sensitive information, and gain unauthorized access to the network.`,
          severity: networkResults.wirelessSecurity.encryption.includes('WEP') || networkResults.wirelessSecurity.encryption.includes('Open') ? 'critical' : 'high',
          category: 'Wireless Security',
          location: 'Wireless Network',
          recommendation: `Upgrade to WPA3 encryption with a strong, unique password. If WPA3 is not available, use WPA2 with AES.`,
          remediationSteps: [
            `Access your wireless router's admin interface.`,
            `Change the encryption type to WPA3 if supported, or WPA2-AES if not.`,
            `Generate a strong, unique password of at least 12 characters.`,
            `Disable WPS (Wi-Fi Protected Setup) as it can be vulnerable.`,
            `Consider implementing a guest network for non-trusted devices.`,
            `Update router firmware to the latest version.`
          ]
        });
        
        report.networkScan.issues.push(issue);
        report.networkScan.wirelessSecurity.vulnerabilities.push(`Weak encryption (${networkResults.wirelessSecurity.encryption})`);
      }
    }
  }
  
  // Process firewall status
  if (networkResults.firewallStatus) {
    report.networkScan.firewallStatus = {
      enabled: networkResults.firewallStatus.enabled || false,
      rules: networkResults.firewallStatus.rules || [],
      recommendations: []
    };
    
    // Check if firewall is disabled
    if (!networkResults.firewallStatus.enabled) {
      const issue = createIssue({
        title: `Firewall is disabled`,
        description: `The system firewall is currently disabled, leaving the system vulnerable to unauthorized access.`,
        impact: `Without a firewall, the system is exposed to potential attacks from the internet and local network, increasing the risk of unauthorized access and malware infection.`,
        severity: 'critical',
        category: 'Perimeter Security',
        location: 'System Firewall',
        recommendation: `Enable the system firewall immediately with a deny-by-default policy.`,
        remediationSteps: [
          `Enable the system firewall.`,
          `Configure a deny-by-default policy.`,
          `Allow only necessary incoming and outgoing connections.`,
          `Test that legitimate applications can still function.`,
          `Implement logging for firewall activities.`
        ]
      });
      
      report.networkScan.issues.push(issue);
      report.networkScan.firewallStatus.recommendations.push('Enable the system firewall immediately');
    }
    
    // Check for overly permissive rules
    if (networkResults.firewallStatus.rules) {
      const permissiveRules = networkResults.firewallStatus.rules.filter(rule => 
        rule.action === 'allow' && (rule.remoteAddress === 'any' || rule.remoteAddress === '0.0.0.0/0')
      );
      
      if (permissiveRules.length > 0) {
        const issue = createIssue({
          title: `Overly permissive firewall rules detected`,
          description: `Found ${permissiveRules.length} firewall rules that allow traffic from any source address.`,
          impact: `Overly permissive rules reduce the effectiveness of the firewall and may allow unauthorized access from untrusted sources.`,
          severity: 'high',
          category: 'Perimeter Security',
          location: 'System Firewall',
          recommendation: `Review and restrict firewall rules to allow traffic only from trusted sources and to necessary services.`,
          remediationSteps: [
            `Review all firewall rules, especially those allowing traffic from any source.`,
            `Replace "any" source address with specific IPs or ranges for trusted sources.`,
            `Implement the principle of least privilege by allowing only necessary ports.`,
            `Document the purpose of each rule for future reference.`,
            `Consider implementing geolocation-based filtering if appropriate.`
          ]
        });
        
        report.networkScan.issues.push(issue);
        report.networkScan.firewallStatus.recommendations.push('Review and restrict overly permissive firewall rules');
      }
    }
  }
}

/**
 * Process system scan results and populate report
 * @param {Object} report - The report object to populate
 * @param {Object} scanResults - Combined scan results
 */
async function processSystemScan(report, scanResults) {
  const systemResults = scanResults.systemScan || {};
  
  // Process OS patches
  if (systemResults.patches) {
    report.systemScan.osPatches = {
      installedPatches: systemResults.patches.installed || [],
      missingPatches: systemResults.patches.missing || [],
      lastUpdateDate: systemResults.patches.lastUpdate || 'Unknown'
    };
    
    // Check for missing security patches
    if (systemResults.patches.missing && systemResults.patches.missing.length > 0) {
      const criticalPatches = systemResults.patches.missing.filter(patch => 
        patch.severity === 'Critical' || patch.severity === 'Important'
      );
      
      if (criticalPatches.length > 0) {
        const issue = createIssue({
          title: `Missing critical security patches`,
          description: `Found ${criticalPatches.length} critical security patches that need to be installed.`,
          impact: `Missing security patches can leave the system vulnerable to known exploits, potentially allowing unauthorized access, data theft, or malware infection.`,
          severity: 'critical',
          category: 'System Updates',
          location: 'Operating System',
          recommendation: `Install all missing security patches as soon as possible, prioritizing critical and important updates.`,
          remediationSteps: [
            `Run the system update utility (Windows Update, apt, yum, etc.).`,
            `Install all critical and important security updates.`,
            `If necessary, schedule a maintenance window for updates requiring restarts.`,
            `Configure automatic updates to prevent future gaps.`,
            `Document update policy and ensure regular maintenance.`
          ]
        });
        
        report.systemScan.issues.push(issue);
      }
      
      // Check for outdated system
      const outdatedSystem = systemResults.patches.lastUpdate ? 
        (new Date() - new Date(systemResults.patches.lastUpdate)) / (1000 * 60 * 60 * 24) > 90 : false;
      
      if (outdatedSystem) {
        const issue = createIssue({
          title: `System significantly outdated`,
          description: `The system has not been updated for over 90 days (last update: ${systemResults.patches.lastUpdate}).`,
          impact: `Severely outdated systems face a higher risk of compromise through known vulnerabilities that have been patched in more recent updates.`,
          severity: 'high',
          category: 'System Updates',
          location: 'Operating System',
          recommendation: `Perform a full system update immediately and implement regular update checks.`,
          remediationSteps: [
            `Back up important data before updating.`,
            `Perform a complete system update.`,
            `Enable automatic updates when possible.`,
            `Create a schedule for manual update checks if automatic updates aren't possible.`,
            `Consider implementing a patch management solution for larger environments.`
          ]
        });
        
        report.systemScan.issues.push(issue);
      }
    }
  }
  
  // Process user accounts
  if (systemResults.userAccounts) {
    report.systemScan.userAccounts = {
      totalAccounts: systemResults.userAccounts.total || 0,
      administratorAccounts: systemResults.userAccounts.administrators || 0,
      passwordPolicy: {
        minimumLength: systemResults.userAccounts.passwordPolicy?.minimumLength || 0,
        complexityEnabled: systemResults.userAccounts.passwordPolicy?.complexityEnabled || false,
        expirationDays: systemResults.userAccounts.passwordPolicy?.expirationDays || 0
      },
      issues: []
    };
    
    // Check for excessive admin accounts
    if (systemResults.userAccounts.administrators > 2) {
      const issue = createIssue({
        title: `Excessive number of administrator accounts`,
        description: `Found ${systemResults.userAccounts.administrators} accounts with administrator privileges.`,
        impact: `More administrator accounts increase the attack surface and the likelihood of privilege escalation through compromised accounts.`,
        severity: 'high',
        category: 'Account Security',
        location: 'User Account Management',
        recommendation: `Review all administrator accounts, remove unnecessary ones, and ensure proper controls for required admin accounts.`,
        remediationSteps: [
          `Audit all administrator accounts and their purposes.`,
          `Remove unnecessary admin accounts or demote them to standard user.`,
          `Ensure admin accounts are used only for administrative tasks.`,
          `Consider implementing Just-In-Time (JIT) admin access.`,
          `Implement multi-factor authentication for all admin accounts.`
        ]
      });
      
      report.systemScan.issues.push(issue);
      report.systemScan.userAccounts.issues.push('Excessive administrator accounts');
    }
    
    // Check for weak password policy
    if (systemResults.userAccounts.passwordPolicy) {
      const policy = systemResults.userAccounts.passwordPolicy;
      const weakPolicy = policy.minimumLength < 12 || !policy.complexityEnabled || policy.expirationDays > 90;
      
      if (weakPolicy) {
        const weakPoints = [];
        if (policy.minimumLength < 12) weakPoints.push(`minimum length (${policy.minimumLength}) less than 12 characters`);
        if (!policy.complexityEnabled) weakPoints.push('password complexity not required');
        if (policy.expirationDays > 90) weakPoints.push(`password expiration (${policy.expirationDays} days) exceeds 90 days`);
        
        const issue = createIssue({
          title: `Weak password policy detected`,
          description: `The current password policy has the following weaknesses: ${weakPoints.join(', ')}.`,
          impact: `Weak password policies may allow easily guessable passwords, increasing the risk of credential theft and unauthorized access.`,
          severity: 'high',
          category: 'Account Security',
          location: 'Password Policy',
          recommendation: `Strengthen the password policy to enforce longer, complex passwords with reasonable expiration periods.`,
          remediationSteps: [
            `Set minimum password length to at least 12 characters.`,
            `Enable password complexity requirements.`,
            `Set password expiration to 90 days or less (or implement NIST recommendations for not expiring strong passwords).`,
            `Implement multi-factor authentication where possible.`,
            `Consider using a password manager with random password generation.`
          ]
        });
        
        report.systemScan.issues.push(issue);
        report.systemScan.userAccounts.issues.push('Weak password policy');
      }
    }
    
    // Check for dormant accounts
    if (systemResults.userAccounts.dormant && systemResults.userAccounts.dormant.length > 0) {
      const issue = createIssue({
        title: `Dormant user accounts detected`,
        description: `Found ${systemResults.userAccounts.dormant.length} accounts that have not been active for over 90 days.`,
        impact: `Dormant accounts may be forgotten and left unsecured, providing an entry point for unauthorized access.`,
        severity: 'medium',
        category: 'Account Security',
        location: 'User Account Management',
        recommendation: `Disable dormant accounts and implement a regular account review process.`,
        remediationSteps: [
          `Review each dormant account to determine if it's still needed.`,
          `Disable or remove unneeded accounts.`,
          `For needed but rarely used accounts, implement stronger security controls.`,
          `Document a process for regular account audits (e.g., quarterly).`,
          `Implement automated account deactivation based on inactivity.`
        ]
      });
      
      report.systemScan.issues.push(issue);
      report.systemScan.userAccounts.issues.push('Dormant accounts present');
    }
  }
  
  // Process file permissions
  if (systemResults.filePermissions) {
    report.systemScan.filePermissions = {
      criticalFiles: systemResults.filePermissions.criticalFiles || [],
      issues: []
    };
    
    // Check for insecure file permissions
    if (systemResults.filePermissions.insecure && systemResults.filePermissions.insecure.length > 0) {
      const issue = createIssue({
        title: `Insecure file permissions`,
        description: `Found ${systemResults.filePermissions.insecure.length} critical files with insufficient permissions control.`,
        impact: `Insecure file permissions may allow unauthorized users to read, modify, or execute important files, leading to data breaches or system compromise.`,
        severity: 'high',
        category: 'File System Security',
        location: 'File System',
        recommendation: `Review and correct permissions on critical files to ensure proper access controls.`,
        remediationSteps: [
          `Identify all critical files and their required permissions.`,
          `Update permissions to follow the principle of least privilege.`,
          `Remove world-readable/writable permissions where inappropriate.`,
          `Ensure ownership is correctly assigned.`,
          `Implement regular permissions audits.`
        ]
      });
      
      report.systemScan.issues.push(issue);
      report.systemScan.filePermissions.issues.push('Insecure permissions on critical files');
    }
  }
  
  // Process security settings
  if (systemResults.securitySettings) {
    report.systemScan.securitySettings = {
      antivirusStatus: systemResults.securitySettings.antivirus || 'Unknown',
      firewallStatus: systemResults.securitySettings.firewall || 'Unknown',
      autoUpdatesEnabled: systemResults.securitySettings.autoUpdates || false,
      diskEncryptionStatus: systemResults.securitySettings.diskEncryption || 'Unknown',
      secureBootEnabled: systemResults.securitySettings.secureBoot || false,
      issues: []
    };
    
    // Check antivirus status
    if (systemResults.securitySettings.antivirus !== 'Active' && 
        systemResults.securitySettings.antivirus !== 'Up-to-date') {
      const issue = createIssue({
        title: `Inadequate antivirus protection`,
        description: `Antivirus status: ${systemResults.securitySettings.antivirus}. The system does not have active, up-to-date antivirus protection.`,
        impact: `Without proper antivirus protection, the system is more vulnerable to malware, ransomware, and other malicious software.`,
        severity: 'high',
        category: 'Endpoint Protection',
        location: 'Antivirus System',
        recommendation: `Install or update antivirus software and ensure real-time protection is enabled.`,
        remediationSteps: [
          `Install a reputable antivirus/endpoint protection solution.`,
          `Update virus definitions to the latest version.`,
          `Enable real-time protection.`,
          `Perform a full system scan.`,
          `Configure scheduled scans and automatic updates.`
        ]
      });
      
      report.systemScan.issues.push(issue);
      report.systemScan.securitySettings.issues.push('Inadequate antivirus protection');
    }
    
    // Check disk encryption
    if (systemResults.securitySettings.diskEncryption !== 'Full' && 
        systemResults.securitySettings.diskEncryption !== 'Enabled') {
      const issue = createIssue({
        title: `Disk encryption not enabled`,
        description: `Disk encryption status: ${systemResults.securitySettings.diskEncryption}. The system's storage is not fully encrypted.`,
        impact: `Unencrypted disks are vulnerable to data theft if the device is lost or stolen, potentially leading to data breaches.`,
        severity: 'high',
        category: 'Data Protection',
        location: 'System Storage',
        recommendation: `Enable full disk encryption to protect sensitive data in case of device theft or loss.`,
        remediationSteps: [
          `Back up all important data before proceeding.`,
          `Enable disk encryption (BitLocker, FileVault, LUKS, etc.).`,
          `Store recovery keys in a secure location.`,
          `Verify encryption status after implementation.`,
          `Consider hardware-based encryption for added security.`
        ]
      });
      
      report.systemScan.issues.push(issue);
      report.systemScan.securitySettings.issues.push('Disk encryption not enabled');
    }
    
    // Check auto updates
    if (!systemResults.securitySettings.autoUpdates) {
      const issue = createIssue({
        title: `Automatic updates disabled`,
        description: `Automatic system updates are not enabled, which may lead to security vulnerabilities remaining unpatched.`,
        impact: `Without automatic updates, the system may remain vulnerable to known security issues that have been patched by the vendor.`,
        severity: 'medium',
        category: 'System Updates',
        location: 'Operating System',
        recommendation: `Enable automatic system updates to ensure timely installation of security patches.`,
        remediationSteps: [
          `Enable automatic updates in system settings.`,
          `Configure updates to be installed at convenient times.`,
          `Ensure the system checks for updates daily.`,
          `Consider a centralized patch management solution for enterprise environments.`,
          `Implement a process for testing critical updates in sensitive environments.`
        ]
      });
      
      report.systemScan.issues.push(issue);
      report.systemScan.securitySettings.issues.push('Automatic updates disabled');
    }
  }
}

/**
 * Process vulnerability scan results and populate report
 * @param {Object} report - The report object to populate
 * @param {Object} scanResults - Combined scan results
 */
async function processVulnerabilityScan(report, scanResults) {
  const vulnerabilityResults = scanResults.vulnerabilityScan || {};
  
  // Process CVE findings
  if (vulnerabilityResults.cveFindings) {
    report.vulnerabilityScan.cveFindings = vulnerabilityResults.cveFindings.map(cve => ({
      id: cve.id,
      severity: cve.severity,
      exploitable: cve.exploitable || false,
      description: cve.description,
      affectedSoftware: cve.affectedSoftware
    }));
    
    // Create issues for critical and high CVEs
    const severeVulnerabilities = vulnerabilityResults.cveFindings.filter(cve => 
      cve.severity === 'Critical' || cve.severity === 'High'
    );
    
    severeVulnerabilities.forEach(cve => {
      const issue = createIssue({
        title: `${cve.severity} severity vulnerability: ${cve.id}`,
        description: cve.description,
        impact: `This vulnerability could allow an attacker to ${cve.exploitable ? 'easily ' : ''}compromise system security, potentially leading to unauthorized access, data theft, or service disruption.`,
        severity: cve.severity.toLowerCase(),
        category: 'Software Vulnerabilities',
        location: cve.affectedSoftware ? `Software: ${cve.affectedSoftware.join(', ')}` : 'System',
        recommendation: `Apply vendor-provided patches or update the affected software to a non-vulnerable version.`,
        remediationSteps: [
          `Check vendor website for security patches addressing this CVE.`,
          `Apply security patches following change management procedures.`,
          `If patches are unavailable, consider implementing mitigating controls.`,
          `Update affected software to the latest version.`,
          `Verify the vulnerability has been resolved through rescanning.`
        ],
        cveIds: [cve.id]
      });
      
      report.vulnerabilityScan.issues.push(issue);
    });
  }
  
  // Process software vulnerabilities
  if (vulnerabilityResults.softwareVulnerabilities) {
    report.vulnerabilityScan.softwareVulnerabilities = vulnerabilityResults.softwareVulnerabilities.map(vuln => ({
      software: vuln.software,
      version: vuln.version,
      vulnerableVersion: vuln.vulnerableVersion || true,
      latestVersion: vuln.latestVersion,
      issues: vuln.issues || []
    }));
    
    // Create issues for outdated software
    const outdatedSoftware = vulnerabilityResults.softwareVulnerabilities.filter(sw => 
      sw.vulnerableVersion || (sw.version !== sw.latestVersion)
    );
    
    if (outdatedSoftware.length > 0) {
      outdatedSoftware.forEach(sw => {
        const issue = createIssue({
          title: `Outdated software with security implications: ${sw.software}`,
          description: `Running ${sw.software} version ${sw.version}, which is outdated (latest: ${sw.latestVersion}) and may contain security vulnerabilities.`,
          impact: `Outdated software versions often contain known security vulnerabilities that can be exploited to gain unauthorized access or compromise system integrity.`,
          severity: sw.vulnerableVersion ? 'high' : 'medium',
          category: 'Software Vulnerabilities',
          location: `Software: ${sw.software}`,
          recommendation: `Update ${sw.software} to the latest version (${sw.latestVersion}).`,
          remediationSteps: [
            `Download the latest version from the official source.`,
            `Follow the vendor's upgrade procedure.`,
            `Backup configurations and data before upgrading.`,
            `Test application functionality after upgrading.`,
            `Document the upgrade process for future reference.`
          ]
        });
        
        report.vulnerabilityScan.issues.push(issue);
      });
    }
  }
  
  // Process web application findings
  if (vulnerabilityResults.webApplications) {
    report.vulnerabilityScan.webApplicationFindings = [];
    
    vulnerabilityResults.webApplications.forEach(webapp => {
      // Common web vulnerabilities to check for
      const webVulnCategories = [
        'SQL Injection', 'XSS', 'CSRF', 'Insecure Deserialization', 
        'Authentication Bypass', 'Authorization Failure', 'Sensitive Data Exposure',
        'XML External Entity', 'Security Misconfiguration'
      ];
      
      webapp.vulnerabilities.forEach(vuln => {
        // Add to web application findings
        report.vulnerabilityScan.webApplicationFindings.push({
          url: vuln.url,
          vulnerability: vuln.type,
          severity: vuln.severity,
          description: vuln.description
        });
        
        // Create issues for web vulnerabilities
        if (vuln.severity === 'Critical' || vuln.severity === 'High') {
          const issue = createIssue({
            title: `Web application vulnerability: ${vuln.type}`,
            description: vuln.description,
            impact: `This vulnerability could allow attackers to compromise the web application, potentially leading to data theft, unauthorized access, or service disruption.`,
            severity: vuln.severity.toLowerCase(),
            category: 'Web Application Security',
            location: `URL: ${vuln.url}`,
            recommendation: `Fix the vulnerability by implementing proper input validation, output encoding, or other security controls appropriate for this vulnerability type.`,
            remediationSteps: getWebVulnerabilityRemediationSteps(vuln.type)
          });
          
          report.vulnerabilityScan.issues.push(issue);
        }
      });
    });
  }
  
  // Process database vulnerabilities
  if (vulnerabilityResults.databases) {
    report.vulnerabilityScan.databaseVulnerabilities = [];
    
    vulnerabilityResults.databases.forEach(db => {
      db.vulnerabilities.forEach(vuln => {
        // Add to database vulnerabilities
        report.vulnerabilityScan.databaseVulnerabilities.push({
          database: db.name,
          type: db.type,
          vulnerability: vuln.type,
          severity: vuln.severity,
          description: vuln.description
        });
        
        // Create issues for database vulnerabilities
        if (vuln.severity === 'Critical' || vuln.severity === 'High') {
          const issue = createIssue({
            title: `Database vulnerability: ${vuln.type}`,
            description: vuln.description,
            impact: `This vulnerability could compromise database security, potentially leading to unauthorized data access, data corruption, or data loss.`,
            severity: vuln.severity.toLowerCase(),
            category: 'Database Security',
            location: `Database: ${db.name} (${db.type})`,
            recommendation: `Apply vendor security patches, update database software, and implement proper security configurations.`,
            remediationSteps: getDatabaseVulnerabilityRemediationSteps(vuln.type)
          });
          
          report.vulnerabilityScan.issues.push(issue);
        }
      });
    });
  }
}

/**
 * Process malware scan results and populate report
 * @param {Object} report - The report object to populate
 * @param {Object} scanResults - Combined scan results
 */
async function processMalwareScan(report, scanResults) {
  const malwareResults = scanResults.malwareScan || {};
  
  // Process malware detection
  report.malwareScan.filesScanned = malwareResults.filesScanned || 0;
  
  // Process detected malware
  if (malwareResults.detections) {
    report.malwareScan.malwareDetected = malwareResults.detections.map(detection => ({
      type: detection.type,
      name: detection.name,
      location: detection.path,
      severity: detection.severity,
      quarantined: detection.quarantined || false
    }));
    
    // Create issues for malware detections
    malwareResults.detections.forEach(detection => {
      const issue = createIssue({
        title: `Malware detected: ${detection.name}`,
        description: `Detected ${detection.type} malware "${detection.name}" at location "${detection.path}".`,
        impact: `Malware can compromise system security, steal sensitive information, damage files, or allow unauthorized remote access to the system.`,
        severity: detection.quarantined ? 'medium' : 'critical',
        category: 'Malware',
        location: detection.path,
        recommendation: detection.quarantined ? 
          `Review the quarantined malware and delete it if confirmed malicious.` : 
          `Immediately quarantine or remove the malware and scan the system for additional infections.`,
        remediationSteps: [
          detection.quarantined ? 
            `Verify the quarantined file is indeed malicious.` : 
            `Use antivirus software to quarantine the malware immediately.`,
          `Scan the entire system for additional infections.`,
          `Identify how the malware entered the system.`,
          `Update security software and system patches.`,
          `Change passwords for sensitive accounts as they may have been compromised.`,
          `Review system logs for suspicious activities.`
        ]
      });
      
      report.malwareScan.issues.push(issue);
    });
  }
  
  // Process suspicious files
  if (malwareResults.suspicious) {
    report.malwareScan.suspiciousFiles = malwareResults.suspicious.map(file => ({
      location: file.path,
      reason: file.reason,
      riskScore: file.riskScore
    }));
    
    // Create issues for high-risk suspicious files
    const highRiskFiles = malwareResults.suspicious.filter(file => 
      file.riskScore >= 7
    );
    
    if (highRiskFiles.length > 0) {
      const issue = createIssue({
        title: `High-risk suspicious files detected`,
        description: `Found ${highRiskFiles.length} suspicious files with high risk scores that may be malicious.`,
        impact: `These files exhibit behavior or characteristics typical of malware and may pose a security risk to the system.`,
        severity: 'high',
        category: 'Potential Malware',
        location: 'Multiple Locations',
        recommendation: `Investigate these files and remove or quarantine them if confirmed malicious.`,
        remediationSteps: [
          `Review each suspicious file in detail.`,
          `Submit unknown files to online scanning services like VirusTotal.`,
          `Quarantine or remove files confirmed as malicious.`,
          `Monitor system for unusual behavior.`,
          `Consider implementing application whitelisting for better control.`
        ]
      });
      
      report.malwareScan.issues.push(issue);
    }
  }
  
  // Process persistence mechanisms
  if (malwareResults.persistenceMechanisms) {
    report.malwareScan.persistenceMechanisms = malwareResults.persistenceMechanisms.map(mechanism => ({
      type: mechanism.type,
      location: mechanism.location,
      associated: mechanism.associatedWith,
      riskLevel: mechanism.riskLevel
    }));
    
    // Create issues for suspicious persistence mechanisms
    if (malwareResults.persistenceMechanisms.length > 0) {
      const issue = createIssue({
        title: `Suspicious persistence mechanisms detected`,
        description: `Found ${malwareResults.persistenceMechanisms.length} mechanisms that may be used by malware to maintain access to the system.`,
        impact: `Persistence mechanisms allow malware to survive system reboots, making it difficult to completely remove infections and allowing continued unauthorized access.`,
        severity: 'high',
        category: 'Malware Persistence',
        location: 'System',
        recommendation: `Investigate each persistence mechanism and remove any that are associated with malicious software.`,
        remediationSteps: [
          `Review each identified persistence mechanism in detail.`,
          `Research unknown entries to determine legitimacy.`,
          `Remove entries associated with malware.`,
          `Perform a full system scan after removal.`,
          `Consider using specialized tools designed to detect persistence mechanisms.`
        ]
      });
      
      report.malwareScan.issues.push(issue);
    }
  }
}

/**
 * Process compliance check results and populate report
 * @param {Object} report - The report object to populate
 * @param {Object} scanResults - Combined scan results
 */
async function processComplianceCheck(report, scanResults) {
  const complianceResults = scanResults.complianceCheck || {};
  
  // Process GDPR compliance
  if (complianceResults.gdpr) {
    report.complianceCheck.gdpr = {
      status: complianceResults.gdpr.status || 'Unknown',
      findings: complianceResults.gdpr.findings || [],
      recommendations: complianceResults.gdpr.recommendations || []
    };
    
    // Create issues for GDPR non-compliance
    if (complianceResults.gdpr.status !== 'Compliant' && complianceResults.gdpr.findings.length > 0) {
      const issue = createIssue({
        title: `GDPR compliance issues detected`,
        description: `The system has ${complianceResults.gdpr.findings.length} findings related to GDPR compliance.`,
        impact: `Non-compliance with GDPR can lead to severe financial penalties, reputational damage, and legal consequences.`,
        severity: 'high',
        category: 'Compliance',
        location: 'GDPR Requirements',
        recommendation: `Address the GDPR compliance issues by implementing the recommended actions.`,
        remediationSteps: complianceResults.gdpr.recommendations
      });
      
      report.complianceCheck.issues.push(issue);
    }
  }
  
  // Process ISO27001 compliance
  if (complianceResults.iso27001) {
    report.complianceCheck.iso27001 = {
      status: complianceResults.iso27001.status || 'Unknown',
      findings: complianceResults.iso27001.findings || [],
      recommendations: complianceResults.iso27001.recommendations || []
    };
    
    // Create issues for ISO27001 non-compliance
    if (complianceResults.iso27001.status !== 'Compliant' && complianceResults.iso27001.findings.length > 0) {
      const issue = createIssue({
        title: `ISO 27001 compliance issues detected`,
        description: `The system has ${complianceResults.iso27001.findings.length} findings related to ISO 27001 compliance.`,
        impact: `Non-compliance with ISO 27001 may indicate inadequate information security management, potentially leading to security breaches and operational issues.`,
        severity: 'medium',
        category: 'Compliance',
        location: 'ISO 27001 Requirements',
        recommendation: `Address the ISO 27001 compliance issues by implementing the recommended actions.`,
        remediationSteps: complianceResults.iso27001.recommendations
      });
      
      report.complianceCheck.issues.push(issue);
    }
  }
  
  // Process PCI compliance
  if (complianceResults.pci) {
    report.complianceCheck.pci = {
      status: complianceResults.pci.status || 'Unknown',
      findings: complianceResults.pci.findings || [],
      recommendations: complianceResults.pci.recommendations || []
    };
    
    // Create issues for PCI non-compliance
    if (complianceResults.pci.status !== 'Compliant' && complianceResults.pci.findings.length > 0) {
      const issue = createIssue({
        title: `PCI DSS compliance issues detected`,
        description: `The system has ${complianceResults.pci.findings.length} findings related to PCI DSS compliance.`,
        impact: `Non-compliance with PCI DSS can result in financial penalties, increased transaction fees, reputational damage, and potential prohibition from processing card payments.`,
        severity: 'high',
        category: 'Compliance',
        location: 'PCI DSS Requirements',
        recommendation: `Address the PCI DSS compliance issues by implementing the recommended actions.`,
        remediationSteps: complianceResults.pci.recommendations
      });
      
      report.complianceCheck.issues.push(issue);
    }
  }
  
  // Process HIPAA compliance
  if (complianceResults.hipaa) {
    report.complianceCheck.hipaa = {
      status: complianceResults.hipaa.status || 'Unknown',
      findings: complianceResults.hipaa.findings || [],
      recommendations: complianceResults.hipaa.recommendations || []
    };
    
    // Create issues for HIPAA non-compliance
    if (complianceResults.hipaa.status !== 'Compliant' && complianceResults.hipaa.findings.length > 0) {
      const issue = createIssue({
        title: `HIPAA compliance issues detected`,
        description: `The system has ${complianceResults.hipaa.findings.length} findings related to HIPAA compliance.`,
        impact: `Non-compliance with HIPAA can result in financial penalties, reputational damage, and legal consequences related to health information protection.`,
        severity: 'high',
        category: 'Compliance',
        location: 'HIPAA Requirements',
        recommendation: `Address the HIPAA compliance issues by implementing the recommended actions.`,
        remediationSteps: complianceResults.hipaa.recommendations
      });
      
      report.complianceCheck.issues.push(issue);
    }
  }
}

/**
 * Build a comprehensive remediation plan based on identified issues
 * @param {Object} report - The report object containing identified issues
 */
function buildRemediationPlan(report) {
  // Collect all issues from different scan types
  const allIssues = [
    ...(report.networkScan.issues || []),
    ...(report.systemScan.issues || []),
    ...(report.vulnerabilityScan.issues || []),
    ...(report.malwareScan.issues || []),
    ...(report.complianceCheck.issues || [])
  ];
  
  // Sort issues by severity
  const criticalIssues = allIssues.filter(issue => issue.severity === 'critical');
  const highIssues = allIssues.filter(issue => issue.severity === 'high');
  const mediumIssues = allIssues.filter(issue => issue.severity === 'medium');
  const lowIssues = allIssues.filter(issue => issue.severity === 'low');
  
  // Create remediation actions for each priority level
  report.remediationPlan.criticalActions = createRemediationActions(criticalIssues, 'critical');
  report.remediationPlan.highPriorityActions = createRemediationActions(highIssues, 'high');
  report.remediationPlan.mediumPriorityActions = createRemediationActions(mediumIssues, 'medium');
  report.remediationPlan.lowPriorityActions = createRemediationActions(lowIssues, 'low');
}

/**
 * Create remediation actions from issues
 * @param {Array} issues - List of issues
 * @param {string} priority - Priority level
 * @returns {Array} List of remediation actions
 */
function createRemediationActions(issues, priority) {
  return issues.map(issue => {
    const remediationId = `REM-${uuidv4().substring(0, 8)}`;
    
    return {
      id: remediationId,
      issueId: issue.id,
      title: `Remediate: ${issue.title}`,
      description: issue.recommendation,
      priority: priority,
      steps: issue.remediationSteps,
      resources: getResourcesForIssue(issue),
      estimatedTime: getEstimatedTimeForRemediation(issue.severity),
      verificationSteps: [
        `Scan the system again after remediation.`,
        `Verify that the issue has been resolved.`,
        `Check for any new issues that may have been introduced during remediation.`
      ],
      additionalNotes: getAdditionalNotesForIssue(issue)
    };
  });
}

/**
 * Get resources to help with remediation for a specific issue
 * @param {Object} issue - The issue to get resources for
 * @returns {Array} List of helpful resources
 */
function getResourcesForIssue(issue) {
  const resources = [];
  
  // General resources based on issue category
  switch (issue.category) {
    case 'Insecure Services':
      resources.push('https://www.cisecurity.org/insights/white-papers/security-primer-ports-protocols-and-services');
      resources.push('https://www.sans.org/security-resources/policies/general/pdf/service-hardening-guidelines');
      break;
    case 'Network Access Control':
      resources.push('https://www.nist.gov/publications/guide-network-security-monitoring');
      resources.push('https://www.cisecurity.org/insights/white-papers/security-primer-zero-trust');
      break;
    case 'Wireless Security':
      resources.push('https://www.wi-fi.org/security');
      resources.push('https://www.nist.gov/publications/guide-enterprise-wireless-local-area-network-security');
      break;
    case 'Perimeter Security':
      resources.push('https://www.sans.org/security-resources/policies/firewall/pdf/firewall-configuration-guidelines');
      break;
    case 'System Updates':
      resources.push('https://www.cisa.gov/known-exploited-vulnerabilities-catalog');
      resources.push('https://www.cisecurity.org/insights/white-papers/security-primer-patching');
      break;
    case 'Account Security':
      resources.push('https://pages.nist.gov/800-63-3/sp800-63b.html');
      resources.push('https://www.sans.org/security-resources/policies/general/pdf/password-construction-guidelines');
      break;
    case 'File System Security':
      resources.push('https://www.nist.gov/publications/guide-securing-file-system-volumes');
      break;
    case 'Endpoint Protection':
      resources.push('https://www.nist.gov/publications/guide-endpoint-security');
      break;
    case 'Data Protection':
      resources.push('https://www.nist.gov/publications/guide-storage-encryption-technologies-end-user-devices');
      break;
    case 'Software Vulnerabilities':
      resources.push('https://owasp.org/www-project-top-ten/');
      break;
    case 'Web Application Security':
      resources.push('https://owasp.org/www-project-top-ten/');
      resources.push('https://cheatsheetseries.owasp.org/');
      break;
    case 'Database Security':
      resources.push('https://www.cisecurity.org/benchmark/database_benchmarks');
      break;
    case 'Malware':
    case 'Potential Malware':
    case 'Malware Persistence':
      resources.push('https://www.cisa.gov/topics/malware-detection-and-prevention');
      break;
    case 'Compliance':
      if (issue.location.includes('GDPR')) {
        resources.push('https://gdpr.eu/checklist/');
      } else if (issue.location.includes('ISO 27001')) {
        resources.push('https://www.iso.org/isoiec-27001-information-security.html');
      } else if (issue.location.includes('PCI DSS')) {
        resources.push('https://www.pcisecuritystandards.org/document_library/');
      } else if (issue.location.includes('HIPAA')) {
        resources.push('https://www.hhs.gov/hipaa/for-professionals/security/guidance/index.html');
      }
      break;
  }
  
  // Add CVE-specific resources
  if (issue.cveIds && issue.cveIds.length > 0) {
    issue.cveIds.forEach(cveId => {
      resources.push(`https://nvd.nist.gov/vuln/detail/${cveId}`);
    });
  }
  
  return resources;
}

/**
 * Get estimated time to complete remediation based on severity
 * @param {string} severity - Issue severity
 * @returns {string} Estimated time
 */
function getEstimatedTimeForRemediation(severity) {
  switch (severity) {
    case 'critical':
      return 'Immediate - 1 day';
    case 'high':
      return '1-3 days';
    case 'medium':
      return '1-2 weeks';
    case 'low':
      return '2-4 weeks';
    default:
      return 'Varies';
  }
}

/**
 * Get additional notes for remediation of a specific issue
 * @param {Object} issue - The issue to get notes for
 * @returns {string} Additional notes
 */
function getAdditionalNotesForIssue(issue) {
  // Category-specific notes
  switch (issue.category) {
    case 'Insecure Services':
      return 'Consider implementing network segmentation to further protect sensitive services.';
    case 'System Updates':
      return 'Always test critical updates in a non-production environment when possible.';
    case 'Account Security':
      return 'Consider implementing multi-factor authentication for additional security.';
    case 'Software Vulnerabilities':
      return 'Establish a vulnerability management program to regularly identify and address vulnerabilities.';
    case 'Malware':
      return 'After malware removal, consider changing passwords for critical accounts as they may have been compromised.';
    case 'Compliance':
      return 'Consider consulting with a compliance specialist to ensure all requirements are properly addressed.';
    default:
      return 'Document all remediation steps taken for future reference and compliance purposes.';
  }
}

/**
 * Calculate overall risk score based on issues
 * @param {Object} report - The report object
 */
function calculateRiskScore(report) {
  // Collect all issues
  const allIssues = [
    ...(report.networkScan.issues || []),
    ...(report.systemScan.issues || []),
    ...(report.vulnerabilityScan.issues || []),
    ...(report.malwareScan.issues || []),
    ...(report.complianceCheck.issues || [])
  ];
  
  // Count issues by severity
  const criticalCount = allIssues.filter(issue => issue.severity === 'critical').length;
  const highCount = allIssues.filter(issue => issue.severity === 'high').length;
  const mediumCount = allIssues.filter(issue => issue.severity === 'medium').length;
  const lowCount = allIssues.filter(issue => issue.severity === 'low').length;
  
  // Calculate weighted score
  // Scale: 0-100 where higher is more risk
  const score = Math.min(100, Math.round(
    (criticalCount * 25) + 
    (highCount * 10) + 
    (mediumCount * 5) + 
    (lowCount * 1)
  ));
  
  report.summary.riskScore = score;
}

/**
 * Update summary statistics in the report
 * @param {Object} report - The report object
 */
function updateSummaryIssueCount(report) {
  // Collect all issues
  const allIssues = [
    ...(report.networkScan.issues || []),
    ...(report.systemScan.issues || []),
    ...(report.vulnerabilityScan.issues || []),
    ...(report.malwareScan.issues || []),
    ...(report.complianceCheck.issues || [])
  ];
  
  // Update summary counts
  report.summary.totalIssues = allIssues.length;
  report.summary.criticalIssues = allIssues.filter(issue => issue.severity === 'critical').length;
  report.summary.highIssues = allIssues.filter(issue => issue.severity === 'high').length;
  report.summary.mediumIssues = allIssues.filter(issue => issue.severity === 'medium').length;
  report.summary.lowIssues = allIssues.filter(issue => issue.severity === 'low').length;
}

/**
 * Create a new issue object based on the template
 * @param {Object} data - Issue data
 * @returns {Object} Issue object
 */
function createIssue(data) {
  const issueId = `ISS-${uuidv4().substring(0, 8)}`;
  
  return {
    id: issueId,
    title: data.title,
    description: data.description,
    impact: data.impact,
    severity: data.severity,
    category: data.category,
    location: data.location,
    evidence: data.evidence || '',
    recommendation: data.recommendation,
    remediationSteps: data.remediationSteps || [],
    remediationDifficulty: getRemediationDifficulty(data.severity),
    references: data.references || [],
    cveIds: data.cveIds || []
  };
}

/**
 * Get remediation difficulty based on severity
 * @param {string} severity - Issue severity
 * @returns {string} Difficulty level
 */
function getRemediationDifficulty(severity) {
  switch (severity) {
    case 'critical':
      return 'High';
    case 'high':
      return 'Medium to High';
    case 'medium':
      return 'Medium';
    case 'low':
      return 'Low to Medium';
    default:
      return 'Medium';
  }
}

/**
 * Get specific remediation steps for web vulnerabilities
 * @param {string} vulnType - Type of web vulnerability
 * @returns {Array} Remediation steps
 */
function getWebVulnerabilityRemediationSteps(vulnType) {
  const lowerType = vulnType.toLowerCase();
  
  if (lowerType.includes('sql injection')) {
    return [
      `Use parameterized queries or prepared statements instead of string concatenation.`,
      `Apply input validation and sanitization.`,
      `Implement least privilege database accounts.`,
      `Use stored procedures when possible.`,
      `Implement a web application firewall (WAF).`
    ];
  } else if (lowerType.includes('xss') || lowerType.includes('cross-site scripting')) {
    return [
      `Implement context-appropriate output encoding.`,
      `Use Content Security Policy (CSP) headers.`,
      `Apply input validation.`,
      `Use modern frameworks that automatically escape output.`,
      `Implement a web application firewall (WAF).`
    ];
  } else if (lowerType.includes('csrf') || lowerType.includes('cross-site request forgery')) {
    return [
      `Implement anti-CSRF tokens in all forms.`,
      `Verify the origin with standard headers.`,
      `Implement SameSite cookie attribute.`,
      `Require re-authentication for sensitive operations.`
    ];
  } else if (lowerType.includes('insecure deserialization')) {
    return [
      `Implement integrity checks on serialized objects.`,
      `Avoid deserializing data from untrusted sources.`,
      `Use safer data formats like JSON with schema validation.`,
      `Implement deserialization monitoring and alerting.`
    ];
  } else if (lowerType.includes('authentication') || lowerType.includes('auth')) {
    return [
      `Implement strong password policies.`,
      `Add multi-factor authentication.`,
      `Use secure session management.`,
      `Implement proper account lockout policies.`,
      `Ensure secure credential storage with modern hashing algorithms.`
    ];
  } else if (lowerType.includes('authorization')) {
    return [
      `Implement proper access control checks on all sensitive operations.`,
      `Use role-based access control (RBAC).`,
      `Apply the principle of least privilege.`,
      `Validate authorization on server-side for every request.`,
      `Implement proper session management.`
    ];
  } else if (lowerType.includes('sensitive data')) {
    return [
      `Encrypt sensitive data both in transit and at rest.`,
      `Implement proper key management.`,
      `Apply data minimization principles.`,
      `Use secure TLS configurations.`,
      `Implement proper access controls for sensitive data.`
    ];
  } else if (lowerType.includes('xxe') || lowerType.includes('xml')) {
    return [
      `Disable XML external entity processing.`,
      `Use less complex data formats like JSON when possible.`,
      `Patch or update XML processors and libraries.`,
      `Validate, filter, and sanitize all XML input.`
    ];
  } else if (lowerType.includes('misconfig') || lowerType.includes('misconfiguration')) {
    return [
      `Follow security hardening guidelines for your web server and framework.`,
      `Remove unnecessary features, components, and documentation.`,
      `Update and patch systems regularly.`,
      `Implement proper security headers.`,
      `Perform regular security audits and penetration testing.`
    ];
  } else {
    // Generic web application security steps
    return [
      `Review the application code related to this vulnerability.`,
      `Apply input validation and output encoding.`,
      `Follow secure coding practices specific to this vulnerability.`,
      `Implement proper error handling that doesn't expose sensitive information.`,
      `Conduct security testing after remediation to verify the fix.`
    ];
  }
}

/**
 * Get specific remediation steps for database vulnerabilities
 * @param {string} vulnType - Type of database vulnerability
 * @returns {Array} Remediation steps
 */
function getDatabaseVulnerabilityRemediationSteps(vulnType) {
  const lowerType = vulnType.toLowerCase();
  
  if (lowerType.includes('authentication') || lowerType.includes('weak password')) {
    return [
      `Implement strong password policies for database accounts.`,
      `Remove or disable default credentials.`,
      `Implement role-based access control.`,
      `Use authentication methods beyond just passwords when available.`,
      `Regularly audit database users and permissions.`
    ];
  } else if (lowerType.includes('authorization') || lowerType.includes('privilege')) {
    return [
      `Apply the principle of least privilege for all database accounts.`,
      `Revoke unnecessary permissions from users and roles.`,
      `Implement schema-level security.`,
      `Use database proxies or connection pooling with controlled access.`,
      `Regularly audit user privileges and access patterns.`
    ];
  } else if (lowerType.includes('encryption') || lowerType.includes('sensitive data')) {
    return [
      `Enable Transparent Data Encryption (TDE) or equivalent.`,
      `Implement column-level encryption for sensitive data.`,
      `Use secure TLS/SSL configurations for database connections.`,
      `Implement proper key management for encryption keys.`,
      `Apply data masking for non-production environments.`
    ];
  } else if (lowerType.includes('injection') || lowerType.includes('sql')) {
    return [
      `Use parameterized queries or prepared statements in application code.`,
      `Implement input validation at the application level.`,
      `Apply the principle of least privilege for database accounts.`,
      `Use stored procedures when possible.`,
      `Consider implementing a database firewall.`
    ];
  } else if (lowerType.includes('patch') || lowerType.includes('update') || lowerType.includes('outdated')) {
    return [
      `Apply all security patches to the database software.`,
      `Upgrade to a supported database version if using an EOL version.`,
      `Implement a regular patching schedule.`,
      `Test patches in non-production environments before applying.`,
      `Document all patch applications for compliance purposes.`
    ];
  } else if (lowerType.includes('audit') || lowerType.includes('logging')) {
    return [
      `Enable comprehensive audit logging for the database.`,
      `Configure logging of authentication attempts, privilege changes, and data access.`,
      `Ensure logs are stored securely and cannot be modified by regular users.`,
      `Implement log monitoring and alerting for suspicious activities.`,
      `Establish log retention policies.`
    ];
  } else if (lowerType.includes('backup') || lowerType.includes('recovery')) {
    return [
      `Implement regular database backups.`,
      `Test recovery procedures to ensure backups are usable.`,
      `Encrypt backup files.`,
      `Store backups securely, with offline or immutable copies.`,
      `Document and regularly test the disaster recovery plan.`
    ];
  } else {
    // Generic database security steps
    return [
      `Consult the database vendor's security best practices.`,
      `Apply principle of least privilege for all database operations.`,
      `Implement regular security audits and vulnerability assessments.`,
      `Keep the database software updated with security patches.`,
      `Maintain proper documentation of security configurations and changes.`
    ];
  }
}

/**
 * Mask sensitive data such as IP addresses and MAC addresses
 * @param {string} data - Data to mask
 * @param {string} type - Type of data
 * @returns {string} Masked data
 */
function maskSensitiveData(data, type = 'ip') {
  if (!data) return data;
  
  if (type === 'ip') {
    // For IP addresses, mask the last octet
    return data.replace(/(\d+\.\d+\.\d+\.)\d+/, '$1xxx');
  } else if (type === 'mac') {
    // For MAC addresses, mask the last three octets
    return data.replace(/([0-9A-F]{2}:[0-9A-F]{2}:[0-9A-F]{2}:)([0-9A-F]{2}:[0-9A-F]{2}:[0-9A-F]{2})/i, '$1xx:xx:xx');
  }
  
  return data;
}

/**
 * Format duration in milliseconds to human readable string
 * @param {number} ms - Duration in milliseconds
 * @returns {string} Formatted duration string
 */
function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

module.exports = {
  analyzeResults
};