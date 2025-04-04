/**
 * CyberShieldX Agent Electron Wrapper
 */

const { app, BrowserWindow, Tray, Menu, dialog, ipcMain } = require('electron');
const path = require('path');
const url = require('url');
const fs = require('fs');
const childProcess = require('child_process');
const os = require('os');

// Keep references to prevent garbage collection
let mainWindow;
let tray;
let agentProcess;
let isQuitting = false;

// Check if another instance is already running
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  console.log('Another instance is already running. Exiting...');
  app.quit();
  return;
}

// Handle second instance
app.on('second-instance', (event, commandLine, workingDirectory) => {
  // Someone tried to run a second instance, focus our window instead
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
    
    // Show dialog to user
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'CyberShieldX Agent',
      message: 'CyberShieldX Agent is already running.',
      detail: 'The application is already running in the background.',
      buttons: ['OK']
    });
  }
});

// Listen for service commands from renderer
ipcMain.on('service-command', (event, command) => {
  if (command === 'start') {
    startAgentProcess();
  } else if (command === 'stop') {
    stopAgentProcess();
  } else if (command === 'restart') {
    restartAgentProcess();
  }
});

// Get service status
ipcMain.handle('get-service-status', async () => {
  return {
    isRunning: agentProcess ? true : false,
    status: agentProcess ? 'running' : 'stopped',
    pid: agentProcess ? agentProcess.pid : null
  };
});

// Check if running as service
const isRunningAsService = process.argv.includes('--service');

// Create main window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Load the UI
  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'resources', 'index.html'),
    protocol: 'file:',
    slashes: true
  }));

  // Hide window on close instead of quitting
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      return false;
    }
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Create system tray
function createTray() {
  tray = new Tray(path.join(__dirname, 'assets', 'icon.ico'));
  
  const contextMenu = Menu.buildFromTemplate([
    { 
      label: 'Open CyberShieldX Agent', 
      click: () => {
        if (mainWindow) {
          mainWindow.show();
        } else {
          createWindow();
        }
      }
    },
    { type: 'separator' },
    { 
      label: 'Start Agent', 
      click: () => {
        startAgentProcess();
      }
    },
    { 
      label: 'Stop Agent', 
      click: () => {
        stopAgentProcess();
      }
    },
    { 
      label: 'Restart Agent', 
      click: () => {
        restartAgentProcess();
      }
    },
    { type: 'separator' },
    { 
      label: 'Quit', 
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);
  
  tray.setToolTip('CyberShieldX Agent');
  tray.setContextMenu(contextMenu);
  
  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
      }
    } else {
      createWindow();
    }
  });
}

// Start the agent process
function startAgentProcess() {
  if (agentProcess) {
    console.log('Agent process already running');
    return;
  }
  
  console.log('Starting agent process...');
  
  try {
    // Start agent as a separate process
    agentProcess = childProcess.fork(path.join(__dirname, 'src', 'index.js'), [], {
      env: process.env,
      stdio: 'inherit'
    });
    
    console.log('Agent process started with PID:', agentProcess.pid);
    
    // Handle process exit
    agentProcess.on('exit', (code, signal) => {
      console.log(`Agent process exited with code ${code} and signal ${signal}`);
      agentProcess = null;
      
      // Notify the renderer if the window exists
      if (mainWindow) {
        mainWindow.webContents.send('agent-status-changed', false);
      }
    });
    
    // Notify the renderer if the window exists
    if (mainWindow) {
      mainWindow.webContents.send('agent-status-changed', true);
    }
    
  } catch (error) {
    console.error('Failed to start agent process:', error);
    dialog.showErrorBox('Error', `Failed to start agent: ${error.message}`);
  }
}

// Stop the agent process
function stopAgentProcess() {
  if (!agentProcess) {
    console.log('No agent process running');
    return;
  }
  
  console.log('Stopping agent process...');
  
  try {
    // Use SIGINT for clean shutdown
    agentProcess.kill('SIGINT');
    
    // Give it some time to shut down gracefully
    setTimeout(() => {
      if (agentProcess) {
        console.log('Forcing agent process to stop');
        agentProcess.kill('SIGKILL');
        agentProcess = null;
      }
    }, 5000);
    
  } catch (error) {
    console.error('Failed to stop agent process:', error);
    agentProcess = null;
  }
}

// Restart the agent process
function restartAgentProcess() {
  console.log('Restarting agent process...');
  stopAgentProcess();
  
  // Wait a bit before starting again
  setTimeout(() => {
    startAgentProcess();
  }, 2000);
}

// Initialize
app.on('ready', () => {
  createTray();
  
  // Only create window if not running as a service
  if (!isRunningAsService) {
    createWindow();
  }
  
  // Start the agent process
  startAgentProcess();
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Don't quit on macOS
    if (!isRunningAsService) {
      app.quit();
    }
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// Clean up before quitting
app.on('before-quit', () => {
  isQuitting = true;
  stopAgentProcess();
});

// If running as a service, run without creating UI
if (isRunningAsService) {
  console.log('Running as a service');
}