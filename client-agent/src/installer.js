/**
 * Installer module for CyberShieldX agent
 * Handles initial setup and installation of required dependencies
 */

const { promisify } = require('util');
const exec = promisify(require('child_process').exec);
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const winston = require('winston');
const inquirer = require('inquirer');
const commandExists = require('command-exists').sync;

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
    new winston.transports.File({ filename: 'installer-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'installer.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

/**
 * Run the initial setup for the agent
 */
async function runInitialSetup() {
  try {
    logger.info('Starting agent initial setup');
    
    // Create necessary directories
    await createDirectories();
    
    // Check for required dependencies and install them if necessary
    await checkDependencies();
    
    // Setup platform-specific configurations
    await setupPlatformSpecific();
    
    // Configure auto-start
    await configureAutoStart();
    
    logger.info('Initial setup completed successfully');
    return true;
  } catch (error) {
    logger.error(`Initial setup failed: ${error.message}`);
    return false;
  }
}

/**
 * Create necessary directories for agent operation
 */
async function createDirectories() {
  try {
    logger.info('Creating necessary directories');
    
    // Base directory in user's home directory
    const baseDir = path.join(os.homedir(), '.cybershieldx');
    
    // Sub-directories
    const dirs = [
      baseDir,
      path.join(baseDir, 'logs'),
      path.join(baseDir, 'reports'),
      path.join(baseDir, 'data'),
      path.join(baseDir, 'backups')
    ];
    
    // Create each directory
    for (const dir of dirs) {
      await fs.mkdir(dir, { recursive: true });
      logger.debug(`Created directory: ${dir}`);
    }
    
    return true;
  } catch (error) {
    logger.error(`Failed to create directories: ${error.message}`);
    throw error;
  }
}

/**
 * Check for required dependencies and install them if necessary
 */
async function checkDependencies() {
  try {
    logger.info('Checking for required dependencies');
    
    // Essential dependencies to check
    const dependencies = [];
    
    if (isWindows) {
      dependencies.push(
        { name: 'PowerShell', command: 'powershell', package: null },
        { name: 'netstat', command: 'netstat', package: null },
        { name: 'npcap', command: null, package: 'npcap', check: checkNpcap }
      );
    } else if (isMac) {
      dependencies.push(
        { name: 'nmap', command: 'nmap', package: 'nmap' },
        { name: 'openssl', command: 'openssl', package: 'openssl' },
        { name: 'netstat', command: 'netstat', package: null }
      );
    } else if (isLinux) {
      dependencies.push(
        { name: 'nmap', command: 'nmap', package: 'nmap' },
        { name: 'openssl', command: 'openssl', package: 'openssl' },
        { name: 'netstat', command: 'netstat', package: 'net-tools' },
        { name: 'curl', command: 'curl', package: 'curl' }
      );
    }
    
    // Check each dependency
    for (const dep of dependencies) {
      logger.debug(`Checking for ${dep.name}`);
      
      let isInstalled = false;
      
      if (dep.command) {
        // Check if command exists
        isInstalled = commandExists(dep.command);
      } else if (dep.check) {
        // Use custom check function
        isInstalled = await dep.check();
      }
      
      if (!isInstalled && dep.package) {
        // Try to install missing dependency
        await installDependency(dep);
      } else if (!isInstalled) {
        logger.warn(`${dep.name} is missing but cannot be automatically installed`);
      } else {
        logger.debug(`${dep.name} is already installed`);
      }
    }
    
    return true;
  } catch (error) {
    logger.error(`Failed to check dependencies: ${error.message}`);
    throw error;
  }
}

/**
 * Check if Npcap is installed (Windows)
 */
async function checkNpcap() {
  try {
    // Check for Npcap in Program Files
    await fs.access('C:\\Program Files\\Npcap');
    return true;
  } catch {
    try {
      // Check for WinPcap as an alternative
      await fs.access('C:\\Program Files\\WinPcap');
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Install a missing dependency
 */
async function installDependency(dependency) {
  logger.info(`Installing ${dependency.name}`);
  
  try {
    if (isWindows) {
      // Windows installation methods
      if (dependency.package === 'npcap') {
        logger.info('Npcap must be installed manually to use network scanning features');
        logger.info('Please download Npcap from https://npcap.com/ and install it');
        
        if (process.stdout.isTTY) {
          // If running in interactive mode, prompt the user
          const { installNow } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'installNow',
              message: 'Would you like to open the Npcap download page now?',
              default: true
            }
          ]);
          
          if (installNow) {
            await exec('start https://npcap.com/');
          }
        }
      }
    } else if (isMac) {
      // macOS installation using Homebrew
      if (commandExists('brew')) {
        await exec(`brew install ${dependency.package}`);
        logger.info(`Installed ${dependency.name} via Homebrew`);
      } else {
        logger.warn('Homebrew is not installed, cannot automatically install dependencies');
        logger.info('Please install Homebrew from https://brew.sh/ and then run this setup again');
      }
    } else if (isLinux) {
      // Linux installation
      let installer;
      
      if (commandExists('apt-get')) {
        installer = 'apt-get -y install';
      } else if (commandExists('yum')) {
        installer = 'yum -y install';
      } else if (commandExists('dnf')) {
        installer = 'dnf -y install';
      } else if (commandExists('zypper')) {
        installer = 'zypper install -y';
      } else if (commandExists('pacman')) {
        installer = 'pacman -S --noconfirm';
      } else {
        throw new Error('No supported package manager found');
      }
      
      await exec(`sudo ${installer} ${dependency.package}`);
      logger.info(`Installed ${dependency.name} via package manager`);
    }
    
    return true;
  } catch (error) {
    logger.error(`Failed to install ${dependency.name}: ${error.message}`);
    logger.warn(`You may need to manually install ${dependency.name} for full functionality`);
    return false;
  }
}

/**
 * Setup platform-specific configurations
 */
async function setupPlatformSpecific() {
  try {
    logger.info('Setting up platform-specific configurations');
    
    if (isWindows) {
      // Windows-specific setup
      await setupWindows();
    } else if (isMac) {
      // macOS-specific setup
      await setupMacOS();
    } else if (isLinux) {
      // Linux-specific setup
      if (isRaspberryPi) {
        await setupRaspberryPi();
      } else {
        await setupLinux();
      }
    }
    
    return true;
  } catch (error) {
    logger.error(`Platform-specific setup failed: ${error.message}`);
    throw error;
  }
}

/**
 * Windows-specific setup
 */
async function setupWindows() {
  try {
    // Create sample scanning exclusions for antivirus
    const agentDir = process.cwd();
    const exclusionsFile = path.join(os.homedir(), '.cybershieldx', 'av_exclusions.txt');
    
    await fs.writeFile(exclusionsFile, `
# CyberShieldX Agent Antivirus Exclusions
# Add these paths to your antivirus exclusions to prevent interference with scanning
${agentDir}
${path.join(os.homedir(), '.cybershieldx')}
`);
    
    logger.info(`Created antivirus exclusions guide at ${exclusionsFile}`);
    
    // Additional Windows setup steps could be added here
    
    return true;
  } catch (error) {
    logger.error(`Windows setup failed: ${error.message}`);
    throw error;
  }
}

/**
 * macOS-specific setup
 */
async function setupMacOS() {
  try {
    // Request full disk access for scanning
    logger.info('For full scanning capabilities, CyberShieldX needs Full Disk Access');
    logger.info('Please add this application to System Preferences > Security & Privacy > Privacy > Full Disk Access');
    
    // Additional macOS setup steps could be added here
    
    return true;
  } catch (error) {
    logger.error(`macOS setup failed: ${error.message}`);
    throw error;
  }
}

/**
 * Linux-specific setup
 */
async function setupLinux() {
  try {
    // Check for and request sudo capabilities for scanning
    const hasSudo = await checkSudo();
    
    if (!hasSudo) {
      logger.warn('For full scanning capabilities, CyberShieldX needs sudo privileges');
      logger.info('Please add the necessary permissions or run with sudo for full functionality');
    }
    
    // Additional Linux setup steps could be added here
    
    return true;
  } catch (error) {
    logger.error(`Linux setup failed: ${error.message}`);
    throw error;
  }
}

/**
 * Raspberry Pi specific setup
 */
async function setupRaspberryPi() {
  try {
    // Regular Linux setup first
    await setupLinux();
    
    // Additional Raspberry Pi optimizations
    logger.info('Setting up Raspberry Pi optimizations');
    
    // Check if running on a Pi with limited resources
    const memInfo = await fs.readFile('/proc/meminfo', 'utf8');
    const memTotalMatch = memInfo.match(/MemTotal:\s+(\d+)/);
    const totalMemMB = memTotalMatch ? Math.floor(parseInt(memTotalMatch[1]) / 1024) : null;
    
    if (totalMemMB && totalMemMB < 2048) {
      logger.info('Detected Raspberry Pi with limited RAM, applying optimizations');
      
      // Create a low-memory configuration
      const configFile = path.join(os.homedir(), '.cybershieldx', 'config.json');
      
      const lowMemConfig = {
        scanInterval: '0 3 * * *', // Once per day at 3 AM
        deepScanInterval: '0 3 * * 0', // Once per week on Sunday at 3 AM
        maxSimultaneousTasks: 1,
        logRotation: { maxFiles: 3, maxSize: '5m' },
        telemetryEnabled: false,
        lowMemoryMode: true
      };
      
      await fs.writeFile(configFile, JSON.stringify(lowMemConfig, null, 2));
      logger.info('Applied low-memory configuration');
    }
    
    return true;
  } catch (error) {
    logger.error(`Raspberry Pi setup failed: ${error.message}`);
    throw error;
  }
}

/**
 * Configure auto-start for the agent
 */
async function configureAutoStart() {
  try {
    logger.info('Configuring auto-start');
    
    const agentDir = process.cwd();
    const agentExe = process.execPath;
    const agentArgs = 'src/index.js';
    
    if (isWindows) {
      // Windows auto-start using Task Scheduler
      const startupDir = path.join(process.env.APPDATA, 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup');
      const batFile = path.join(startupDir, 'CyberShieldX-Agent.bat');
      
      // Create startup batch file
      const batContent = `@echo off
cd /d "${agentDir}"
start "CyberShieldX" /min node ${agentArgs}
`;
      
      await fs.writeFile(batFile, batContent);
      logger.info(`Created startup batch file: ${batFile}`);
    } else if (isMac) {
      // macOS auto-start using LaunchAgents
      const launchAgentDir = path.join(os.homedir(), 'Library', 'LaunchAgents');
      const plistFile = path.join(launchAgentDir, 'com.cybershieldx.agent.plist');
      
      // Create launch agent plist
      const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.cybershieldx.agent</string>
    <key>ProgramArguments</key>
    <array>
        <string>${agentExe}</string>
        <string>${path.join(agentDir, agentArgs)}</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardErrorPath</key>
    <string>${path.join(os.homedir(), '.cybershieldx', 'logs', 'agent-error.log')}</string>
    <key>StandardOutPath</key>
    <string>${path.join(os.homedir(), '.cybershieldx', 'logs', 'agent.log')}</string>
</dict>
</plist>`;
      
      // Ensure LaunchAgents directory exists
      await fs.mkdir(launchAgentDir, { recursive: true });
      
      await fs.writeFile(plistFile, plistContent);
      await exec(`chmod 644 ${plistFile}`);
      logger.info(`Created launch agent plist: ${plistFile}`);
      
      // Load the launch agent
      try {
        await exec(`launchctl load ${plistFile}`);
        logger.info('Loaded launch agent');
      } catch (e) {
        logger.warn(`Could not load launch agent: ${e.message}`);
        logger.info('You may need to load it manually by running:');
        logger.info(`launchctl load ${plistFile}`);
      }
    } else if (isLinux) {
      // Linux auto-start using systemd user service
      const systemdDir = path.join(os.homedir(), '.config', 'systemd', 'user');
      const serviceFile = path.join(systemdDir, 'cybershieldx-agent.service');
      
      // Create systemd service file
      const serviceContent = `[Unit]
Description=CyberShieldX Security Agent
After=network.target

[Service]
ExecStart=${agentExe} ${path.join(agentDir, agentArgs)}
WorkingDirectory=${agentDir}
Restart=on-failure
RestartSec=10
StandardOutput=append:${path.join(os.homedir(), '.cybershieldx', 'logs', 'agent.log')}
StandardError=append:${path.join(os.homedir(), '.cybershieldx', 'logs', 'agent-error.log')}

[Install]
WantedBy=default.target
`;
      
      // Ensure systemd directory exists
      await fs.mkdir(systemdDir, { recursive: true });
      
      await fs.writeFile(serviceFile, serviceContent);
      logger.info(`Created systemd user service: ${serviceFile}`);
      
      // Enable the service
      try {
        await exec('systemctl --user daemon-reload');
        await exec('systemctl --user enable cybershieldx-agent.service');
        logger.info('Enabled systemd user service');
      } catch (e) {
        logger.warn(`Could not enable systemd user service: ${e.message}`);
        logger.info('You may need to enable it manually by running:');
        logger.info('systemctl --user daemon-reload');
        logger.info('systemctl --user enable cybershieldx-agent.service');
      }
    }
    
    return true;
  } catch (error) {
    logger.error(`Failed to configure auto-start: ${error.message}`);
    throw error;
  }
}

/**
 * Check if user has sudo privileges
 */
async function checkSudo() {
  try {
    await exec('sudo -n true');
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  runInitialSetup
};