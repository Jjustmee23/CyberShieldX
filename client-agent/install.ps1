# CyberShieldX Agent Windows Installatiescript
# Dit script installeert de CyberShieldX agent op Windows systemen

# Parameters
param(
    [Parameter(Mandatory=$false)]
    [string]$ClientId,
    
    [Parameter(Mandatory=$false)]
    [string]$ServerUrl = "https://api.cybershieldx.com",
    
    [Parameter(Mandatory=$false)]
    [string]$InstallDir = "$env:ProgramFiles\CyberShieldX",
    
    [Parameter(Mandatory=$false)]
    [string]$LogLevel = "info",
    
    [Parameter(Mandatory=$false)]
    [string]$ScanInterval = "6h",
    
    [Parameter(Mandatory=$false)]
    [switch]$Silent = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$NoAutoStart = $false
)

# Functies voor logging
function Write-LogMessage {
    param(
        [Parameter(Mandatory=$true)]
        [string]$Message,
        
        [Parameter(Mandatory=$false)]
        [string]$Type = "INFO"
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Type] $Message"
    
    switch ($Type) {
        "ERROR" { 
            Write-Host $logMessage -ForegroundColor Red 
            Add-Content -Path "$env:TEMP\cybershieldx_install.log" -Value $logMessage
        }
        "WARNING" { 
            Write-Host $logMessage -ForegroundColor Yellow 
            Add-Content -Path "$env:TEMP\cybershieldx_install.log" -Value $logMessage
        }
        "SUCCESS" { 
            Write-Host $logMessage -ForegroundColor Green 
            Add-Content -Path "$env:TEMP\cybershieldx_install.log" -Value $logMessage
        }
        default { 
            Write-Host $logMessage 
            Add-Content -Path "$env:TEMP\cybershieldx_install.log" -Value $logMessage
        }
    }
}

function Test-Administrator {
    $currentUser = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    return $currentUser.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# Header weergeven
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "   CyberShieldX Agent Windows Installatiescript  " -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# Controleer beheerderrechten
if (-not (Test-Administrator)) {
    Write-LogMessage "Dit script moet als administrator worden uitgevoerd." -Type "ERROR"
    Write-LogMessage "Start PowerShell als administrator en probeer opnieuw." -Type "ERROR"
    exit 1
}

# Controleer en vraag om ClientID als die niet is opgegeven
if (-not $ClientId -and -not $Silent) {
    $ClientId = Read-Host "Voer uw Client ID in (verplicht, te vinden in het CyberShieldX webplatform)"
    if (-not $ClientId) {
        Write-LogMessage "Geen Client ID opgegeven. Installatie wordt afgebroken." -Type "ERROR"
        exit 1
    }
}

if (-not $ClientId) {
    Write-LogMessage "Geen Client ID opgegeven. Gebruik -ClientId parameter of voer interactieve installatie uit." -Type "ERROR"
    exit 1
}

# Controleer en vraag om ServerUrl als die niet de standaard is
if ($ServerUrl -eq "https://api.cybershieldx.com" -and -not $Silent) {
    $customServer = Read-Host "Voer server URL in (druk op Enter voor standaard: $ServerUrl)"
    if ($customServer) {
        $ServerUrl = $customServer
    }
}

Write-LogMessage "Installatie wordt gestart met de volgende instellingen:" -Type "INFO"
Write-LogMessage "  - Client ID: $ClientId" -Type "INFO"
Write-LogMessage "  - Server URL: $ServerUrl" -Type "INFO" 
Write-LogMessage "  - Installatie map: $InstallDir" -Type "INFO"
Write-LogMessage "  - Log niveau: $LogLevel" -Type "INFO"
Write-LogMessage "  - Scan interval: $ScanInterval" -Type "INFO"
Write-LogMessage "  - Automatisch starten: $(if($NoAutoStart) { 'Nee' } else { 'Ja' })" -Type "INFO"

if (-not $Silent) {
    Write-Host ""
    $confirmation = Read-Host "Wilt u doorgaan met de installatie? (J/N)"
    if ($confirmation -ne "J" -and $confirmation -ne "j") {
        Write-LogMessage "Installatie geannuleerd door gebruiker." -Type "WARNING"
        exit 0
    }
}

# Begin installatie
Write-LogMessage "CyberShieldX Agent installatie gestart..." -Type "INFO"

# Controleer of Node.js is geïnstalleerd
Write-LogMessage "Node.js controleren..." -Type "INFO"
try {
    $nodeVersion = node -v
    Write-LogMessage "Node.js versie $nodeVersion gevonden." -Type "INFO"
} catch {
    Write-LogMessage "Node.js niet gevonden. Installatie wordt gestart..." -Type "WARNING"
    
    try {
        # Download Node.js installer
        $nodeInstaller = "$env:TEMP\node_installer.msi"
        Invoke-WebRequest -Uri "https://nodejs.org/dist/v16.17.0/node-v16.17.0-x64.msi" -OutFile $nodeInstaller
        
        # Installeer Node.js
        Write-LogMessage "Node.js installeren..." -Type "INFO"
        Start-Process msiexec.exe -Wait -ArgumentList "/i $nodeInstaller /quiet"
        
        # Verwijder installer
        Remove-Item $nodeInstaller -Force
        
        # Update PATH
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine")
        
        Write-LogMessage "Node.js succesvol geïnstalleerd." -Type "SUCCESS"
    } catch {
        Write-LogMessage "Fout bij installeren van Node.js: $_" -Type "ERROR"
        Write-LogMessage "Installeer Node.js 16.x of nieuwer handmatig via https://nodejs.org/" -Type "ERROR"
        exit 1
    }
}

# Controleer of Npcap is geïnstalleerd (voor netwerk scanning)
Write-LogMessage "Npcap controleren..." -Type "INFO"
$npcapInstalled = Get-Service -Name npcap -ErrorAction SilentlyContinue

if (-not $npcapInstalled) {
    Write-LogMessage "Npcap niet gevonden. Installatie wordt gestart..." -Type "WARNING"
    
    try {
        # Download Npcap installer
        $npcapInstaller = "$env:TEMP\npcap_installer.exe"
        Invoke-WebRequest -Uri "https://npcap.com/dist/npcap-1.60.exe" -OutFile $npcapInstaller
        
        # Installeer Npcap
        Write-LogMessage "Npcap installeren..." -Type "INFO"
        Start-Process $npcapInstaller -Wait -ArgumentList "/quiet /loopback_support=yes"
        
        # Verwijder installer
        Remove-Item $npcapInstaller -Force
        
        Write-LogMessage "Npcap succesvol geïnstalleerd." -Type "SUCCESS"
    } catch {
        Write-LogMessage "Fout bij installeren van Npcap: $_" -Type "WARNING"
        Write-LogMessage "Netwerk scans werken mogelijk niet correct. Installeer Npcap handmatig via https://npcap.com/" -Type "WARNING"
    }
}

# Maak installatiemap
Write-LogMessage "Installatiemap voorbereiden..." -Type "INFO"
if (-not (Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}

# Maak submappen
$configDir = Join-Path $InstallDir "config"
$dataDir = Join-Path $InstallDir "data"
$logsDir = Join-Path $InstallDir "logs"

New-Item -ItemType Directory -Path $configDir -Force | Out-Null
New-Item -ItemType Directory -Path $dataDir -Force | Out-Null
New-Item -ItemType Directory -Path $logsDir -Force | Out-Null

# Download agent bestanden
Write-LogMessage "Agent bestanden downloaden..." -Type "INFO"

try {
    # Download van de meest recente versie
    # In een echte omgeving zou je deze bestanden downloaden van je eigen server
    $agentZip = "$env:TEMP\cybershieldx_agent.zip"
    Invoke-WebRequest -Uri "$ServerUrl/downloads/windows/agent.zip" -OutFile $agentZip -ErrorAction Stop
    
    # Pak het ZIP-bestand uit
    Expand-Archive -Path $agentZip -DestinationPath $InstallDir -Force
    
    # Verwijder het ZIP-bestand
    Remove-Item $agentZip -Force
    
    Write-LogMessage "Agent bestanden succesvol gedownload en uitgepakt." -Type "SUCCESS"
} catch {
    Write-LogMessage "Fout bij downloaden van agent bestanden: $_" -Type "ERROR"
    
    # Fallback: Probeer GitHub als alternatief
    try {
        Write-LogMessage "Alternatieve download methode proberen..." -Type "INFO"
        $repoZip = "$env:TEMP\cybershieldx_repo.zip"
        Invoke-WebRequest -Uri "https://github.com/Jjustmee23/CyberShieldX/archive/refs/heads/main.zip" -OutFile $repoZip
        
        # Pak het ZIP-bestand uit
        Expand-Archive -Path $repoZip -DestinationPath "$env:TEMP\cybershieldx_temp" -Force
        
        # Kopieer alleen de client-agent map
        Copy-Item -Path "$env:TEMP\cybershieldx_temp\CyberShieldX-main\client-agent\*" -Destination $InstallDir -Recurse -Force
        
        # Opruimen
        Remove-Item $repoZip -Force
        Remove-Item "$env:TEMP\cybershieldx_temp" -Recurse -Force
        
        Write-LogMessage "Agent bestanden succesvol via alternatieve bron gedownload." -Type "SUCCESS"
    } catch {
        Write-LogMessage "Kon agent bestanden niet downloaden. Installatie wordt afgebroken." -Type "ERROR"
        Write-LogMessage "Foutmelding: $_" -Type "ERROR"
        exit 1
    }
}

# Installeer NPM dependencies
Write-LogMessage "Node.js dependencies installeren..." -Type "INFO"
Set-Location $InstallDir
try {
    Start-Process npm -ArgumentList "install --production" -Wait -NoNewWindow
    Write-LogMessage "Dependencies succesvol geïnstalleerd." -Type "SUCCESS"
} catch {
    Write-LogMessage "Fout bij installeren van dependencies: $_" -Type "ERROR"
    exit 1
}

# Maak configuratiebestand
Write-LogMessage "Configuratiebestand aanmaken..." -Type "INFO"
$configFile = Join-Path $configDir "config.json"
$configJson = @{
    clientId = $ClientId
    server = $ServerUrl
    logLevel = $LogLevel
    scanInterval = $ScanInterval
    autoStart = -not $NoAutoStart
    telemetry = $true
    autoUpdate = $true
    installDir = $InstallDir
} | ConvertTo-Json

Set-Content -Path $configFile -Value $configJson
Write-LogMessage "Configuratiebestand aangemaakt op $configFile" -Type "SUCCESS"

# Maak Windows service voor automatisch starten
if (-not $NoAutoStart) {
    Write-LogMessage "Windows service aanmaken..." -Type "INFO"
    
    # Maak een batch bestand voor de service
    $serviceBatch = Join-Path $InstallDir "service.bat"
    @"
@echo off
cd /d $InstallDir
node src/index.js --config=$configFile
"@ | Set-Content -Path $serviceBatch

    try {
        # Gebruik NSSM voor service management
        $nssmPath = Join-Path $InstallDir "tools\nssm.exe"
        
        if (-not (Test-Path $nssmPath)) {
            # Download NSSM
            $nssmZip = "$env:TEMP\nssm.zip"
            New-Item -ItemType Directory -Path (Join-Path $InstallDir "tools") -Force | Out-Null
            Invoke-WebRequest -Uri "https://nssm.cc/release/nssm-2.24.zip" -OutFile $nssmZip
            
            # Pak het zip bestand uit
            Expand-Archive -Path $nssmZip -DestinationPath "$env:TEMP\nssm" -Force
            Copy-Item -Path "$env:TEMP\nssm\nssm-2.24\win64\nssm.exe" -Destination $nssmPath
            
            # Opruimen
            Remove-Item $nssmZip -Force
            Remove-Item "$env:TEMP\nssm" -Recurse -Force
        }
        
        # Verwijder bestaande service indien aanwezig
        Start-Process $nssmPath -ArgumentList "stop CyberShieldXAgent" -NoNewWindow -Wait -ErrorAction SilentlyContinue
        Start-Process $nssmPath -ArgumentList "remove CyberShieldXAgent confirm" -NoNewWindow -Wait -ErrorAction SilentlyContinue
        
        # Maak nieuwe service
        Start-Process $nssmPath -ArgumentList "install CyberShieldXAgent $serviceBatch" -NoNewWindow -Wait
        Start-Process $nssmPath -ArgumentList "set CyberShieldXAgent Description CyberShieldX Security Agent" -NoNewWindow -Wait
        Start-Process $nssmPath -ArgumentList "set CyberShieldXAgent DisplayName CyberShieldX Agent" -NoNewWindow -Wait
        Start-Process $nssmPath -ArgumentList "set CyberShieldXAgent Start SERVICE_AUTO_START" -NoNewWindow -Wait
        
        # Start de service
        Start-Process $nssmPath -ArgumentList "start CyberShieldXAgent" -NoNewWindow -Wait
        
        Write-LogMessage "Service succesvol aangemaakt en gestart." -Type "SUCCESS"
    } catch {
        Write-LogMessage "Fout bij aanmaken van service: $_" -Type "ERROR"
        Write-LogMessage "U kunt de agent handmatig starten met: node $InstallDir\src\index.js" -Type "WARNING"
    }
}

# Maak een bureaublad snelkoppeling
$desktopShortcut = [System.IO.Path]::Combine([System.Environment]::GetFolderPath("Desktop"), "CyberShieldX Agent.lnk")
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($desktopShortcut)
$Shortcut.TargetPath = "cmd.exe"
$Shortcut.Arguments = "/c `"cd /d $InstallDir && npm start`""
$Shortcut.IconLocation = "$InstallDir\assets\icon.ico, 0"
$Shortcut.Description = "CyberShieldX Security Agent"
$Shortcut.WorkingDirectory = $InstallDir
$Shortcut.Save()

Write-LogMessage "Bureaublad snelkoppeling aangemaakt." -Type "SUCCESS"

# Maak een start menu item
$startMenuFolder = [System.IO.Path]::Combine([System.Environment]::GetFolderPath("Programs"), "CyberShieldX")
if (-not (Test-Path $startMenuFolder)) {
    New-Item -ItemType Directory -Path $startMenuFolder -Force | Out-Null
}
$startMenuShortcut = [System.IO.Path]::Combine($startMenuFolder, "CyberShieldX Agent.lnk")
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($startMenuShortcut)
$Shortcut.TargetPath = "cmd.exe"
$Shortcut.Arguments = "/c `"cd /d $InstallDir && npm start`""
$Shortcut.IconLocation = "$InstallDir\assets\icon.ico, 0"
$Shortcut.Description = "CyberShieldX Security Agent"
$Shortcut.WorkingDirectory = $InstallDir
$Shortcut.Save()

Write-LogMessage "Start menu item aangemaakt." -Type "SUCCESS"

# Voeg een uninstaller toe aan Programs and Features
$uninstallRegKey = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\CyberShieldXAgent"
if (-not (Test-Path $uninstallRegKey)) {
    New-Item -Path $uninstallRegKey -Force | Out-Null
}

$uninstallScript = Join-Path $InstallDir "uninstall.ps1"
@"
# CyberShieldX Agent uninstaller
Write-Host "CyberShieldX Agent wordt verwijderd..." -ForegroundColor Cyan

# Stop en verwijder service
try {
    `$nssmPath = Join-Path "$InstallDir" "tools\nssm.exe"
    if (Test-Path `$nssmPath) {
        Start-Process `$nssmPath -ArgumentList "stop CyberShieldXAgent" -NoNewWindow -Wait
        Start-Process `$nssmPath -ArgumentList "remove CyberShieldXAgent confirm" -NoNewWindow -Wait
    } else {
        sc.exe stop CyberShieldXAgent
        sc.exe delete CyberShieldXAgent
    }
} catch { }

# Verwijder snelkoppelingen
Remove-Item -Path "$desktopShortcut" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "$startMenuFolder" -Recurse -Force -ErrorAction SilentlyContinue

# Verwijder registry key
Remove-Item -Path "$uninstallRegKey" -Recurse -Force -ErrorAction SilentlyContinue

# Verwijder installatiemap
Remove-Item -Path "$InstallDir" -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "CyberShieldX Agent is succesvol verwijderd." -ForegroundColor Green
"@ | Set-Content -Path $uninstallScript

New-ItemProperty -Path $uninstallRegKey -Name "DisplayName" -Value "CyberShieldX Security Agent" -PropertyType String -Force | Out-Null
New-ItemProperty -Path $uninstallRegKey -Name "DisplayVersion" -Value "1.0.0" -PropertyType String -Force | Out-Null
New-ItemProperty -Path $uninstallRegKey -Name "Publisher" -Value "CyberShieldX" -PropertyType String -Force | Out-Null
New-ItemProperty -Path $uninstallRegKey -Name "UninstallString" -Value "powershell.exe -ExecutionPolicy Bypass -File `"$uninstallScript`"" -PropertyType String -Force | Out-Null
New-ItemProperty -Path $uninstallRegKey -Name "DisplayIcon" -Value "$InstallDir\assets\icon.ico" -PropertyType String -Force | Out-Null
New-ItemProperty -Path $uninstallRegKey -Name "InstallLocation" -Value $InstallDir -PropertyType String -Force | Out-Null
New-ItemProperty -Path $uninstallRegKey -Name "NoModify" -Value 1 -PropertyType DWord -Force | Out-Null
New-ItemProperty -Path $uninstallRegKey -Name "NoRepair" -Value 1 -PropertyType DWord -Force | Out-Null

Write-LogMessage "Uninstaller geregistreerd in Programma's en Onderdelen." -Type "SUCCESS"

# Installatie voltooien
Write-Host ""
Write-Host "=================================================" -ForegroundColor Green
Write-Host "   CyberShieldX Agent Installatie Voltooid!      " -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green
Write-Host ""
Write-LogMessage "Installatie voltooid op: $(Get-Date)" -Type "SUCCESS"
Write-LogMessage "Installatiemap: $InstallDir" -Type "INFO"
Write-LogMessage "Log bestand: $env:TEMP\cybershieldx_install.log" -Type "INFO"
Write-Host ""

if (-not $NoAutoStart) {
    Write-LogMessage "De agent draait nu als een Windows service en zal automatisch starten bij opstarten." -Type "INFO"
} else {
    Write-LogMessage "U kunt de agent handmatig starten via de bureaublad snelkoppeling of Start menu." -Type "INFO"
}

Write-Host ""
Write-LogMessage "Voor ondersteuning, neem contact op met support@cybershieldx.com" -Type "INFO"
Write-Host "=================================================" -ForegroundColor Green