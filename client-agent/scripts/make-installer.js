/**
 * Script to create a Windows installer using NSIS
 * This script is used to create a standalone Windows installer without Electron
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Check if running on Windows
if (process.platform !== 'win32') {
  console.error('This script must be run on Windows');
  process.exit(1);
}

// Check if makensis is installed (part of NSIS)
try {
  execSync('makensis -VERSION');
} catch (error) {
  console.error('NSIS is not installed or not in PATH. Please install NSIS first.');
  console.error('You can download it from: https://nsis.sourceforge.io/Download');
  process.exit(1);
}

// Create NSIS installer script
const createInstallerScript = () => {
  const packageJson = require('../package.json');
  const tempDir = path.join(os.tmpdir(), 'cybershieldx-installer');
  
  // Create temp directory
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  // Get paths
  const scriptPath = path.join(tempDir, 'installer.nsi');
  const iconPath = path.resolve(__dirname, '../assets/icon.ico');
  const outputDir = path.resolve(__dirname, '../dist');
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Create NSIS script
  const nsisScript = `
; CyberShieldX Agent Installer Script
Unicode True

!include "MUI2.nsh"
!include "FileFunc.nsh"
!include "LogicLib.nsh"

; Define basic info
!define PRODUCT_NAME "CyberShieldX Agent"
!define PRODUCT_VERSION "${packageJson.version}"
!define PRODUCT_PUBLISHER "CyberShieldX"
!define PRODUCT_WEB_SITE "https://cybershieldx.be"
!define PRODUCT_DIR_REGKEY "Software\\Microsoft\\Windows\\CurrentVersion\\App Paths\\CyberShieldX-Agent.exe"
!define PRODUCT_UNINST_KEY "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\\${PRODUCT_NAME}"

; Request application privileges for Windows Vista/7/8/10
RequestExecutionLevel admin

; Set compression
SetCompressor /SOLID lzma

; Interface settings
!define MUI_ABORTWARNING
!define MUI_ICON "${iconPath}"
!define MUI_UNICON "${iconPath}"
!define MUI_WELCOMEFINISHPAGE_BITMAP "${iconPath}"
!define MUI_HEADERIMAGE
!define MUI_HEADERIMAGE_BITMAP "${iconPath}"

; Welcome page
!insertmacro MUI_PAGE_WELCOME

; License page
!define MUI_LICENSEPAGE_CHECKBOX
!insertmacro MUI_PAGE_LICENSE "../LICENSE"

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

; Client ID page function
Function ClientIDPage
  !insertmacro MUI_HEADER_TEXT "Client Configuration" "Enter your Client ID"
  
  nsDialogs::Create 1018
  Pop $0
  
  ${If} $0 == error
    Abort
  ${EndIf}
  
  ${NSD_CreateLabel} 0 0 100% 20u "Enter your Client ID (provided by your administrator):"
  Pop $0
  
  ${NSD_CreateText} 0 25u 100% 15u ""
  Pop $ClientID
  
  nsDialogs::Show
FunctionEnd

Function ClientIDLeave
  ${NSD_GetText} $ClientID $ClientID
  ${If} $ClientID == ""
    MessageBox MB_OK|MB_ICONEXCLAMATION "Please enter a Client ID. Contact your administrator if you don't have one."
    Abort
  ${EndIf}
FunctionEnd

; Main installer section
Name "\${PRODUCT_NAME} \${PRODUCT_VERSION}"
OutFile "${outputDir}\\CyberShieldX-Agent-Setup.exe"
InstallDir "$PROGRAMFILES\\CyberShieldX\\Agent"
InstallDirRegKey HKLM "\${PRODUCT_DIR_REGKEY}" ""
ShowInstDetails show
ShowUnInstDetails show

Section "MainSection" SEC01
  SetOutPath "$INSTDIR"
  SetOverwrite on
  
  ; Copy files
  File /r "../dist-pkg/*.*"
  File "../assets/icon.ico"
  
  ; Create config file with Client ID
  FileOpen $0 "$INSTDIR\\config.json" w
  FileWrite $0 '{"clientId": "$ClientID", "serverUrl": "https://cybershieldx.be", "agentVersion": "${packageJson.version}", "platform": "windows", "installDate": "${new Date().toISOString()}"}'
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
SectionEnd
  `;
  
  // Write the NSIS script to a file
  fs.writeFileSync(scriptPath, nsisScript);
  
  console.log(`NSIS script created at: ${scriptPath}`);
  return scriptPath;
};

// Main function
const main = async () => {
  try {
    console.log('Building standalone executable with pkg...');
    execSync('npm run pkg', { stdio: 'inherit' });
    
    console.log('Creating Windows installer...');
    const scriptPath = createInstallerScript();
    
    console.log('Running NSIS compiler...');
    execSync(`makensis "${scriptPath}"`, { stdio: 'inherit' });
    
    console.log('Installer created successfully!');
  } catch (error) {
    console.error('Error creating installer:', error);
    process.exit(1);
  }
};

// Run the main function
main();