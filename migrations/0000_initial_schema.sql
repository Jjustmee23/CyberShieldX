-- Create users table
CREATE TABLE IF NOT EXISTS "users" (
  "id" SERIAL PRIMARY KEY,
  "username" TEXT NOT NULL UNIQUE,
  "password" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "role" TEXT DEFAULT 'consultant',
  "require_password_change" BOOLEAN DEFAULT FALSE,
  "two_factor_enabled" BOOLEAN DEFAULT FALSE
);

-- Create clients table
CREATE TABLE IF NOT EXISTS "clients" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "client_id" TEXT NOT NULL UNIQUE,
  "status" TEXT DEFAULT 'offline',
  "last_seen" TIMESTAMP DEFAULT NOW(),
  "risk_level" TEXT DEFAULT 'low',
  "logo" TEXT DEFAULT '',
  "created_at" TIMESTAMP DEFAULT NOW()
);

-- Create scans table
CREATE TABLE IF NOT EXISTS "scans" (
  "id" SERIAL PRIMARY KEY,
  "client_id" INTEGER NOT NULL REFERENCES "clients"("id"),
  "type" TEXT NOT NULL,
  "status" TEXT DEFAULT 'pending',
  "progress" INTEGER DEFAULT 0,
  "started_at" TIMESTAMP DEFAULT NOW(),
  "completed_at" TIMESTAMP,
  "results" JSONB DEFAULT '{}',
  "options" JSONB DEFAULT '{}'
);

-- Create reports table
CREATE TABLE IF NOT EXISTS "reports" (
  "id" SERIAL PRIMARY KEY,
  "client_id" INTEGER NOT NULL REFERENCES "clients"("id"),
  "scan_id" INTEGER REFERENCES "scans"("id"),
  "title" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "created_at" TIMESTAMP DEFAULT NOW(),
  "content" JSONB DEFAULT '{}',
  "file_path" TEXT
);

-- Create incidents table
CREATE TABLE IF NOT EXISTS "incidents" (
  "id" SERIAL PRIMARY KEY,
  "client_id" INTEGER NOT NULL REFERENCES "clients"("id"),
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "severity" TEXT NOT NULL,
  "status" TEXT DEFAULT 'unresolved',
  "reported_at" TIMESTAMP DEFAULT NOW(),
  "resolved_at" TIMESTAMP,
  "type" TEXT NOT NULL
);

-- Create quizzes table
CREATE TABLE IF NOT EXISTS "quizzes" (
  "id" SERIAL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "questions" JSONB NOT NULL,
  "created_at" TIMESTAMP DEFAULT NOW()
);

-- Create quiz_results table
CREATE TABLE IF NOT EXISTS "quiz_results" (
  "id" SERIAL PRIMARY KEY,
  "client_id" INTEGER NOT NULL REFERENCES "clients"("id"),
  "quiz_id" INTEGER NOT NULL REFERENCES "quizzes"("id"),
  "score" INTEGER NOT NULL,
  "answers" JSONB NOT NULL,
  "completed_at" TIMESTAMP DEFAULT NOW()
);

-- Create default admin user if not exists
INSERT INTO "users" ("username", "password", "name", "email", "role")
VALUES ('admin', '$2b$10$IbwBl2N5YkBIm8kHd5fzWeiM0wMiiZxH.YXHnKLtUn6x8rkJP16XG', 'Administrator', 'admin@cybershieldx.com', 'admin')
ON CONFLICT (username) DO NOTHING;
