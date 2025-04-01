import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import crypto from "crypto";
import {
  insertUserSchema,
  insertClientSchema,
  insertScanSchema,
  insertReportSchema,
  insertIncidentSchema,
  insertQuizSchema,
  insertQuizResultSchema
} from "@shared/schema";

// Simple JWT simulation for authentication
// In a real application, use a proper JWT library
function generateToken(userId: number, username: string): string {
  return Buffer.from(JSON.stringify({ userId, username, exp: Date.now() + 24 * 60 * 60 * 1000 })).toString('base64');
}

function verifyToken(token: string): { userId: number, username: string } | null {
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64').toString());
    if (payload.exp < Date.now()) {
      return null;
    }
    return { userId: payload.userId, username: payload.username };
  } catch (error) {
    return null;
  }
}

// Authentication middleware
const authenticate = async (req: Request, res: Response, next: Function) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  const token = authHeader.split(' ')[1];
  const payload = verifyToken(token);
  
  if (!payload) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
  
  const user = await storage.getUser(payload.userId);
  
  if (!user) {
    return res.status(401).json({ message: 'User not found' });
  }
  
  req.body.user = user;
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  app.post('/api/auth/login', async (req, res) => {
    const schema = z.object({
      username: z.string().min(1),
      password: z.string().min(1)
    });

    try {
      const { username, password } = schema.parse(req.body);
      
      const user = await storage.getUserByUsername(username);
      
      if (!user || user.password !== password) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      const token = generateToken(user.id, user.username);
      
      return res.json({ 
        token,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
    } catch (error) {
      return res.status(400).json({ message: 'Invalid request body' });
    }
  });

  // Get authenticated user
  app.get('/api/auth/me', authenticate, async (req, res) => {
    const user = req.body.user;
    
    return res.json({
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role
    });
  });

  // Client routes
  app.get('/api/clients', authenticate, async (req, res) => {
    try {
      const clients = await storage.getClients();
      return res.json(clients);
    } catch (error) {
      return res.status(500).json({ message: 'Server error' });
    }
  });

  app.get('/api/clients/:id', authenticate, async (req, res) => {
    try {
      const clientId = parseInt(req.params.id);
      const client = await storage.getClient(clientId);
      
      if (!client) {
        return res.status(404).json({ message: 'Client not found' });
      }
      
      return res.json(client);
    } catch (error) {
      return res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/clients', authenticate, async (req, res) => {
    try {
      const clientData = insertClientSchema.parse(req.body);
      const newClient = await storage.createClient(clientData);
      return res.status(201).json(newClient);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid client data', errors: error.errors });
      }
      return res.status(500).json({ message: 'Server error' });
    }
  });

  app.patch('/api/clients/:id', authenticate, async (req, res) => {
    try {
      const clientId = parseInt(req.params.id);
      const client = await storage.getClient(clientId);
      
      if (!client) {
        return res.status(404).json({ message: 'Client not found' });
      }
      
      const updateSchema = insertClientSchema.partial();
      const clientUpdate = updateSchema.parse(req.body);
      
      const updatedClient = await storage.updateClient(clientId, clientUpdate);
      return res.json(updatedClient);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid client data', errors: error.errors });
      }
      return res.status(500).json({ message: 'Server error' });
    }
  });

  app.delete('/api/clients/:id', authenticate, async (req, res) => {
    try {
      const clientId = parseInt(req.params.id);
      const client = await storage.getClient(clientId);
      
      if (!client) {
        return res.status(404).json({ message: 'Client not found' });
      }
      
      await storage.deleteClient(clientId);
      return res.status(204).send();
    } catch (error) {
      return res.status(500).json({ message: 'Server error' });
    }
  });

  // Scan routes
  app.get('/api/scans', authenticate, async (req, res) => {
    try {
      const scans = await storage.getScans();
      return res.json(scans);
    } catch (error) {
      return res.status(500).json({ message: 'Server error' });
    }
  });

  app.get('/api/scans/:id', authenticate, async (req, res) => {
    try {
      const scanId = parseInt(req.params.id);
      const scan = await storage.getScan(scanId);
      
      if (!scan) {
        return res.status(404).json({ message: 'Scan not found' });
      }
      
      return res.json(scan);
    } catch (error) {
      return res.status(500).json({ message: 'Server error' });
    }
  });

  app.get('/api/clients/:clientId/scans', authenticate, async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const client = await storage.getClient(clientId);
      
      if (!client) {
        return res.status(404).json({ message: 'Client not found' });
      }
      
      const scans = await storage.getScansByClientId(clientId);
      return res.json(scans);
    } catch (error) {
      return res.status(500).json({ message: 'Server error' });
    }
  });
  
  app.get('/api/clients/:clientId/active-scans', authenticate, async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const client = await storage.getClient(clientId);
      
      if (!client) {
        return res.status(404).json({ message: 'Client not found' });
      }
      
      const scans = await storage.getActiveScansByClientId(clientId);
      return res.json(scans);
    } catch (error) {
      return res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/scans', authenticate, async (req, res) => {
    try {
      const scanData = insertScanSchema.parse(req.body);
      
      // Verify client exists
      const client = await storage.getClient(scanData.clientId);
      if (!client) {
        return res.status(404).json({ message: 'Client not found' });
      }
      
      const newScan = await storage.createScan(scanData);
      return res.status(201).json(newScan);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid scan data', errors: error.errors });
      }
      return res.status(500).json({ message: 'Server error' });
    }
  });

  app.patch('/api/scans/:id', authenticate, async (req, res) => {
    try {
      const scanId = parseInt(req.params.id);
      const scan = await storage.getScan(scanId);
      
      if (!scan) {
        return res.status(404).json({ message: 'Scan not found' });
      }
      
      const updateSchema = insertScanSchema.partial();
      const scanUpdate = updateSchema.parse(req.body);
      
      const updatedScan = await storage.updateScan(scanId, scanUpdate);
      return res.json(updatedScan);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid scan data', errors: error.errors });
      }
      return res.status(500).json({ message: 'Server error' });
    }
  });

  // Report routes
  app.get('/api/reports', authenticate, async (req, res) => {
    try {
      const reports = await storage.getReports();
      return res.json(reports);
    } catch (error) {
      return res.status(500).json({ message: 'Server error' });
    }
  });

  app.get('/api/reports/:id', authenticate, async (req, res) => {
    try {
      const reportId = parseInt(req.params.id);
      const report = await storage.getReport(reportId);
      
      if (!report) {
        return res.status(404).json({ message: 'Report not found' });
      }
      
      return res.json(report);
    } catch (error) {
      return res.status(500).json({ message: 'Server error' });
    }
  });

  app.get('/api/clients/:clientId/reports', authenticate, async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const client = await storage.getClient(clientId);
      
      if (!client) {
        return res.status(404).json({ message: 'Client not found' });
      }
      
      const reports = await storage.getReportsByClientId(clientId);
      return res.json(reports);
    } catch (error) {
      return res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/reports', authenticate, async (req, res) => {
    try {
      const reportData = insertReportSchema.parse(req.body);
      
      // Verify client exists
      const client = await storage.getClient(reportData.clientId);
      if (!client) {
        return res.status(404).json({ message: 'Client not found' });
      }
      
      const newReport = await storage.createReport(reportData);
      return res.status(201).json(newReport);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid report data', errors: error.errors });
      }
      return res.status(500).json({ message: 'Server error' });
    }
  });

  // Incident routes
  app.get('/api/incidents', authenticate, async (req, res) => {
    try {
      const incidents = await storage.getIncidents();
      return res.json(incidents);
    } catch (error) {
      return res.status(500).json({ message: 'Server error' });
    }
  });

  app.get('/api/incidents/:id', authenticate, async (req, res) => {
    try {
      const incidentId = parseInt(req.params.id);
      const incident = await storage.getIncident(incidentId);
      
      if (!incident) {
        return res.status(404).json({ message: 'Incident not found' });
      }
      
      return res.json(incident);
    } catch (error) {
      return res.status(500).json({ message: 'Server error' });
    }
  });

  app.get('/api/incidents/recent/:limit', authenticate, async (req, res) => {
    try {
      const limit = parseInt(req.params.limit) || 5;
      const incidents = await storage.getRecentIncidents(limit);
      return res.json(incidents);
    } catch (error) {
      return res.status(500).json({ message: 'Server error' });
    }
  });

  app.get('/api/clients/:clientId/incidents', authenticate, async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const client = await storage.getClient(clientId);
      
      if (!client) {
        return res.status(404).json({ message: 'Client not found' });
      }
      
      const incidents = await storage.getIncidentsByClientId(clientId);
      return res.json(incidents);
    } catch (error) {
      return res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/incidents', authenticate, async (req, res) => {
    try {
      const incidentData = insertIncidentSchema.parse(req.body);
      
      // Verify client exists
      const client = await storage.getClient(incidentData.clientId);
      if (!client) {
        return res.status(404).json({ message: 'Client not found' });
      }
      
      const newIncident = await storage.createIncident(incidentData);
      return res.status(201).json(newIncident);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid incident data', errors: error.errors });
      }
      return res.status(500).json({ message: 'Server error' });
    }
  });

  app.patch('/api/incidents/:id', authenticate, async (req, res) => {
    try {
      const incidentId = parseInt(req.params.id);
      const incident = await storage.getIncident(incidentId);
      
      if (!incident) {
        return res.status(404).json({ message: 'Incident not found' });
      }
      
      const updateSchema = insertIncidentSchema.partial();
      const incidentUpdate = updateSchema.parse(req.body);
      
      const updatedIncident = await storage.updateIncident(incidentId, incidentUpdate);
      return res.json(updatedIncident);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid incident data', errors: error.errors });
      }
      return res.status(500).json({ message: 'Server error' });
    }
  });

  // Quiz routes
  app.get('/api/quizzes', authenticate, async (req, res) => {
    try {
      const quizzes = await storage.getQuizzes();
      return res.json(quizzes);
    } catch (error) {
      return res.status(500).json({ message: 'Server error' });
    }
  });

  app.get('/api/quizzes/:id', authenticate, async (req, res) => {
    try {
      const quizId = parseInt(req.params.id);
      const quiz = await storage.getQuiz(quizId);
      
      if (!quiz) {
        return res.status(404).json({ message: 'Quiz not found' });
      }
      
      return res.json(quiz);
    } catch (error) {
      return res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/quizzes', authenticate, async (req, res) => {
    try {
      const quizData = insertQuizSchema.parse(req.body);
      const newQuiz = await storage.createQuiz(quizData);
      return res.status(201).json(newQuiz);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid quiz data', errors: error.errors });
      }
      return res.status(500).json({ message: 'Server error' });
    }
  });

  app.get('/api/clients/:clientId/quiz-results', authenticate, async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const client = await storage.getClient(clientId);
      
      if (!client) {
        return res.status(404).json({ message: 'Client not found' });
      }
      
      const quizResults = await storage.getQuizResultsByClientId(clientId);
      return res.json(quizResults);
    } catch (error) {
      return res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/quiz-results', authenticate, async (req, res) => {
    try {
      const quizResultData = insertQuizResultSchema.parse(req.body);
      
      // Verify client exists
      const client = await storage.getClient(quizResultData.clientId);
      if (!client) {
        return res.status(404).json({ message: 'Client not found' });
      }
      
      // Verify quiz exists
      const quiz = await storage.getQuiz(quizResultData.quizId);
      if (!quiz) {
        return res.status(404).json({ message: 'Quiz not found' });
      }
      
      const newQuizResult = await storage.createQuizResult(quizResultData);
      return res.status(201).json(newQuizResult);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid quiz result data', errors: error.errors });
      }
      return res.status(500).json({ message: 'Server error' });
    }
  });

  // Security and 2FA routes
  app.post('/api/auth/request-2fa', authenticate, async (req, res) => {
    try {
      const user = req.body.user;
      // Generate a 6-digit 2FA code for the user
      const twoFactorCode = crypto.randomInt(100000, 999999).toString();
      
      // In a real application, this would send the code via SMS or email
      // For demo purposes, we'll just return it
      return res.json({
        message: 'Two-factor authentication code generated',
        twoFactorCode,
        userId: user.id
      });
    } catch (error) {
      return res.status(500).json({ message: 'Server error' });
    }
  });
  
  app.post('/api/auth/verify-2fa', authenticate, async (req, res) => {
    try {
      const schema = z.object({
        code: z.string().length(6),
        expectedCode: z.string().length(6)
      });
      
      const { code, expectedCode } = schema.parse(req.body);
      
      if (code !== expectedCode) {
        return res.status(401).json({ message: 'Invalid two-factor code' });
      }
      
      return res.json({
        message: 'Two-factor authentication successful',
        twoFactorVerified: true
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      return res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Notification Settings routes
  app.post('/api/settings/notifications', authenticate, async (req, res) => {
    try {
      const schema = z.object({
        emailNotifications: z.boolean(),
        incidentAlerts: z.boolean(),
        scanCompletions: z.boolean(),
        weeklyReports: z.boolean(),
        notificationEmail: z.string().email().optional()
      });
      
      const notificationSettings = schema.parse(req.body);
      const user = req.body.user;
      
      // In a real application, this would save the settings to the database
      // For now, we'll just return success
      return res.json({
        message: 'Notification settings updated successfully',
        settings: notificationSettings
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid settings data', errors: error.errors });
      }
      return res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Send notification endpoint (for testing)
  app.post('/api/notifications/send', authenticate, async (req, res) => {
    try {
      const schema = z.object({
        type: z.enum(['incident', 'scan', 'report', 'security']),
        title: z.string(),
        message: z.string(),
        clientId: z.number().optional()
      });
      
      const notification = schema.parse(req.body);
      
      // In a real application, this would send actual emails or push notifications
      // For now, we'll just return success
      return res.json({
        message: 'Notification sent successfully',
        notification
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid notification data', errors: error.errors });
      }
      return res.status(500).json({ message: 'Server error' });
    }
  });

  // Dashboard summary route
  app.get('/api/dashboard/summary', authenticate, async (req, res) => {
    try {
      const clients = await storage.getClients();
      const activeScans = (await storage.getScans()).filter(scan => scan.status === 'in-progress');
      const recentIncidents = await storage.getRecentIncidents(5);
      
      // Calculate training compliance (placeholder in this demo)
      const trainingCompliance = 86; // Percentage

      return res.json({
        totalClients: clients.length,
        activeScansCount: activeScans.length,
        activeScans,
        securityIncidentsCount: recentIncidents.length,
        recentIncidents,
        trainingCompliance,
        clients
      });
    } catch (error) {
      return res.status(500).json({ message: 'Server error' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
