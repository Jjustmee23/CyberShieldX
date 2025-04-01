import { pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User table for consultant accounts
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  role: text("role").default("consultant"),
});

// Client table for organizations being monitored
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  clientId: text("client_id").notNull().unique(), // Unique identifier for the client (e.g., CYB-1234)
  status: text("status").default("offline"), // online, offline
  lastSeen: timestamp("last_seen").defaultNow(),
  riskLevel: text("risk_level").default("low"), // low, medium, high
  logo: text("logo").default(""),
  createdAt: timestamp("created_at").defaultNow(),
});

// Scan table for tracking security scans
export const scans = pgTable("scans", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => clients.id),
  type: text("type").notNull(), // network, system, webapp, full
  status: text("status").default("pending"), // pending, in-progress, completed, failed
  progress: integer("progress").default(0), // 0-100
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  results: jsonb("results").default({}),
  options: jsonb("options").default({}),
});

// Reports table for security reports
export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => clients.id),
  scanId: integer("scan_id").references(() => scans.id),
  title: text("title").notNull(),
  type: text("type").notNull(), // network, system, webapp, full, incident
  createdAt: timestamp("created_at").defaultNow(),
  content: jsonb("content").default({}),
  filePath: text("file_path"),
});

// Incidents table for security incidents
export const incidents = pgTable("incidents", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => clients.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  severity: text("severity").notNull(), // low, medium, high
  status: text("status").default("unresolved"), // unresolved, in-progress, resolved
  reportedAt: timestamp("reported_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
  type: text("type").notNull(), // suspicious-login, malware, vulnerability, etc.
});

// Training quizzes
export const quizzes = pgTable("quizzes", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  questions: jsonb("questions").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Quiz results for clients
export const quizResults = pgTable("quiz_results", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => clients.id),
  quizId: integer("quiz_id").notNull().references(() => quizzes.id),
  score: integer("score").notNull(),
  answers: jsonb("answers").notNull(),
  completedAt: timestamp("completed_at").defaultNow(),
});

// Schemas for insert operations
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  email: true,
  role: true,
});

export const insertClientSchema = createInsertSchema(clients).pick({
  name: true,
  clientId: true,
  status: true,
  riskLevel: true,
  logo: true,
});

export const insertScanSchema = createInsertSchema(scans).pick({
  clientId: true,
  type: true,
  status: true,
  options: true,
});

export const insertReportSchema = createInsertSchema(reports).pick({
  clientId: true,
  scanId: true,
  title: true,
  type: true,
  content: true,
});

export const insertIncidentSchema = createInsertSchema(incidents).pick({
  clientId: true,
  title: true,
  description: true,
  severity: true,
  type: true,
});

export const insertQuizSchema = createInsertSchema(quizzes).pick({
  title: true,
  description: true,
  questions: true,
});

export const insertQuizResultSchema = createInsertSchema(quizResults).pick({
  clientId: true,
  quizId: true,
  score: true,
  answers: true,
});

// Type definitions
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;

export type InsertScan = z.infer<typeof insertScanSchema>;
export type Scan = typeof scans.$inferSelect;

export type InsertReport = z.infer<typeof insertReportSchema>;
export type Report = typeof reports.$inferSelect;

export type InsertIncident = z.infer<typeof insertIncidentSchema>;
export type Incident = typeof incidents.$inferSelect;

export type InsertQuiz = z.infer<typeof insertQuizSchema>;
export type Quiz = typeof quizzes.$inferSelect;

export type InsertQuizResult = z.infer<typeof insertQuizResultSchema>;
export type QuizResult = typeof quizResults.$inferSelect;

// Enums for consistent type checking
export enum ScanType {
  NETWORK = 'network',
  SYSTEM = 'system',
  WEBAPP = 'webapp',
  FULL = 'full',
}

export enum ScanStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in-progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum ClientStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
}

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export enum IncidentSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export enum IncidentStatus {
  UNRESOLVED = 'unresolved',
  IN_PROGRESS = 'in-progress',
  RESOLVED = 'resolved',
}
