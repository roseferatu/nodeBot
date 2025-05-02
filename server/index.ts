import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { importCuratedStrains } from "./lib/strainApi";
import { initializeWCounter } from "./lib/wCounter";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // First register routes and start the server
  const server = await registerRoutes(app);
  
  // Then import curated strains after server has started
  // This avoids timeouts during workflow startup
  setTimeout(async () => {
    try {
      const strainCount = await importCuratedStrains();
      log(`Successfully imported ${strainCount} curated strains after startup`);
    } catch (error) {
      log(`Error importing curated strains: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    // Initialize W counter bot if not initialized yet by routes.ts
    if (!global.wCounterInitialized) {
      log('Starting W Counter bot initialization from index.ts');
      try {
        log('Checking W_COUNTER_TOKEN availability...');
        if (!process.env.W_COUNTER_TOKEN) {
          log('W_COUNTER_TOKEN not found in environment variables!');
        } else {
          log('W_COUNTER_TOKEN found, proceeding with bot initialization');
          const wClient = await initializeWCounter();
          global.wCounterInitialized = true;
          log(`W Counter bot initialized successfully ${wClient ? 'with client' : 'but client is null'}`);
        }
      } catch (error) {
        log(`Error initializing W Counter bot: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      log('W Counter bot already initialized in routes.ts, skipping duplicate initialization');
    }
  }, 5000); // Wait 5 seconds after server start to begin importing

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Serve the app on a port that won't conflict with other services
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000; // Using standard port for Replit workflow compatibility
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
