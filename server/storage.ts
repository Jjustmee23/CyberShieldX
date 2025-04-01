import {
  users, clients, scans, reports, incidents, quizzes, quizResults,
  type User, type InsertUser,
  type Client, type InsertClient,
  type Scan, type InsertScan,
  type Report, type InsertReport,
  type Incident, type InsertIncident,
  type Quiz, type InsertQuiz,
  type QuizResult, type InsertQuizResult,
  ClientStatus,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, lte, gte } from "drizzle-orm";

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
  getOnlineClients(): Promise<Client[]>; // New method to get only online clients
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

// Database storage implementation
export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }
  
  // Client operations
  async getClient(id: number): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client || undefined;
  }
  
  async getClientByClientId(clientId: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.clientId, clientId));
    return client || undefined;
  }
  
  async getClients(): Promise<Client[]> {
    return db.select().from(clients);
  }
  
  async getOnlineClients(): Promise<Client[]> {
    return db.select().from(clients).where(eq(clients.status, ClientStatus.ONLINE));
  }
  
  async createClient(client: InsertClient): Promise<Client> {
    const [newClient] = await db
      .insert(clients)
      .values(client)
      .returning();
    return newClient;
  }
  
  async updateClient(id: number, client: Partial<Client>): Promise<Client | undefined> {
    const [updatedClient] = await db
      .update(clients)
      .set(client)
      .where(eq(clients.id, id))
      .returning();
    return updatedClient || undefined;
  }
  
  async deleteClient(id: number): Promise<boolean> {
    const result = await db
      .delete(clients)
      .where(eq(clients.id, id));
    return true; // Assuming deletion was successful
  }
  
  // Scan operations
  async getScan(id: number): Promise<Scan | undefined> {
    const [scan] = await db.select().from(scans).where(eq(scans.id, id));
    return scan || undefined;
  }
  
  async getScans(): Promise<Scan[]> {
    return db.select().from(scans);
  }
  
  async getScansByClientId(clientId: number): Promise<Scan[]> {
    return db.select().from(scans).where(eq(scans.clientId, clientId));
  }
  
  async getActiveScansByClientId(clientId: number): Promise<Scan[]> {
    return db.select().from(scans).where(
      and(
        eq(scans.clientId, clientId),
        eq(scans.status, 'in-progress')
      )
    );
  }
  
  async createScan(scan: InsertScan): Promise<Scan> {
    const [newScan] = await db
      .insert(scans)
      .values(scan)
      .returning();
    return newScan;
  }
  
  async updateScan(id: number, scan: Partial<Scan>): Promise<Scan | undefined> {
    const [updatedScan] = await db
      .update(scans)
      .set(scan)
      .where(eq(scans.id, id))
      .returning();
    return updatedScan || undefined;
  }
  
  // Report operations
  async getReport(id: number): Promise<Report | undefined> {
    const [report] = await db.select().from(reports).where(eq(reports.id, id));
    return report || undefined;
  }
  
  async getReports(): Promise<Report[]> {
    return db.select().from(reports);
  }
  
  async getReportsByClientId(clientId: number): Promise<Report[]> {
    return db.select().from(reports).where(eq(reports.clientId, clientId));
  }
  
  async createReport(report: InsertReport): Promise<Report> {
    const [newReport] = await db
      .insert(reports)
      .values(report)
      .returning();
    return newReport;
  }
  
  // Incident operations
  async getIncident(id: number): Promise<Incident | undefined> {
    const [incident] = await db.select().from(incidents).where(eq(incidents.id, id));
    return incident || undefined;
  }
  
  async getIncidents(): Promise<Incident[]> {
    return db.select().from(incidents);
  }
  
  async getIncidentsByClientId(clientId: number): Promise<Incident[]> {
    return db.select().from(incidents).where(eq(incidents.clientId, clientId));
  }
  
  async getRecentIncidents(limit: number): Promise<Incident[]> {
    return db.select()
      .from(incidents)
      .orderBy(desc(incidents.reportedAt))
      .limit(limit);
  }
  
  async createIncident(incident: InsertIncident): Promise<Incident> {
    const [newIncident] = await db
      .insert(incidents)
      .values(incident)
      .returning();
    return newIncident;
  }
  
  async updateIncident(id: number, incident: Partial<Incident>): Promise<Incident | undefined> {
    const [updatedIncident] = await db
      .update(incidents)
      .set(incident)
      .where(eq(incidents.id, id))
      .returning();
    return updatedIncident || undefined;
  }
  
  // Quiz operations
  async getQuiz(id: number): Promise<Quiz | undefined> {
    const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, id));
    return quiz || undefined;
  }
  
  async getQuizzes(): Promise<Quiz[]> {
    return db.select().from(quizzes);
  }
  
  async createQuiz(quiz: InsertQuiz): Promise<Quiz> {
    const [newQuiz] = await db
      .insert(quizzes)
      .values(quiz)
      .returning();
    return newQuiz;
  }
  
  // Quiz Result operations
  async getQuizResult(id: number): Promise<QuizResult | undefined> {
    const [quizResult] = await db.select().from(quizResults).where(eq(quizResults.id, id));
    return quizResult || undefined;
  }
  
  async getQuizResultsByClientId(clientId: number): Promise<QuizResult[]> {
    return db.select().from(quizResults).where(eq(quizResults.clientId, clientId));
  }
  
  async createQuizResult(quizResult: InsertQuizResult): Promise<QuizResult> {
    const [newQuizResult] = await db
      .insert(quizResults)
      .values(quizResult)
      .returning();
    return newQuizResult;
  }
}

// Use database storage
export const storage = new DatabaseStorage();