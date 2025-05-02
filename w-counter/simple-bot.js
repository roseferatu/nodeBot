// Simple W Counter Bot implementation
// This simplified version focuses only on the core W detection functionality
const { Client, Events, GatewayIntentBits, EmbedBuilder } = require('discord.js');
require('dotenv').config();

console.log('Starting simplified W Counter bot...');

// Create a client with minimal configuration but all message-related intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages, 
    GatewayIntentBits.MessageContent
  ]
});

// Store counters in memory (simplified approach)
const serverCounters = {};

// When the bot is ready
client.once(Events.ClientReady, () => {
  console.log(`Simplified W Counter Bot ready! Logged in as ${client.user.tag}`);
  
  // Log heartbeat every 30 seconds to confirm the bot is still running
  setInterval(() => {
    console.log(`[HEARTBEAT] Bot still running at ${new Date().toISOString()}`);
  }, 30000);
});

// Core message event handler
client.on(Events.MessageCreate, async (message) => {
  try {
    console.log(`Received message: "${message.content}" from ${message.author.tag}`);
    
    // Skip messages from bots (including ourselves)
    if (message.author.bot) {
      console.log('Ignoring message from a bot');
      return;
    }
    
    // Skip DMs
    if (!message.guild) {
      console.log('Ignoring DM');
      return;
    }
    
    // Check for 'w' (case insensitive)
    const lowerContent = message.content.toLowerCase();
    const wMatches = lowerContent.match(/w/g);
    
    if (wMatches) {
      const wCount = wMatches.length;
      console.log(`Found ${wCount} W's in message`);
      
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
        .setTitle('W Counter')
        .setDescription(`**${wCount}** new W's detected!`)
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
    console.error('Error processing message:', error);
  }
});

// Login to Discord
client.login(process.env.W_COUNTER_TOKEN)
  .catch(error => console.error('Login error:', error));