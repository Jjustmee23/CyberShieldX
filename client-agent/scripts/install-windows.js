/**
 * Windows installation script for CyberShieldX Agent
 * This script will be called from the npm script: npm run install:win
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const readline = require('readline');
const os = require('os');

// Check if running on Windows
if (process.platform !== 'win32') {
  console.error('This script must be run on Windows');
  process.exit(1);
}

// Check if running as Administrator
const isAdmin = () => {
  try {
    execSync('net session >nul 2>&1');
    return true;
  } catch (e) {
    return false;
  }
};

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Main installation function
const install = async () => {
  try {
    // Check for admin rights
    if (!isAdmin()) {
      console.error('This installation script must be run as Administrator!');
      console.log('Please restart the script with administrator privileges.');
      process.exit(1);
    }

    console.log('===========================================');
    console.log('  CyberShieldX Agent Installation Script  ');
    console.log('===========================================');
    
    // Get installation directory
    const defaultDir = path.join(process.env.PROGRAMFILES, 'CyberShieldX', 'Agent');
    
    // Get client ID
    const clientId = await new Promise(resolve => {
      rl.question('Enter your Client ID (provided by your administrator): ', answer => {
        if (!answer.trim()) {
          console.error('Client ID is required.');
          process.exit(1);
        }
        resolve(answer.trim());
      });
    });

    // Get server URL
    const defaultServerUrl = 'https://cybershieldx.be';
    const serverUrl = await new Promise(resolve => {
      rl.question(`Enter server URL (press Enter for default: ${defaultServerUrl}): `, answer => {
        resolve(answer.trim() || defaultServerUrl);
      });
    });
    
    rl.close();
    
    console.log('');
    console.log('Starting installation...');
    console.log('');
    
    // Create installation directory
    console.log(`Creating installation directory: ${defaultDir}`);
    if (!fs.existsSync(defaultDir)) {
      fs.mkdirSync(defaultDir, { recursive: true });
    }
    
    // Copy files to installation directory
    console.log('Copying agent files...');
    const sourceDir = path.resolve(__dirname, '..');
    
    // Create file list to copy
    const filesToCopy = [
      'src',
      'package.json',
      'assets'
    ];
    
    for (const file of filesToCopy) {
      const sourcePath = path.join(sourceDir, file);
      const destPath = path.join(defaultDir, file);
      
      // Use robocopy for directories, copy for files
      if (fs.statSync(sourcePath).isDirectory()) {
        execSync(`robocopy "${sourcePath}" "${destPath}" /S /E /NP /NFL /NDL`, { stdio: 'ignore' });
      } else {
        fs.copyFileSync(sourcePath, destPath);
      }
    }
    
    // Create config file
    console.log('Creating configuration file...');
    const configFile = path.join(defaultDir, 'config.json');
    const config = {
      clientId,
      serverUrl,
      agentVersion: require('../package.json').version,
      installDate: new Date().toISOString(),
      platform: 'windows',
      hostname: os.hostname()
    };
    
    fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
    
    // Install dependencies
    console.log('Installing dependencies...');
    process.chdir(defaultDir);
    execSync('npm install --production', { stdio: 'inherit' });
    
    // Create Windows service
    console.log('Registering Windows service...');
    const serviceBatchFile = path.join(defaultDir, 'start-service.bat');
    
    // Create batch file for service
    fs.writeFileSync(serviceBatchFile, `@echo off
cd /d "${defaultDir}"
node src/index.js
`);
    
    // Create service using sc command
    try {
      // Remove existing service if it exists
      execSync('sc delete CyberShieldXAgent', { stdio: 'ignore' });
    } catch (e) {
      // Ignore error if service doesn't exist
    }
    
    // Create new service
    execSync(`sc create CyberShieldXAgent binPath= "cmd.exe /c ${serviceBatchFile}" start= auto DisplayName= "CyberShieldX Security Agent"`, 
      { stdio: 'inherit' });
    execSync(`sc description CyberShieldXAgent "CyberShieldX security monitoring agent for real-time protection"`, 
      { stdio: 'inherit' });
    
    // Start the service
    console.log('Starting the service...');
    execSync('sc start CyberShieldXAgent', { stdio: 'inherit' });
    
    // Create shortcuts
    console.log('Creating shortcuts...');
    
    // Script for creating shortcuts
    const shortcutScript = `
    Set oWS = WScript.CreateObject("WScript.Shell")
    
    ' Desktop shortcut
    sDesktop = oWS.SpecialFolders("Desktop")
    Set oLink = oWS.CreateShortcut(sDesktop & "\\CyberShieldX Agent.lnk")
    oLink.TargetPath = "${defaultDir}\\src\\index.js"
    oLink.Description = "CyberShieldX Security Agent"
    oLink.IconLocation = "${defaultDir}\\assets\\icon.ico"
    oLink.Save
    
    ' Start Menu shortcut
    Set oLink = oWS.CreateShortcut(oWS.SpecialFolders("StartMenu") & "\\Programs\\CyberShieldX\\CyberShieldX Agent.lnk")
    
    ' Create Programs directory if it doesn't exist
    On Error Resume Next
    oWS.Run("cmd /c mkdir """ & oWS.SpecialFolders("StartMenu") & "\\Programs\\CyberShieldX"""), 0, True
    On Error Goto 0
    
    oLink.TargetPath = "${defaultDir}\\src\\index.js"
    oLink.Description = "CyberShieldX Security Agent"
    oLink.IconLocation = "${defaultDir}\\assets\\icon.ico"
    oLink.Save
    `;
    
    // Write shortcut script to a temp file
    const shortcutVbs = path.join(os.tmpdir(), 'cybershieldx_shortcuts.vbs');
    fs.writeFileSync(shortcutVbs, shortcutScript);
    
    // Create shortcuts by running the VBScript
    execSync(`cscript //nologo "${shortcutVbs}"`, { stdio: 'inherit' });
    
    // Clean up the temp file
    fs.unlinkSync(shortcutVbs);
    
    console.log('');
    console.log('============================================================');
    console.log('  CyberShieldX Agent has been successfully installed!');
    console.log('============================================================');
    console.log('');
    console.log(`Installation directory: ${defaultDir}`);
    console.log(`Client ID: ${clientId}`);
    console.log(`Server URL: ${serverUrl}`);
    console.log('');
    console.log('The agent service has been started and will run automatically at system startup.');
    console.log('');
    
  } catch (error) {
    console.error('An error occurred during installation:');
    console.error(error.message);
    process.exit(1);
  }
};

// Run the installation
install();