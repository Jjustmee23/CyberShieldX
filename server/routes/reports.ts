import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { ScanType, ScanStatus, insertReportSchema } from '@shared/schema';
import { z } from 'zod';
import path from 'path';
import fs from 'fs';

const router = Router();

// Get all reports
router.get('/', async (req: Request, res: Response) => {
  try {
    const reports = await storage.getReports();
    res.json(reports);
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ message: 'Failed to fetch reports' });
  }
});

// Get reports by client ID
router.get('/client/:clientId', async (req: Request, res: Response) => {
  try {
    const clientId = parseInt(req.params.clientId);
    if (isNaN(clientId)) {
      return res.status(400).json({ message: 'Invalid client ID' });
    }
    
    const reports = await storage.getReportsByClientId(clientId);
    res.json(reports);
  } catch (error) {
    console.error('Error fetching client reports:', error);
    res.status(500).json({ message: 'Failed to fetch client reports' });
  }
});

// Get single report by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const reportId = parseInt(req.params.id);
    if (isNaN(reportId)) {
      return res.status(400).json({ message: 'Invalid report ID' });
    }
    
    const report = await storage.getReport(reportId);
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }
    
    res.json(report);
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({ message: 'Failed to fetch report' });
  }
});

// Create new report
router.post('/', async (req: Request, res: Response) => {
  try {
    const validatedData = insertReportSchema.safeParse(req.body);
    
    if (!validatedData.success) {
      return res.status(400).json({ 
        message: 'Invalid report data', 
        errors: validatedData.error.errors 
      });
    }
    
    const newReport = await storage.createReport(validatedData.data);
    res.status(201).json(newReport);
  } catch (error) {
    console.error('Error creating report:', error);
    res.status(500).json({ message: 'Failed to create report' });
  }
});

// Export report in different formats
router.get('/:id/export', async (req: Request, res: Response) => {
  try {
    const reportId = parseInt(req.params.id);
    if (isNaN(reportId)) {
      return res.status(400).json({ message: 'Invalid report ID' });
    }
    
    const format = req.query.format as string || 'pdf';
    if (!['pdf', 'html', 'json'].includes(format)) {
      return res.status(400).json({ message: 'Invalid export format. Supported formats: pdf, html, json' });
    }
    
    // Get the report
    const report = await storage.getReport(reportId);
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }
    
    // Get client info for the report
    const client = await storage.getClient(report.clientId);
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }
    
    // Get detailed report data
    // In a real implementation this would come from the database or file system
    const reportData = await getDetailedReportData(report.id);
    
    switch (format) {
      case 'pdf':
        // For prototype, return a JSON with a message
        // In a real implementation, this would generate a PDF
        return res.json({
          message: 'PDF generation successful',
          reportId: report.id,
          clientName: client.name,
          format: 'pdf',
          // Add sample data to demonstrate functionality
          data: {
            summary: reportData.summary,
            issueCount: {
              critical: reportData.summary.criticalIssues,
              high: reportData.summary.highIssues,
              medium: reportData.summary.mediumIssues,
              low: reportData.summary.lowIssues
            }
          }
        });
        
      case 'html':
        // For prototype, return a simple HTML
        // In a real implementation, this would generate a full HTML report
        const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Security Report - ${client.name}</title>
            <style>
              body { font-family: Arial, sans-serif; }
              .header { text-align: center; margin-bottom: 20px; }
              .section { margin-bottom: 20px; }
              .issue { border: 1px solid #ccc; padding: 10px; margin-bottom: 10px; }
              .critical { border-left: 5px solid #ff0000; }
              .high { border-left: 5px solid #ff9900; }
              .medium { border-left: 5px solid #ffcc00; }
              .low { border-left: 5px solid #00cc00; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Cybersecurity Assessment Report</h1>
              <h2>${client.name}</h2>
              <p>Report Date: ${new Date().toLocaleDateString()}</p>
              <p>Risk Score: ${reportData.summary.riskScore}/100</p>
            </div>
            
            <div class="section">
              <h2>Executive Summary</h2>
              <p>This report identifies ${reportData.summary.totalIssues} security issues requiring attention.</p>
              <ul>
                <li>Critical Issues: ${reportData.summary.criticalIssues}</li>
                <li>High Issues: ${reportData.summary.highIssues}</li>
                <li>Medium Issues: ${reportData.summary.mediumIssues}</li>
                <li>Low Issues: ${reportData.summary.lowIssues}</li>
              </ul>
            </div>
            
            <div class="section">
              <h2>Critical Issues</h2>
              <div class="issue critical">
                <h3>Example Critical Issue</h3>
                <p>This is a placeholder for a critical security issue that requires immediate attention.</p>
                <p><strong>Recommendation:</strong> Apply security patches immediately.</p>
              </div>
            </div>
            
            <footer>
              <p>CONFIDENTIAL - CyberShieldX Platform</p>
            </footer>
          </body>
          </html>
        `;
        res.setHeader('Content-Type', 'text/html');
        return res.send(htmlContent);
        
      case 'json':
        res.setHeader('Content-Type', 'application/json');
        return res.json(reportData);
    }
  } catch (error) {
    console.error('Error exporting report:', error);
    res.status(500).json({ message: 'Failed to export report' });
  }
});

/**
 * Get detailed report data - in a real application, this would be fetched from the database
 * or file system based on the report ID
 */
async function getDetailedReportData(reportId: number) {
  // In a real implementation, this would fetch the actual detailed report data
  // For the prototype, we're generating sample data
  return {
    summary: {
      title: "Comprehensive Security Assessment",
      riskScore: 68,
      totalIssues: 24,
      criticalIssues: 3,
      highIssues: 8,
      mediumIssues: 9,
      lowIssues: 4,
      scanDate: new Date().toISOString(),
      scanDuration: "1h 24m 36s",
      clientInfo: {
        name: "Acme Corporation",
        id: "client-123456",
        ipAddress: "192.168.1.xxx",
        macAddress: "00:1A:2B:xx:xx:xx",
        osInfo: "Windows Server 2019",
        systemType: "Virtual Machine"
      }
    },
    networkScan: {
      title: "Network Security Assessment",
      openPorts: [
        { port: 22, service: "SSH", protocol: "tcp", state: "open" },
        { port: 80, service: "HTTP", protocol: "tcp", state: "open" },
        { port: 443, service: "HTTPS", protocol: "tcp", state: "open" },
        { port: 3389, service: "RDP", protocol: "tcp", state: "open" }
      ],
      vulnerableServices: [
        { port: 22, service: "SSH", protocol: "tcp", state: "open" }
      ],
      issues: [
        {
          id: "ISS-12345678",
          title: "Potentially insecure service running: SSH on port 22",
          description: "The SSH service running on port 22/tcp could pose a security risk if not properly secured.",
          impact: "Unauthorized access to systems, data exfiltration, and potential for service exploitation.",
          severity: "high",
          category: "Insecure Services",
          location: "Port 22/tcp",
          recommendation: "Close the port if the service is unused. If needed, implement proper authentication, encryption, and access controls.",
          remediationSteps: [
            "Verify if this service is necessary for business operations.",
            "If unnecessary, disable the service and close the port in your firewall.",
            "If required, update to the latest secure version and enable encryption.",
            "Implement strong authentication and restrict access by IP.",
            "Configure proper logging to monitor access attempts."
          ],
          remediationDifficulty: "Medium"
        },
        {
          id: "ISS-87654321",
          title: "Weak wireless network encryption",
          description: "The wireless network is using WPA encryption, which is considered insecure.",
          impact: "Weak encryption can be broken, allowing attackers to intercept network traffic, steal sensitive information, and gain unauthorized access to the network.",
          severity: "high",
          category: "Wireless Security",
          location: "Wireless Network",
          recommendation: "Upgrade to WPA3 encryption with a strong, unique password. If WPA3 is not available, use WPA2 with AES.",
          remediationSteps: [
            "Access your wireless router's admin interface.",
            "Change the encryption type to WPA3 if supported, or WPA2-AES if not.",
            "Generate a strong, unique password of at least 12 characters.",
            "Disable WPS (Wi-Fi Protected Setup) as it can be vulnerable.",
            "Consider implementing a guest network for non-trusted devices.",
            "Update router firmware to the latest version."
          ],
          remediationDifficulty: "Low"
        }
      ]
    },
    systemScan: {
      title: "System Security Assessment",
      issues: [
        {
          id: "ISS-23456789",
          title: "Missing critical security patches",
          description: "Found 7 critical security patches that need to be installed.",
          impact: "Missing security patches can leave the system vulnerable to known exploits, potentially allowing unauthorized access, data theft, or malware infection.",
          severity: "critical",
          category: "System Updates",
          location: "Operating System",
          recommendation: "Install all missing security patches as soon as possible, prioritizing critical and important updates.",
          remediationSteps: [
            "Run the system update utility (Windows Update, apt, yum, etc.).",
            "Install all critical and important security updates.",
            "If necessary, schedule a maintenance window for updates requiring restarts.",
            "Configure automatic updates to prevent future gaps.",
            "Document update policy and ensure regular maintenance."
          ],
          remediationDifficulty: "Medium"
        },
        {
          id: "ISS-34567890",
          title: "Weak password policy detected",
          description: "The current password policy has the following weaknesses: minimum length (8) less than 12 characters, password complexity not required, password expiration (180 days) exceeds 90 days.",
          impact: "Weak password policies may allow easily guessable passwords, increasing the risk of credential theft and unauthorized access.",
          severity: "high",
          category: "Account Security",
          location: "Password Policy",
          recommendation: "Strengthen the password policy to enforce longer, complex passwords with reasonable expiration periods.",
          remediationSteps: [
            "Set minimum password length to at least 12 characters.",
            "Enable password complexity requirements.",
            "Set password expiration to 90 days or less (or implement NIST recommendations for not expiring strong passwords).",
            "Implement multi-factor authentication where possible.",
            "Consider using a password manager with random password generation."
          ],
          remediationDifficulty: "Low"
        }
      ]
    },
    vulnerabilityScan: {
      title: "Vulnerability Assessment",
      issues: [
        {
          id: "ISS-45678901",
          title: "Critical severity vulnerability: CVE-2021-44228",
          description: "Log4j vulnerability allowing remote code execution (Log4Shell).",
          impact: "This vulnerability could allow an attacker to easily compromise system security, potentially leading to unauthorized access, data theft, or service disruption.",
          severity: "critical",
          category: "Software Vulnerabilities",
          location: "Software: Apache Log4j 2.0-2.14.1",
          recommendation: "Apply vendor-provided patches or update the affected software to a non-vulnerable version.",
          remediationSteps: [
            "Check vendor website for security patches addressing this CVE.",
            "Apply security patches following change management procedures.",
            "If patches are unavailable, consider implementing mitigating controls.",
            "Update affected software to the latest version.",
            "Verify the vulnerability has been resolved through rescanning."
          ],
          remediationDifficulty: "High",
          cveIds: ["CVE-2021-44228"]
        },
        {
          id: "ISS-56789012",
          title: "Web application vulnerability: SQL Injection",
          description: "SQL injection vulnerability in the login form of the customer portal.",
          impact: "This vulnerability could allow attackers to compromise the web application, potentially leading to data theft, unauthorized access, or service disruption.",
          severity: "critical",
          category: "Web Application Security",
          location: "URL: /customer/login.php",
          recommendation: "Fix the vulnerability by implementing proper input validation, output encoding, or other security controls appropriate for this vulnerability type.",
          remediationSteps: [
            "Use parameterized queries or prepared statements instead of string concatenation.",
            "Apply input validation and sanitization.",
            "Implement least privilege database accounts.",
            "Use stored procedures when possible.",
            "Implement a web application firewall (WAF)."
          ],
          remediationDifficulty: "Medium"
        }
      ]
    },
    malwareScan: {
      title: "Malware Detection",
      filesScanned: 125478,
      issues: [
        {
          id: "ISS-67890123",
          title: "Malware detected: Trojan.GenericKD.30157892",
          description: "Detected Trojan malware \"Trojan.GenericKD.30157892\" at location \"C:\\Windows\\Temp\\setup.exe\".",
          impact: "Malware can compromise system security, steal sensitive information, damage files, or allow unauthorized remote access to the system.",
          severity: "critical",
          category: "Malware",
          location: "C:\\Windows\\Temp\\setup.exe",
          recommendation: "Immediately quarantine or remove the malware and scan the system for additional infections.",
          remediationSteps: [
            "Use antivirus software to quarantine the malware immediately.",
            "Scan the entire system for additional infections.",
            "Identify how the malware entered the system.",
            "Update security software and system patches.",
            "Change passwords for sensitive accounts as they may have been compromised.",
            "Review system logs for suspicious activities."
          ],
          remediationDifficulty: "High"
        }
      ]
    },
    complianceCheck: {
      title: "Compliance Assessment",
      issues: [
        {
          id: "ISS-78901234",
          title: "GDPR compliance issues detected",
          description: "The system has 5 findings related to GDPR compliance.",
          impact: "Non-compliance with GDPR can lead to severe financial penalties, reputational damage, and legal consequences.",
          severity: "high",
          category: "Compliance",
          location: "GDPR Requirements",
          recommendation: "Address the GDPR compliance issues by implementing the recommended actions.",
          remediationSteps: [
            "Implement proper data encryption for personal data at rest and in transit.",
            "Ensure documented consent mechanisms are in place for data collection.",
            "Implement access controls to restrict personal data access to authorized personnel only.",
            "Create a process for handling data subject requests (right to be forgotten, data portability, etc.).",
            "Ensure breach notification procedures are documented and tested."
          ],
          remediationDifficulty: "High"
        },
        {
          id: "ISS-89012345",
          title: "ISO 27001 compliance issues detected",
          description: "The system has 8 findings related to ISO 27001 compliance.",
          impact: "Non-compliance with ISO 27001 may indicate inadequate information security management, potentially leading to security breaches and operational issues.",
          severity: "medium",
          category: "Compliance",
          location: "ISO 27001 Requirements",
          recommendation: "Address the ISO 27001 compliance issues by implementing the recommended actions.",
          remediationSteps: [
            "Develop and implement a formal information security management system (ISMS).",
            "Conduct a thorough risk assessment and implement risk treatment plan.",
            "Implement appropriate security controls based on ISO 27001 Annex A.",
            "Establish a regular audit and review process for security controls.",
            "Train staff on information security awareness and procedures."
          ],
          remediationDifficulty: "Medium"
        }
      ]
    },
    remediationPlan: {
      title: "Remediation Plan",
      criticalActions: [
        {
          id: "REM-12345678",
          issueId: "ISS-45678901",
          title: "Remediate: Critical severity vulnerability: CVE-2021-44228",
          description: "Apply vendor-provided patches or update the affected software to a non-vulnerable version.",
          priority: "critical",
          steps: [
            "Check vendor website for security patches addressing this CVE.",
            "Apply security patches following change management procedures.",
            "If patches are unavailable, consider implementing mitigating controls.",
            "Update affected software to the latest version.",
            "Verify the vulnerability has been resolved through rescanning."
          ],
          estimatedTime: "Immediate - 1 day",
          verificationSteps: [
            "Scan the system again after remediation.",
            "Verify that the issue has been resolved.",
            "Check for any new issues that may have been introduced during remediation."
          ]
        },
        {
          id: "REM-23456789",
          issueId: "ISS-56789012",
          title: "Remediate: Web application vulnerability: SQL Injection",
          description: "Fix the vulnerability by implementing proper input validation, output encoding, or other security controls appropriate for this vulnerability type.",
          priority: "critical",
          steps: [
            "Use parameterized queries or prepared statements instead of string concatenation.",
            "Apply input validation and sanitization.",
            "Implement least privilege database accounts.",
            "Use stored procedures when possible.",
            "Implement a web application firewall (WAF)."
          ],
          estimatedTime: "Immediate - 1 day",
          verificationSteps: [
            "Scan the system again after remediation.",
            "Verify that the issue has been resolved.",
            "Check for any new issues that may have been introduced during remediation."
          ]
        }
      ],
      highPriorityActions: [
        {
          id: "REM-34567890",
          issueId: "ISS-12345678",
          title: "Remediate: Potentially insecure service running: SSH on port 22",
          description: "Close the port if the service is unused. If needed, implement proper authentication, encryption, and access controls.",
          priority: "high",
          steps: [
            "Verify if this service is necessary for business operations.",
            "If unnecessary, disable the service and close the port in your firewall.",
            "If required, update to the latest secure version and enable encryption.",
            "Implement strong authentication and restrict access by IP.",
            "Configure proper logging to monitor access attempts."
          ],
          estimatedTime: "1-3 days",
          verificationSteps: [
            "Scan the system again after remediation.",
            "Verify that the issue has been resolved.",
            "Check for any new issues that may have been introduced during remediation."
          ]
        }
      ]
    }
  };
}

export default router;