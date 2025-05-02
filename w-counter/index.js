// W Counter Bot
// A simple Discord bot that counts mentions of "W" in chat with animated loading indicators
const { 
  Client, 
  Events, 
  GatewayIntentBits,
  ChannelType,
  EmbedBuilder
} = require('discord.js');
require('dotenv').config();
const { loadData, setupAutosave } = require('./storage');

// Load persistent counter data from storage
const data = loadData();
console.log('W Counter data loaded successfully');

// Initialize counters for each server
const serverCounters = data.serverCounters || {};

// Store total counts across all channels per server
const serverTotalCounters = data.serverTotalCounters || {};

// Setup autosave for persistent storage
setupAutosave(serverCounters, serverTotalCounters);

// Set up intentId for all possible intents
const FULL_INTENTS = 32767;  // This is a magic number for ALL intents

// Create a new Discord client with EVERY POSSIBLE intent
const client = new Client({
  intents: FULL_INTENTS
});

// Playful mascot animation frames based on bot avatar (ᴀɪꜱʜᴀ)
// Each style represents a different emotion or state of the mascot
const mascotStyles = {
  // Default style - mix of all styles
  default: [
    "✧⋄⋆ Aisha ⋆⋄✧",  // Sparkly name
    "ᵃⁱˢʰᵃ 💕",       // Small text with heart
    "(づ｡◕‿‿◕｡)づ",    // Cute face
    "(✿◠‿◠)",        // Flower face
    "🙋‍♀️ Aisha",      // Waving emoji
    "( •̀ᴗ•́ )و ̑̑",     // Determined
    "ᴀ ̥ ɪ ̥ s ̥ ʜ ̥ ᴀ ̥",  // Spaced letters
    "ᴀɪꜱʜᴀ ✨",        // Capital small letters with sparkle
    "⋆｡°✩ Aisha ✩°｡⋆", // Star decorations
  ],
  
  // Happy/Excited style - playful and energetic
  happy: [
    "ヽ(^◇^*)/ Aisha",   // Excited with arms up
    "=͟͟͞͞ʕ•̀=͟͟͞͞ʕ•̀ω•́=͟͟͞͞ʕ•́ω•́ʔ", // Running excited
    "(＾▽＾)",           // Simple happy
    "ᴀɪꜱʜᴀ ʕ•ᴥ•ʔ",      // With bear
    "(ﾉ´ヮ`)ﾉ*:･ﾟ✧",     // Magical excitement
    "ᕕ( ᐛ )ᕗ Aisha",    // Walking happily
    "♪(๑ᴖ◡ᴖ๑)♪",        // Singing
    "ヾ(^▽^*)))",        // Waving excitement
  ],
  
  // Cool/Stylish style - more composed and confident
  cool: [
    "Aisha ⟬⸙⟭",         // With stylish brackets
    "(￣︶￣)⌐■-■",        // Putting on sunglasses
    "ᴀɪꜱʜᴀ ✧",           // Sparkle
    "(•_•) ( •_•)>⌐■-■", // Cool transition
    "(⌐■_■)",            // Wearing sunglasses
    "Aisha │▌█║▌║▌║",    // With barcode
    "ᴀ‧ɪ‧s‧ʜ‧ᴀ",          // Separated letters
    "₳łₛₕₐ",              // Stylized letters
  ],
  
  // W-focused style (for W Counter bot specifically)
  w_counter: [
    "W⊂(◉‿◉)つW",         // Holding W's
    "W٩(｡•́‿•̀｡)۶W",       // Excited with W's
    "(づ｡◕‿‿◕｡)づ W",     // Giving a W
    "W ᕙ(⇀‸↼‶)ᕗ W",      // Strong with W's
    "W★Aisha★W",          // Star decorated with W's
    "W ٩(◕‿◕｡)۶ W",       // Celebrating W's
    "Wᴡᴡᴡ(◠‿◠)ᴡᴡᴡW",    // Multiple W's
    "W(♥ᴗ♥)W",            // Loving W's
  ]
};

// Loading animations with mascot
const loadingAnimations = [
  // Counting animation
  frames => frames.map(frame => `${frame} Counting W's...`),
  
  // Searching animation
  frames => frames.map(frame => `${frame} Looking for W's...`),
  
  // Processing animation
  frames => frames.map(frame => `${frame} Processing W's...`),
  
  // Calculating animation
  frames => frames.map(frame => `${frame} Calculating W total...`),
  
  // Dancing animation
  frames => frames.map((frame, i) => `${frame} ${Array(i % 5 + 1).fill('W').join(' ')}`),
  
  // W wave animation
  frames => frames.map((frame, i) => `${frame} ${Array(10).fill('').map((_, j) => (j + i) % 3 === 0 ? 'W' : '~').join('')}`),
];

// Get mascot frames based on style
function getMascotFrames(style = 'default') {
  if (style && mascotStyles[style]) {
    return mascotStyles[style];
  }
  // For W counter specific operations, use the w_counter style
  else if (style === 'w_counter' && mascotStyles.w_counter) {
    return mascotStyles.w_counter;
  } 
  // Fallback to default style
  return mascotStyles.default;
}

// Helper function to create a delayed animation in Discord
async function playAnimation(message, animationType, duration = 3000, interval = 500, mascotStyle = 'w_counter') {
  // Select a random animation if not specified
  const animationFunction = typeof animationType === 'number' 
    ? loadingAnimations[animationType] 
    : loadingAnimations[Math.floor(Math.random() * loadingAnimations.length)];
  
  // Get the appropriate mascot frames
  const mascotFrames = getMascotFrames(mascotStyle);
  
  // Create animation frames
  const frames = animationFunction(mascotFrames);
  const sentMessage = await message.channel.send(frames[0]);
  
  let frameIndex = 1;
  const intervalId = setInterval(async () => {
    if (frameIndex < frames.length) {
      await sentMessage.edit(frames[frameIndex]);
      frameIndex++;
    } else {
      frameIndex = 0; // Loop the animation
    }
  }, interval);
  
  // After duration, clear the interval and return the message for further updates
  return new Promise(resolve => {
    setTimeout(() => {
      clearInterval(intervalId);
      resolve(sentMessage);
    }, duration);
  });
}

// Create embed with mascot for channel count
function createWCountEmbed(count, serverId, mascotStyle = 'w_counter') {
  // Get the appropriate mascot frames and choose a random one
  const mascotFrames = getMascotFrames(mascotStyle);
  const randomMascot = mascotFrames[Math.floor(Math.random() * mascotFrames.length)];
  
  // If count is an object (our new structure), handle appropriately
  let channelCount = 0;
  let channelCountsText = '';
  
  if (typeof count === 'object' && !Array.isArray(count)) {
    // Get top channels
    const topChannels = Object.entries(count)
      .map(([channelId, count]) => ({ channelId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
      
    if (topChannels.length > 0) {
      channelCount = topChannels[0].count;
      channelCountsText = topChannels.map((c, i) => 
        `#${i+1}: <#${c.channelId}> - ${c.count} W's`
      ).join('\n');
    }
  } else {
    // If it's a simple number, use that
    channelCount = count;
  }
  
  // Generate a gradient color based on the count (more W's = more vibrant color)
  const colorValue = Math.min(Math.max(channelCount * 25, 0), 16777215); // Capped to valid color range
  
  const embed = new EmbedBuilder()
    .setTitle(`W Counter ${randomMascot}`)
    .setDescription(`**${channelCount}** W's counted in this channel!`)
    .setColor(colorValue)
    .setFooter({ text: `Server ID: ${serverId} • Use /total to see the total count` })
    .setTimestamp();
    
  // Add field for top channels if we have that data
  if (channelCountsText) {
    embed.addFields({ name: 'Top W Channels', value: channelCountsText });
  }
  
  return embed;
}

// Create embed for total W count
function createTotalCountEmbed(channelCount, totalCount, serverId, mascotStyle = 'w_counter') {
  // Get the appropriate mascot frames and choose a random one
  const mascotFrames = getMascotFrames(mascotStyle);
  const randomMascot = mascotFrames[Math.floor(Math.random() * mascotFrames.length)];
  
  // Use a vibrant color for the total count
  return new EmbedBuilder()
    .setTitle(`Total W Count ${randomMascot}`)
    .setDescription(`**${totalCount}** W's have been counted in total across all channels!`)
    .setColor(0xe74c3c) // Red color for total count
    .addFields(
      { name: 'Current Channel Count', value: `${channelCount} W's`, inline: true },
      { name: 'Total Server Count', value: `${totalCount} W's`, inline: true },
    )
    .setFooter({ text: `Server ID: ${serverId} • Use /reset to reset the counter` })
    .setTimestamp();
}

// Special mascot showcase function
function createMascotShowcaseEmbed(serverId, style = 'default') {
  // Get the appropriate mascot frames
  const mascotFrames = getMascotFrames(style);
  
  // Create a styled display of the mascot
  const mascotDisplay = mascotFrames.join('\n');
  
  // Choose color based on style
  let color = 0x3498db; // Default blue
  if (style === 'happy') color = 0xe74c3c; // Red
  if (style === 'cool') color = 0x9b59b6; // Purple
  if (style === 'w_counter') color = 0x2ecc71; // Green
  
  return new EmbedBuilder()
    .setTitle(`W Counter Bot Mascot (${style.charAt(0).toUpperCase() + style.slice(1)} Style)`)
    .setDescription(`Meet Aisha, the W Counter mascot!\n\n${mascotDisplay}`)
    .setColor(color)
    .setFooter({ text: `Server ID: ${serverId} • Try different styles with /mascot` })
    .setTimestamp();
}

// When the client is ready, run this code
client.once(Events.ClientReady, (readyClient) => {
  console.log(`W Counter Bot is ready! Logged in as ${readyClient.user.tag}`);
  console.log(`Bot is configured with intents: ${JSON.stringify(client.options.intents)}`);
  
  // Send a test message to console every 15 seconds to verify the bot is still running
  setInterval(() => {
    console.log(`[W Counter] HEARTBEAT CHECK - Bot still running at ${new Date().toISOString()}`);
  }, 15000);
  
  // Use direct event listener for messages to ensure we're handling them
  client.on('messageCreate', (message) => {
    console.log(`[DIRECT EVENT] Message received: "${message.content}" from ${message.author.tag}`);
    // Don't do anything else here, just log
  });
});

// Listen for messages
client.on(Events.MessageCreate, async (message) => {
  // Debug logging for ALL messages - write to a file for better debugging
  const fs = require('fs');
  const debugLogPath = './debug-messages.log';
  try {
    const debugInfo = `${new Date().toISOString()} - Message: "${message.content}" from ${message.author.tag} in ${message.guild?.name || 'DM'} (Channel type: ${message.channel.type})\n`;
    
    // Append to log file
    fs.appendFileSync(debugLogPath, debugInfo);
    
    // SUPER EXTRA verbose console logging for debugging
    console.log('======= MESSAGE DETECTION DEBUG ========');
    console.log(`[W Counter] MESSAGE CONTENT: "${message.content}"`);
    console.log(`[W Counter] MESSAGE AUTHOR: ${message.author.tag}`);
    console.log(`[W Counter] MESSAGE SERVER: ${message.guild?.name || 'DM'}`);
    console.log(`[W Counter] MESSAGE ID: ${message.id}`);
    console.log(`[W Counter] MESSAGE CHANNEL: ${message.channel.name || 'Unknown'} (${message.channel.id})`);
    console.log(`[W Counter] MESSAGE TYPE: ${message.type}`);
    console.log(`[W Counter] INTENTS: ${JSON.stringify(client.options.intents)}`);
    console.log('======= END MESSAGE DETECTION DEBUG ========');
  } catch (error) {
    console.error('Error in debug logging:', error);
  }
  
  // EMERGENCY TESTING - Send a test message on ANY message detection
  try {
    console.log('ATTEMPTING TO SEND TEST MESSAGE FOR ANY CONTENT');
    const randomMascot = "W⊂(◉‿◉)つW";
    
    // Only respond if not from a bot (to prevent loops)
    if (!message.author.bot) {
      // Reply directly to the message
      message.reply(`${randomMascot} Message detected! Content: "${message.content}"`).catch(err => {
        console.error('Error sending test message:', err);
      });
    } else {
      console.log(`[W Counter] Ignoring bot message from: ${message.author.tag}`);
      return;
    }
  } catch (error) {
    console.error('Error in emergency test message:', error);
  }

  // Get the server ID
  const serverId = message.guild?.id;
  if (!serverId) {
    console.log(`[W Counter] Ignoring DM or non-server message`);
    return; // Skip DMs or messages not in a server
  }

  // Initialize counters for this server if they don't exist
  if (!serverCounters[serverId]) {
    console.log(`[W Counter] Initializing counter for server: ${message.guild.name}`);
    serverCounters[serverId] = {};
  }
  if (!serverTotalCounters[serverId]) {
    console.log(`[W Counter] Initializing total counter for server: ${message.guild.name}`);
    serverTotalCounters[serverId] = 0;
  }
  
  // Initialize channel counter if it doesn't exist
  const channelId = message.channel.id;
  if (!serverCounters[serverId][channelId]) {
    console.log(`[W Counter] Initializing counter for channel: ${message.channel.name}`);
    serverCounters[serverId][channelId] = 0;
  }

  // Check if the message contains 'w' (case insensitive)
  const messageContent = message.content.toLowerCase();
  
  // Log the message content for debugging
  console.log(`[W Counter] Processing message content: "${messageContent}"`);
  
  // Count 'w' in any context - use regex to find all w's in the message
  const wMatches = messageContent.match(/w/gi);
  const wCount = wMatches ? wMatches.length : 0;
  
  console.log(`[W Counter] Found ${wCount} W's in message from ${message.author.tag}`);
  
  if (wCount > 0) {
    // Log where the W's were found for debugging
    console.log(`[W Counter] W matches: ${JSON.stringify(wMatches)}`);
    
    // Increment the server counters
    serverCounters[serverId][channelId] += wCount;
    serverTotalCounters[serverId] += wCount;
    
    // Log the updated counters
    console.log(`[W Counter] Updated channel counter to ${serverCounters[serverId][channelId]}`);
    console.log(`[W Counter] Updated server total counter to ${serverTotalCounters[serverId]}`);
    
    // Send a message with the updated count
    try {
      // Check if it's a text-based channel - log the channel type for debugging
      console.log(`[W Counter] Channel type: ${message.channel.type}`);
      
      // Always assume channel is valid for sending messages
      // This simplifies our logic to avoid complex channel type checks
      const isTextChannel = true;
      
      if (isTextChannel) {
        // Get the counts
        const totalCount = serverTotalCounters[serverId];
        const channelCount = serverCounters[serverId][channelId];
        
        // For single W's, show a complete total embed directly
        if (wCount === 1) {
          // Get a random mascot for the message
          const mascotFrames = getMascotFrames('w_counter');
          const randomMascot = mascotFrames[Math.floor(Math.random() * mascotFrames.length)];
          
          // Always display the total count embed for better visibility
          await message.channel.send({
            content: `${randomMascot} W detected!`,
            embeds: [createTotalCountEmbed(channelCount, totalCount, serverId, 'w_counter')]
          });
        } 
        // For multiple W's, play a fun animation
        else if (wCount > 1) {
          // Show an animation for larger W counts with the W-specific mascot
          const loadingMessage = await playAnimation(message, 4, 2000, 400, 'w_counter');
          
          // Always show a total count embed, with special formatting for milestones
          if (totalCount % 25 === 0) {
            // Replace with the special milestone total count embed
            await loadingMessage.edit({
              content: `**MILESTONE REACHED: ${totalCount} W's!** 🎉`,
              embeds: [createTotalCountEmbed(channelCount, totalCount, serverId, 'w_counter')]
            });
          } else {
            // Always use the total count embed instead of just channel count
            await loadingMessage.edit({ 
              content: `Multiple W's detected (${wCount})!`,
              embeds: [createTotalCountEmbed(channelCount, totalCount, serverId, 'w_counter')]
            });
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }
});

// Handle errors
client.on(Events.Error, (error) => {
  console.error('Discord client error:', error);
});

// Add commands support
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;

  // Reset command to zero out the W counter
  if (commandName === 'reset') {
    const serverId = interaction.guild?.id;
    if (serverId) {
      // Acknowledge the interaction immediately
      await interaction.deferReply();
      
      // Get mascot frames and choose a random one
      const mascotFrames = getMascotFrames('w_counter');
      const randomMascot = mascotFrames[Math.floor(Math.random() * mascotFrames.length)];
      
      // Animate the reset process
      const resetMessages = [
        `${randomMascot} Resetting W counter...`,
        `${randomMascot} Deleting W's...`,
        `${randomMascot} Cleaning up...`,
        `${randomMascot} Counter reset complete!`
      ];
      
      // Send initial message
      await interaction.editReply(resetMessages[0]);
      
      // Show animation
      for (let i = 1; i < resetMessages.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 700));
        await interaction.editReply(resetMessages[i]);
      }
      
      // Reset both counters
      serverCounters[serverId] = {};
      serverTotalCounters[serverId] = 0;
      
      // Final message with embed
      await new Promise(resolve => setTimeout(resolve, 500));
      const embed = new EmbedBuilder()
        .setTitle(`W Counter Reset ${randomMascot}`)
        .setDescription(`Both channel and total W counters have been reset to 0!`)
        .setColor(0x3498db)
        .addFields(
          { name: 'Channel Counter', value: '0 W\'s', inline: true },
          { name: 'Total Counter', value: '0 W\'s', inline: true }
        )
        .setFooter({ text: `Server ID: ${serverId}` })
        .setTimestamp();
      
      await interaction.editReply({ content: '', embeds: [embed] });
    }
  }
  
  // Total command to show the total W count across all channels
  if (commandName === 'total') {
    const serverId = interaction.guild?.id;
    if (serverId) {
      // Initialize total counter if it doesn't exist
      if (!serverTotalCounters[serverId]) {
        serverTotalCounters[serverId] = 0;
      }
      
      const totalCount = serverTotalCounters[serverId];
      
      // Acknowledge the interaction immediately
      await interaction.deferReply();
      
      // Get mascot frames and choose a random one
      const mascotFrames = getMascotFrames('w_counter');
      const randomMascot = mascotFrames[Math.floor(Math.random() * mascotFrames.length)];
      
      // Create animated counting sequence
      const totalMessages = [
        `${randomMascot} Counting all W's across all channels...`,
        `${randomMascot} Gathering statistics...`,
        `${randomMascot} Compiling totals...`,
        `${randomMascot} Almost there...`
      ];
      
      // Send initial message
      await interaction.editReply(totalMessages[0]);
      
      // Show animation
      for (let i = 1; i < totalMessages.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 600));
        await interaction.editReply(totalMessages[i]);
      }
      
      // Final message with embed
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Initialize server counters if they don't exist
      if (!serverCounters[serverId]) {
        serverCounters[serverId] = {};
      }
      
      // Get the channel ID from the interaction
      const channelId = interaction.channelId;
      
      // Initialize channel counter if it doesn't exist
      if (!serverCounters[serverId][channelId]) {
        serverCounters[serverId][channelId] = 0;
      }
      
      // Get the channel count
      const channelCount = serverCounters[serverId][channelId];
      
      // Use our helper function to create the total embed
      await interaction.editReply({ 
        content: '', 
        embeds: [createTotalCountEmbed(channelCount, totalCount, serverId, 'w_counter')]
      });
    }
  }

  // Count command to show the current W count
  if (commandName === 'count') {
    const serverId = interaction.guild?.id;
    if (serverId) {
      // Initialize server counters if they don't exist
      if (!serverCounters[serverId]) {
        serverCounters[serverId] = {};
      }
      
      // Get the channel ID from the interaction
      const channelId = interaction.channelId;
      
      // Initialize channel counter if it doesn't exist
      if (!serverCounters[serverId][channelId]) {
        serverCounters[serverId][channelId] = 0;
      }
      
      // Get the channel count and total count
      const channelCount = serverCounters[serverId][channelId];
      const totalCount = serverTotalCounters[serverId] || 0;
      
      // Acknowledge the interaction immediately
      await interaction.deferReply();
      
      // Get mascot frames and choose a random one
      const mascotFrames = getMascotFrames('w_counter');
      const randomMascot = mascotFrames[Math.floor(Math.random() * mascotFrames.length)];
      
      // Create animated counting sequence
      const countMessages = [
        `${randomMascot} Counting W's...`,
        `${randomMascot} Almost there...`,
        `${randomMascot} Finalizing count...`
      ];
      
      // Send initial message
      await interaction.editReply(countMessages[0]);
      
      // Show animation
      for (let i = 1; i < countMessages.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 600));
        await interaction.editReply(countMessages[i]);
      }
      
      // Final message with embed - always show total count embed
      await new Promise(resolve => setTimeout(resolve, 500));
      await interaction.editReply({ 
        content: '', 
        embeds: [createTotalCountEmbed(channelCount, totalCount, serverId, 'w_counter')]
      });
    }
  }

  // Topservers command to show servers with most W's
  if (commandName === 'topservers') {
    // Acknowledge the interaction immediately
    await interaction.deferReply();
    
    // Get mascot frames and choose a random one
    const mascotFrames = getMascotFrames('w_counter');
    const randomMascot = mascotFrames[Math.floor(Math.random() * mascotFrames.length)];
    
    // Create animated loading sequence
    const loadingMessages = [
      `${randomMascot} Collecting server data...`,
      `${randomMascot} Ranking servers by W's...`,
      `${randomMascot} Preparing leaderboard...`,
      `${randomMascot} Almost ready...`
    ];
    
    // Send initial message
    await interaction.editReply(loadingMessages[0]);
    
    // Show animation
    for (let i = 1; i < loadingMessages.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 600));
      await interaction.editReply(loadingMessages[i]);
    }
    
    try {
      // Create array of servers and sort by total W count
      const topServers = Object.entries(serverTotalCounters)
        .map(([serverId, count]) => ({ serverId, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10); // Get top 10
      
      // Get server names where possible
      const serverList = await Promise.all(
        topServers.map(async (server, index) => {
          let serverName = "Unknown Server";
          try {
            const guild = await client.guilds.fetch(server.serverId);
            serverName = guild.name;
          } catch (error) {
            // If we can't fetch the server, just use the ID
            serverName = `Server ${server.serverId.substring(0, 6)}...`;
          }
          
          return `${index + 1}. **${serverName}**: ${server.count} W's`;
        })
      );
      
      // Create embed for top servers
      const embed = new EmbedBuilder()
        .setTitle(`🏆 Top Servers W Leaderboard ${randomMascot}`)
        .setDescription(serverList.length > 0 
          ? serverList.join('\n') 
          : "No servers have counted W's yet!")
        .setColor(0xf1c40f) // Gold color for leaderboard
        .setFooter({ text: `W Counter stats • Updated ${new Date().toLocaleDateString()}` })
        .setTimestamp();
      
      // Send the leaderboard
      await interaction.editReply({ 
        content: '', 
        embeds: [embed] 
      });
    } catch (error) {
      console.error('Error showing server leaderboard:', error);
      await interaction.editReply(`${randomMascot} Error creating leaderboard: ${error.message}`);
    }
  }
  
  // Mascot command to showcase the bot mascot
  if (commandName === 'mascot') {
    const serverId = interaction.guild?.id;
    if (serverId) {
      // Get the requested style from options
      let style = 'default';
      if (interaction.options.getString('style')) {
        style = interaction.options.getString('style');
      }
      
      // Acknowledge the interaction immediately
      await interaction.deferReply();
      
      // Get mascot frames based on style
      const mascotFrames = getMascotFrames(style);
      const randomMascot = mascotFrames[Math.floor(Math.random() * mascotFrames.length)];
      
      // Create animated introduction
      const introMessages = [
        `${randomMascot} Waking up the mascot...`,
        `${randomMascot} Preparing for showcase...`,
        `${randomMascot} Almost ready...`
      ];
      
      // Send initial message
      await interaction.editReply(introMessages[0]);
      
      // Show animation
      for (let i = 1; i < introMessages.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 600));
        await interaction.editReply(introMessages[i]);
      }
      
      // Final message with mascot showcase embed
      await new Promise(resolve => setTimeout(resolve, 500));
      await interaction.editReply({
        content: '',
        embeds: [createMascotShowcaseEmbed(serverId, style)]
      });
    }
  }
});

// Login to Discord with the W Counter bot token
// Use W_COUNTER_TOKEN if available, otherwise fall back to DISCORD_TOKEN
const token = process.env.W_COUNTER_TOKEN || process.env.DISCORD_TOKEN;
client.login(token)
  .catch(error => {
    console.error('Error logging in W Counter bot:', error);
  });