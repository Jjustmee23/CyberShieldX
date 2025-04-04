import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import { log } from '../vite';

const router = Router();

// Create directory for downloads if it doesn't exist
const downloadsDir = path.join(process.cwd(), 'public', 'downloads');
if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir, { recursive: true });
  log(`Created downloads directory at ${downloadsDir}`, 'downloads');
}

// Windows installer script
const windowsInstallScript = `
# CyberShieldX Agent Installer for Windows
# Run as Administrator: PowerShell -ExecutionPolicy Bypass -File install-windows.ps1

Write-Host "CyberShieldX Agent Installer for Windows" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# Check if running as administrator
if (-NOT ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "Please run this script as Administrator" -ForegroundColor Red
    Exit 1
}

# Configuration
$installDir = "C:\\Program Files\\CyberShieldX"
$clientId = ""
$serverUrl = "https://cybershieldx.be"

# Get server URL from user (with default value)
$userServerUrl = Read-Host "Enter Server URL (press Enter for default: $serverUrl)"
if ($userServerUrl) {
    $serverUrl = $userServerUrl
}
Write-Host "Using server URL: $serverUrl" -ForegroundColor Green

# Get client ID from user
$clientId = Read-Host "Enter your Client ID (provided by your administrator)"
if (-not $clientId) {
    Write-Host "Client ID is required. Please contact your administrator." -ForegroundColor Red
    Exit 1
}

# Create installation directory
if (!(Test-Path $installDir)) {
    New-Item -ItemType Directory -Path $installDir | Out-Null
}

# Install required dependencies
Write-Host "Installing required dependencies..." -ForegroundColor Yellow
try {
    # Install Node.js if not already installed
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        Write-Host "Installing Node.js..." -ForegroundColor Yellow
        # Download Node.js installer
        $nodeInstaller = "$env:TEMP\\node-installer.msi"
        Invoke-WebRequest -Uri "https://nodejs.org/dist/v18.17.1/node-v18.17.1-x64.msi" -OutFile $nodeInstaller
        # Install Node.js silently
        Start-Process -FilePath "msiexec.exe" -ArgumentList "/i \\"$nodeInstaller\\" /quiet /qn" -Wait
        # Check if installation succeeded
        if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
            Write-Host "Failed to install Node.js. Please install it manually." -ForegroundColor Red
            Exit 1
        }
    }
    
    # Create configuration file
    $config = @{
        serverUrl = $serverUrl
        clientId = $clientId
        installDate = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
        agentVersion = "1.0.0"
        platform = "windows"
        hostname = [System.Net.Dns]::GetHostName()
    } | ConvertTo-Json

    Set-Content -Path "$installDir\\config.json" -Value $config
    
    # Download agent files
    Write-Host "Downloading agent files..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri "$serverUrl/downloads/cybershieldx-agent-windows.zip" -OutFile "$env:TEMP\\cybershieldx-agent.zip"
    Expand-Archive -Path "$env:TEMP\\cybershieldx-agent.zip" -DestinationPath $installDir -Force
    
    # Register as a service
    Write-Host "Registering Windows service..." -ForegroundColor Yellow
    # For simplicity, using the native Windows SC command
    $serviceName = "CyberShieldXAgent"
    
    # Check if service already exists, if so remove it
    if (Get-Service $serviceName -ErrorAction SilentlyContinue) {
        sc.exe delete $serviceName | Out-Null
    }
    
    # Create batch file to start the agent
    $batchContent = @"
@echo off
cd /d "$installDir"
node agent.js
"@
    Set-Content -Path "$installDir\\start-agent.bat" -Value $batchContent
    
    # Create service
    sc.exe create $serviceName binPath= "cmd.exe /c $installDir\\start-agent.bat" start= auto DisplayName= "CyberShieldX Security Agent" | Out-Null
    sc.exe description $serviceName "CyberShieldX security monitoring agent for real-time protection" | Out-Null
    
    # Start the service
    Start-Service $serviceName
    
    Write-Host "CyberShieldX Agent installed successfully!" -ForegroundColor Green
    Write-Host "Service Name: $serviceName" -ForegroundColor Green
    Write-Host "Installation Directory: $installDir" -ForegroundColor Green
    Write-Host "Client ID: $clientId" -ForegroundColor Green
    
} catch {
    Write-Host "An error occurred during installation: $_" -ForegroundColor Red
    Exit 1
}

Write-Host "Installation completed successfully." -ForegroundColor Green
`;

// Linux installer script
const linuxInstallScript = `#!/bin/bash
# CyberShieldX Agent Installer for Linux
# Usage: sudo bash install-linux.sh

echo "CyberShieldX Agent Installer for Linux"
echo "======================================="

# Check if running as root
if [ "$(id -u)" != "0" ]; then
   echo "This script must be run as root"
   exit 1
fi

# Configuration
INSTALL_DIR="/opt/cybershieldx-agent"
SERVER_URL="https://cybershieldx.be"

# Get server URL from user (with default)
echo -n "Enter Server URL (press Enter for default: $SERVER_URL): "
read USER_SERVER_URL

if [ ! -z "$USER_SERVER_URL" ]; then
    SERVER_URL="$USER_SERVER_URL"
fi
echo "Using server URL: $SERVER_URL"

# Get client ID
echo -n "Enter your Client ID (provided by your administrator): "
read CLIENT_ID

if [ -z "$CLIENT_ID" ]; then
    echo "Client ID is required. Please contact your administrator."
    exit 1
fi

# Create installation directory
mkdir -p $INSTALL_DIR
cd $INSTALL_DIR || exit 1

# Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
    VERSION=$VERSION_ID
    echo "Detected OS: $OS $VERSION"
else
    echo "Could not detect OS, assuming Ubuntu/Debian"
    OS="debian"
fi

# Install dependencies
echo "Installing dependencies..."

# Install Node.js if not already installed
if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    
    if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
        curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
        apt-get install -y nodejs
    elif [ "$OS" = "fedora" ]; then
        dnf -y install nodejs
    elif [ "$OS" = "centos" ] || [ "$OS" = "rhel" ]; then
        curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
        yum install -y nodejs
    else
        echo "Unsupported OS: $OS"
        echo "Please install Node.js manually"
        exit 1
    fi
    
    # Verify installation
    if ! command -v node &> /dev/null; then
        echo "Failed to install Node.js"
        exit 1
    fi
fi

# Create configuration file
echo "Creating configuration..."
cat > "$INSTALL_DIR/config.json" << EOF
{
    "serverUrl": "$SERVER_URL",
    "clientId": "$CLIENT_ID",
    "installDate": "$(date '+%Y-%m-%d %H:%M:%S')",
    "agentVersion": "1.0.0",
    "platform": "linux",
    "hostname": "$(hostname)"
}
EOF

# Download agent files
echo "Downloading agent files..."
curl -s -o /tmp/cybershieldx-agent.tar.gz "$SERVER_URL/downloads/cybershieldx-agent-linux.tar.gz"
tar -xzf /tmp/cybershieldx-agent.tar.gz -C $INSTALL_DIR
rm /tmp/cybershieldx-agent.tar.gz

# Create systemd service
echo "Creating systemd service..."
cat > /etc/systemd/system/cybershieldx-agent.service << EOF
[Unit]
Description=CyberShieldX Security Agent
After=network.target

[Service]
ExecStart=/usr/bin/node $INSTALL_DIR/agent.js
WorkingDirectory=$INSTALL_DIR
Restart=always
User=root
Group=root
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd, enable and start service
systemctl daemon-reload
systemctl enable cybershieldx-agent
systemctl start cybershieldx-agent

echo "CyberShieldX Agent installed successfully!"
echo "Service Name: cybershieldx-agent"
echo "Installation Directory: $INSTALL_DIR"
echo "Client ID: $CLIENT_ID"

# Verify service is running
if systemctl is-active --quiet cybershieldx-agent; then
    echo "Service is running."
else
    echo "Service failed to start. Check logs with: journalctl -u cybershieldx-agent"
fi

echo "Installation completed successfully."
`;

// Raspberry Pi installer script
const raspberryPiInstallScript = `#!/bin/bash
# CyberShieldX Agent Installer for Raspberry Pi
# Usage: sudo bash install-raspberry.sh

echo "CyberShieldX Agent Installer for Raspberry Pi"
echo "============================================="

# Check if running as root
if [ "$(id -u)" != "0" ]; then
   echo "This script must be run as root"
   exit 1
fi

# Check if running on a Raspberry Pi
if ! grep -q "Raspberry Pi" /proc/cpuinfo && ! grep -q "BCM" /proc/cpuinfo; then
    echo "Warning: This system does not appear to be a Raspberry Pi."
    echo -n "Continue anyway? (y/n): "
    read CONTINUE
    if [ "$CONTINUE" != "y" ]; then
        exit 1
    fi
fi

# Configuration
INSTALL_DIR="/opt/cybershieldx-agent"
SERVER_URL="https://cybershieldx.be"

# Get server URL from user (with default)
echo -n "Enter Server URL (press Enter for default: $SERVER_URL): "
read USER_SERVER_URL

if [ ! -z "$USER_SERVER_URL" ]; then
    SERVER_URL="$USER_SERVER_URL"
fi
echo "Using server URL: $SERVER_URL"

# Get client ID
echo -n "Enter your Client ID (provided by your administrator): "
read CLIENT_ID

if [ -z "$CLIENT_ID" ]; then
    echo "Client ID is required. Please contact your administrator."
    exit 1
fi

# Create installation directory
mkdir -p $INSTALL_DIR
cd $INSTALL_DIR || exit 1

# Install dependencies
echo "Installing dependencies..."

# Update package lists
apt-get update

# Install Node.js if not already installed
if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    
    # For Raspberry Pi, we'll use the NodeSource repository
    curl -fsSL https://deb.nodesource.com/setup_16.x | bash -
    apt-get install -y nodejs
    
    # Verify installation
    if ! command -v node &> /dev/null; then
        echo "Failed to install Node.js"
        exit 1
    fi
fi

# Create configuration file
echo "Creating configuration..."
cat > "$INSTALL_DIR/config.json" << EOF
{
    "serverUrl": "$SERVER_URL",
    "clientId": "$CLIENT_ID",
    "installDate": "$(date '+%Y-%m-%d %H:%M:%S')",
    "agentVersion": "1.0.0",
    "platform": "raspberry-pi",
    "hostname": "$(hostname)",
    "raspberryPiModel": "$(cat /proc/cpuinfo | grep 'Model' | cut -d ':' -f 2 | xargs || echo 'Unknown')"
}
EOF

# Download agent files optimized for Raspberry Pi
echo "Downloading agent files..."
curl -s -o /tmp/cybershieldx-agent.tar.gz "$SERVER_URL/downloads/cybershieldx-agent-raspberry.tar.gz"
tar -xzf /tmp/cybershieldx-agent.tar.gz -C $INSTALL_DIR
rm /tmp/cybershieldx-agent.tar.gz

# Create systemd service
echo "Creating systemd service..."
cat > /etc/systemd/system/cybershieldx-agent.service << EOF
[Unit]
Description=CyberShieldX Security Agent for Raspberry Pi
After=network.target

[Service]
ExecStart=/usr/bin/node $INSTALL_DIR/agent.js
WorkingDirectory=$INSTALL_DIR
Restart=always
User=root
Group=root
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd, enable and start service
systemctl daemon-reload
systemctl enable cybershieldx-agent
systemctl start cybershieldx-agent

echo "CyberShieldX Agent installed successfully!"
echo "Service Name: cybershieldx-agent"
echo "Installation Directory: $INSTALL_DIR"
echo "Client ID: $CLIENT_ID"

# Verify service is running
if systemctl is-active --quiet cybershieldx-agent; then
    echo "Service is running."
else
    echo "Service failed to start. Check logs with: journalctl -u cybershieldx-agent"
fi

echo "Installation completed successfully."
`;

// Create the download files
fs.writeFileSync(path.join(downloadsDir, 'install-windows.ps1'), windowsInstallScript);
fs.writeFileSync(path.join(downloadsDir, 'install-linux.sh'), linuxInstallScript);
fs.writeFileSync(path.join(downloadsDir, 'install-raspberry.sh'), raspberryPiInstallScript);

// Create a proper NSIS installer script for Windows
const nsisInstallerScript = `; CyberShieldX Agent Installer Script
Unicode True

!include "MUI2.nsh"
!include "FileFunc.nsh"
!include "LogicLib.nsh"

; Define basic info
!define PRODUCT_NAME "CyberShieldX Agent"
!define PRODUCT_VERSION "1.0.0"
!define PRODUCT_PUBLISHER "CyberShieldX"
!define PRODUCT_WEB_SITE "https://cybershieldx.be"
!define PRODUCT_DIR_REGKEY "Software\\Microsoft\\Windows\\CurrentVersion\\App Paths\\CyberShieldX-Agent.exe"
!define PRODUCT_UNINST_KEY "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\$\{PRODUCT_NAME\}"

; Request application privileges for Windows Vista/7/8/10
RequestExecutionLevel admin

; Set compression
SetCompressor /SOLID lzma

; Interface settings
!define MUI_ABORTWARNING
!define MUI_ICON "icon.ico"
!define MUI_UNICON "icon.ico"
!define MUI_HEADERIMAGE
!define MUI_HEADERIMAGE_BITMAP "icon.ico"

; Welcome page
!insertmacro MUI_PAGE_WELCOME

; License page
!define MUI_LICENSEPAGE_CHECKBOX
!insertmacro MUI_PAGE_LICENSE "LICENSE.txt"

; Directory page
!insertmacro MUI_PAGE_DIRECTORY

; Client ID page
Var ClientID
Page custom ClientIDPage ClientIDLeave

; Instfiles page
!insertmacro MUI_PAGE_INSTFILES

; Finish page
!define MUI_FINISHPAGE_RUN "$INSTDIR\\CyberShieldX-Agent.exe"
!insertmacro MUI_PAGE_FINISH

; Uninstaller pages
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

; Language files
!insertmacro MUI_LANGUAGE "English"
!insertmacro MUI_LANGUAGE "Dutch"

; Client ID page function
Function ClientIDPage
  !insertmacro MUI_HEADER_TEXT "Client Configuration" "Enter your Client ID"
  
  nsDialogs::Create 1018
  Pop $0
  
  \${If\} $0 == error
    Abort
  \${EndIf\}
  
  \${NSD_CreateLabel\} 0 0 100% 20u "Enter your Client ID (provided by your administrator):"
  Pop $0
  
  \${NSD_CreateText\} 0 25u 100% 15u ""
  Pop $ClientID
  
  nsDialogs::Show
FunctionEnd

Function ClientIDLeave
  \${NSD_GetText\} $ClientID $ClientID
  \${If\} $ClientID == ""
    MessageBox MB_OK|MB_ICONEXCLAMATION "Please enter a Client ID. Contact your administrator if you don't have one."
    Abort
  \${EndIf\}
FunctionEnd

; Main installer section
Name "\${PRODUCT_NAME} \${PRODUCT_VERSION}"
OutFile "CyberShieldX-Agent-Setup.exe"
InstallDir "$PROGRAMFILES\\CyberShieldX\\Agent"
InstallDirRegKey HKLM "\${PRODUCT_DIR_REGKEY}" ""
ShowInstDetails show
ShowUnInstDetails show

Section "MainSection" SEC01
  SetOutPath "$INSTDIR"
  SetOverwrite on
  
  ; Copy files
  File "CyberShieldX-Agent.exe"
  File "icon.ico"
  
  ; Create config file with Client ID
  FileOpen $0 "$INSTDIR\\config.json" w
  FileWrite $0 '{"clientId": "$ClientID", "serverUrl": "https://cybershieldx.be", "agentVersion": "\${PRODUCT_VERSION}", "platform": "windows", "installDate": "${new Date().toISOString()}"}'
  FileClose $0
  
  ; Write registry keys
  WriteRegStr HKLM "\${PRODUCT_DIR_REGKEY}" "" "$INSTDIR\\CyberShieldX-Agent.exe"
  WriteRegStr HKLM "\${PRODUCT_UNINST_KEY}" "DisplayName" "\${PRODUCT_NAME}"
  WriteRegStr HKLM "\${PRODUCT_UNINST_KEY}" "UninstallString" "$INSTDIR\\uninstall.exe"
  WriteRegStr HKLM "\${PRODUCT_UNINST_KEY}" "DisplayIcon" "$INSTDIR\\icon.ico"
  WriteRegStr HKLM "\${PRODUCT_UNINST_KEY}" "DisplayVersion" "\${PRODUCT_VERSION}"
  WriteRegStr HKLM "\${PRODUCT_UNINST_KEY}" "URLInfoAbout" "\${PRODUCT_WEB_SITE}"
  WriteRegStr HKLM "\${PRODUCT_UNINST_KEY}" "Publisher" "\${PRODUCT_PUBLISHER}"
  
  ; Create uninstaller
  WriteUninstaller "$INSTDIR\\uninstall.exe"
  
  ; Create shortcuts
  CreateDirectory "$SMPROGRAMS\\CyberShieldX"
  CreateShortCut "$SMPROGRAMS\\CyberShieldX\\CyberShieldX Agent.lnk" "$INSTDIR\\CyberShieldX-Agent.exe" "" "$INSTDIR\\icon.ico"
  CreateShortCut "$DESKTOP\\CyberShieldX Agent.lnk" "$INSTDIR\\CyberShieldX-Agent.exe" "" "$INSTDIR\\icon.ico"
  
  ; Create Windows service
  ExecWait '"$SYSDIR\\sc.exe" create "CyberShieldXAgent" DisplayName= "CyberShieldX Security Agent" start= auto binPath= "$INSTDIR\\CyberShieldX-Agent.exe"'
  ExecWait '"$SYSDIR\\sc.exe" description "CyberShieldXAgent" "CyberShieldX security monitoring agent for real-time protection"'
  
  ; Start the service
  ExecWait '"$SYSDIR\\sc.exe" start "CyberShieldXAgent"'
SectionEnd

Section "Uninstall"
  ; Stop and remove service
  ExecWait '"$SYSDIR\\sc.exe" stop "CyberShieldXAgent"'
  ExecWait '"$SYSDIR\\sc.exe" delete "CyberShieldXAgent"'
  
  ; Remove shortcuts, files and registry entries
  Delete "$DESKTOP\\CyberShieldX Agent.lnk"
  Delete "$SMPROGRAMS\\CyberShieldX\\CyberShieldX Agent.lnk"
  RMDir "$SMPROGRAMS\\CyberShieldX"
  
  Delete "$INSTDIR\\uninstall.exe"
  RMDir /r "$INSTDIR"
  
  DeleteRegKey HKLM "\${PRODUCT_UNINST_KEY}"
  DeleteRegKey HKLM "\${PRODUCT_DIR_REGKEY}"
SectionEnd`;

// Create the download files
fs.writeFileSync(path.join(downloadsDir, 'install-windows.ps1'), windowsInstallScript);
fs.writeFileSync(path.join(downloadsDir, 'install-linux.sh'), linuxInstallScript);
fs.writeFileSync(path.join(downloadsDir, 'install-raspberry.sh'), raspberryPiInstallScript);
fs.writeFileSync(path.join(downloadsDir, 'CyberShieldX-Installer.nsi'), nsisInstallerScript);

// Create placeholder files for agent downloads if they don't exist
if (!fs.existsSync(path.join(downloadsDir, 'cybershieldx-agent-windows.exe'))) {
  fs.writeFileSync(path.join(downloadsDir, 'cybershieldx-agent-windows.exe'), 'This is a placeholder for the Windows agent executable.');
}
if (!fs.existsSync(path.join(downloadsDir, 'cybershieldx-agent-windows.zip'))) {
  fs.writeFileSync(path.join(downloadsDir, 'cybershieldx-agent-windows.zip'), 'This is a placeholder for the Windows agent ZIP file.');
}
if (!fs.existsSync(path.join(downloadsDir, 'cybershieldx-agent-linux.tar.gz'))) {
  fs.writeFileSync(path.join(downloadsDir, 'cybershieldx-agent-linux.tar.gz'), 'This is a placeholder for the Linux agent tarball.');
}
if (!fs.existsSync(path.join(downloadsDir, 'cybershieldx-agent-raspberry.tar.gz'))) {
  fs.writeFileSync(path.join(downloadsDir, 'cybershieldx-agent-raspberry.tar.gz'), 'This is a placeholder for the Raspberry Pi agent tarball.');
}
if (!fs.existsSync(path.join(downloadsDir, 'CyberShieldX-Manual.pdf'))) {
  fs.writeFileSync(path.join(downloadsDir, 'CyberShieldX-Manual.pdf'), 'This is a placeholder for the CyberShieldX manual PDF.');
}

// Get NSIS installer template from file or create if it doesn't exist
const nsisInstallerPath = path.join(downloadsDir, 'CyberShieldX-Installer.txt');
if (!fs.existsSync(nsisInstallerPath)) {
  fs.writeFileSync(nsisInstallerPath, fs.readFileSync(path.join(process.cwd(), 'public', 'downloads', 'CyberShieldX-Installer.txt'), 'utf8'));
  log('Added NSIS installer template to downloads', 'downloads');
}

// Routes to serve download files
router.get('/', (req, res) => {
  res.redirect('/downloads');
});

// Route to list available downloads
router.get('/list', (req, res) => {
  try {
    const files = fs.readdirSync(downloadsDir).map(file => {
      return {
        name: file,
        url: `/api/downloads/${file}`,
        size: fs.statSync(path.join(downloadsDir, file)).size
      };
    });
    
    res.json(files);
  } catch (error) {
    console.error('Error listing downloads:', error);
    res.status(500).json({ error: 'Failed to list downloads' });
  }
});

// Route to download a specific file
router.get('/:filename', (req, res) => {
  try {
    const fileName = req.params.filename;
    const filePath = path.join(downloadsDir, fileName);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    res.download(filePath);
  } catch (error) {
    console.error('Error serving download:', error);
    res.status(500).json({ error: 'Failed to serve download' });
  }
});

export default router;