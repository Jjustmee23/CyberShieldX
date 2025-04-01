import {
  users, clients, scans, reports, incidents, quizzes, quizResults,
  type User, type InsertUser,
  type Client, type InsertClient,
  type Scan, type InsertScan,
  type Report, type InsertReport,
  type Incident, type InsertIncident,
  type Quiz, type InsertQuiz,
  type QuizResult, type InsertQuizResult,
} from "@shared/schema";

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Client operations
  getClient(id: number): Promise<Client | undefined>;
  getClientByClientId(clientId: string): Promise<Client | undefined>;
  getClients(): Promise<Client[]>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: number, client: Partial<Client>): Promise<Client | undefined>;
  deleteClient(id: number): Promise<boolean>;
  
  // Scan operations
  getScan(id: number): Promise<Scan | undefined>;
  getScans(): Promise<Scan[]>;
  getScansByClientId(clientId: number): Promise<Scan[]>;
  getActiveScansByClientId(clientId: number): Promise<Scan[]>;
  createScan(scan: InsertScan): Promise<Scan>;
  updateScan(id: number, scan: Partial<Scan>): Promise<Scan | undefined>;
  
  // Report operations
  getReport(id: number): Promise<Report | undefined>;
  getReports(): Promise<Report[]>;
  getReportsByClientId(clientId: number): Promise<Report[]>;
  createReport(report: InsertReport): Promise<Report>;
  
  // Incident operations
  getIncident(id: number): Promise<Incident | undefined>;
  getIncidents(): Promise<Incident[]>;
  getIncidentsByClientId(clientId: number): Promise<Incident[]>;
  getRecentIncidents(limit: number): Promise<Incident[]>;
  createIncident(incident: InsertIncident): Promise<Incident>;
  updateIncident(id: number, incident: Partial<Incident>): Promise<Incident | undefined>;
  
  // Quiz operations
  getQuiz(id: number): Promise<Quiz | undefined>;
  getQuizzes(): Promise<Quiz[]>;
  createQuiz(quiz: InsertQuiz): Promise<Quiz>;
  
  // Quiz Result operations
  getQuizResult(id: number): Promise<QuizResult | undefined>;
  getQuizResultsByClientId(clientId: number): Promise<QuizResult[]>;
  createQuizResult(quizResult: InsertQuizResult): Promise<QuizResult>;
}

// In-memory storage implementation
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private clients: Map<number, Client>;
  private scans: Map<number, Scan>;
  private reports: Map<number, Report>;
  private incidents: Map<number, Incident>;
  private quizzes: Map<number, Quiz>;
  private quizResults: Map<number, QuizResult>;
  
  private userId: number;
  private clientId: number;
  private scanId: number;
  private reportId: number;
  private incidentId: number;
  private quizId: number;
  private quizResultId: number;
  
  constructor() {
    this.users = new Map();
    this.clients = new Map();
    this.scans = new Map();
    this.reports = new Map();
    this.incidents = new Map();
    this.quizzes = new Map();
    this.quizResults = new Map();
    
    this.userId = 1;
    this.clientId = 1;
    this.scanId = 1;
    this.reportId = 1;
    this.incidentId = 1;
    this.quizId = 1;
    this.quizResultId = 1;
    
    // Initialize with sample admin user
    this.createUser({
      username: 'admin',
      password: 'password123', // In a real application, this would be hashed
      name: 'Admin User',
      email: 'admin@cybershieldx.com',
      role: 'admin'
    });
    
    // Create sample data for demo purposes
    this.initializeSampleData();
  }

  // Initialize the storage with sample data for demonstration
  private initializeSampleData() {
    // Add sample clients
    const acmeClient = this.createClient({
      name: 'Acme Corporation',
      clientId: 'CYB-1234',
      status: 'online',
      riskLevel: 'low',
    });
    
    const globalClient = this.createClient({
      name: 'Global Logistics',
      clientId: 'CYB-2561',
      status: 'online',
      riskLevel: 'medium',
    });
    
    const techClient = this.createClient({
      name: 'TechSolutions Inc',
      clientId: 'CYB-3987',
      status: 'offline',
      riskLevel: 'high',
    });
    
    const farmClient = this.createClient({
      name: 'Farmhouse Organics',
      clientId: 'CYB-4012',
      status: 'online',
      riskLevel: 'medium',
    });
    
    const buildClient = this.createClient({
      name: 'BuildFast Construction',
      clientId: 'CYB-5278',
      status: 'online',
      riskLevel: 'low',
    });
    
    // Add sample scans
    this.createScan({
      clientId: acmeClient.id,
      type: 'network',
      status: 'in-progress',
      options: { thorough: true, reportOnCompletion: true }
    });
    
    this.createScan({
      clientId: globalClient.id,
      type: 'system',
      status: 'in-progress',
      options: { thorough: true, reportOnCompletion: true }
    });
    
    this.createScan({
      clientId: farmClient.id,
      type: 'webapp',
      status: 'in-progress',
      options: { thorough: false, reportOnCompletion: true }
    });
    
    // Add sample incidents
    this.createIncident({
      clientId: techClient.id,
      title: 'Suspicious Login Attempt',
      description: 'Multiple login attempts from unusual IP addresses detected.',
      severity: 'high',
      type: 'suspicious-login',
    });
    
    this.createIncident({
      clientId: globalClient.id,
      title: 'Malware Detection',
      description: 'Potential malware detected on workstation GL-WS-042.',
      severity: 'medium',
      type: 'malware',
    });
    
    this.createIncident({
      clientId: acmeClient.id,
      title: 'Firewall Misconfiguration',
      description: 'Firewall rule allowing unauthorized external access detected.',
      severity: 'medium',
      type: 'firewall',
    });
    
    this.createIncident({
      clientId: techClient.id,
      title: 'XSS Vulnerability',
      description: 'Cross-site scripting vulnerability found in customer portal.',
      severity: 'high',
      type: 'vulnerability',
    });
    
    this.createIncident({
      clientId: farmClient.id,
      title: 'Phishing Attempt',
      description: 'Users reporting phishing emails impersonating company executives.',
      severity: 'low',
      type: 'phishing',
    });
  }
  
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }
  
  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // Client methods
  async getClient(id: number): Promise<Client | undefined> {
    return this.clients.get(id);
  }
  
  async getClientByClientId(clientId: string): Promise<Client | undefined> {
    return Array.from(this.clients.values()).find(
      (client) => client.clientId === clientId,
    );
  }
  
  async getClients(): Promise<Client[]> {
    return Array.from(this.clients.values());
  }
  
  async createClient(insertClient: InsertClient): Promise<Client> {
    const id = this.clientId++;
    const now = new Date();
    const client: Client = { 
      ...insertClient,
      id,
      lastSeen: now,
      createdAt: now
    };
    this.clients.set(id, client);
    return client;
  }
  
  async updateClient(id: number, clientUpdate: Partial<Client>): Promise<Client | undefined> {
    const existingClient = this.clients.get(id);
    if (!existingClient) {
      return undefined;
    }
    
    const updatedClient = { ...existingClient, ...clientUpdate };
    this.clients.set(id, updatedClient);
    return updatedClient;
  }
  
  async deleteClient(id: number): Promise<boolean> {
    return this.clients.delete(id);
  }
  
  // Scan methods
  async getScan(id: number): Promise<Scan | undefined> {
    return this.scans.get(id);
  }
  
  async getScans(): Promise<Scan[]> {
    return Array.from(this.scans.values());
  }
  
  async getScansByClientId(clientId: number): Promise<Scan[]> {
    return Array.from(this.scans.values()).filter(
      (scan) => scan.clientId === clientId,
    );
  }
  
  async getActiveScansByClientId(clientId: number): Promise<Scan[]> {
    return Array.from(this.scans.values()).filter(
      (scan) => scan.clientId === clientId && scan.status === 'in-progress',
    );
  }
  
  async createScan(insertScan: InsertScan): Promise<Scan> {
    const id = this.scanId++;
    const now = new Date();
    const scan: Scan = {
      ...insertScan,
      id,
      progress: 0,
      startedAt: now,
      completedAt: null,
      results: {}
    };
    this.scans.set(id, scan);
    return scan;
  }
  
  async updateScan(id: number, scanUpdate: Partial<Scan>): Promise<Scan | undefined> {
    const existingScan = this.scans.get(id);
    if (!existingScan) {
      return undefined;
    }
    
    const updatedScan = { ...existingScan, ...scanUpdate };
    this.scans.set(id, updatedScan);
    return updatedScan;
  }
  
  // Report methods
  async getReport(id: number): Promise<Report | undefined> {
    return this.reports.get(id);
  }
  
  async getReports(): Promise<Report[]> {
    return Array.from(this.reports.values());
  }
  
  async getReportsByClientId(clientId: number): Promise<Report[]> {
    return Array.from(this.reports.values()).filter(
      (report) => report.clientId === clientId,
    );
  }
  
  async createReport(insertReport: InsertReport): Promise<Report> {
    const id = this.reportId++;
    const now = new Date();
    const report: Report = {
      ...insertReport,
      id,
      createdAt: now,
      filePath: null
    };
    this.reports.set(id, report);
    return report;
  }
  
  // Incident methods
  async getIncident(id: number): Promise<Incident | undefined> {
    return this.incidents.get(id);
  }
  
  async getIncidents(): Promise<Incident[]> {
    return Array.from(this.incidents.values());
  }
  
  async getIncidentsByClientId(clientId: number): Promise<Incident[]> {
    return Array.from(this.incidents.values()).filter(
      (incident) => incident.clientId === clientId,
    );
  }
  
  async getRecentIncidents(limit: number): Promise<Incident[]> {
    const sortedIncidents = Array.from(this.incidents.values())
      .sort((a, b) => {
        return new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime();
      });
    
    return sortedIncidents.slice(0, limit);
  }
  
  async createIncident(insertIncident: InsertIncident): Promise<Incident> {
    const id = this.incidentId++;
    const now = new Date();
    const incident: Incident = {
      ...insertIncident,
      id,
      reportedAt: now,
      resolvedAt: null,
      status: 'unresolved'
    };
    this.incidents.set(id, incident);
    return incident;
  }
  
  async updateIncident(id: number, incidentUpdate: Partial<Incident>): Promise<Incident | undefined> {
    const existingIncident = this.incidents.get(id);
    if (!existingIncident) {
      return undefined;
    }
    
    const updatedIncident = { ...existingIncident, ...incidentUpdate };
    this.incidents.set(id, updatedIncident);
    return updatedIncident;
  }
  
  // Quiz methods
  async getQuiz(id: number): Promise<Quiz | undefined> {
    return this.quizzes.get(id);
  }
  
  async getQuizzes(): Promise<Quiz[]> {
    return Array.from(this.quizzes.values());
  }
  
  async createQuiz(insertQuiz: InsertQuiz): Promise<Quiz> {
    const id = this.quizId++;
    const now = new Date();
    const quiz: Quiz = {
      ...insertQuiz,
      id,
      createdAt: now
    };
    this.quizzes.set(id, quiz);
    return quiz;
  }
  
  // Quiz Result methods
  async getQuizResult(id: number): Promise<QuizResult | undefined> {
    return this.quizResults.get(id);
  }
  
  async getQuizResultsByClientId(clientId: number): Promise<QuizResult[]> {
    return Array.from(this.quizResults.values()).filter(
      (result) => result.clientId === clientId,
    );
  }
  
  async createQuizResult(insertQuizResult: InsertQuizResult): Promise<QuizResult> {
    const id = this.quizResultId++;
    const now = new Date();
    const quizResult: QuizResult = {
      ...insertQuizResult,
      id,
      completedAt: now
    };
    this.quizResults.set(id, quizResult);
    return quizResult;
  }
}

export const storage = new MemStorage();
