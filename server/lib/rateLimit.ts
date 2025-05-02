import { storage } from '../storage';

// Default rate limit
const DEFAULT_RATE_LIMIT = 100;

// Rate limit interval in hours
const RATE_LIMIT_INTERVAL = 1;

// Check if a user has exceeded their rate limit
export async function checkRateLimit(userId: string, serverId: string, countToAdd: number = 1) {
  // Get the current rate limit for this user
  let rateLimit = await storage.getRateLimit(userId, serverId);
  
  // Get server-specific rate limit if configured
  const botSettings = await storage.getBotSettings(serverId);
  const configuredRateLimit = botSettings?.settings?.rateLimit 
    ? parseInt(botSettings.settings.rateLimit, 10)
    : DEFAULT_RATE_LIMIT;
  
  // If no rate limit exists or it has expired, create a new one
  if (!rateLimit || new Date() > rateLimit.reset_at) {
    // Reset the rate limit
    rateLimit = await storage.resetRateLimit(userId, serverId);
  }
  
  // Increment the usage count by the specified amount (default: 1)
  rateLimit = await storage.incrementRateLimit(userId, serverId, countToAdd);
  
  // Check if user has exceeded their limit
  const allowed = rateLimit.count <= configuredRateLimit;
  
  // Calculate time until reset
  const resetTime = new Date(rateLimit.reset_at);
  const now = new Date();
  const diffMs = resetTime.getTime() - now.getTime();
  const diffMins = Math.ceil(diffMs / 60000);
  
  return {
    allowed,
    current: rateLimit.count,
    limit: configuredRateLimit,
    reset: resetTime,
    resetInMinutes: diffMins,
  };
}
