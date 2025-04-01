// User types
export interface User {
  id: number;
  username: string;
  name: string;
  email: string;
  role: string;
}

export interface InsertUser {
  username: string;
  password: string;
  name: string;
  email: string;
  role?: string;
}

// Client types
export interface Client {
  id: number;
  name: string;
  clientId: string;
  status: string;
  lastSeen: string;
  riskLevel: RiskLevel;
  logo?: string;
  createdAt: string;
}

export interface InsertClient {
  name: string;
  clientId: string;
  status?: string;
  riskLevel?: RiskLevel;
  logo?: string;
}

// Scan types
export interface Scan {
  id: number;
  clientId: number;
  type: string;
  status: string;
  progress: number;
  startedAt: string;
  completedAt: string | null;
  results: Record<string, any>;
  options: Record<string, any>;
  client?: Client; // Added for UI convenience
}

export interface InsertScan {
  clientId: number;
  type: ScanType;
  options?: Record<string, any>;
}

// Report types
export interface Report {
  id: number;
  clientId: number;
  scanId?: number;
  title: string;
  type: string;
  createdAt: string;
  content: Record<string, any>;
  filePath: string | null;
}

export interface InsertReport {
  clientId: number;
  scanId?: number;
  title: string;
  type: string;
  content: Record<string, any>;
}

// Incident types
export interface Incident {
  id: number;
  clientId: number;
  title: string;
  description: string;
  severity: string;
  status: string;
  reportedAt: string;
  resolvedAt: string | null;
  type: string;
  client?: Client; // Added for UI convenience
}

export interface InsertIncident {
  clientId: number;
  title: string;
  description: string;
  severity: IncidentSeverity;
  type: string;
}

// Quiz types
export interface Quiz {
  id: number;
  title: string;
  description: string;
  questions: Record<string, any>[];
  createdAt: string;
}

export interface InsertQuiz {
  title: string;
  description: string;
  questions: Record<string, any>[];
}

// Quiz Result types
export interface QuizResult {
  id: number;
  clientId: number;
  quizId: number;
  score: number;
  answers: Record<string, any>[];
  completedAt: string;
}

export interface InsertQuizResult {
  clientId: number;
  quizId: number;
  score: number;
  answers: Record<string, any>[];
}

// Enums
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
