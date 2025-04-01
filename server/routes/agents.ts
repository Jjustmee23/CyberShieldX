import express, { Request, Response } from 'express';
import { storage } from '../storage';
import { ClientStatus } from '@shared/schema';

const router = express.Router();

// WebSocket verbindingen met agents bijhouden
const agentConnections: Record<string, any> = {};

// Interne update tracking
let currentUpdates: {
  inProgress: boolean;
  startTime: Date | null;
  completed: number;
  total: number;
  errors: string[];
} = {
  inProgress: false,
  startTime: null,
  completed: 0,
  total: 0,
  errors: []
};

/**
 * Route om alle online agents bij te werken
 * Stuurt een update commando naar alle agent verbindingen
 */
router.post('/update', async (req: Request, res: Response) => {
  try {
    // Controleer of er al een update bezig is
    if (currentUpdates.inProgress) {
      return res.status(409).json({
        success: false,
        message: 'Er is al een update bezig. Probeer het later opnieuw.',
        inProgress: true,
        startTime: currentUpdates.startTime,
        progress: {
          completed: currentUpdates.completed,
          total: currentUpdates.total
        }
      });
    }

    // Haal alle online clients op
    const onlineClients = await storage.getOnlineClients();
    
    // Als er geen online clients zijn
    if (onlineClients.length === 0) {
      return res.json({
        success: true,
        message: 'Geen online agents gevonden om bij te werken.',
        agentCount: 0
      });
    }

    // Update starten
    currentUpdates = {
      inProgress: true,
      startTime: new Date(),
      completed: 0,
      total: onlineClients.length,
      errors: []
    };

    // Verstuur update commando naar alle verbonden agents
    // In een echte implementatie zou dit via WebSockets gebeuren
    // Hier simuleren we het proces voor de demo
    
    // Simuleer dat we commando's naar agents versturen
    // In werkelijkheid zou dit een WebSocket bericht naar elke agent zijn
    setTimeout(() => {
      // Update proces simuleren (in een echte app zou dit via WebSocket events gaan)
      const mockUpdateProcess = () => {
        // Simuleer dat enkele agents succesvol updaten
        currentUpdates.completed += 1;
        
        // Als alle updates klaar zijn
        if (currentUpdates.completed >= currentUpdates.total) {
          currentUpdates.inProgress = false;
        }
      };
      
      // Simuleer een update proces met intervallen
      const interval = setInterval(() => {
        if (currentUpdates.completed < currentUpdates.total) {
          mockUpdateProcess();
        } else {
          clearInterval(interval);
        }
      }, 1500); // Update elke 1.5 seconde een agent
    }, 500);
    
    return res.json({
      success: true,
      message: 'Update commando verstuurd naar alle online agents.',
      agentCount: onlineClients.length
    });
  } catch (error) {
    console.error('Error updating agents:', error);
    return res.status(500).json({
      success: false,
      message: 'Er is een fout opgetreden bij het bijwerken van de agents.'
    });
  }
});

/**
 * Route om update status op te halen
 * Geeft informatie over lopende updates
 */
router.get('/update/status', async (req: Request, res: Response) => {
  return res.json({
    inProgress: currentUpdates.inProgress,
    startTime: currentUpdates.startTime,
    progress: {
      completed: currentUpdates.completed,
      total: currentUpdates.total,
      percentage: currentUpdates.total > 0 
        ? Math.round((currentUpdates.completed / currentUpdates.total) * 100) 
        : 0
    },
    errors: currentUpdates.errors
  });
});

/**
 * Route om de lijst van agents te krijgen
 * Geeft alle clients terug, inclusief status
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const clients = await storage.getClients();
    return res.json(clients);
  } catch (error) {
    console.error('Error getting agents:', error);
    return res.status(500).json({
      success: false,
      message: 'Er is een fout opgetreden bij het ophalen van de agents.'
    });
  }
});

/**
 * Route om online agents te krijgen
 * Geeft alleen clients terug met status ONLINE
 */
router.get('/online', async (req: Request, res: Response) => {
  try {
    const onlineClients = await storage.getOnlineClients();
    return res.json(onlineClients);
  } catch (error) {
    console.error('Error getting online agents:', error);
    return res.status(500).json({
      success: false,
      message: 'Er is een fout opgetreden bij het ophalen van online agents.'
    });
  }
});

/**
 * Route om een specifieke agent bij te werken
 * Verstuurt update commando naar één specifieke agent
 */
router.post('/:clientId/update', async (req: Request, res: Response) => {
  try {
    const clientId = req.params.clientId;
    
    // Haal client op
    const client = await storage.getClientByClientId(clientId);
    
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Agent niet gevonden.'
      });
    }
    
    if (client.status !== ClientStatus.ONLINE) {
      return res.status(400).json({
        success: false,
        message: 'Agent is niet online. Update niet mogelijk.'
      });
    }
    
    // In een echte implementatie, verstuur hier een WebSocket bericht naar deze specifieke agent
    
    return res.json({
      success: true,
      message: `Update commando verstuurd naar agent ${clientId}.`,
      client: client
    });
  } catch (error) {
    console.error(`Error updating agent ${req.params.clientId}:`, error);
    return res.status(500).json({
      success: false,
      message: 'Er is een fout opgetreden bij het bijwerken van de agent.'
    });
  }
});

export default router;