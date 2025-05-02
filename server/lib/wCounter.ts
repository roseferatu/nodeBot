// W Counter service that runs within our main application
import { Client, Events, GatewayIntentBits, EmbedBuilder } from 'discord.js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Server-specific data structures
interface ChannelCounters {
  [channelId: string]: number;
}

interface ServerData {
  total: number;
  channels: ChannelCounters;
}

// State for W counters
const serverCounters: { [serverId: string]: ServerData } = {};

// Logger specifically for the kUShCOOKIES W counter
const wLogger = {
  info: (message: string) => console.log(`[kUShCOOKIES W Counter] ${message}`),
  error: (message: string) => console.error(`[kUShCOOKIES W Counter] ERROR: ${message}`),
  debug: (message: string) => console.log(`[kUShCOOKIES W Counter DEBUG] ${message}`)
};

// Create a Discord client for the W counter
export async function initializeWCounter(): Promise<any> {
  try {
    const token = process.env.W_COUNTER_TOKEN;
    
    if (!token) {
      wLogger.error('W_COUNTER_TOKEN not found in environment variables');
      return;
    }
    
    // Create a client with minimal configuration but all message-related intents
    const client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        // Add additional intents
        GatewayIntentBits.GuildMembers
      ]
    });
    
    // When the bot is ready
    client.once(Events.ClientReady, () => {
      wLogger.info(`kUShCOOKIES W Counter Bot ready! Logged in as ${client.user?.tag}`);
    });
    
    // Core message event handler
    client.on(Events.MessageCreate, async (message) => {
      try {
        wLogger.debug(`Received message: "${message.content}" from ${message.author.tag}`);
        
        // Skip messages from bots (including ourselves)
        if (message.author.bot) {
          wLogger.debug('Ignoring message from a bot');
          return;
        }
        
        // Skip DMs
        if (!message.guild) {
          wLogger.debug('Ignoring DM');
          return;
        }
        
        // Check for exact 'w' or 'W' phrases only
        const messageWords = message.content.split(/\s+/);
        wLogger.debug(`Message split into words: ${JSON.stringify(messageWords)}`);
        
        // Filter only for exact "W" or "w" matches (standalone)
        const exactWMatches = messageWords.filter(word => word === 'w' || word === 'W');
        wLogger.debug(`Exact W matches: ${JSON.stringify(exactWMatches)}`);
        
        if (exactWMatches.length > 0) {
          const wCount = exactWMatches.length;
          wLogger.info(`Found ${wCount} exact W's in message from ${message.author.tag}`);
          
          // Initialize server and channel counters if they don't exist
          const serverId = message.guild.id;
          const channelId = message.channel.id;
          
          if (!serverCounters[serverId]) {
            serverCounters[serverId] = { total: 0, channels: {} };
          }
          
          if (!serverCounters[serverId].channels[channelId]) {
            serverCounters[serverId].channels[channelId] = 0;
          }
          
          // Increment counters
          serverCounters[serverId].total += wCount;
          serverCounters[serverId].channels[channelId] += wCount;
          
          // Get updated counts
          const totalCount = serverCounters[serverId].total;
          const channelCount = serverCounters[serverId].channels[channelId];
          
          // Create embed
          const embed = new EmbedBuilder()
            .setTitle('kUShCOOKIES W Counter')
            .setDescription(`**${totalCount} W's in chat!**`)
            .setColor(0xe74c3c)
            .addFields(
              { name: 'Channel Count', value: `${channelCount} W's`, inline: true },
              { name: 'Server Total', value: `${totalCount} W's`, inline: true }
            )
            .setFooter({ text: `Server: ${message.guild.name}` })
            .setTimestamp();
          
          // Send the message
          await message.channel.send({ embeds: [embed] });
        }
      } catch (error) {
        wLogger.error(`Error processing message: ${error}`);
      }
    });
    
    // Handle slash commands
    client.on(Events.InteractionCreate, async (interaction) => {
      if (!interaction.isCommand()) return;
      
      const { commandName } = interaction;
      const serverId = interaction.guild?.id;
      
      if (!serverId) {
        wLogger.error('Command used outside of a server');
        return;
      }
      
      try {
        // Initialize server data if it doesn't exist
        if (!serverCounters[serverId]) {
          serverCounters[serverId] = { total: 0, channels: {} };
        }
        
        // Get the channel ID
        const channelId = interaction.channelId;
        
        // Initialize channel counter if it doesn't exist
        if (!serverCounters[serverId].channels[channelId]) {
          serverCounters[serverId].channels[channelId] = 0;
        }
        
        // Handle different commands
        if (commandName === 'count') {
          // Acknowledge the interaction
          await interaction.deferReply();
          
          // Get the counts
          const totalCount = serverCounters[serverId].total;
          const channelCount = serverCounters[serverId].channels[channelId];
          
          // Create embed
          const embed = new EmbedBuilder()
            .setTitle('kUShCOOKIES W Counter')
            .setDescription(`Current W counts for this server:`)
            .setColor(0x3498db)
            .addFields(
              { name: 'Channel Count', value: `${channelCount} W's`, inline: true },
              { name: 'Server Total', value: `${totalCount} W's`, inline: true }
            )
            .setFooter({ text: `Server: ${interaction.guild?.name}` })
            .setTimestamp();
          
          // Send the response
          await interaction.editReply({ embeds: [embed] });
        } else if (commandName === 'reset') {
          // Acknowledge the interaction
          await interaction.deferReply();
          
          // Reset the counters
          serverCounters[serverId] = { total: 0, channels: {} };
          
          // Create embed
          const embed = new EmbedBuilder()
            .setTitle('kUShCOOKIES W Counter Reset')
            .setDescription(`All W counters have been reset to 0!`)
            .setColor(0x2ecc71)
            .addFields(
              { name: 'Channel Count', value: `0 W's`, inline: true },
              { name: 'Server Total', value: `0 W's`, inline: true }
            )
            .setFooter({ text: `Server: ${interaction.guild?.name}` })
            .setTimestamp();
          
          // Send the response
          await interaction.editReply({ embeds: [embed] });
        }
      } catch (error) {
        wLogger.error(`Error handling command: ${error}`);
        
        // Try to respond to the interaction if possible
        try {
          if (interaction.deferred || interaction.replied) {
            await interaction.editReply({ content: 'An error occurred while processing your command.' });
          } else {
            await interaction.reply({ content: 'An error occurred while processing your command.', ephemeral: true });
          }
        } catch (replyError) {
          wLogger.error(`Error responding to interaction: ${replyError}`);
        }
      }
    });
    
    // Login to Discord
    await client.login(token);
    wLogger.info('kUShCOOKIES W Counter bot logged in successfully');
    
    // Return client for later reference
    return client;
  } catch (error) {
    wLogger.error(`Failed to initialize W Counter bot: ${error}`);
    throw error;
  }
}