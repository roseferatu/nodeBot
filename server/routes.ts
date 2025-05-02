import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { initializeBot, checkDiscordStatus, getConnectedServers } from "./lib/discord";
import { checkOpenAIStatus } from "./lib/openai";
import { checkGroqStatus } from "./lib/groq";
import { importCuratedStrains, importStrainsFromApi, importStrainsFromOtreeba } from "./lib/strainApi";
import { initializeTimeTracking } from "./lib/timeTracking";
import { initializeWCounter } from "./lib/wCounter"; 
import { ApiStatusSchema } from "@shared/schema";
import { z } from "zod";

// Bot instance and start time
let discordBot: any;
let wCounterBot: any;
const startTime = Date.now();

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize the Discord bot
  discordBot = initializeBot();
  
  // Initialize time tracking system
  // We'll start it with a small delay after the Discord bot initializes
  setTimeout(async () => {
    try {
      await initializeTimeTracking();
      console.log('Time tracking system initialized');
    } catch (error) {
      console.error('Error initializing time tracking:', error);
    }
  }, 10000); // Wait 10 seconds after Discord bot initialization
  
  // Initialize W Counter bot - only if it hasn't been initialized elsewhere
  if (!global.wCounterInitialized) {
    console.log('Starting W Counter bot initialization');
    console.log('Checking W_COUNTER_TOKEN availability...');
    
    if (process.env.W_COUNTER_TOKEN) {
      console.log('W_COUNTER_TOKEN found, proceeding with bot initialization');
      try {
        wCounterBot = await initializeWCounter();
        global.wCounterInitialized = true;
        console.log('W Counter bot initialized successfully with client');
      } catch (error) {
        console.error('Error initializing W Counter bot:', error);
      }
    } else {
      console.log('W_COUNTER_TOKEN not found, skipping W Counter bot initialization');
    }
  } else {
    console.log('W Counter bot already initialized elsewhere, skipping duplicate initialization');
  }

  // API status endpoint
  app.get("/api/status", async (req: Request, res: Response) => {
    try {
      // Check connection status
      const discordConnected = await checkDiscordStatus();
      const openaiConnected = await checkOpenAIStatus();
      const groqConnected = await checkGroqStatus();
      
      // Get servers
      const servers = await getConnectedServers();
      
      // Convert servers to the format expected by the frontend
      const serverInfo = servers.map(server => {
        return {
          id: server.id,
          name: server.name,
          // In a real implementation, you'd get actual alert counts
          alerts: Math.floor(Math.random() * 4) // Simulated alerts
        };
      });
      
      // Calculate uptime in seconds
      const uptime = Math.floor((Date.now() - startTime) / 1000);
      
      // Get overall rate limit usage
      // In a real implementation, this would be aggregated from all users
      const totalRateLimit = 100;
      const usedRateLimit = Math.min(Math.floor(Math.random() * 30), totalRateLimit);
      
      const status = {
        discord: discordConnected,
        openai: openaiConnected,
        groq: groqConnected,
        wCounterToken: !!process.env.W_COUNTER_TOKEN,
        uptime,
        rate_limit: {
          used: usedRateLimit,
          total: totalRateLimit,
          reset_in: 3600 - (uptime % 3600)
        },
        servers: serverInfo
      };
      
      // Validate the response
      const validatedStatus = ApiStatusSchema.parse(status);
      
      res.json(validatedStatus);
    } catch (error) {
      console.error("Error getting API status:", error);
      res.status(500).json({ error: "Failed to get API status" });
    }
  });

  // Get recent conversations
  app.get("/api/conversations", async (req: Request, res: Response) => {
    try {
      const serverId = req.query.server_id as string;
      const channelId = req.query.channel_id as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      
      if (!serverId) {
        return res.status(400).json({ error: "server_id is required" });
      }
      
      const conversations = await storage.getConversations(serverId, channelId, limit);
      
      res.json(conversations);
    } catch (error) {
      console.error("Error getting conversations:", error);
      res.status(500).json({ error: "Failed to get conversations" });
    }
  });

  // Get server list
  app.get("/api/servers", async (req: Request, res: Response) => {
    try {
      const servers = await storage.getServers();
      res.json(servers);
    } catch (error) {
      console.error("Error getting servers:", error);
      res.status(500).json({ error: "Failed to get servers" });
    }
  });
  
  // Strain management routes
  app.get("/api/strains", async (req: Request, res: Response) => {
    try {
      const strains = await storage.getStrains();
      res.json(strains);
    } catch (error) {
      console.error("Error getting strains:", error);
      res.status(500).json({ error: "Failed to get strains" });
    }
  });
  
  app.post("/api/strains/import", async (req: Request, res: Response) => {
    try {
      const source = req.body.source || 'curated';
      const limit = req.body.limit ? parseInt(req.body.limit) : 50;
      const apiKey = req.body.api_key || '';
      
      let count = 0;
      
      if (source === 'curated') {
        count = await importCuratedStrains();
      } else if (source === 'api') {
        count = await importStrainsFromApi(apiKey, limit);
      } else if (source === 'otreeba') {
        count = await importStrainsFromOtreeba(limit);
      } else {
        return res.status(400).json({ error: "Invalid source. Use 'curated', 'api', or 'otreeba'" });
      }
      
      res.json({ 
        success: true, 
        message: `Successfully imported ${count} strains from ${source}`,
        count
      });
    } catch (error) {
      console.error("Error importing strains:", error);
      res.status(500).json({ 
        error: "Failed to import strains", 
        message: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // Update bot settings
  const UpdateSettingsSchema = z.object({
    server_id: z.string(),
    settings: z.record(z.any()),
  });
  
  app.post("/api/settings", async (req: Request, res: Response) => {
    try {
      const { server_id, settings } = UpdateSettingsSchema.parse(req.body);
      
      const updatedSettings = await storage.updateBotSettings(server_id, settings);
      
      res.json(updatedSettings);
    } catch (error) {
      console.error("Error updating settings:", error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid request data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to update settings" });
      }
    }
  });
  
  // Time tracking endpoints
  
  // Get time tracking statistics for a specific user
  app.get("/api/timetracking/user", async (req: Request, res: Response) => {
    try {
      // Set content type explicitly to prevent Vite from intercepting the response
      res.setHeader('Content-Type', 'application/json');
      
      const { discord_user_id, server_id } = req.query;
      
      if (!discord_user_id || !server_id) {
        return res.status(400).json({ error: "discord_user_id and server_id are required" });
      }
      
      const { getUserTimeStats } = await import('./lib/timeTracking');
      const stats = await getUserTimeStats(discord_user_id as string, server_id as string);
      
      if (!stats) {
        return res.status(404).json({ error: "No time tracking data found for this user" });
      }
      
      console.log("Returning user time stats:", JSON.stringify(stats));
      res.json(stats);
    } catch (error) {
      console.error("Error getting user time stats:", error);
      res.status(500).json({ error: "Failed to get time tracking data" });
    }
  });
  
  // Get server-wide time tracking statistics
  app.get("/api/timetracking/server", async (req: Request, res: Response) => {
    try {
      // Set content type explicitly to prevent Vite from intercepting the response
      res.setHeader('Content-Type', 'application/json');
      
      const { server_id } = req.query;
      
      if (!server_id) {
        return res.status(400).json({ error: "server_id is required" });
      }
      
      const { getServerTimeStats } = await import('./lib/timeTracking');
      const stats = await getServerTimeStats(server_id as string);
      
      if (!stats) {
        return res.status(404).json({ error: "No time tracking data found for this server" });
      }
      
      console.log("Returning server time stats:", JSON.stringify(stats));
      res.json(stats);
    } catch (error) {
      console.error("Error getting server time stats:", error);
      res.status(500).json({ error: "Failed to get server time tracking data" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
