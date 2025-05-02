import { Client, TextChannel } from 'discord.js';
import { storage } from '../storage';
import { StrainAnnouncement, Strain } from '@shared/schema';
import cron from 'node-cron';

interface ScheduledTask {
  serverId: string;
  channelId: string;
  time: string;
  timezone: string | null;
  cronJob: cron.ScheduledTask;
}

const scheduledTasks: Map<number, ScheduledTask> = new Map();

/**
 * Convert a time (HH:MM) and timezone to a cron expression
 * @param time - Time in HH:MM format
 * @param timezone - Timezone (e.g., 'UTC', 'America/New_York')
 * @returns Cron expression
 */
function timeToCron(time: string, timezone: string | null): string {
  const [hours, minutes] = time.split(':').map(n => parseInt(n, 10));
  return `0 ${minutes} ${hours} * * *`;
}

/**
 * Post a strain announcement to a Discord channel
 * @param client - Discord client instance
 * @param announcement - Strain announcement configuration
 */
export async function postStrainAnnouncement(
  client: Client, 
  announcement: StrainAnnouncement
): Promise<void> {
  try {
    // Get a random strain
    const strain = await storage.getRandomStrain();
    
    if (!strain) {
      console.error('No strains found for announcement');
      return;
    }
    
    // Get the Discord channel
    const channel = await client.channels.fetch(announcement.channel_id) as TextChannel;
    
    if (!channel || !channel.isTextBased()) {
      console.error(`Channel ${announcement.channel_id} not found or not a text channel`);
      return;
    }
    
    // Create the strain announcement embed
    const strainEmbed: any = {
      title: `🌿 kUShCOOKIES Strain of the Day: ${strain.name}`,
      description: strain.description,
      color: strain.type === 'indica' ? 0x6B4EE0 : strain.type === 'sativa' ? 0xE04E4E : 0x4EE078, // Purple for indica, red for sativa, green for hybrid
      thumbnail: {
        url: 'https://kushcookies.com/wp-content/uploads/2021/06/logo7.png' // Default KushCookies logo
      },
      fields: [
        {
          name: 'Type',
          value: strain.type.charAt(0).toUpperCase() + strain.type.slice(1),
          inline: true
        }
      ],
      footer: {
        text: '🔍 Daily Strain Announcement'
      },
      timestamp: new Date().toISOString()
    };
    
    // Add optional fields if present
    if (strain.thc_content) {
      strainEmbed.fields.push({
        name: 'THC Content',
        value: strain.thc_content,
        inline: true
      });
    }
    
    if (strain.cbd_content) {
      strainEmbed.fields.push({
        name: 'CBD Content',
        value: strain.cbd_content,
        inline: true
      });
    }
    
    if (strain.flavor_profile) {
      strainEmbed.fields.push({
        name: 'Flavor Profile',
        value: strain.flavor_profile,
        inline: true
      });
    }
    
    if (strain.effects) {
      strainEmbed.fields.push({
        name: 'Effects',
        value: strain.effects,
        inline: true
      });
    }
    
    // Add image if available
    if (strain.image_url) {
      strainEmbed.image = {
        url: strain.image_url
      };
    }
    
    // Send the announcement
    await channel.send({ 
      content: `**🌿 Today's Strain: ${strain.name}**`,
      embeds: [strainEmbed] 
    });
    
    console.log(`Posted strain announcement for ${strain.name} in channel ${channel.name}`);
    
    // Update the last announced timestamp
    await storage.updateLastAnnounced(announcement.id, new Date());
    
  } catch (error) {
    console.error('Error posting strain announcement:', error);
  }
}

/**
 * Schedule a strain announcement task
 * @param client - Discord client instance
 * @param announcement - Strain announcement configuration
 */
export function scheduleAnnouncement(
  client: Client,
  announcement: StrainAnnouncement
): void {
  try {
    // Cancel any existing scheduled task for this announcement
    if (scheduledTasks.has(announcement.id)) {
      const task = scheduledTasks.get(announcement.id);
      task?.cronJob.stop();
      scheduledTasks.delete(announcement.id);
    }
    
    // Only schedule if the announcement is enabled
    if (!announcement.is_enabled) {
      console.log(`Announcement ${announcement.id} is disabled, not scheduling`);
      return;
    }
    
    // Convert the time to a cron expression
    const cronExpression = timeToCron(announcement.time, announcement.timezone);
    
    // Create timezone options if a timezone is specified
    const options: cron.ScheduleOptions = {};
    if (announcement.timezone) {
      options.timezone = announcement.timezone;
    }
    
    // Schedule the task
    const cronJob = cron.schedule(
      cronExpression,
      () => postStrainAnnouncement(client, announcement),
      options
    );
    
    // Store the scheduled task
    scheduledTasks.set(announcement.id, {
      serverId: announcement.server_id,
      channelId: announcement.channel_id,
      time: announcement.time,
      timezone: announcement.timezone,
      cronJob
    });
    
    console.log(`Scheduled strain announcement at ${announcement.time} ${announcement.timezone || 'UTC'} for server ${announcement.server_id}`);
    
  } catch (error) {
    console.error('Error scheduling announcement:', error);
  }
}

/**
 * Initialize all strain announcements from the database
 * @param client - Discord client instance
 */
export async function initializeStrainAnnouncements(client: Client): Promise<void> {
  try {
    // Get all servers
    const servers = await storage.getServers();
    
    // For each server, get and schedule all announcements
    for (const server of servers) {
      const announcements = await storage.getStrainAnnouncements(server.id);
      
      for (const announcement of announcements) {
        if (announcement.is_enabled) {
          scheduleAnnouncement(client, announcement);
        }
      }
    }
    
    console.log('Strain announcements initialized');
    
  } catch (error) {
    console.error('Error initializing strain announcements:', error);
  }
}

/**
 * Create a temporary announcement object and post it immediately
 * For use with the /strain-now command to trigger a manual announcement
 * 
 * @param client - Discord client instance
 * @param serverId - Server ID
 * @param channelId - Channel ID to post to
 * @returns Promise that resolves when the announcement is posted
 */
export async function createAndPostManualAnnouncement(
  client: Client,
  serverId: string,
  channelId: string
): Promise<void> {
  try {
    // Create a temporary announcement object
    const tempAnnouncement: StrainAnnouncement = {
      id: -1, // Temporary ID that won't conflict with stored announcements
      server_id: serverId,
      channel_id: channelId,
      time: '00:00', // Not relevant for manual announcement
      timezone: null,
      created_at: new Date(),
      is_enabled: true,
      last_announced: null
    };
    
    // Post the announcement immediately
    await postStrainAnnouncement(client, tempAnnouncement);
    
    console.log(`Manual strain announcement posted to channel ${channelId} in server ${serverId}`);
    
  } catch (error) {
    console.error('Error posting manual strain announcement:', error);
    throw error;
  }
}