; Custom NSIS script for CyberShieldX Agent

; Add registry keys for auto-start
!macro customInstall
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Run" "CyberShieldX Agent" "$INSTDIR\${APP_EXECUTABLE_FILENAME} --service"
!macroend

; Clean up registry on uninstall
!macro customUnInstall
  DeleteRegValue HKLM "Software\Microsoft\Windows\CurrentVersion\Run" "CyberShieldX Agent"
  
  ; Stop and remove Windows service if it exists
  ExecWait 'sc stop CyberShieldXAgent'
  ExecWait 'sc delete CyberShieldXAgent'
!macroend

; Custom dialog for Client ID
Var ClientID
Var ClientIDLabel
Var ClientIDTextBox
Var ServerURL
Var ServerURLLabel
Var ServerURLTextBox

!macro customDialogs
  !define CLIENTID_DIALOG_NAME "ClientIDDialog"
  !define CLIENTID_DIALOG_TITLE "CyberShieldX Agent Configuration"
  !define CLIENTID_DIALOG_TEXT "Please enter your Client ID and Server URL."
  
  Page custom ClientIDDialogShow ClientIDDialogLeave
  
  Function ClientIDDialogShow
    nsDialogs::Create 1018
    Pop $0
    ${If} $0 == error
      Abort
    ${EndIf}
    
    # Create labels and text fields
    ${NSD_CreateLabel} 0 0 100% 12u "Please enter your Client ID (provided by your administrator):"
    Pop $ClientIDLabel
    
    ${NSD_CreateText} 0 15u 100% 12u ""
    Pop $ClientIDTextBox
    
    ${NSD_CreateLabel} 0 42u 100% 12u "Server URL (leave default unless specified by administrator):"
    Pop $ServerURLLabel
    
    ${NSD_CreateText} 0 57u 100% 12u "https://cybershieldx.be"
    Pop $ServerURLTextBox
    
    nsDialogs::Show
  FunctionEnd
  
  Function ClientIDDialogLeave
    ${NSD_GetText} $ClientIDTextBox $ClientID
    ${NSD_GetText} $ServerURLTextBox $ServerURL
    
    ${If} $ClientID == ""
      MessageBox MB_ICONEXCLAMATION|MB_OK "Please enter a Client ID."
      Abort
    ${EndIf}
    
    ${If} $ServerURL == ""
      StrCpy $ServerURL "https://cybershieldx.be"
    ${EndIf}
    
    # Create config.json with the entered values
    # This file will be read by the agent on startup
    FileOpen $0 "$INSTDIR\config.json" w
    FileWrite $0 '{"clientId": "$ClientID", "serverUrl": "$ServerURL", "agentVersion": "${VERSION}", "platform": "windows", "installDate": "${__DATE__}${__TIME__}", "hostname": "$COMPUTERNAME"}'
    FileClose $0
  FunctionEnd
!macroend

; Register the application as a Windows service after installation
!macro customInstallEnd
  ExecWait '"$INSTDIR\${APP_EXECUTABLE_FILENAME}" --service-install'
  ExecWait 'sc create CyberShieldXAgent binPath= "$INSTDIR\${APP_EXECUTABLE_FILENAME} --service" start= auto DisplayName= "CyberShieldX Security Agent"'
  ExecWait 'sc description CyberShieldXAgent "CyberShieldX security monitoring agent for real-time protection"'
  ExecWait 'sc failure CyberShieldXAgent reset= 86400 actions= restart/60000/restart/60000/restart/60000'
  ExecWait 'sc start CyberShieldXAgent'
!macroend