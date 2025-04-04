; CyberShieldX Agent Installer Script
Unicode True

!include "MUI2.nsh"
!include "FileFunc.nsh"
!include "LogicLib.nsh"

; Define basic info
!define PRODUCT_NAME "CyberShieldX Agent"
!define PRODUCT_VERSION "1.0.0"
!define PRODUCT_PUBLISHER "CyberShieldX"
!define PRODUCT_WEB_SITE "https://cybershieldx.be"
!define PRODUCT_DIR_REGKEY "Software\Microsoft\Windows\CurrentVersion\App Paths\CyberShieldX-Agent.exe"
!define PRODUCT_UNINST_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}"

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
!define MUI_FINISHPAGE_RUN "$INSTDIR\CyberShieldX-Agent.exe"
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
Name "${PRODUCT_NAME} ${PRODUCT_VERSION}"
OutFile "CyberShieldX-Agent-Setup.exe"
InstallDir "$PROGRAMFILES\CyberShieldX\Agent"
InstallDirRegKey HKLM "${PRODUCT_DIR_REGKEY}" ""
ShowInstDetails show
ShowUnInstDetails show

Section "MainSection" SEC01
  SetOutPath "$INSTDIR"
  SetOverwrite on
  
  ; Copy files
  File "CyberShieldX-Agent.exe"
  File "icon.ico"
  
  ; Create config file with Client ID
  FileOpen $0 "$INSTDIR\config.json" w
  FileWrite $0 '{"clientId": "$ClientID", "serverUrl": "https://cybershieldx.be", "agentVersion": "${PRODUCT_VERSION}", "platform": "windows", "installDate": "2025-04-04T19:51:28.386Z"}'
  FileClose $0
  
  ; Write registry keys
  WriteRegStr HKLM "${PRODUCT_DIR_REGKEY}" "" "$INSTDIR\CyberShieldX-Agent.exe"
  WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "DisplayName" "${PRODUCT_NAME}"
  WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "UninstallString" "$INSTDIR\uninstall.exe"
  WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "DisplayIcon" "$INSTDIR\icon.ico"
  WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "DisplayVersion" "${PRODUCT_VERSION}"
  WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "URLInfoAbout" "${PRODUCT_WEB_SITE}"
  WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "Publisher" "${PRODUCT_PUBLISHER}"
  
  ; Create uninstaller
  WriteUninstaller "$INSTDIR\uninstall.exe"
  
  ; Create shortcuts
  CreateDirectory "$SMPROGRAMS\CyberShieldX"
  CreateShortCut "$SMPROGRAMS\CyberShieldX\CyberShieldX Agent.lnk" "$INSTDIR\CyberShieldX-Agent.exe" "" "$INSTDIR\icon.ico"
  CreateShortCut "$DESKTOP\CyberShieldX Agent.lnk" "$INSTDIR\CyberShieldX-Agent.exe" "" "$INSTDIR\icon.ico"
  
  ; Create Windows service
  ExecWait '"$SYSDIR\sc.exe" create "CyberShieldXAgent" DisplayName= "CyberShieldX Security Agent" start= auto binPath= "$INSTDIR\CyberShieldX-Agent.exe"'
  ExecWait '"$SYSDIR\sc.exe" description "CyberShieldXAgent" "CyberShieldX security monitoring agent for real-time protection"'
  
  ; Start the service
  ExecWait '"$SYSDIR\sc.exe" start "CyberShieldXAgent"'
SectionEnd

Section "Uninstall"
  ; Stop and remove service
  ExecWait '"$SYSDIR\sc.exe" stop "CyberShieldXAgent"'
  ExecWait '"$SYSDIR\sc.exe" delete "CyberShieldXAgent"'
  
  ; Remove shortcuts, files and registry entries
  Delete "$DESKTOP\CyberShieldX Agent.lnk"
  Delete "$SMPROGRAMS\CyberShieldX\CyberShieldX Agent.lnk"
  RMDir "$SMPROGRAMS\CyberShieldX"
  
  Delete "$INSTDIR\uninstall.exe"
  RMDir /r "$INSTDIR"
  
  DeleteRegKey HKLM "${PRODUCT_UNINST_KEY}"
  DeleteRegKey HKLM "${PRODUCT_DIR_REGKEY}"
SectionEnd