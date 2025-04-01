import { db } from "./db";
import { users, clients, scans, incidents } from "@shared/schema";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("Seeding database...");

  // Create admin user
  const [adminUser] = await db
    .insert(users)
    .values({
      username: 'admin',
      password: 'password123', // In a real application, this would be hashed
      name: 'Admin User',
      email: 'admin@cybershieldx.com',
      role: 'admin'
    })
    .returning()
    .onConflictDoNothing();

  // Create sample clients
  const [acmeClient] = await db
    .insert(clients)
    .values({
      name: 'Acme Corporation',
      clientId: 'CYB-1234',
      status: 'online',
      riskLevel: 'low',
    })
    .returning()
    .onConflictDoNothing();

  const [globalClient] = await db
    .insert(clients)
    .values({
      name: 'Global Logistics',
      clientId: 'CYB-2561',
      status: 'online',
      riskLevel: 'medium',
    })
    .returning()
    .onConflictDoNothing();

  const [techClient] = await db
    .insert(clients)
    .values({
      name: 'TechSolutions Inc',
      clientId: 'CYB-3987',
      status: 'offline',
      riskLevel: 'high',
    })
    .returning()
    .onConflictDoNothing();

  const [farmClient] = await db
    .insert(clients)
    .values({
      name: 'Farmhouse Organics',
      clientId: 'CYB-4012',
      status: 'online',
      riskLevel: 'medium',
    })
    .returning()
    .onConflictDoNothing();

  const [buildClient] = await db
    .insert(clients)
    .values({
      name: 'BuildFast Construction',
      clientId: 'CYB-5278',
      status: 'online',
      riskLevel: 'low',
    })
    .returning()
    .onConflictDoNothing();

  // Ensure all clients were created
  let finalAcmeClient = acmeClient;
  let finalGlobalClient = globalClient;
  let finalTechClient = techClient;
  let finalFarmClient = farmClient;
  let finalBuildClient = buildClient;
  
  if (!finalAcmeClient || !finalGlobalClient || !finalTechClient || !finalFarmClient || !finalBuildClient) {
    console.log("Some clients already exist, fetching them");
    
    // Fetch existing clients if they weren't created
    if (!finalAcmeClient) {
      const [existingAcme] = await db.select().from(clients).where(eq(clients.clientId, 'CYB-1234'));
      finalAcmeClient = existingAcme;
    }
    
    if (!finalGlobalClient) {
      const [existingGlobal] = await db.select().from(clients).where(eq(clients.clientId, 'CYB-2561'));
      finalGlobalClient = existingGlobal;
    }
    
    if (!finalTechClient) {
      const [existingTech] = await db.select().from(clients).where(eq(clients.clientId, 'CYB-3987'));
      finalTechClient = existingTech;
    }
    
    if (!finalFarmClient) {
      const [existingFarm] = await db.select().from(clients).where(eq(clients.clientId, 'CYB-4012'));
      finalFarmClient = existingFarm;
    }
    
    if (!finalBuildClient) {
      const [existingBuild] = await db.select().from(clients).where(eq(clients.clientId, 'CYB-5278'));
      finalBuildClient = existingBuild;
    }
  }

  // Create sample scans if clients exist
  if (finalAcmeClient) {
    await db
      .insert(scans)
      .values({
        clientId: finalAcmeClient.id,
        type: 'network',
        status: 'in-progress',
        options: { thorough: true, reportOnCompletion: true }
      })
      .onConflictDoNothing();
  }

  if (finalGlobalClient) {
    await db
      .insert(scans)
      .values({
        clientId: finalGlobalClient.id,
        type: 'system',
        status: 'in-progress',
        options: { thorough: true, reportOnCompletion: true }
      })
      .onConflictDoNothing();
  }

  if (finalFarmClient) {
    await db
      .insert(scans)
      .values({
        clientId: finalFarmClient.id,
        type: 'webapp',
        status: 'in-progress',
        options: { thorough: false, reportOnCompletion: true }
      })
      .onConflictDoNothing();
  }

  // Create sample incidents
  if (finalTechClient) {
    await db
      .insert(incidents)
      .values({
        clientId: finalTechClient.id,
        title: 'Suspicious Login Attempt',
        description: 'Multiple login attempts from unusual IP addresses detected.',
        severity: 'high',
        type: 'suspicious-login',
      })
      .onConflictDoNothing();

    await db
      .insert(incidents)
      .values({
        clientId: finalTechClient.id,
        title: 'XSS Vulnerability',
        description: 'Cross-site scripting vulnerability found in customer portal.',
        severity: 'high',
        type: 'vulnerability',
      })
      .onConflictDoNothing();
  }

  if (finalGlobalClient) {
    await db
      .insert(incidents)
      .values({
        clientId: finalGlobalClient.id,
        title: 'Malware Detection',
        description: 'Potential malware detected on workstation GL-WS-042.',
        severity: 'medium',
        type: 'malware',
      })
      .onConflictDoNothing();
  }

  if (finalAcmeClient) {
    await db
      .insert(incidents)
      .values({
        clientId: finalAcmeClient.id,
        title: 'Firewall Misconfiguration',
        description: 'Firewall rule allowing unauthorized external access detected.',
        severity: 'medium',
        type: 'firewall',
      })
      .onConflictDoNothing();
  }

  if (finalFarmClient) {
    await db
      .insert(incidents)
      .values({
        clientId: finalFarmClient.id,
        title: 'Phishing Attempt',
        description: 'Users reporting phishing emails impersonating company executives.',
        severity: 'low',
        type: 'phishing',
      })
      .onConflictDoNothing();
  }

  console.log("Database seeding completed");
}

// Run seeding
seed().catch(console.error);