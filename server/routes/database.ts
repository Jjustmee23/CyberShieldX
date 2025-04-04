import { Router, Request, Response } from 'express';
import { backupDatabase, restoreDatabase } from '../db-init';
import fs from 'fs';
import path from 'path';
import { log } from '../vite';

const router = Router();

// Get list of available backups
router.get('/backups', async (req: Request, res: Response) => {
  try {
    const backupDir = path.join(process.cwd(), 'backups');
    
    // Create backup directory if it doesn't exist
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
      return res.json({ backups: [] });
    }
    
    // Get list of backup files
    const files = fs.readdirSync(backupDir)
      .filter(file => file.startsWith('cybershieldx-backup-') && file.endsWith('.sql'))
      .map(file => {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);
        
        return {
          filename: file,
          path: filePath,
          size: stats.size,
          created: stats.mtime
        };
      })
      .sort((a, b) => b.created.getTime() - a.created.getTime()); // Sort by date, newest first
      
    return res.json({ backups: files });
  } catch (error) {
    log(`Error listing backups: ${error}`, 'database');
    return res.status(500).json({ error: 'Failed to list backups' });
  }
});

// Create a new backup
router.post('/backup', async (req: Request, res: Response) => {
  try {
    const backupFile = await backupDatabase();
    
    if (backupFile) {
      return res.json({ 
        success: true,
        message: 'Database backup created successfully',
        backupFile
      });
    } else {
      return res.status(500).json({ 
        success: false,
        error: 'Failed to create database backup'
      });
    }
  } catch (error) {
    log(`Error creating backup: ${error}`, 'database');
    return res.status(500).json({ error: 'Failed to create backup' });
  }
});

// Restore from a backup
router.post('/restore', async (req: Request, res: Response) => {
  try {
    const { filename } = req.body;
    
    if (!filename) {
      return res.status(400).json({ error: 'Missing backup filename' });
    }
    
    // Validate the filename to prevent directory traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ error: 'Invalid backup filename' });
    }
    
    const backupDir = path.join(process.cwd(), 'backups');
    const backupFile = path.join(backupDir, filename);
    
    if (!fs.existsSync(backupFile)) {
      return res.status(404).json({ error: 'Backup file not found' });
    }
    
    const result = await restoreDatabase(backupFile);
    
    if (result) {
      return res.json({ 
        success: true,
        message: 'Database restored successfully',
      });
    } else {
      return res.status(500).json({ 
        success: false,
        error: 'Failed to restore database'
      });
    }
  } catch (error) {
    log(`Error restoring database: ${error}`, 'database');
    return res.status(500).json({ error: 'Failed to restore database' });
  }
});

// Delete a backup
router.delete('/backup/:filename', async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    
    // Validate the filename to prevent directory traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ error: 'Invalid backup filename' });
    }
    
    const backupDir = path.join(process.cwd(), 'backups');
    const backupFile = path.join(backupDir, filename);
    
    if (!fs.existsSync(backupFile)) {
      return res.status(404).json({ error: 'Backup file not found' });
    }
    
    fs.unlinkSync(backupFile);
    
    return res.json({ 
      success: true,
      message: 'Backup deleted successfully',
    });
  } catch (error) {
    log(`Error deleting backup: ${error}`, 'database');
    return res.status(500).json({ error: 'Failed to delete backup' });
  }
});

export default router;