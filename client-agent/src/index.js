#!/usr/bin/env node

/**
 * CyberShieldX Security Agent
 * Cross-platform network security agent for Windows, MacOS, Linux and Raspberry Pi
 * 
 * Main entry point for the agent application
 */

require('dotenv').config();
const express = require('express');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const os = require('os');
const fs = require('fs');
const path = require('path');
const { CronJob } = require('cron');
const si = require('systeminformation');
const winston = require('winston');
const chalk = require('chalk');

// Internal modules
const config = require('./utils/config');
const scanner = require('./scanners');
const analyzer = require('./analyzers');
const reporter = require('./reporter');
const installer = require('./installer');
const auth = require('./auth');
const selfUpdate = require('./self-update');

// Setup logging
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Agent ID and configuration
let agentId = config.get('agentId');
if (!agentId) {
  agentId = uuidv4();
  config.set('agentId', agentId);
  logger.info(`Generated new agent ID: ${agentId}`);
}

// Initialize agent configuration
const agentConfig = {
  id: agentId,
  version: require('../package.json').version,
  platform: process.platform,
  arch: process.arch,
  hostname: os.hostname(),
  clientId: config.get('clientId') || '',
  serverUrl: config.get('serverUrl') || 'wss://api.cybershieldx.com',
  scanInterval: config.get('scanInterval') || '0 */6 * * *', // Every 6 hours by default
  lastScan: config.get('lastScan') || null,
  status: 'initializing'
};

// Used for server HTTP API
const app = express();
const PORT = process.env.PORT || 8585;

// WebSocket connection to main server
let ws;
let wsReconnectInterval;
let heartbeatInterval;

/**
 * Setup WebSocket connection to the main server
 */
function setupWebSocket() {
  if (ws) {
    clearInterval(heartbeatInterval);
    ws.terminate();
  }

  logger.info(`Connecting to server: ${agentConfig.serverUrl}`);
  
  try {
    ws = new WebSocket(agentConfig.serverUrl);
    
    ws.on('open', () => {
      logger.info(chalk.green('Connected to CyberShieldX server!'));
      agentConfig.status = 'online';
      
      // Clear reconnect interval if it exists
      if (wsReconnectInterval) {
        clearInterval(wsReconnectInterval);
        wsReconnectInterval = null;
      }
      
      // Send authentication message
      sendMessage('auth', {
        agentId: agentConfig.id,
        clientId: agentConfig.clientId,
        hostname: agentConfig.hostname,
        platform: agentConfig.platform,
        version: agentConfig.version
      });
      
      // Setup heartbeat
      heartbeatInterval = setInterval(() => {
        sendMessage('heartbeat', {
          status: agentConfig.status,
          timestamp: new Date().toISOString()
        });
      }, 30000);
    });
    
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data);
        logger.debug(`Received message: ${message.type}`);
        
        switch (message.type) {
          case 'auth_response':
            handleAuthResponse(message.data);
            break;
          
          case 'config_update':
            handleConfigUpdate(message.data);
            break;
          
          case 'run_scan':
            handleRunScan(message.data);
            break;
            
          case 'update_agent':
            handleUpdateAgent(message.data);
            break;
            
          case 'reboot':
            handleReboot();
            break;
            
          default:
            logger.warn(`Unknown message type: ${message.type}`);
        }
      } catch (error) {
        logger.error(`Error processing message: ${error.message}`);
      }
    });
    
    ws.on('error', (error) => {
      logger.error(`WebSocket error: ${error.message}`);
    });
    
    ws.on('close', () => {
      logger.warn('Connection to server closed');
      agentConfig.status = 'offline';
      
      // Try to reconnect
      if (!wsReconnectInterval) {
        wsReconnectInterval = setInterval(() => {
          logger.info('Attempting to reconnect...');
          setupWebSocket();
        }, 10000); // Try to reconnect every 10 seconds
      }
    });
  } catch (error) {
    logger.error(`Failed to connect to server: ${error.message}`);
    
    // Setup reconnect if not already set
    if (!wsReconnectInterval) {
      wsReconnectInterval = setInterval(() => {
        logger.info('Attempting to reconnect...');
        setupWebSocket();
      }, 10000);
    }
  }
}

/**
 * Send message to the server via WebSocket
 */
function sendMessage(type, data) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type,
      data,
      timestamp: new Date().toISOString()
    }));
    return true;
  }
  logger.warn(`Cannot send message, WebSocket not connected: ${type}`);
  return false;
}

/**
 * Handle authentication response from server
 */
function handleAuthResponse(data) {
  if (data.success) {
    logger.info(chalk.green('Authentication successful!'));
    
    // Store token if provided
    if (data.token) {
      config.set('serverToken', data.token);
    }
    
    // Update client ID if provided
    if (data.clientId && data.clientId !== agentConfig.clientId) {
      agentConfig.clientId = data.clientId;
      config.set('clientId', data.clientId);
      logger.info(`Updated client ID: ${data.clientId}`);
    }
    
    // Schedule scans if provided
    if (data.scanInterval) {
      scheduleScan(data.scanInterval);
    }
    
    // Run initial scan if requested
    if (data.runInitialScan) {
      runScan('system');
    }
  } else {
    logger.error(chalk.red('Authentication failed:', data.message));
    
    // If token is invalid, clear it
    if (data.message === 'Invalid token') {
      config.delete('serverToken');
    }
  }
}

/**
 * Handle configuration update from server
 */
function handleConfigUpdate(data) {
  logger.info('Received configuration update from server');
  
  // Update scan interval if provided
  if (data.scanInterval) {
    scheduleScan(data.scanInterval);
  }
  
  // Update server URL if provided
  if (data.serverUrl && data.serverUrl !== agentConfig.serverUrl) {
    agentConfig.serverUrl = data.serverUrl;
    config.set('serverUrl', data.serverUrl);
    logger.info(`Updated server URL: ${data.serverUrl}`);
    
    // Reconnect to new server URL
    setupWebSocket();
  }
  
  // Save any other configuration values
  Object.keys(data).forEach(key => {
    if (key !== 'scanInterval' && key !== 'serverUrl') {
      config.set(key, data[key]);
      logger.debug(`Set config ${key}: ${data[key]}`);
    }
  });
  
  // Send acknowledgement
  sendMessage('config_update_ack', {
    success: true,
    message: 'Configuration updated'
  });
}

/**
 * Handle scan request from server
 */
async function handleRunScan(data) {
  const scanType = data.type || 'quick';
  const scanId = data.scanId || uuidv4();
  
  logger.info(`Received scan request from server: ${scanType} (ID: ${scanId})`);
  
  // Run the scan
  try {
    const scanResult = await runScan(scanType, scanId);
    
    // Send acknowledgement
    sendMessage('scan_complete', {
      scanId,
      success: true,
      results: scanResult
    });
  } catch (error) {
    logger.error(`Error running scan: ${error.message}`);
    
    // Send error message
    sendMessage('scan_complete', {
      scanId,
      success: false,
      error: error.message
    });
  }
}

/**
 * Run a security scan
 */
async function runScan(scanType = 'quick', scanId = null) {
  if (!scanId) {
    scanId = uuidv4();
  }
  
  agentConfig.status = 'scanning';
  logger.info(`Starting ${scanType} scan (ID: ${scanId})...`);
  
  // Send scan start notification
  sendMessage('scan_start', {
    scanId,
    type: scanType,
    timestamp: new Date().toISOString()
  });
  
  try {
    let scanResults = {};
    
    // Run appropriate scan based on type
    switch (scanType) {
      case 'quick':
        scanResults = await scanner.quickScan();
        break;
      case 'system':
        scanResults = await scanner.systemScan();
        break;
      case 'network':
        scanResults = await scanner.networkScan();
        break;
      case 'full':
        scanResults = await scanner.fullScan();
        break;
      default:
        throw new Error(`Unknown scan type: ${scanType}`);
    }
    
    // Analyze scan results
    const analysis = await analyzer.analyze(scanResults);
    
    // Generate report
    const report = reporter.generateReport(scanId, scanType, scanResults, analysis);
    
    // Update last scan time
    agentConfig.lastScan = new Date().toISOString();
    config.set('lastScan', agentConfig.lastScan);
    
    // Save report locally
    const reportDir = path.join(os.homedir(), '.cybershieldx', 'reports');
    fs.mkdirSync(reportDir, { recursive: true });
    fs.writeFileSync(
      path.join(reportDir, `scan_${scanId}.json`),
      JSON.stringify(report, null, 2)
    );
    
    // Reset status
    agentConfig.status = 'online';
    
    logger.info(chalk.green(`Scan completed successfully (ID: ${scanId})`));
    return report;
  } catch (error) {
    // Reset status
    agentConfig.status = 'online';
    logger.error(`Scan failed: ${error.message}`);
    throw error;
  }
}

/**
 * Schedule periodic scans
 */
function scheduleScan(cronExpression) {
  // Clear existing scheduled scan if any
  if (global.scheduledScan) {
    global.scheduledScan.stop();
  }
  
  // Schedule new scan
  agentConfig.scanInterval = cronExpression;
  config.set('scanInterval', cronExpression);
  
  global.scheduledScan = new CronJob(
    cronExpression,
    () => {
      logger.info('Running scheduled scan');
      runScan('system');
    },
    null,
    true
  );
  
  logger.info(`Scheduled scans with cron expression: ${cronExpression}`);
}

/**
 * Handle agent update request
 */
async function handleUpdateAgent(data) {
  logger.info('Received request to update agent');
  
  try {
    const updateResult = await selfUpdate.update(data.version);
    
    if (updateResult.success) {
      logger.info(chalk.green(`Agent updated to version ${updateResult.version}`));
      
      // Send acknowledgement
      sendMessage('update_complete', {
        success: true,
        version: updateResult.version
      });
      
      // Restart agent if requested
      if (data.restart) {
        setTimeout(() => {
          process.exit(0); // Exit so that service manager can restart us
        }, 2000);
      }
    } else {
      logger.error(chalk.red(`Update failed: ${updateResult.message}`));
      
      // Send error
      sendMessage('update_complete', {
        success: false,
        error: updateResult.message
      });
    }
  } catch (error) {
    logger.error(`Error during update: ${error.message}`);
    
    // Send error
    sendMessage('update_complete', {
      success: false,
      error: error.message
    });
  }
}

/**
 * Handle reboot request
 */
function handleReboot() {
  logger.info('Received reboot request from server');
  
  // Send acknowledgement before rebooting
  sendMessage('reboot_ack', {
    message: 'Rebooting agent'
  });
  
  // Wait a moment to ensure message is sent
  setTimeout(() => {
    process.exit(0); // Exit so that service manager can restart us
  }, 2000);
}

/**
 * Setup HTTP API server
 */
function setupApiServer() {
  // Basic auth middleware
  const basicAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'Authentication required' 
      });
    }
    
    const token = authHeader.split(' ')[1];
    if (token !== config.get('localApiToken')) {
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'Invalid token' 
      });
    }
    
    next();
  };
  
  // JSON middleware
  app.use(express.json());
  
  // Public routes
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      version: agentConfig.version,
      agentStatus: agentConfig.status
    });
  });
  
  // Authenticated routes
  app.get('/api/info', basicAuth, (req, res) => {
    res.json({
      id: agentConfig.id,
      version: agentConfig.version,
      platform: agentConfig.platform,
      hostname: agentConfig.hostname,
      clientId: agentConfig.clientId,
      status: agentConfig.status,
      lastScan: agentConfig.lastScan
    });
  });
  
  app.post('/api/scan', basicAuth, async (req, res) => {
    const { type = 'quick' } = req.body;
    
    try {
      // Start scan in background
      runScan(type)
        .catch(error => {
          logger.error(`Background scan error: ${error.message}`);
        });
      
      res.json({
        message: `${type} scan started`,
        status: 'scanning'
      });
    } catch (error) {
      res.status(500).json({
        error: 'Scan failed to start',
        message: error.message
      });
    }
  });
  
  app.get('/api/config', basicAuth, (req, res) => {
    // Get all config except sensitive data
    const safeConfig = config.getAll();
    delete safeConfig.serverToken;
    delete safeConfig.localApiToken;
    
    res.json(safeConfig);
  });
  
  app.post('/api/config', basicAuth, (req, res) => {
    const newConfig = req.body;
    
    // Don't allow updating sensitive data this way
    delete newConfig.serverToken;
    delete newConfig.localApiToken;
    
    // Update config
    Object.keys(newConfig).forEach(key => {
      config.set(key, newConfig[key]);
    });
    
    res.json({
      message: 'Configuration updated'
    });
  });
  
  // Start server
  app.listen(PORT, () => {
    logger.info(`HTTP API server running on port ${PORT}`);
  });
}

/**
 * Run initial system info collection
 */
async function collectSystemInfo() {
  try {
    const systemInfo = {
      os: await si.osInfo(),
      cpu: await si.cpu(),
      memory: await si.mem(),
      disk: await si.fsSize(),
      network: await si.networkInterfaces()
    };
    
    logger.info('System information collected');
    
    // Save system info
    config.set('systemInfo', systemInfo);
    
    return systemInfo;
  } catch (error) {
    logger.error(`Error collecting system info: ${error.message}`);
    return null;
  }
}

/**
 * Ensure the agent has a local API token
 */
function ensureLocalApiToken() {
  let token = config.get('localApiToken');
  
  if (!token) {
    token = uuidv4();
    config.set('localApiToken', token);
    logger.info('Generated new local API token');
  }
  
  return token;
}

/**
 * Main function
 */
async function main() {
  console.log(chalk.blue('                                                         '));
  console.log(chalk.blue('  _____      _                  _____ _     _      _     _   _  __ '));
  console.log(chalk.blue(' / ____|    | |                / ____| |   (_)    | |   | | \\ \\/ / '));
  console.log(chalk.blue('| |     _   | |__   ___ _ __  | (___ | |__  _  ___| | __| |_ \\  /  '));
  console.log(chalk.blue('| |    | | | | \'_ \\ / _ \\ \'__|  \\___ \\| \'_ \\| |/ _ \\ |/ _\` | |/  \\  '));
  console.log(chalk.blue('| |____| |_| | |_) |  __/ |     ____) | | | | |  __/ | (_| |/ /\\ \\ '));
  console.log(chalk.blue(' \\_____|\\__, |_.__/ \\___|_|    |_____/|_| |_|_|\\___|_|\\__,_/_/  \\_\\'));
  console.log(chalk.blue('         __/ |                                                      '));
  console.log(chalk.blue('        |___/                                                       '));
  console.log(chalk.blue('                                                         '));
  console.log(chalk.green(`CyberShieldX Agent v${agentConfig.version}`));
  console.log(chalk.yellow(`Agent ID: ${agentConfig.id}`));
  console.log(chalk.yellow(`Platform: ${agentConfig.platform} (${agentConfig.arch})`));
  console.log(chalk.yellow(`Hostname: ${agentConfig.hostname}`));
  console.log('                                                         ');
  
  // Check if first run
  const firstRun = !config.get('setupComplete');
  
  if (firstRun) {
    logger.info('First run detected, running initial setup');
    await installer.runInitialSetup();
    config.set('setupComplete', true);
  }
  
  // Ensure local API token exists
  ensureLocalApiToken();
  
  // Collect system information
  await collectSystemInfo();
  
  // Setup API server for local communication
  setupApiServer();
  
  // Check for updates immediately on startup if applicable
  selfUpdate.checkForUpdate()
    .then(updateInfo => {
      if (updateInfo.available) {
        logger.info(`New version available: ${updateInfo.version}`);
      }
    })
    .catch(error => {
      logger.error(`Update check failed: ${error.message}`);
    });
  
  // Connect to server
  setupWebSocket();
}

// Run main function
main().catch(error => {
  logger.error(`Fatal error: ${error.message}`);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully');
  
  if (ws) {
    logger.info('Closing WebSocket connection');
    sendMessage('shutdown', { reason: 'user_request' });
    ws.close();
  }
  
  setTimeout(() => {
    process.exit(0);
  }, 1000);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  
  if (ws) {
    logger.info('Closing WebSocket connection');
    sendMessage('shutdown', { reason: 'service_stop' });
    ws.close();
  }
  
  setTimeout(() => {
    process.exit(0);
  }, 1000);
});

// Uncaught exception handler
process.on('uncaughtException', (error) => {
  logger.error(`Uncaught exception: ${error.message}`, error);
  
  // Try to send error to server
  if (ws && ws.readyState === WebSocket.OPEN) {
    sendMessage('error', {
      message: error.message,
      stack: error.stack
    });
  }
});

// Unhandled promise rejection handler
process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Unhandled promise rejection: ${reason}`);
  
  // Try to send error to server
  if (ws && ws.readyState === WebSocket.OPEN) {
    sendMessage('error', {
      message: reason.toString(),
      stack: reason.stack
    });
  }
});