
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
$serverUrl = "https://cybershieldx.be"
$installDir = "C:\Program Files\CyberShieldX"
$clientId = ""

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
        $nodeInstaller = "$env:TEMP\node-installer.msi"
        Invoke-WebRequest -Uri "https://nodejs.org/dist/v18.17.1/node-v18.17.1-x64.msi" -OutFile $nodeInstaller
        # Install Node.js silently
        Start-Process -FilePath "msiexec.exe" -ArgumentList "/i \"$nodeInstaller\" /quiet /qn" -Wait
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

    Set-Content -Path "$installDir\config.json" -Value $config
    
    # Download agent files
    Write-Host "Downloading agent files..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri "$serverUrl/downloads/cybershieldx-agent-windows.zip" -OutFile "$env:TEMP\cybershieldx-agent.zip"
    Expand-Archive -Path "$env:TEMP\cybershieldx-agent.zip" -DestinationPath $installDir -Force
    
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
    Set-Content -Path "$installDir\start-agent.bat" -Value $batchContent
    
    # Create service
    sc.exe create $serviceName binPath= "cmd.exe /c $installDir\start-agent.bat" start= auto DisplayName= "CyberShieldX Security Agent" | Out-Null
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
