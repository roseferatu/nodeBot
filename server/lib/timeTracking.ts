import type { TimeTrackingSession, TimeTrackingSummary, TimeTrackingSettings, LinkedAccount } from "@shared/schema";
import { storage } from "../storage";
import { fetchVRChatUserStatus } from "./vrchat";
import { addHours, format, subDays, startOfWeek, startOfMonth, endOfDay } from "date-fns";
import { getServerAndClient } from "./discord";

// Track active intervals to avoid memory leaks
const trackingIntervals: Map<string, NodeJS.Timeout> = new Map();

/**
 * Start tracking time for a linked account
 * @param linkedAccount The linked VRChat account
 * @returns void
 */
export async function startTracking(linkedAccount: LinkedAccount): Promise<void> {
  // Get or create time tracking settings for this server
  let settings = await storage.getTimeTrackingSettings(linkedAccount.server_id);
  
  if (!settings) {
    settings = await storage.createTimeTrackingSettings({
      server_id: linkedAccount.server_id,
      enabled: true,
      track_worlds: true,
      check_interval_minutes: 5,
      milestone_notifications: true
    });
  }
  
  // Check if tracking is enabled
  if (!settings.enabled) {
    console.log(`Time tracking is disabled for server ${linkedAccount.server_id}`);
    return;
  }
  
  // Check if there's already an interval running for this user
  const intervalKey = `${linkedAccount.server_id}:${linkedAccount.discord_user_id}`;
  if (trackingIntervals.has(intervalKey)) {
    // Already tracking this user
    return;
  }
  
  // Start the tracking interval
  const intervalId = setInterval(
    () => checkUserStatus(linkedAccount), 
    (settings.check_interval_minutes || 5) * 60 * 1000
  );
  
  // Store the interval ID for later cleanup
  trackingIntervals.set(intervalKey, intervalId);
  
  console.log(`Started time tracking for ${linkedAccount.vrchat_display_name} (Discord: ${linkedAccount.discord_username}) in server ${linkedAccount.server_id}`);
  
  // Do an initial check immediately
  await checkUserStatus(linkedAccount);
}

/**
 * Stop tracking time for a linked account
 * @param linkedAccount The linked VRChat account
 * @returns void
 */
export async function stopTracking(linkedAccount: LinkedAccount): Promise<void> {
  const intervalKey = `${linkedAccount.server_id}:${linkedAccount.discord_user_id}`;
  const intervalId = trackingIntervals.get(intervalKey);
  
  if (intervalId) {
    clearInterval(intervalId);
    trackingIntervals.delete(intervalKey);
    
    // Close any active sessions
    const activeSession = await storage.getActiveSessionByLinkedAccount(linkedAccount.id);
    if (activeSession) {
      await storage.closeTimeTrackingSession(activeSession.id, new Date());
    }
    
    console.log(`Stopped time tracking for ${linkedAccount.vrchat_display_name} (Discord: ${linkedAccount.discord_username}) in server ${linkedAccount.server_id}`);
  }
}

/**
 * Check the current status of a VRChat user and update sessions accordingly
 * @param linkedAccount The linked VRChat account
 * @returns void
 */
export async function checkUserStatus(linkedAccount: LinkedAccount): Promise<void> {
  try {
    // Get the user's current status from VRChat API
    const userStatus = await fetchVRChatUserStatus(linkedAccount.vrchat_user_id);
    
    // Get any active sessions for this user
    const activeSession = await storage.getActiveSessionByLinkedAccount(linkedAccount.id);
    
    if (userStatus.isOnline) {
      // User is online in VRChat
      if (!activeSession) {
        // Start a new session
        await storage.createTimeTrackingSession({
          linked_account_id: linkedAccount.id,
          server_id: linkedAccount.server_id,
          session_start: new Date(),
          status: userStatus.status || 'online',
          world_id: userStatus.worldId || null,
          world_name: userStatus.worldName || null
        });
        
        console.log(`Started new session for ${linkedAccount.vrchat_display_name} (Discord: ${linkedAccount.discord_username})`);
      } else {
        // Update the active session if world changes
        if (userStatus.worldId && userStatus.worldId !== activeSession.world_id) {
          await storage.updateTimeTrackingSession(activeSession.id, {
            world_id: userStatus.worldId,
            world_name: userStatus.worldName || null,
            status: userStatus.status || 'online'
          });
          
          console.log(`Updated world for ${linkedAccount.vrchat_display_name} to ${userStatus.worldName || 'Unknown World'}`);
        }
      }
    } else {
      // User is offline in VRChat
      if (activeSession) {
        // Close the active session
        const closedSession = await storage.closeTimeTrackingSession(activeSession.id, new Date());
        
        // Update summary statistics
        await updateSummaries(linkedAccount, closedSession);
        
        console.log(`Closed session for ${linkedAccount.vrchat_display_name} (Discord: ${linkedAccount.discord_username}). Duration: ${closedSession.duration_minutes} minutes`);
        
        // Check if they reached any milestones
        await checkMilestones(linkedAccount);
      }
    }
  } catch (error) {
    console.error(`Error checking VRChat status for ${linkedAccount.vrchat_display_name}:`, error);
  }
}

/**
 * Update time tracking summary statistics
 * @param linkedAccount The linked account
 * @param session The session that was just closed
 */
async function updateSummaries(linkedAccount: LinkedAccount, session: TimeTrackingSession): Promise<void> {
  try {
    const today = new Date();
    
    // Update daily summary
    await updateSummary(linkedAccount, session, 'daily', today);
    
    // Update weekly summary (current week)
    await updateSummary(linkedAccount, session, 'weekly', today);
    
    // Update monthly summary (current month)
    await updateSummary(linkedAccount, session, 'monthly', today);
  } catch (error) {
    console.error(`Error updating summaries for ${linkedAccount.vrchat_display_name}:`, error);
  }
}

/**
 * Update a specific time tracking summary
 * @param linkedAccount The linked account
 * @param session The session that was just closed
 * @param summaryType Type of summary (daily, weekly, monthly)
 * @param date Date to use for the summary period
 */
async function updateSummary(
  linkedAccount: LinkedAccount, 
  session: TimeTrackingSession, 
  summaryType: string,
  date: Date
): Promise<void> {
  // Determine the date to use for this summary
  let summaryDate: Date;
  
  if (summaryType === 'daily') {
    // Use today's date, time set to 00:00:00
    summaryDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  } else if (summaryType === 'weekly') {
    // Use the start of the week
    summaryDate = startOfWeek(date);
  } else if (summaryType === 'monthly') {
    // Use the start of the month
    summaryDate = new Date(date.getFullYear(), date.getMonth(), 1);
  } else {
    throw new Error(`Invalid summary type: ${summaryType}`);
  }
  
  // Try to get existing summary
  const existingSummaries = await storage.getSummariesByLinkedAccount(linkedAccount.id, summaryType, 10);
  let summary = existingSummaries.find(s => {
    const summaryDateObj = new Date(s.summary_date);
    return summaryDateObj.getFullYear() === summaryDate.getFullYear() &&
           summaryDateObj.getMonth() === summaryDate.getMonth() &&
           summaryDateObj.getDate() === summaryDate.getDate();
  });
  
  // Get session duration (default to 0 if somehow missing)
  const sessionMinutes = session.duration_minutes || 0;
  
  if (summary) {
    // Update existing summary
    const worldsData = summary.worlds_data || {};
    const worldId = session.world_id || 'unknown';
    
    // Update world stats if this world was visited
    if (worldId !== 'unknown') {
      // Cast to Record with any values to fix TypeScript error
      const typedWorldsData = worldsData as Record<string, any>;
      
      const worldStats = typedWorldsData[worldId] || { 
        name: session.world_name || 'Unknown World', 
        minutes: 0, 
        visits: 0
      };
      
      worldStats.minutes += sessionMinutes;
      worldStats.visits += 1;
      typedWorldsData[worldId] = worldStats;
    }
    
    // Update the summary with null checks for TypeScript
    await storage.updateTimeTrackingSummary(summary.id, {
      total_minutes: (summary.total_minutes || 0) + sessionMinutes,
      active_sessions: (summary.active_sessions || 0) + 1,
      worlds_visited: Object.keys(worldsData).length,
      worlds_data: worldsData
    });
  } else {
    // Create new summary
    const worldsData: Record<string, any> = {};
    
    // Add this world to the worlds data if applicable
    if (session.world_id) {
      worldsData[session.world_id] = {
        name: session.world_name || 'Unknown World',
        minutes: sessionMinutes,
        visits: 1
      };
    }
    
    await storage.createTimeTrackingSummary({
      linked_account_id: linkedAccount.id,
      server_id: linkedAccount.server_id,
      summary_date: summaryDate,
      summary_type: summaryType,
      total_minutes: sessionMinutes,
      active_sessions: 1,
      worlds_visited: Object.keys(worldsData).length,
      worlds_data: worldsData
    });
  }
}

/**
 * Check if a user has reached any time milestones
 * @param linkedAccount The linked account
 */
async function checkMilestones(linkedAccount: LinkedAccount): Promise<void> {
  try {
    // Get time tracking settings for this server
    const settings = await storage.getTimeTrackingSettings(linkedAccount.server_id);
    
    if (!settings || !settings.milestone_notifications || !settings.milestone_roles) {
      return; // No milestones configured
    }
    
    // Get monthly summary for the current month
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const monthlySummaries = await storage.getSummariesByLinkedAccount(linkedAccount.id, 'monthly', 1);
    const currentMonthSummary = monthlySummaries[0];
    
    if (!currentMonthSummary) {
      return; // No summary for this month yet
    }
    
    // Check milestone roles
    const milestoneRoles = settings.milestone_roles as Record<string, string>;
    const totalMinutes = currentMonthSummary.total_minutes;
    
    // Sort milestones in descending order to check highest milestone first
    const minuteThresholds = Object.keys(milestoneRoles)
      .map(Number)
      .sort((a, b) => b - a);
    
    // Find the highest milestone reached
    let highestMilestoneMinutes = 0;
    let highestMilestoneRoleId = '';
    
    for (const minutes of minuteThresholds) {
      if ((totalMinutes || 0) >= minutes && minutes > highestMilestoneMinutes) {
        highestMilestoneMinutes = minutes;
        highestMilestoneRoleId = milestoneRoles[minutes.toString()];
      }
    }
    
    if (highestMilestoneRoleId) {
      // Apply the role in Discord
      const { client } = getServerAndClient();
      if (!client) return;
      
      const guild = client.guilds.cache.get(linkedAccount.server_id);
      if (!guild) return;
      
      try {
        const member = await guild.members.fetch(linkedAccount.discord_user_id);
        if (!member) return;
        
        // Add the role if they don't already have it
        if (!member.roles.cache.has(highestMilestoneRoleId)) {
          await member.roles.add(highestMilestoneRoleId);
          
          // Send notification if channel is configured
          if (settings.notification_channel_id) {
            const channel = guild.channels.cache.get(settings.notification_channel_id);
            if (channel && channel.isTextBased()) {
              const role = guild.roles.cache.get(highestMilestoneRoleId);
              const roleName = role ? role.name : 'Time Milestone Role';
              
              await channel.send({
                content: `🎉 Congratulations to ${member.displayName} for reaching the ${roleName} milestone with ${totalMinutes} minutes spent in VRChat this month!`
              });
            }
          }
        }
      } catch (error) {
        console.error(`Error applying milestone role to ${linkedAccount.discord_username}:`, error);
      }
    }
  } catch (error) {
    console.error(`Error checking milestones for ${linkedAccount.vrchat_display_name}:`, error);
  }
}

/**
 * Get time tracking statistics for a specific Discord user in a server
 * @param discordUserId Discord user ID
 * @param serverId Discord server ID
 * @returns Object containing time statistics or null if no data found
 */
export async function getUserTimeStats(discordUserId: string, serverId: string): Promise<any> {
  try {
    // Get linked account for this Discord user
    const linkedAccount = await storage.getLinkedAccount(discordUserId);
    
    if (!linkedAccount || !linkedAccount.verified) {
      return null; // No linked account
    }
    
    // Get active session if any
    const activeSession = await storage.getActiveSessionByLinkedAccount(linkedAccount.id);
    
    // Get daily summary for today
    const today = new Date();
    const dailySummaries = await storage.getSummariesByLinkedAccount(linkedAccount.id, 'daily', 7);
    
    // Get weekly summary
    const weeklySummaries = await storage.getSummariesByLinkedAccount(linkedAccount.id, 'weekly', 4);
    
    // Get monthly summary
    const monthlySummaries = await storage.getSummariesByLinkedAccount(linkedAccount.id, 'monthly', 3);
    
    // Process the daily, weekly, and monthly data
    const todaySummary = dailySummaries.find(s => {
      const date = new Date(s.summary_date);
      return date.getDate() === today.getDate() &&
             date.getMonth() === today.getMonth() &&
             date.getFullYear() === today.getFullYear();
    });
    
    // Calculate today's time including active session
    let todayMinutes = todaySummary ? todaySummary.total_minutes : 0;
    
    if (activeSession) {
      const sessionStartDate = new Date(activeSession.session_start);
      const sessionStartDay = sessionStartDate.getDate();
      
      if (sessionStartDay === today.getDate()) {
        // Calculate current session duration
        const now = new Date();
        const durationMs = now.getTime() - sessionStartDate.getTime();
        const durationMinutes = Math.round(durationMs / (1000 * 60));
        todayMinutes = (todayMinutes || 0) + durationMinutes;
      }
    }
    
    // Prepare stats object
    const stats = {
      username: linkedAccount.vrchat_display_name,
      isCurrentlyOnline: !!activeSession,
      currentWorld: activeSession ? activeSession.world_name : null,
      todayMinutes,
      weekMinutes: weeklySummaries.length > 0 ? weeklySummaries[0].total_minutes : 0,
      monthMinutes: monthlySummaries.length > 0 ? monthlySummaries[0].total_minutes : 0,
      dailyHistory: dailySummaries.map(s => ({
        date: format(new Date(s.summary_date), 'yyyy-MM-dd'),
        minutes: s.total_minutes
      })),
      lastActive: activeSession ? activeSession.session_start : 
        (dailySummaries.length > 0 ? dailySummaries[0].updated_at : null)
    };
    
    return stats;
  } catch (error) {
    console.error(`Error getting time stats for user ${discordUserId}:`, error);
    return null;
  }
}

/**
 * Start tracking for all verified linked accounts
 */
export async function initializeTimeTracking(): Promise<void> {
  try {
    console.log('Initializing time tracking system...');
    
    // Get all servers
    const servers = await storage.getServers();
    
    for (const server of servers) {
      // Get all linked accounts for this server
      const linkedAccounts = await storage.getLinkedAccountsByServer(server.id);
      
      // Start tracking for verified accounts
      for (const account of linkedAccounts) {
        if (account.verified) {
          await startTracking(account);
        }
      }
      
      console.log(`Started time tracking for ${linkedAccounts.filter(a => a.verified).length} users in server ${server.id}`);
    }
    
    console.log('Time tracking system initialized successfully');
  } catch (error) {
    console.error('Error initializing time tracking system:', error);
  }
}

/**
 * Get server-wide time statistics
 * @param serverId Discord server ID
 * @returns Object containing server-wide time statistics
 */
export async function getServerTimeStats(serverId: string): Promise<any> {
  try {
    // Get all time summaries for this server from the past 30 days
    const today = new Date();
    const dailySummaries = await storage.getSummariesByServer(serverId, 'daily', 100);
    
    // Get monthly summaries
    const monthlySummaries = await storage.getSummariesByServer(serverId, 'monthly', 12);
    
    // Calculate total time across all users for the current month
    const currentMonthSummaries = monthlySummaries.filter(s => {
      const date = new Date(s.summary_date);
      return date.getMonth() === today.getMonth() && 
             date.getFullYear() === today.getFullYear();
    });
    
    const totalMonthlyMinutes = currentMonthSummaries.reduce((sum, summary) => sum + (summary.total_minutes || 0), 0);
    
    // Calculate average daily time for the past 7 days
    const last7DaysSummaries = dailySummaries.filter(s => {
      const date = new Date(s.summary_date);
      const daysDiff = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      return daysDiff < 7;
    });
    
    // Group by date
    const dailyTotals: Record<string, number> = {};
    
    for (const summary of last7DaysSummaries) {
      const dateStr = format(new Date(summary.summary_date), 'yyyy-MM-dd');
      dailyTotals[dateStr] = (dailyTotals[dateStr] || 0) + (summary.total_minutes || 0);
    }
    
    const dailyAverageMinutes = Object.values(dailyTotals).reduce((sum, minutes) => sum + minutes, 0) / 
      Math.max(Object.keys(dailyTotals).length, 1);
    
    // Calculate top worlds visited
    const worldStats: Record<string, { name: string, totalMinutes: number, visits: number }> = {};
    
    for (const summary of dailySummaries) {
      if (summary.worlds_data) {
        const worldsData = summary.worlds_data as Record<string, any>;
        
        for (const [worldId, data] of Object.entries(worldsData)) {
          if (!worldStats[worldId]) {
            worldStats[worldId] = { 
              name: data.name || 'Unknown World', 
              totalMinutes: 0, 
              visits: 0 
            };
          }
          
          worldStats[worldId].totalMinutes += data.minutes || 0;
          worldStats[worldId].visits += data.visits || 0;
        }
      }
    }
    
    // Sort worlds by total minutes
    const topWorlds = Object.entries(worldStats)
      .map(([id, stats]) => ({
        id,
        name: stats.name,
        minutes: stats.totalMinutes,
        visits: stats.visits
      }))
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 10);
    
    return {
      totalMonthlyMinutes,
      dailyAverageMinutes,
      topWorlds,
      activeUsers: currentMonthSummaries.length,
      dailyActivity: Object.entries(dailyTotals).map(([date, minutes]) => ({
        date,
        minutes
      })).sort((a, b) => a.date.localeCompare(b.date))
    };
  } catch (error) {
    console.error(`Error getting server time stats for ${serverId}:`, error);
    return null;
  }
}