import { 
  Client, 
  GatewayIntentBits, 
  Events, 
  Message, 
  ColorResolvable,
  REST,
  Routes,
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  Collection,
  ApplicationCommandOptionType,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder
} from 'discord.js';
import { storage } from '../storage';
import { chatWithGPT, checkOpenAIStatus, ImageSize, ImageQuality } from './openai';
import { checkGroqStatus } from './groq';
import { 
  askCommand, 
  chatCommand, 
  continueConversation,
  generateImageCommand
} from './aiProvider';
import { getConversationContext, clearConversationContext } from './chatContext';
import { checkRateLimit } from './rateLimit';
import { searchUsers, getUserInfo, checkVRChatStatus, VRChatUser } from './vrchat';
import { initializeStrainAnnouncements, scheduleAnnouncement, createAndPostManualAnnouncement } from './scheduler';
import { importCuratedStrains, importStrainsFromApi, importStrainsFromOtreeba } from './strainApi';
import { getStrainRecommendation } from './strainRecommender';
import { handleStrainRecommendCommand } from './strainRecommendHandler';
import { createLoadingAnimation } from './loadingAnimations';

// Initialize Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

/**
 * Get the Discord client and server instance
 * @returns Object containing Discord client
 */
export function getServerAndClient() {
  return { client };
}

// Command prefix (keeping for backward compatibility)
const PREFIX = '!';

// Command definitions
const COMMANDS = {
  ASK: 'ask',
  CHAT: 'chat',
  HELP: 'help',
  CONTINUE: 'continue',
  CLEAR: 'clear',
  CONFIG: 'config',
  STATS: 'stats',
  RESTART: 'restart',
  RAINBOW: 'rainbow',
  VRCHAT: 'vrchat',
  LINK_VRCHAT: 'link-vrchat',
  VERIFY_VRCHAT: 'verify-vrchat',
  VRCHAT_ROLE: 'vrchat-role',
  STRAIN: 'strain',
  STRAIN_ADD: 'strain-add',
  STRAIN_ANNOUNCE: 'strain-announce',
  STRAIN_IMPORT: 'strain-import',
  STRAIN_RECOMMEND: 'strain-recommend',
  STRAIN_NOW: 'strain-now',
  TIME_STATS: 'time-stats',
  SERVER_TIME_STATS: 'server-time-stats',
  IMAGE: 'image',
};

// Define slash commands
const slashCommands = [
  new SlashCommandBuilder()
    .setName('ask')
    .setDescription('Ask a direct question to get a focused answer')
    .addStringOption(option => 
      option.setName('question')
        .setDescription('The question you want to ask')
        .setRequired(true)),
        
  new SlashCommandBuilder()
    .setName('chat')
    .setDescription('Have a conversation with the AI')
    .addStringOption(option => 
      option.setName('message')
        .setDescription('Your message to the AI')
        .setRequired(true)),
        
  new SlashCommandBuilder()
    .setName('continue')
    .setDescription("Continue the bot's last response if it was cut off"),
    
  new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Clear your conversation history with the bot'),
    
  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show list of available commands including VRChat integration commands'),
    
  new SlashCommandBuilder()
    .setName('config')
    .setDescription('Change bot settings (Admin only)')
    .addStringOption(option => 
      option.setName('setting')
        .setDescription('The setting to change')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('value')
        .setDescription('The new value for the setting')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
        
  new SlashCommandBuilder()
    .setName('stats')
    .setDescription('View bot statistics (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
  new SlashCommandBuilder()
    .setName('restart')
    .setDescription('Restart the bot (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
  new SlashCommandBuilder()
    .setName('rainbow')
    .setDescription('Create a rainbow effect on a role (Admin only)')
    .addStringOption(option => 
      option.setName('role')
        .setDescription('The name of the role to apply the rainbow effect to')
        .setRequired(true))
    .addIntegerOption(option => 
      option.setName('interval')
        .setDescription('Interval in milliseconds between color changes (default: 1000, min: 500)')
        .setMinValue(500)
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
        
  new SlashCommandBuilder()
    .setName('vrchat')
    .setDescription('Search for a VRChat user')
    .addStringOption(option => 
      option.setName('username')
        .setDescription('The VRChat username or display name to look up')
        .setRequired(true))
    .addBooleanOption(option =>
      option.setName('private')
        .setDescription('Whether to show the result only to you (default: false)')
        .setRequired(false)),
        
  new SlashCommandBuilder()
    .setName('link-vrchat')
    .setDescription('Link your Discord account to a VRChat account')
    .addStringOption(option => 
      option.setName('username')
        .setDescription('Your VRChat username')
        .setRequired(true))
    .addBooleanOption(option =>
      option.setName('private')
        .setDescription('Whether to show the result only to you (default: true)')
        .setRequired(false)),
        
  new SlashCommandBuilder()
    .setName('verify-vrchat')
    .setDescription('Verify your VRChat account with your verification code')
    .addStringOption(option => 
      option.setName('code')
        .setDescription('The verification code from the link-vrchat command')
        .setRequired(true))
    .addBooleanOption(option =>
      option.setName('private')
        .setDescription('Whether to show the result only to you (default: true)')
        .setRequired(false)),
        
  new SlashCommandBuilder()
    .setName('vrchat-role')
    .setDescription('Assign a role to verified VRChat users (Admin only)')
    .addRoleOption(option => 
      option.setName('role')
        .setDescription('The role to assign to verified VRChat users')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
  // kUShCOOKIES Strain of the Day commands
  new SlashCommandBuilder()
    .setName('strain')
    .setDescription('Display information about a marijuana strain')
    .addStringOption(option =>
      option.setName('name')
        .setDescription('Name of the strain to display (leave empty for a random strain)')
        .setRequired(false)),
        
  new SlashCommandBuilder()
    .setName('strain-add')
    .setDescription('Add a new marijuana strain to the database (Admin only)')
    .addStringOption(option =>
      option.setName('name')
        .setDescription('Name of the strain')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('type')
        .setDescription('Type of the strain')
        .setRequired(true)
        .addChoices(
          { name: 'Indica', value: 'indica' },
          { name: 'Sativa', value: 'sativa' },
          { name: 'Hybrid', value: 'hybrid' }
        ))
    .addStringOption(option =>
      option.setName('description')
        .setDescription('Description of the strain')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('thc')
        .setDescription('THC content (e.g., "18-24%")')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('cbd')
        .setDescription('CBD content (e.g., "0.1-1%")')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('flavor')
        .setDescription('Flavor profile of the strain')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('effects')
        .setDescription('Effects of the strain (e.g., "Relaxed, Happy, Euphoric")')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('image')
        .setDescription('URL of an image of the strain')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
  new SlashCommandBuilder()
    .setName('strain-announce')
    .setDescription('Set up daily strain announcements (Admin only)')
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('Channel where announcements will be posted')
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildText))
    .addStringOption(option =>
      option.setName('time')
        .setDescription('Time for daily announcements in 24-hour format (e.g., "16:20")')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('timezone')
        .setDescription('Timezone for announcements (default: UTC)')
        .setRequired(false)
        .addChoices(
          { name: 'UTC', value: 'UTC' },
          { name: 'US Eastern', value: 'America/New_York' },
          { name: 'US Central', value: 'America/Chicago' },
          { name: 'US Mountain', value: 'America/Denver' },
          { name: 'US Pacific', value: 'America/Los_Angeles' },
          { name: 'UK', value: 'Europe/London' },
          { name: 'Central Europe', value: 'Europe/Berlin' },
          { name: 'Japan', value: 'Asia/Tokyo' },
          { name: 'Australia Eastern', value: 'Australia/Sydney' }
        ))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
  new SlashCommandBuilder()
    .setName('strain-import')
    .setDescription('Import marijuana strains from various sources (Admin only)')
    .addStringOption(option =>
      option.setName('source')
        .setDescription('Source to import strains from')
        .setRequired(true)
        .addChoices(
          { name: 'Curated List', value: 'curated' },
          { name: 'Public API', value: 'api' }
        ))
    .addStringOption(option =>
      option.setName('api_key')
        .setDescription('API key for external sources (if needed)')
        .setRequired(false))
    .addIntegerOption(option =>
      option.setName('limit')
        .setDescription('Maximum number of strains to import (default: 15)')
        .setMinValue(1)
        .setMaxValue(50)
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
  // AI-powered strain recommendation command
  new SlashCommandBuilder()
    .setName('strain-recommend')
    .setDescription('Get an AI-powered strain recommendation based on your preferences')
    .addStringOption(option =>
      option.setName('preferences')
        .setDescription('Describe your preferences, symptoms, or desired effects')
        .setRequired(true)),
        
  // Manual strain announcement command
  new SlashCommandBuilder()
    .setName('strain-now')
    .setDescription('Manually trigger the strain of the day announcement')
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('Channel to post the announcement (defaults to configured channel)')
        .setRequired(false)
        .addChannelTypes(ChannelType.GuildText))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
  // VRChat time tracking commands
  new SlashCommandBuilder()
    .setName('time-stats')
    .setDescription('View your VRChat time tracking statistics')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('Discord user to check stats for (defaults to yourself)')
        .setRequired(false)),
        
  // Image generation command
  new SlashCommandBuilder()
    .setName('image')
    .setDescription('Generate an AI image based on your text prompt')
    .addStringOption(option =>
      option.setName('prompt')
        .setDescription('Detailed description of the image you want to generate')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('size')
        .setDescription('Size/aspect ratio of the generated image')
        .setRequired(false)
        .addChoices(
          { name: 'Square (1024x1024)', value: '1024x1024' },
          { name: 'Portrait (1024x1792)', value: '1024x1792' },
          { name: 'Landscape (1792x1024)', value: '1792x1024' }
        ))
    .addStringOption(option =>
      option.setName('quality')
        .setDescription('Quality level of the generated image')
        .setRequired(false)
        .addChoices(
          { name: 'Standard', value: 'standard' },
          { name: 'HD (High Definition)', value: 'hd' }
        )),
  new SlashCommandBuilder()
    .setName('server-time-stats')
    .setDescription('View server-wide VRChat time tracking statistics (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
];

// Create a REST instance for deploying commands
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN || '');

// Store commands for execution
const commandMap = new Collection<string, (interaction: ChatInputCommandInteraction) => Promise<void>>();

// Store the last response for each user for the continue command
const lastResponses = new Map<string, string>();

// Store active rainbow role effects
const activeRainbowRoles = new Map<string, NodeJS.Timeout>();

/**
 * Helper function to convert hex color strings to Discord.js ColorResolvable
 * @param hexColor - Hex color string (e.g., "#FF0000")
 * @returns ColorResolvable value (safe for Discord.js)
 */
function hexToColorResolvable(hexColor: string): ColorResolvable {
  // Remove # if present
  const hex = hexColor.startsWith('#') ? hexColor.substring(1) : hexColor;
  
  // Convert to number (Discord.js also accepts integer color values)
  const colorInt = parseInt(hex, 16);
  
  return colorInt as ColorResolvable;
}

/**
 * Helper function to generate a color gradient between two colors
 * @param startColor - Starting color in hex format
 * @param endColor - Ending color in hex format
 * @param steps - Number of steps to generate
 * @returns Array of ColorResolvable values ready for Discord.js
 */
function generateGradient(startColor: string, endColor: string, steps: number): ColorResolvable[] {
  // Convert hex colors to RGB
  const startRGB = {
    r: parseInt(startColor.substring(1, 3), 16),
    g: parseInt(startColor.substring(3, 5), 16),
    b: parseInt(startColor.substring(5, 7), 16)
  };
  
  const endRGB = {
    r: parseInt(endColor.substring(1, 3), 16),
    g: parseInt(endColor.substring(3, 5), 16),
    b: parseInt(endColor.substring(5, 7), 16)
  };
  
  // Calculate the step size for each color component
  const stepSize = {
    r: (endRGB.r - startRGB.r) / (steps - 1),
    g: (endRGB.g - startRGB.g) / (steps - 1),
    b: (endRGB.b - startRGB.b) / (steps - 1)
  };
  
  // Generate the gradient
  const gradient: ColorResolvable[] = [];
  for (let i = 0; i < steps; i++) {
    const r = Math.round(startRGB.r + (stepSize.r * i));
    const g = Math.round(startRGB.g + (stepSize.g * i));
    const b = Math.round(startRGB.b + (stepSize.b * i));
    
    // Convert to hex string
    const hexColor = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    
    // Convert to ColorResolvable and add to gradient
    gradient.push(hexToColorResolvable(hexColor));
  }
  
  return gradient;
}

// Define the main color points in the rainbow
const colorPoints = [
  '#FF0000', // Red
  '#FF8000', // Orange
  '#FFFF00', // Yellow
  '#00FF00', // Green
  '#00FFFF', // Cyan
  '#0000FF', // Blue
  '#8000FF', // Purple
  '#FF00FF', // Magenta
  '#FF0000'  // Back to Red to complete the circle
];

// Generate a super smooth rainbow with many more steps
const rainbowColors: ColorResolvable[] = [];

// Number of steps between each main color point
const stepsPerSegment = 40; // Increased for ultra-smooth transitions

// Generate gradients between each pair of main colors
for (let i = 0; i < colorPoints.length - 1; i++) {
  const segment = generateGradient(colorPoints[i], colorPoints[i + 1], stepsPerSegment);
  
  // Add all colors except the last one (to avoid duplicates)
  if (i < colorPoints.length - 2) {
    rainbowColors.push(...segment.slice(0, -1));
  } else {
    // For the last segment, include all colors
    rainbowColors.push(...segment);
  }
}

// Log the total number of colors for smooth transition
console.log(`Rainbow effect configured with ${rainbowColors.length} colors for ultra-smooth transitions`);

// Register command handlers
function registerSlashCommandHandlers() {
  // Define all the command handlers
  commandMap.set('ask', async (interaction) => {
    const question = interaction.options.getString('question', true);
    
    // Check rate limit
    const rateLimitResult = await checkRateLimit(
      interaction.user.id, 
      interaction.guildId || '0'
    );
    
    if (!rateLimitResult.allowed) {
      await interaction.reply({
        content: `Rate limit exceeded. Please try again in ${rateLimitResult.resetInMinutes} minutes.`,
        ephemeral: true
      });
      
      // Store the rate limit error
      await storage.createConversation({
        server_id: interaction.guildId || '0',
        channel_id: interaction.channelId,
        user_id: interaction.user.id,
        username: interaction.user.username,
        message: `/ask ${question}`,
        response: `Rate limit exceeded. Please try again in ${rateLimitResult.resetInMinutes} minutes.`,
        command: COMMANDS.ASK,
        is_error: true,
        error_message: `Rate limit exceeded (${rateLimitResult.current}/${rateLimitResult.limit})`,
      });
      
      return;
    }
    
    // Get conversation context
    const context = await getConversationContext(
      interaction.guildId || '0',
      interaction.channelId,
      interaction.user.id
    );
    
    // Defer reply since the response might take time
    await interaction.deferReply();
    
    // Create loading animation
    // Loading animation imported at the top of the file
    const stopLoading = createLoadingAnimation(interaction, COMMANDS.ASK);
    
    try {
      // Get response from OpenAI
      const response = await askCommand(question, context);
      
      // Stop loading animation
      stopLoading();
      
      // Send response
      await interaction.editReply(response);
      
      // Save the response for /continue command
      const userKey = `${interaction.user.id}:${interaction.channelId}`;
      lastResponses.set(userKey, response);
      
      // Store the conversation
      await storage.createConversation({
        server_id: interaction.guildId || '0',
        channel_id: interaction.channelId,
        user_id: interaction.user.id,
        username: interaction.user.username,
        message: `/ask ${question}`,
        response,
        command: COMMANDS.ASK,
        is_error: false,
      });
    } catch (error) {
      console.error('Error in ask command:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      await interaction.editReply(`Error: Failed to get a response. ${errorMessage}`);
    }
  });
  
  commandMap.set('chat', async (interaction) => {
    const chatMessage = interaction.options.getString('message', true);
    
    // Check rate limit
    const rateLimitResult = await checkRateLimit(
      interaction.user.id, 
      interaction.guildId || '0'
    );
    
    if (!rateLimitResult.allowed) {
      await interaction.reply({
        content: `Rate limit exceeded. Please try again in ${rateLimitResult.resetInMinutes} minutes.`,
        ephemeral: true
      });
      
      // Store the rate limit error
      await storage.createConversation({
        server_id: interaction.guildId || '0',
        channel_id: interaction.channelId,
        user_id: interaction.user.id,
        username: interaction.user.username,
        message: `/chat ${chatMessage}`,
        response: `Rate limit exceeded. Please try again in ${rateLimitResult.resetInMinutes} minutes.`,
        command: COMMANDS.CHAT,
        is_error: true,
        error_message: `Rate limit exceeded (${rateLimitResult.current}/${rateLimitResult.limit})`,
      });
      
      return;
    }
    
    // Get conversation context
    const context = await getConversationContext(
      interaction.guildId || '0',
      interaction.channelId,
      interaction.user.id
    );
    
    // Defer reply since the response might take time
    await interaction.deferReply();
    
    // Create loading animation
    // Loading animation imported at the top of the file
    const stopLoading = createLoadingAnimation(interaction, COMMANDS.CHAT);
    
    try {
      // Get response from OpenAI
      const response = await chatCommand(chatMessage, context);
      
      // Stop loading animation
      stopLoading();
      
      // Send response
      await interaction.editReply(response);
      
      // Save the response for /continue command
      const userKey = `${interaction.user.id}:${interaction.channelId}`;
      lastResponses.set(userKey, response);
      
      // Store the conversation
      await storage.createConversation({
        server_id: interaction.guildId || '0',
        channel_id: interaction.channelId,
        user_id: interaction.user.id,
        username: interaction.user.username,
        message: `/chat ${chatMessage}`,
        response,
        command: COMMANDS.CHAT,
        is_error: false,
      });
    } catch (error) {
      console.error('Error in chat command:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      await interaction.editReply(`Error: Failed to get a response. ${errorMessage}`);
    }
  });
  
  commandMap.set('continue', async (interaction) => {
    const userKey = `${interaction.user.id}:${interaction.channelId}`;
    const lastResponse = lastResponses.get(userKey);
    
    if (!lastResponse) {
      await interaction.reply({
        content: 'There is no previous response to continue.',
        ephemeral: true
      });
      return;
    }
    
    // Check rate limit
    const rateLimitResult = await checkRateLimit(
      interaction.user.id, 
      interaction.guildId || '0'
    );
    
    if (!rateLimitResult.allowed) {
      await interaction.reply({
        content: `Rate limit exceeded. Please try again in ${rateLimitResult.resetInMinutes} minutes.`,
        ephemeral: true
      });
      return;
    }
    
    // Defer reply since the response might take time
    await interaction.deferReply();
    
    // Create loading animation
    // Loading animation imported at the top of the file
    const stopLoading = createLoadingAnimation(interaction, COMMANDS.CONTINUE);
    
    try {
      // Use the continueConversation function from aiProvider which handles fallbacks
      const response = await continueConversation(lastResponse);
      
      // Stop loading animation
      stopLoading();
      
      // Send response
      await interaction.editReply(response);
      
      // Update the last response
      lastResponses.set(userKey, response);
      
      // Store the conversation
      await storage.createConversation({
        server_id: interaction.guildId || '0',
        channel_id: interaction.channelId,
        user_id: interaction.user.id,
        username: interaction.user.username,
        message: '/continue',
        response,
        command: COMMANDS.CONTINUE,
        is_error: false,
      });
    } catch (error) {
      console.error('Error in continue command:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      await interaction.editReply(`Error: Failed to continue the response. ${errorMessage}`);
    }
  });
  
  commandMap.set('clear', async (interaction) => {
    const userKey = `${interaction.user.id}:${interaction.channelId}`;
    
    // Remove any saved response
    lastResponses.delete(userKey);
    
    // Clear conversation context
    await clearConversationContext(
      interaction.guildId || '0',
      interaction.channelId,
      interaction.user.id
    );
    
    await interaction.reply({
      content: 'Your conversation history has been cleared.',
      ephemeral: true
    });
  });
  
  commandMap.set('help', async (interaction) => {
    const helpText = `
**Available Slash Commands:**

• </ask:${slashCommands[0].name}> - Ask a direct question to get a focused answer
• </chat:${slashCommands[1].name}> - Have a conversation with the bot
• </continue:${slashCommands[2].name}> - Continue the bot's last response if it was cut off
• </clear:${slashCommands[3].name}> - Clear your conversation history with the bot
• </help:${slashCommands[4].name}> - Show this help message

**VRChat Integration Commands:**
• </vrchat:${slashCommands[9].name}> - Look up information about a VRChat user
• </link-vrchat:${slashCommands[10].name}> - Link your Discord account to your VRChat account
• </verify-vrchat:${slashCommands[11].name}> - Verify your VRChat account with a code
• </time-stats:${slashCommands[19].name}> - View your VRChat time tracking statistics

**Strain of the Day Commands:**
• </strain:${slashCommands[13].name}> - Display information about a marijuana strain
• </strain-recommend:${slashCommands[17].name}> - Get an AI-powered strain recommendation

**Admin Commands:**
• </config:${slashCommands[5].name}> - Change bot settings (Admin only)
• </stats:${slashCommands[6].name}> - View bot statistics (Admin only)
• </restart:${slashCommands[7].name}> - Restart the bot (Admin only)
• </rainbow:${slashCommands[8].name}> - Create a rainbow effect on a role (Admin only)
• </vrchat-role:${slashCommands[12].name}> - Set a role for verified VRChat users (Admin only)
• </server-time-stats:${slashCommands[20].name}> - View server-wide VRChat time tracking stats (Admin only)
• </strain-now:${slashCommands[18].name}> - Manually trigger strain of the day announcement (Admin only)
    `;
    
    await interaction.reply({
      content: helpText,
      ephemeral: false
    });
  });
  
  commandMap.set('config', async (interaction) => {
    const setting = interaction.options.getString('setting', true);
    const value = interaction.options.getString('value', true);
    
    try {
      // Get current settings
      const botSettings = await storage.getBotSettings(interaction.guildId || '0');
      const currentSettings = botSettings?.settings || {};
      
      // Update the specific setting
      const updatedSettings = {
        ...currentSettings,
        [setting]: value
      };
      
      // Save the updated settings
      await storage.updateBotSettings(interaction.guildId || '0', updatedSettings);
      
      await interaction.reply({
        content: `Setting \`${setting}\` has been updated to \`${value}\`.`,
        ephemeral: true
      });
    } catch (error) {
      console.error('Error updating config:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      await interaction.reply({
        content: `Failed to update config: ${errorMessage}`,
        ephemeral: true
      });
    }
  });
  
  commandMap.set('stats', async (interaction) => {
    try {
      // Get statistics
      const conversations = await storage.getConversations(interaction.guildId || '0');
      const totalMessages = conversations.length;
      const errorCount = conversations.filter(c => c.is_error).length;
      const successRate = totalMessages > 0 ? ((totalMessages - errorCount) / totalMessages * 100).toFixed(2) : '100';
      
      const stats = `
**Bot Statistics:**

• Total Messages Processed: ${totalMessages}
• Success Rate: ${successRate}%
• Error Count: ${errorCount}
• Uptime: ${Math.floor(client.uptime ? client.uptime / 3600000 : 0)} hours
      `;
      
      await interaction.reply({
        content: stats,
        ephemeral: false
      });
    } catch (error) {
      console.error('Error getting stats:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      await interaction.reply({
        content: `Failed to get stats: ${errorMessage}`,
        ephemeral: true
      });
    }
  });
  
  commandMap.set('restart', async (interaction) => {
    await interaction.reply({
      content: 'Restarting the bot...',
      ephemeral: false
    });
    
    // Log out and reconnect
    try {
      await client.destroy();
      await client.login(process.env.DISCORD_TOKEN);
      
      await interaction.followUp({
        content: 'Bot has been restarted successfully.',
        ephemeral: false
      });
    } catch (error) {
      console.error('Error restarting bot:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      await interaction.followUp({
        content: `Failed to restart the bot: ${errorMessage}`,
        ephemeral: true
      });
    }
  });
  
  commandMap.set('rainbow', async (interaction) => {
    console.log('Rainbow command triggered!', interaction);
    
    try {
      // Get parameters
      const roleName = interaction.options.getString('role', true);
      console.log(`Looking for role: ${roleName}`);
      const interval = interaction.options.getInteger('interval') || 1000;
      
      // Validate interval (minimum 500ms to prevent rate limiting)
      if (interval < 500) {
        await interaction.reply({
          content: 'The interval must be at least 500 milliseconds.',
          ephemeral: true
        });
        return;
      }
      
      // Find the role in the guild
      console.log('Guild:', interaction.guild?.name);
      console.log('Available roles:', interaction.guild?.roles.cache.map(r => r.name).join(', '));
      
      const role = interaction.guild?.roles.cache.find(r => 
        r.name.toLowerCase() === roleName.toLowerCase()
      );
      
      if (!role) {
        await interaction.reply({
          content: `Could not find a role named "${roleName}". Please check the role name and try again.`,
          ephemeral: true
        });
        return;
      }
      
      console.log(`Found role: ${role.name} (${role.id})`);
      const guildRoleKey = `${interaction.guildId}:${role.id}`;
      
      // Check if this role already has a rainbow effect running
      if (activeRainbowRoles.has(guildRoleKey)) {
        // Stop the existing timer
        clearInterval(activeRainbowRoles.get(guildRoleKey));
        activeRainbowRoles.delete(guildRoleKey);
        await interaction.reply({
          content: `Rainbow effect for the role "${role.name}" has been stopped.`,
          ephemeral: false
        });
        return;
      }
      
      // Start the rainbow effect
      let colorIndex = 0;
      
      // Acknowledge the command first
      await interaction.reply({
        content: `🌈 Starting rainbow effect for the role "${role.name}". The color will change every ${interval / 1000} seconds. To stop the effect, use this command again.`,
        ephemeral: false
      });
      
      // Create an interval to change the role color
      const intervalId = setInterval(async () => {
        try {
          if (!role.editable) {
            console.log(`Role ${role.name} is not editable, stopping rainbow effect`);
            clearInterval(intervalId);
            activeRainbowRoles.delete(guildRoleKey);
            return;
          }
          
          // Update the role color
          // console.log(`Changing color to ${rainbowColors[colorIndex]}`);
          await role.setColor(rainbowColors[colorIndex]);
          
          // Move to the next color (loop back to start when we reach the end)
          colorIndex = (colorIndex + 1) % rainbowColors.length;
        } catch (error) {
          console.error('Error updating rainbow role color:', error);
          // If there's an error, stop the interval
          clearInterval(intervalId);
          activeRainbowRoles.delete(guildRoleKey);
        }
      }, interval);
      
      // Store the interval ID so we can stop it later if needed
      activeRainbowRoles.set(guildRoleKey, intervalId);
      console.log(`Rainbow effect started for role ${role.name}, interval: ${interval}ms`);
      
    } catch (error) {
      console.error('Error in rainbow command:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      try {
        if (interaction.deferred) {
          await interaction.editReply({
            content: `Failed to start rainbow effect: ${errorMessage}`
          });
        } else if (interaction.replied) {
          await interaction.followUp({
            content: `Failed to start rainbow effect: ${errorMessage}`,
            ephemeral: true
          });
        } else {
          await interaction.reply({
            content: `Failed to start rainbow effect: ${errorMessage}`,
            ephemeral: true
          });
        }
      } catch (replyError) {
        console.error('Error sending error message:', replyError);
      }
    }
  });

  // Add strain command handlers
  commandMap.set('strain', async (interaction) => {
    const strainName = interaction.options.getString('name');
    
    // Defer reply 
    await interaction.deferReply();
    
    // Create loading animation
    // Loading animation imported at the top of the file
    const stopLoading = createLoadingAnimation(interaction, 'strain');
    
    try {
      let strain;
      
      if (strainName) {
        // Get all strains and find one with a name that matches (case insensitive)
        const allStrains = await storage.getStrains();
        strain = allStrains.find(s => 
          s.name.toLowerCase() === strainName.toLowerCase()
        );
        
        if (!strain) {
          // Look for partial matches
          const partialMatches = allStrains.filter(s => 
            s.name.toLowerCase().includes(strainName.toLowerCase())
          );
          
          if (partialMatches.length === 0) {
            await interaction.editReply(`Could not find a strain named "${strainName}". Try using /strain without a name to get a random strain.`);
            return;
          } else if (partialMatches.length === 1) {
            strain = partialMatches[0];
          } else if (partialMatches.length > 1) {
            // Create an embed with partial matches
            const matchesEmbed = {
              title: '🌿 Multiple Strains Found',
              description: `Found ${partialMatches.length} strains matching "${strainName}":`,
              color: 0x00C957, // Green color
              fields: partialMatches.slice(0, 10).map(s => ({
                name: s.name,
                value: `Type: ${s.type.charAt(0).toUpperCase() + s.type.slice(1)}`
              })),
              footer: {
                text: 'Use /strain with an exact name to see details'
              }
            };
            
            await interaction.editReply({ embeds: [matchesEmbed] });
            return;
          }
        }
      } else {
        // Get a random strain
        strain = await storage.getRandomStrain();
        
        if (!strain) {
          await interaction.editReply("No strains found in the database. Ask an admin to add some using /strain-add.");
          return;
        }
      }
      
      // Make sure strain is not undefined
      if (!strain) {
        await interaction.editReply("Error: Strain data couldn't be retrieved.");
        return;
      }
      
      // Create a detailed strain embed
      const strainEmbed: any = {
        title: `🌿 ${strain.name}`,
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
          text: '🔍 kUShCOOKIES Strain of the Day'
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
      
      await interaction.editReply({ embeds: [strainEmbed] });
      
    } catch (error) {
      console.error('Error in strain command:', error);
      await interaction.editReply('There was an error fetching strain information. Please try again later.');
    } finally {
      // Clean up the loading animation
      stopLoading();
    }
  });
  
  commandMap.set('strain-add', async (interaction) => {
    // Get strain information from options
    const name = interaction.options.getString('name', true);
    const type = interaction.options.getString('type', true);
    const thc = interaction.options.getString('thc');
    const cbd = interaction.options.getString('cbd');
    const flavor = interaction.options.getString('flavor');
    const effects = interaction.options.getString('effects');
    const description = interaction.options.getString('description', true);
    const imageUrl = interaction.options.getString('image');
    
    // Defer reply since this might take some time
    await interaction.deferReply();
    
    // Create loading animation
    // Loading animation imported at the top of the file
    const stopLoading = createLoadingAnimation(interaction, 'strain');
    
    try {
      // Check if strain already exists
      const allStrains = await storage.getStrains();
      const existingStrain = allStrains.find(s => 
        s.name.toLowerCase() === name.toLowerCase()
      );
      
      if (existingStrain) {
        await interaction.editReply({
          content: `A strain named "${name}" already exists! Use a different name or edit the existing strain.`
        });
        return;
      }
      
      // Create the new strain
      await storage.createStrain({
        name,
        type,
        thc_content: thc || null,
        cbd_content: cbd || null,
        flavor_profile: flavor || null,
        effects: effects || null,
        description,
        image_url: imageUrl || null
      });
      
      // Create a preview embed
      const strainEmbed: any = {
        title: `🌿 ${name} - Added Successfully!`,
        description: description,
        color: type === 'indica' ? 0x6B4EE0 : type === 'sativa' ? 0xE04E4E : 0x4EE078,
        fields: [
          {
            name: 'Type',
            value: type.charAt(0).toUpperCase() + type.slice(1),
            inline: true
          }
        ],
        footer: {
          text: '🔍 kUShCOOKIES Strain Database'
        }
      };
      
      // Add optional fields if present
      if (thc) {
        strainEmbed.fields.push({
          name: 'THC Content',
          value: thc,
          inline: true
        });
      }
      
      if (cbd) {
        strainEmbed.fields.push({
          name: 'CBD Content',
          value: cbd,
          inline: true
        });
      }
      
      if (flavor) {
        strainEmbed.fields.push({
          name: 'Flavor Profile',
          value: flavor,
          inline: true
        });
      }
      
      if (effects) {
        strainEmbed.fields.push({
          name: 'Effects',
          value: effects,
          inline: true
        });
      }
      
      // Add image if available
      if (imageUrl) {
        (strainEmbed as any).image = {
          url: imageUrl
        };
      }
      
      await interaction.editReply({ 
        content: `✅ Strain "${name}" has been added to the database!`,
        embeds: [strainEmbed]
      });
      
    } catch (error) {
      console.error('Error adding strain:', error);
      await interaction.editReply({
        content: `Error adding strain: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      // Clean up the loading animation
      stopLoading();
    }
  });
  
  commandMap.set('strain-announce', async (interaction) => {
    // Get announcement settings
    const channel = interaction.options.getChannel('channel', true);
    const time = interaction.options.getString('time', true);
    const timezone = interaction.options.getString('timezone') || 'UTC';
    
    // Validate time format (HH:MM in 24-hour format)
    const timeRegex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
    if (!timeRegex.test(time)) {
      await interaction.reply({
        content: 'Invalid time format. Please use 24-hour format (e.g., "16:20").',
        ephemeral: true
      });
      return;
    }
    
    // Defer reply since this might take some time
    await interaction.deferReply();
    
    // Create loading animation
    const stopLoading = createLoadingAnimation(interaction, 'strain-announce');
    
    try {
      // Check if an announcement already exists for this server
      const existingAnnouncements = await storage.getStrainAnnouncements(interaction.guildId || '0');
      
      let announcement;
      
      if (existingAnnouncements.length > 0) {
        // Update the existing announcement
        const [existing] = existingAnnouncements;
        announcement = await storage.updateStrainAnnouncement(existing.id, {
          channel_id: channel.id,
          time,
          timezone,
          is_enabled: true
        });
        
        await interaction.editReply({
          content: `✅ Updated strain announcements to channel ${channel} at ${time} ${timezone}.`
        });
      } else {
        // Create a new announcement
        announcement = await storage.createStrainAnnouncement({
          server_id: interaction.guildId || '0',
          channel_id: channel.id,
          time,
          timezone,
          is_enabled: true
        });
        
        await interaction.editReply({
          content: `✅ Daily strain announcements set up! A random strain will be posted in ${channel} at ${time} ${timezone} every day.`
        });
      }
      
      // Schedule the announcement
      if (announcement) {
        scheduleAnnouncement(client, announcement);
      }
      
      // Check if there are strains in the database
      const strains = await storage.getStrains();
      if (strains.length === 0) {
        await interaction.followUp({
          content: 'ℹ️ Your strain database is empty. Please add some strains using the `/strain-add` command or the `/strain-import` command.',
          ephemeral: true
        });
      } else {
        const strainsCount = strains.length;
        await interaction.followUp({
          content: `ℹ️ Your strain database contains ${strainsCount} strain${strainsCount === 1 ? '' : 's'}. A random strain will be posted each day at ${time} ${timezone}.`,
          ephemeral: false
        });
      }
      
    } catch (error) {
      console.error('Error setting up strain announcements:', error);
      await interaction.editReply({
        content: `⚠️ Error setting up announcements: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      // Clean up the loading animation
      stopLoading();
    }
  });
  
  // Add strain import command handler
  commandMap.set('strain-import', async (interaction) => {
    // Get import options
    const source = interaction.options.getString('source', true);
    const apiKey = interaction.options.getString('api_key') || '';
    const limit = interaction.options.getInteger('limit') || 15;
    
    // Defer the reply since importing might take some time
    await interaction.deferReply();
    
    // Create loading animation
    // Loading animation imported at the top of the file
    const stopLoading = createLoadingAnimation(interaction, 'strain');
    
    try {
      let importCount = 0;
      let sourceDescription = '';
      
      // Import from the selected source
      switch (source) {
        case 'curated':
          importCount = await importCuratedStrains();
          sourceDescription = 'curated list';
          break;
          
        case 'api':
          if (source === 'api' && !apiKey) {
            await interaction.editReply({
              content: '⚠️ API key is required for importing from public APIs. Please provide an API key with the `api_key` option.'
            });
            // The finally block will handle cleanup
            return;
          }
          
          importCount = await importStrainsFromApi(apiKey, limit);
          sourceDescription = 'public API';
          break;
          
        default:
          await interaction.editReply({
            content: '⚠️ Invalid source. Please choose a valid source from the options.'
          });
          // The finally block will handle cleanup
          return;
      }
      
      // Get total strain count after import
      const strains = await storage.getStrains();
      
      // Create a response embed
      const embed = {
        title: '🌿 Strain Import Complete',
        description: `Successfully imported ${importCount} strains from the ${sourceDescription}.`,
        color: 0x4EE078, // Green color
        fields: [
          {
            name: 'Total Strains',
            value: `${strains.length} strain${strains.length === 1 ? '' : 's'} now in database`,
            inline: true
          },
          {
            name: 'New Strains Added',
            value: `${importCount} strain${importCount === 1 ? '' : 's'}`,
            inline: true
          }
        ],
        timestamp: new Date().toISOString(),
        footer: {
          text: 'Use /strain to view strain information'
        }
      };
      
      // Send the response
      await interaction.editReply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Error importing strains:', error);
      await interaction.editReply({
        content: `⚠️ Error importing strains: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      // Clean up the loading animation
      stopLoading();
    }
  });
  
  // Add strain recommend command handler
  commandMap.set('strain-recommend', async (interaction) => {
    await handleStrainRecommendCommand(interaction);
  });
  
  // Add time stats command handler
  commandMap.set('time-stats', async (interaction) => {
    // Get command parameters
    const userOption = interaction.options.getUser('user');
    const targetUser = userOption || interaction.user;
    
    // Defer reply since this might take some time
    await interaction.deferReply({ ephemeral: false });
    
    // Create loading animation
    const stopLoading = createLoadingAnimation(interaction, 'time-stats');
    
    try {
      // Import time tracking functions
      const { getUserTimeStats } = await import('./timeTracking');
      
      // Get time stats
      const timeStats = await getUserTimeStats(targetUser.id, interaction.guildId || '0');
      
      stopLoading();
      
      if (!timeStats) {
        await interaction.editReply({ 
          content: `No time tracking data found for ${targetUser === interaction.user ? 'you' : targetUser.username}.`
        });
        return;
      }
      
      // Format time for display
      const formatMinutes = (minutes: number) => {
        if (minutes === 0) return '0 minutes';
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        
        if (hours === 0) return `${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
        if (remainingMinutes === 0) return `${hours} hour${hours !== 1 ? 's' : ''}`;
        return `${hours} hour${hours !== 1 ? 's' : ''} and ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
      };
      
      // Create nice embed for time stats
      const embed = new EmbedBuilder()
        .setColor('#3498db')
        .setTitle(`VRChat Time Stats for ${targetUser.username}`)
        .setThumbnail(targetUser.displayAvatarURL())
        .addFields(
          { name: 'Total Play Time (This Month)', value: formatMinutes(timeStats.totalMonthlyMinutes), inline: false },
          { name: 'Daily Average', value: formatMinutes(timeStats.dailyAverageMinutes), inline: false }
        )
        .setFooter({ text: 'VRChat Time Tracking' })
        .setTimestamp();
      
      // Add top worlds if available
      if (timeStats.topWorlds && timeStats.topWorlds.length > 0) {
        const topWorldsList = timeStats.topWorlds
          .map((world: { name: string; minutes: number }, index: number) => `${index + 1}. ${world.name || 'Unknown World'} - ${formatMinutes(world.minutes)}`)
          .join('\n');
        
        embed.addFields({ name: 'Top Visited Worlds', value: topWorldsList || 'No world data available', inline: false });
      } else {
        embed.addFields({ name: 'Top Visited Worlds', value: 'No world data available', inline: false });
      }
      
      await interaction.editReply({ embeds: [embed] });
      
    } catch (error) {
      stopLoading();
      console.error('Error getting time stats:', error);
      await interaction.editReply({
        content: `⚠️ Error retrieving time stats: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  });
  
  // Add server time stats command handler (admin only)
  commandMap.set('server-time-stats', async (interaction) => {
    // Defer reply since this might take some time
    await interaction.deferReply({ ephemeral: false });
    
    // Create loading animation
    const stopLoading = createLoadingAnimation(interaction, 'server-time-stats');
    
    try {
      // Import time tracking functions
      const { getServerTimeStats } = await import('./timeTracking');
      
      // Get server time stats
      const serverStats = await getServerTimeStats(interaction.guildId || '0');
      
      stopLoading();
      
      if (!serverStats) {
        await interaction.editReply({ 
          content: `No time tracking data found for this server.`
        });
        return;
      }
      
      // Format time for display
      const formatMinutes = (minutes: number) => {
        if (minutes === 0) return '0 minutes';
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        
        if (hours === 0) return `${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
        if (remainingMinutes === 0) return `${hours} hour${hours !== 1 ? 's' : ''}`;
        return `${hours} hour${hours !== 1 ? 's' : ''} and ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
      };
      
      // Create nice embed for server time stats
      const embed = new EmbedBuilder()
        .setColor('#9b59b6')
        .setTitle(`Server-wide VRChat Stats`)
        .setThumbnail(interaction.guild?.iconURL() || null)
        .addFields(
          { name: 'Total Server Play Time (This Month)', value: formatMinutes(serverStats.totalMonthlyMinutes), inline: false },
          { name: 'Daily Average', value: formatMinutes(serverStats.dailyAverageMinutes), inline: false },
          { name: 'Active VRChat Users', value: serverStats.activeUsers.toString(), inline: true }
        )
        .setFooter({ text: 'VRChat Time Tracking' })
        .setTimestamp();
      
      // Add top worlds if available
      if (serverStats.topWorlds && serverStats.topWorlds.length > 0) {
        const topWorldsList = serverStats.topWorlds
          .map((world: { name: string; minutes: number }, index: number) => `${index + 1}. ${world.name || 'Unknown World'} - ${formatMinutes(world.minutes)}`)
          .join('\n');
        
        embed.addFields({ name: 'Top Visited Worlds', value: topWorldsList || 'No world data available', inline: false });
      } else {
        embed.addFields({ name: 'Top Visited Worlds', value: 'No world data available', inline: false });
      }
      
      // Add daily activity if available
      if (serverStats.dailyActivity && serverStats.dailyActivity.length > 0) {
        const activityList = serverStats.dailyActivity
          .map((day: { day: string; minutes: number }) => `${day.day}: ${formatMinutes(day.minutes)}`)
          .join('\n');
        
        embed.addFields({ name: 'Daily Activity (Last 7 Days)', value: activityList || 'No activity data available', inline: false });
      }
      
      await interaction.editReply({ embeds: [embed] });
      
    } catch (error) {
      stopLoading();
      console.error('Error getting server time stats:', error);
      await interaction.editReply({
        content: `⚠️ Error retrieving server time stats: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  });

  // Add image generation command handler
  commandMap.set('image', async (interaction) => {
    // Get command parameters
    const prompt = interaction.options.getString('prompt', true);
    const size = interaction.options.getString('size') as ImageSize || '1024x1024';
    const quality = interaction.options.getString('quality') as ImageQuality || 'standard';
    
    // Check rate limit - images use more resources
    const rateLimitResult = await checkRateLimit(
      interaction.user.id, 
      interaction.guildId || '0',
      2  // Count as 2 requests due to resource intensity
    );
    
    if (!rateLimitResult.allowed) {
      await interaction.reply({
        content: `Rate limit exceeded. Please try again in ${rateLimitResult.resetInMinutes} minutes.`,
        ephemeral: true
      });
      
      // Store the rate limit error
      await storage.createConversation({
        server_id: interaction.guildId || '0',
        channel_id: interaction.channelId,
        user_id: interaction.user.id,
        username: interaction.user.username,
        message: `/image ${prompt}`,
        response: `Rate limit exceeded. Please try again in ${rateLimitResult.resetInMinutes} minutes.`,
        command: COMMANDS.IMAGE,
        is_error: true,
        error_message: `Rate limit exceeded (${rateLimitResult.current}/${rateLimitResult.limit})`,
      });
      
      return;
    }
    
    // Defer reply since image generation might take time
    await interaction.deferReply();
    
    // Create loading animation
    const stopLoading = createLoadingAnimation(interaction, COMMANDS.IMAGE);
    
    try {
      // Generate the image
      const images = await generateImageCommand(prompt, size, quality);
      
      // Stop loading animation
      stopLoading();
      
      if (!images || images.length === 0) {
        throw new Error("No images were generated.");
      }
      
      // Create an embed with the image
      const embed = new EmbedBuilder()
        .setColor('#00AAFF')
        .setTitle('🎨 AI Generated Image')
        .setDescription(`**Prompt:** ${prompt}`)
        .setImage(images[0].url)
        .setFooter({ text: `Size: ${size} • Quality: ${quality}` })
        .setTimestamp();
      
      // Reply with the generated image
      await interaction.editReply({ embeds: [embed] });
      
      // Store the image generation in conversation history
      await storage.createConversation({
        server_id: interaction.guildId || '0',
        channel_id: interaction.channelId,
        user_id: interaction.user.id,
        username: interaction.user.username,
        message: `/image ${prompt} (${size}, ${quality})`,
        response: images[0].url,
        command: COMMANDS.IMAGE,
        is_error: false,
      });
    } catch (error) {
      console.error('Error in image generation command:', error);
      
      // Handle different error types
      let errorMessage = "An error occurred while generating the image.";
      
      if (error instanceof Error) {
        if (error.message.includes("quota exceeded") || error.message.includes("rate limit")) {
          errorMessage = "AI service quota exceeded. Please try again later.";
        } else if (error.message.includes("content policy") || error.message.includes("safety")) {
          errorMessage = "Your prompt was flagged by content safety filters. Please try a different prompt.";
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }
      
      // Stop the loading animation if it's still running
      stopLoading();
      
      // Reply with the error
      await interaction.editReply(errorMessage);
      
      // Store the error in conversation history
      await storage.createConversation({
        server_id: interaction.guildId || '0',
        channel_id: interaction.channelId,
        user_id: interaction.user.id,
        username: interaction.user.username,
        message: `/image ${prompt} (${size}, ${quality})`,
        response: errorMessage,
        command: COMMANDS.IMAGE,
        is_error: true,
        error_message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
  
  // Add manual strain announcement command handler
  commandMap.set('strain-now', async (interaction) => {
    // Get command parameters
    const channelOption = interaction.options.getChannel('channel');
    
    // Defer reply since this might take some time
    await interaction.deferReply({ ephemeral: false });
    
    // Create loading animation
    const stopLoading = createLoadingAnimation(interaction, 'strain-now');
    
    try {
      let channelId: string;
      
      // If a specific channel is provided, use it
      if (channelOption) {
        channelId = channelOption.id;
      } else {
        // Otherwise check if there are any configured announcements to use their channel
        const existingAnnouncements = await storage.getStrainAnnouncements(interaction.guildId || '0');
        
        if (existingAnnouncements.length === 0) {
          await interaction.editReply({
            content: '⚠️ No announcement channel specified or configured. Please specify a channel or set up scheduled announcements with `/strain-announce` first.'
          });
          stopLoading();
          return;
        }
        
        // Use the channel from the most recently configured announcement
        channelId = existingAnnouncements[0].channel_id;
      }
      
      // Trigger a manual announcement
      await createAndPostManualAnnouncement(client, interaction.guildId || '0', channelId);
      
      // Confirm success
      await interaction.editReply({
        content: '✅ Manual strain announcement triggered successfully!'
      });
      
    } catch (error) {
      console.error('Error triggering manual strain announcement:', error);
      await interaction.editReply({
        content: `⚠️ Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}. Make sure your strain database is populated.`
      });
    } finally {
      // Clean up the loading animation
      stopLoading();
    }
  });

  // Add VRChat command handler
  commandMap.set('vrchat', async (interaction) => {
    console.log('VRChat command triggered');
    
    // Get command parameters
    const username = interaction.options.getString('username', true);
    const isPrivate = interaction.options.getBoolean('private') || false;
    
    // Acknowledge the command since the API might take some time to respond
    await interaction.deferReply({ ephemeral: isPrivate });
    
    // Create loading animation
    // Loading animation imported at the top of the file
    const stopLoading = createLoadingAnimation(interaction, 'vrchat');
    
    try {
      console.log(`Searching for VRChat user: ${username}`);
      
      // First try a direct search by username
      const user = await getUserInfo(username);
      
      // If direct lookup failed, try to search for similar usernames
      if (!user) {
        const searchResults = await searchUsers(username);
        
        if (!searchResults || searchResults.length === 0) {
          await interaction.editReply({
            content: `⚠️ Could not find any VRChat users matching "${username}". Please check the spelling and try again.`
          });
          // The finally block will handle cleanup
          return;
        }
        
        // Create an embed for search results
        const embed = {
          title: '🔍 VRChat User Search Results',
          description: `Found ${searchResults.length} users matching "${username}"`,
          color: 0x1a73e8, // Discord blue
          fields: searchResults.slice(0, 5).map(user => ({
            name: user.displayName,
            value: `Username: ${user.username}\nStatus: ${user.status}\n${user.statusDescription ? `Status Message: ${user.statusDescription}\n` : ''}${user.isFriend ? '✅ Friend' : ''}`,
            inline: false
          })),
          footer: {
            text: 'Use /vrchat with the exact username to see more details'
          },
          timestamp: new Date().toISOString()
        };
        
        await interaction.editReply({ embeds: [embed] });
        // The finally block will handle cleanup
        return;
      }
      
      // Create an embed for the user details
      const userEmbed = {
        title: `🌐 VRChat User: ${user.displayName}`,
        color: 0x5865F2, // Discord blurple
        thumbnail: {
          url: user.currentAvatarThumbnailImageUrl || user.currentAvatarImageUrl
        },
        fields: [
          {
            name: 'Username',
            value: user.username,
            inline: true
          },
          {
            name: 'Status',
            value: user.status,
            inline: true
          },
          {
            name: 'Location',
            value: user.location || 'Private/Offline',
            inline: true
          }
        ],
        image: {
          url: user.currentAvatarImageUrl
        },
        footer: {
          text: `User ID: ${user.id}`
        },
        timestamp: new Date().toISOString()
      };
      
      // Add bio if present
      if (user.bio) {
        userEmbed.fields.push({
          name: 'Bio',
          value: user.bio.substring(0, 1024), // Discord limits field values to 1024 characters
          inline: false
        });
      }
      
      // Add status description if present
      if (user.statusDescription) {
        userEmbed.fields.push({
          name: 'Status Message',
          value: user.statusDescription.substring(0, 1024),
          inline: false
        });
      }
      
      // Add friend info
      userEmbed.fields.push({
        name: 'Friend Status',
        value: user.isFriend ? '✅ Friend' : '❌ Not a friend',
        inline: true
      });
      
      // Add tags if present (limit to 5 tags to save space)
      if (user.tags && user.tags.length > 0) {
        userEmbed.fields.push({
          name: 'Tags',
          value: user.tags.slice(0, 5).join(', '),
          inline: false
        });
      }
      
      await interaction.editReply({ embeds: [userEmbed] });
      
      console.log(`Successfully displayed VRChat user info for: ${user.displayName}`);
      
    } catch (error) {
      console.error('Error in vrchat command:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      // Format a nice error message
      await interaction.editReply({
        content: `⚠️ Error retrieving VRChat user information: ${errorMessage}\n\nMake sure the username is correct and try again.`
      });
    } finally {
      // Stop loading animation
      stopLoading();
    }
  });
  
  // Add VRChat account linking command handler
  commandMap.set('link-vrchat', async (interaction) => {
    console.log('VRChat account linking requested');
    
    // Get the VRChat username and privacy setting
    const vrchatUsername = interaction.options.getString('username', true);
    const isPrivate = interaction.options.getBoolean('private') !== false; // Default to true
    
    // Acknowledge the command
    await interaction.deferReply({ ephemeral: isPrivate });
    
    // Create loading animation
    // Loading animation imported at the top of the file
    const stopLoading = createLoadingAnimation(interaction, 'link-vrchat');
    
    try {
      // Make sure we're in a guild (server)
      if (!interaction.guildId) {
        await interaction.editReply({
          content: '⚠️ This command can only be used in a server, not in direct messages.'
        });
        return;
      }
      
      // Get the Discord user info
      const discordUser = interaction.user;
      
      // Check if VRChat user exists
      const vrchatUser = await getUserInfo(vrchatUsername);
      
      if (!vrchatUser) {
        await interaction.editReply({
          content: `⚠️ Could not find a VRChat user with username "${vrchatUsername}". Please check the spelling and try again.`
        });
        // The finally block will handle cleanup
        return;
      }
      
      // Check if this Discord user already has a linked account
      const existingLink = await storage.getLinkedAccount(discordUser.id);
      
      if (existingLink && existingLink.verified) {
        await interaction.editReply({
          content: `⚠️ Your Discord account is already linked to VRChat user "${existingLink.vrchat_display_name}" (${existingLink.vrchat_username}). Please unlink your account first before linking a new one.`,
        });
        // The finally block will handle cleanup
        return;
      }
      
      // Generate a random verification code (6 characters alphanumeric)
      const verificationCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      // Create or update the linking record
      await storage.createLinkedAccount({
        discord_user_id: discordUser.id,
        discord_username: discordUser.username,
        vrchat_user_id: vrchatUser.id,
        vrchat_username: vrchatUser.username,
        vrchat_display_name: vrchatUser.displayName,
        server_id: interaction.guildId,
        role_id: '', // Will be set by vrchat-role command
        verification_code: verificationCode,
        verified: false
      });
      
      // Create response embed
      const embed = {
        title: '🔗 VRChat Account Linking',
        description: `I've started the process to link your Discord account to VRChat user **${vrchatUser.displayName}** (${vrchatUser.username}).`,
        color: 0x7289DA, // Discord color
        fields: [
          {
            name: 'Verification Code',
            value: `\`${verificationCode}\``,
            inline: false
          },
          {
            name: 'Next Steps',
            value: 'To complete the verification:\n1. Add this code to your VRChat bio/status\n2. Run `/verify-vrchat ${verificationCode}` to verify ownership',
            inline: false
          }
        ],
        thumbnail: {
          url: vrchatUser.currentAvatarThumbnailImageUrl || vrchatUser.currentAvatarImageUrl
        },
        footer: {
          text: 'This verification code will expire in 24 hours'
        },
        timestamp: new Date().toISOString()
      };
      
      await interaction.editReply({ embeds: [embed] });
      console.log(`Generated verification code ${verificationCode} for Discord user ${discordUser.id} linking to VRChat user ${vrchatUser.username}`);
      
    } catch (error) {
      console.error('Error in link-vrchat command:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      await interaction.editReply({
        content: `⚠️ Error linking VRChat account: ${errorMessage}\n\nPlease try again later.`
      });
    } finally {
      // Stop loading animation
      stopLoading();
    }
  });
  
  // Add VRChat account verification command handler
  commandMap.set('verify-vrchat', async (interaction) => {
    console.log('VRChat account verification requested');
    
    // Get the verification code and privacy setting
    const code = interaction.options.getString('code', true);
    const isPrivate = interaction.options.getBoolean('private') !== false; // Default to true
    
    // Acknowledge the command
    await interaction.deferReply({ ephemeral: isPrivate });
    
    // Create loading animation
    // Loading animation imported at the top of the file
    const stopLoading = createLoadingAnimation(interaction, 'verify-vrchat');
    
    try {
      // Make sure we're in a guild (server)
      if (!interaction.guildId) {
        await interaction.editReply({
          content: '⚠️ This command can only be used in a server, not in direct messages.'
        });
        return;
      }
      
      // Get the Discord user
      const discordUser = interaction.user;
      
      // Check if there's a pending link for this Discord user
      const pendingLink = await storage.getLinkedAccount(discordUser.id);
      
      if (!pendingLink) {
        await interaction.editReply({
          content: '⚠️ You do not have a pending VRChat account link. Please use `/link-vrchat` first to start the linking process.'
        });
        // The finally block will handle cleanup
        return;
      }
      
      // Check if the verification code matches
      if (pendingLink.verification_code !== code) {
        await interaction.editReply({
          content: '⚠️ Invalid verification code. Please check the code and try again.'
        });
        // The finally block will handle cleanup
        return;
      }
      
      // If the account is already verified, just inform the user
      if (pendingLink.verified) {
        await interaction.editReply({
          content: `✅ Your Discord account is already verified and linked to VRChat user "${pendingLink.vrchat_display_name}" (${pendingLink.vrchat_username}).`
        });
        // The finally block will handle cleanup
        return;
      }
      
      // Fetch the latest info for the VRChat user to check bio/status
      const vrchatUser = await getUserInfo(pendingLink.vrchat_username);
      
      if (!vrchatUser) {
        await interaction.editReply({
          content: '⚠️ Could not fetch your VRChat profile. Please try again later.'
        });
        // The finally block will handle cleanup
        return;
      }
      
      // Check if verification code is in their bio or status description
      const bioHasCode = vrchatUser.bio && vrchatUser.bio.includes(code);
      const statusHasCode = vrchatUser.statusDescription && vrchatUser.statusDescription.includes(code);
      
      if (!bioHasCode && !statusHasCode) {
        await interaction.editReply({
          content: `⚠️ Verification failed. Could not find the code \`${code}\` in your VRChat bio or status. Please add the code to your bio or status and try again.`
        });
        // The finally block will handle cleanup
        return;
      }
      
      // Mark the account as verified
      await storage.updateLinkedAccount(discordUser.id, {
        verified: true,
        verification_code: null // Clear the verification code
      });
      
      // Get the role if one is assigned for VRChat users
      let roleMessage = '';
      if (pendingLink.role_id) {
        try {
          const guild = interaction.guild;
          const role = await guild?.roles.fetch(pendingLink.role_id);
          
          if (role && guild) {
            // Add the role to the user
            const member = await guild.members.fetch(discordUser.id);
            await member.roles.add(role);
            
            roleMessage = `\n\n🏅 You've been granted the "${role.name}" role!`;
          }
        } catch (roleError) {
          console.error('Error assigning role:', roleError);
          roleMessage = '\n\n⚠️ There was an error assigning your role. Please contact an administrator.';
        }
      }
      
      // Create success embed
      const embed = {
        title: '✅ VRChat Account Verified',
        description: `Your Discord account has been successfully linked to VRChat user **${vrchatUser.displayName}** (${vrchatUser.username}).${roleMessage}`,
        color: 0x43B581, // Discord green
        thumbnail: {
          url: vrchatUser.currentAvatarThumbnailImageUrl || vrchatUser.currentAvatarImageUrl
        },
        footer: {
          text: 'Thanks for verifying your account!'
        },
        timestamp: new Date().toISOString()
      };
      
      await interaction.editReply({ embeds: [embed] });
      console.log(`Successfully verified Discord user ${discordUser.id} with VRChat user ${vrchatUser.username}`);
      
    } catch (error) {
      console.error('Error in verify-vrchat command:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      await interaction.editReply({
        content: `⚠️ Error verifying VRChat account: ${errorMessage}\n\nPlease try again later.`
      });
    } finally {
      // Stop loading animation
      stopLoading();
    }
  });
  
  // Add VRChat role assignment command handler (admin only)
  commandMap.set('vrchat-role', async (interaction) => {
    console.log('VRChat role assignment requested');
    
    // Create loading animation
    // Loading animation imported at the top of the file
    const stopLoading = createLoadingAnimation(interaction, 'vrchat-role');
    
    try {
      // Make sure we're in a guild (server)
      if (!interaction.guildId || !interaction.guild) {
        await interaction.reply({
          content: '⚠️ This command can only be used in a server, not in direct messages.',
          ephemeral: true
        });
        return;
      }
      
      // Get the role
      const roleOption = interaction.options.getRole('role', true);
      
      // Check if the bot can manage this role
      const guild = interaction.guild;
      const botMember = guild.members.cache.get(client.user?.id || '');
      
      if (!botMember) {
        await interaction.reply({
          content: '⚠️ Could not find the bot in this server. This is an unexpected error.',
          ephemeral: true
        });
        return;
      }
      
      if (!botMember.permissions.has('ManageRoles')) {
        await interaction.reply({
          content: '⚠️ The bot does not have the "Manage Roles" permission required to assign roles.',
          ephemeral: true
        });
        return;
      }
      
      // Fetch the role from the guild to ensure we have a full Role object (not APIRole)
      const role = await guild.roles.fetch(roleOption.id);
      
      if (!role) {
        await interaction.reply({
          content: '⚠️ Could not find the specified role in this server.',
          ephemeral: true
        });
        return;
      }
      
      // Check if the role is manageable
      if (!role.editable) {
        await interaction.reply({
          content: `⚠️ The bot cannot manage the "${role.name}" role. The role might be higher in the hierarchy than the bot's role.`,
          ephemeral: true
        });
        return;
      }
      
      // Save the role ID for this server
      const linkedAccounts = await storage.getLinkedAccountsByServer(interaction.guildId);
      
      // Update all linked accounts for this server with the new role ID
      for (const account of linkedAccounts) {
        await storage.updateLinkedAccount(account.discord_user_id, {
          role_id: role.id
        });
        
        // If the account is verified, assign the role
        if (account.verified) {
          try {
            const member = await guild.members.fetch(account.discord_user_id);
            if (member) {
              await member.roles.add(role);
            }
          } catch (error) {
            console.error(`Error adding role to user ${account.discord_user_id}:`, error);
          }
        }
      }
      
      await interaction.reply({
        content: `✅ Successfully set the "${role.name}" role for verified VRChat users.\n\n${linkedAccounts.filter(a => a.verified).length} verified users have been assigned this role.`,
        ephemeral: true
      });
      
      console.log(`Set role ${role.name} (${role.id}) for VRChat users in server ${interaction.guildId}`);
      
    } catch (error) {
      console.error('Error in vrchat-role command:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      await interaction.reply({
        content: `⚠️ Error setting VRChat role: ${errorMessage}`,
        ephemeral: true
      });
    } finally {
      // Stop loading animation
      stopLoading();
    }
  });
}

// Reconnection variables
let reconnectAttempts = 0;
const maxReconnectAttempts = 10;
const reconnectTimeout = 5000; // 5 seconds initial timeout

// Function to handle reconnection
function reconnectDiscord() {
  if (reconnectAttempts >= maxReconnectAttempts) {
    console.error(`Failed to reconnect to Discord after ${maxReconnectAttempts} attempts. Giving up.`);
    return;
  }

  reconnectAttempts++;
  
  // Exponential backoff: increase timeout with each attempt
  const timeout = reconnectTimeout * Math.pow(1.5, reconnectAttempts - 1);
  
  console.log(`Attempting to reconnect to Discord (attempt ${reconnectAttempts}/${maxReconnectAttempts}) in ${timeout/1000} seconds...`);
  
  setTimeout(() => {
    if (!process.env.DISCORD_TOKEN) {
      console.warn('DISCORD_TOKEN environment variable is missing or empty. Discord bot will not be operational.');
      return;
    }
    
    client.login(process.env.DISCORD_TOKEN)
      .then(() => {
        console.log('Successfully reconnected to Discord');
        reconnectAttempts = 0; // Reset counter on successful connection
      })
      .catch(error => {
        console.error('Failed to reconnect to Discord:', error.message);
        reconnectDiscord(); // Try again
      });
  }, timeout);
}

// Initialize Discord bot
export function initializeBot() {
  // Setup event handlers
  setupDiscordEventHandlers();
  
  // Register slash command handlers
  registerSlashCommandHandlers();
  
  // Add disconnect handler
  client.on('disconnect', (event) => {
    console.log(`Discord connection lost with code ${event.code}. Reason: ${event.reason}`);
    reconnectDiscord();
  });
  
  // Handle errors that might lead to disconnection
  client.on('error', (error) => {
    console.error('Discord client error:', error);
    // Only attempt reconnect if we're not already connected
    if (!client.isReady()) {
      reconnectDiscord();
    }
  });
  
  // Try to login to Discord, but don't let it crash the entire application if it fails
  try {
    if (!process.env.DISCORD_TOKEN) {
      console.warn('DISCORD_TOKEN environment variable is missing or empty. Discord bot will not be operational.');
      return client;
    }
    
    // Login to Discord
    client.login(process.env.DISCORD_TOKEN)
      .then(() => {
        console.log('Successfully connected to Discord');
        reconnectAttempts = 0; // Reset counter on successful connection
        
        // Initialize strain announcements
        client.once('ready', () => {
          console.log('Bot is online as ' + client.user?.tag);
          
          // Register slash commands
          registerSlashCommandsWithDiscord(client.user?.id || '');
          
          // Initialize strain announcements
          initializeStrainAnnouncements(client)
            .then(() => {
              console.log('Strain announcements initialized');
            })
            .catch(error => {
              console.error('Error initializing strain announcements:', error);
            });
        });
      })
      .catch(error => {
        console.error('Failed to connect to Discord:', error.message);
        reconnectDiscord(); // Try to reconnect on initial failure
      });
  } catch (error) {
    console.error('Error initializing Discord bot:', error);
  }
  
  return client;
}

// Register slash commands with Discord
async function registerSlashCommandsWithDiscord(clientId: string) {
  try {
    console.log('Started refreshing application (/) commands.');
    
    await rest.put(
      Routes.applicationCommands(clientId),
      { body: slashCommands.map(command => command.toJSON()) }
    );
    
    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error('Error registering slash commands:', error);
  }
}

// Setup all event handlers for Discord client
function setupDiscordEventHandlers() {
  // Event: Bot is ready
  client.once(Events.ClientReady, async (readyClient) => {
    console.log(`Bot is online as ${readyClient.user.tag}`);
    
    // Register slash commands
    await registerSlashCommandsWithDiscord(readyClient.user.id);
    
    // Store all connected servers in the database
    const guilds = readyClient.guilds.cache;
    guilds.forEach(async (guild) => {
      const existingServer = await storage.getServer(guild.id);
      
      if (!existingServer) {
        await storage.createServer({
          id: guild.id,
          name: guild.name,
          joined_at: new Date(),
        });
      }
    });
  });
  
  // Event: Role removed from a member
  client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
    try {
      // Check if a role was removed
      if (oldMember.roles.cache.size <= newMember.roles.cache.size) {
        return; // No roles were removed
      }
      
      // Find which role was removed
      const removedRoles = oldMember.roles.cache.filter(role => !newMember.roles.cache.has(role.id));
      
      if (removedRoles.size === 0) {
        return; // No roles were removed (shouldn't happen, but just in case)
      }
      
      // Check if the user has a linked VRChat account
      const linkedAccount = await storage.getLinkedAccount(newMember.id);
      
      if (!linkedAccount || !linkedAccount.verified) {
        return; // No linked account or not verified
      }
      
      // Check if any of the removed roles match the VRChat role
      // Convert to array to avoid Collection iteration issues
      const removedRolesArray = Array.from(removedRoles.values());
      
      for (const role of removedRolesArray) {
        if (linkedAccount.role_id && role.id === linkedAccount.role_id) {
          console.log(`VRChat role removed from user ${newMember.user.username} (${newMember.id}). Unlinking VRChat account.`);
          
          // Unlink the VRChat account by setting verified to false
          await storage.updateLinkedAccount(newMember.id, {
            verified: false
          });
          
          // Try to send a DM to the user
          try {
            await newMember.send({
              content: `Your VRChat verification status has been reset because the ${role.name} role was removed from your Discord account. Use \`/link-vrchat\` command again if you want to re-verify.`
            });
          } catch (dmError) {
            console.error(`Failed to send DM to ${newMember.user.username}:`, dmError);
            // We can't send DMs to this user, but we've still unlinked the account
          }
          
          // We found and processed the VRChat role, no need to check other roles
          return;
        }
      }
    } catch (error) {
      console.error('Error handling role removal:', error);
    }
  });

  // Event: Bot joins a new server
  client.on(Events.GuildCreate, async (guild) => {
    console.log(`Joined a new guild: ${guild.name} (${guild.id})`);
    
    // Store the new server in the database
    await storage.createServer({
      id: guild.id,
      name: guild.name,
      joined_at: new Date(),
    });
  });

  // Event: Interaction created (for slash commands)
  client.on(Events.InteractionCreate, async (interaction) => {
    // Handle only chat input interactions (slash commands)
    if (!interaction.isChatInputCommand()) return;
    
    const commandName = interaction.commandName;
    
    try {
      // Check if this command has a registered handler
      const handler = commandMap.get(commandName);
      
      if (handler) {
        // Execute the command handler
        await handler(interaction);
      } else {
        // No handler found for this command
        await interaction.reply({
          content: `Internal error: no handler for /${commandName} command.`,
          ephemeral: true
        });
      }
    } catch (error) {
      console.error(`Error processing slash command '${commandName}':`, error);
      
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      
      // Try to reply with the error
      try {
        if (interaction.deferred) {
          await interaction.editReply(`Error: ${errorMessage}`);
        } else {
          await interaction.reply({
            content: `Error: ${errorMessage}`,
            ephemeral: true
          });
        }
      } catch (replyError) {
        console.error('Error sending error reply:', replyError);
      }
    }
  });
  
  // Event: Message is sent in a server (for legacy prefix commands)
  client.on(Events.MessageCreate, async (message: Message) => {
    // Ignore messages from bots
    if (message.author.bot) return;
    
    // Ignore messages that don't start with the prefix
    if (!message.content.startsWith(PREFIX)) return;
    
    // Parse the command
    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift()?.toLowerCase();
    
    if (!command) return;
    
    try {
      // Process commands
      switch (command) {
        case COMMANDS.ASK:
          await handleAskCommand(message, args);
          break;
        case COMMANDS.CHAT:
          await handleChatCommand(message, args);
          break;
        case COMMANDS.HELP:
          await handleHelpCommand(message);
          break;
        case COMMANDS.CONTINUE:
          await handleContinueCommand(message);
          break;
        case COMMANDS.CLEAR:
          await handleClearCommand(message);
          break;
        case COMMANDS.CONFIG:
          await handleConfigCommand(message, args);
          break;
        case COMMANDS.STATS:
          await handleStatsCommand(message);
          break;
        case COMMANDS.RESTART:
          await handleRestartCommand(message);
          break;
        case COMMANDS.RAINBOW:
          await handleRainbowCommand(message, args);
          break;
        default:
          await message.reply(`Unknown command. Type \`${PREFIX}help\` for a list of commands.`);
      }
    } catch (error) {
      console.error(`Error processing command '${command}':`, error);
      
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      
      // Store error in database
      await storage.createConversation({
        server_id: message.guild?.id || '0',
        channel_id: message.channel.id,
        user_id: message.author.id,
        username: message.author.username,
        message: message.content,
        response: errorMessage,
        command,
        is_error: true,
        error_message: errorMessage,
      });
      
      await message.reply(`Error: ${errorMessage}`);
    }
  });
}

// Command handler functions
async function handleAskCommand(message: Message, args: string[]) {
  const question = args.join(' ');
  
  if (!question) {
    await message.reply(`Please provide a question. Example: \`${PREFIX}ask What is Node.js?\``);
    return;
  }
  
  // Check rate limit
  const rateLimitResult = await checkRateLimit(message.author.id, message.guild?.id || '0');
  
  if (!rateLimitResult.allowed) {
    await message.reply(`Rate limit exceeded. Please try again in ${rateLimitResult.resetInMinutes} minutes.`);
    
    // Store the rate limit error
    await storage.createConversation({
      server_id: message.guild?.id || '0',
      channel_id: message.channel.id,
      user_id: message.author.id,
      username: message.author.username,
      message: message.content,
      response: `Rate limit exceeded. Please try again in ${rateLimitResult.resetInMinutes} minutes.`,
      command: COMMANDS.ASK,
      is_error: true,
      error_message: `Rate limit exceeded (${rateLimitResult.current}/${rateLimitResult.limit})`,
    });
    
    return;
  }
  
  // Get conversation context
  const context = await getConversationContext(
    message.guild?.id || '0',
    message.channel.id,
    message.author.id
  );
  
  // Send typing indicator
  // Check if channel supports sendTyping
  if ('sendTyping' in message.channel) {
    await message.channel.sendTyping();
  }
  
  try {
    // Get response from OpenAI
    const response = await askCommand(question, context);
    
    // Send response
    await message.reply(response);
    
    // Save the response for !continue command
    const userKey = `${message.author.id}:${message.channel.id}`;
    lastResponses.set(userKey, response);
    
    // Store the conversation
    await storage.createConversation({
      server_id: message.guild?.id || '0',
      channel_id: message.channel.id,
      user_id: message.author.id,
      username: message.author.username,
      message: message.content,
      response,
      command: COMMANDS.ASK,
      is_error: false,
    });
  } catch (error) {
    console.error('Error in ask command:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to get a response: ${errorMessage}`);
  }
}

async function handleChatCommand(message: Message, args: string[]) {
  const chatMessage = args.join(' ');
  
  if (!chatMessage) {
    await message.reply(`Please provide a message. Example: \`${PREFIX}chat Tell me about space exploration\``);
    return;
  }
  
  // Check rate limit
  const rateLimitResult = await checkRateLimit(message.author.id, message.guild?.id || '0');
  
  if (!rateLimitResult.allowed) {
    await message.reply(`Rate limit exceeded. Please try again in ${rateLimitResult.resetInMinutes} minutes.`);
    
    // Store the rate limit error
    await storage.createConversation({
      server_id: message.guild?.id || '0',
      channel_id: message.channel.id,
      user_id: message.author.id,
      username: message.author.username,
      message: message.content,
      response: `Rate limit exceeded. Please try again in ${rateLimitResult.resetInMinutes} minutes.`,
      command: COMMANDS.CHAT,
      is_error: true,
      error_message: `Rate limit exceeded (${rateLimitResult.current}/${rateLimitResult.limit})`,
    });
    
    return;
  }
  
  // Get conversation context
  const context = await getConversationContext(
    message.guild?.id || '0',
    message.channel.id,
    message.author.id
  );
  
  // Send typing indicator
  // Check if channel supports sendTyping
  if ('sendTyping' in message.channel) {
    await message.channel.sendTyping();
  }
  
  try {
    // Get response from OpenAI
    const response = await chatCommand(chatMessage, context);
    
    // Send response
    await message.reply(response);
    
    // Save the response for !continue command
    const userKey = `${message.author.id}:${message.channel.id}`;
    lastResponses.set(userKey, response);
    
    // Store the conversation
    await storage.createConversation({
      server_id: message.guild?.id || '0',
      channel_id: message.channel.id,
      user_id: message.author.id,
      username: message.author.username,
      message: message.content,
      response,
      command: COMMANDS.CHAT,
      is_error: false,
    });
  } catch (error) {
    console.error('Error in chat command:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to get a response: ${errorMessage}`);
  }
}

async function handleHelpCommand(message: Message) {
  const helpText = `
**Available Commands:**

• \`${PREFIX}ask [question]\` - Get a direct answer to a question
• \`${PREFIX}chat [message]\` - Have a conversation with the bot
• \`${PREFIX}continue\` - Continue the bot's last response if it was cut off
• \`${PREFIX}clear\` - Clear your conversation history with the bot
• \`${PREFIX}help\` - Show this help message
• \`/image [prompt]\` - Generate an AI image from a text prompt

**VRChat Integration Commands:**
• \`/vrchat [username]\` - Look up a VRChat user's profile
• \`/link-vrchat [username]\` - Link your Discord account to your VRChat account
• \`/verify-vrchat [code]\` - Verify your VRChat account with the code from /link-vrchat
• \`/time-stats\` - View your VRChat playtime statistics
• \`/server-time-stats\` - View server-wide VRChat playtime statistics (Admin only)

**Admin Commands:**
• \`${PREFIX}config [setting] [value]\` - Change bot settings (Admin only)
• \`${PREFIX}stats\` - View bot statistics (Admin only)
• \`${PREFIX}restart\` - Restart the bot (Admin only)
• \`${PREFIX}rainbow [role name] [interval in ms]\` - Create a rainbow effect on a role (Admin only)
• \`/vrchat-role [role]\` - Set a Discord role to assign to verified VRChat users (Admin only)
• \`/strain-now\` - Manually trigger the daily strain announcement (Admin only)
  `;
  
  await message.reply(helpText);
}

async function handleContinueCommand(message: Message) {
  const userKey = `${message.author.id}:${message.channel.id}`;
  const lastResponse = lastResponses.get(userKey);
  
  if (!lastResponse) {
    await message.reply('There is no previous response to continue.');
    return;
  }
  
  // Check rate limit
  const rateLimitResult = await checkRateLimit(message.author.id, message.guild?.id || '0');
  
  if (!rateLimitResult.allowed) {
    await message.reply(`Rate limit exceeded. Please try again in ${rateLimitResult.resetInMinutes} minutes.`);
    return;
  }
  
  // Send typing indicator
  // Check if channel supports sendTyping
  if ('sendTyping' in message.channel) {
    await message.channel.sendTyping();
  }
  
  try {
    // Get continuation from OpenAI
    const response = await chatWithGPT(`Please continue your last response: "${lastResponse}"`, [
      { role: "assistant", content: lastResponse }
    ]);
    
    // Send response
    await message.reply(response);
    
    // Update the last response
    lastResponses.set(userKey, response);
    
    // Store the conversation
    await storage.createConversation({
      server_id: message.guild?.id || '0',
      channel_id: message.channel.id,
      user_id: message.author.id,
      username: message.author.username,
      message: message.content,
      response,
      command: COMMANDS.CONTINUE,
      is_error: false,
    });
  } catch (error) {
    console.error('Error in continue command:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to continue the response: ${errorMessage}`);
  }
}

async function handleClearCommand(message: Message) {
  const userKey = `${message.author.id}:${message.channel.id}`;
  
  // Remove any saved response
  lastResponses.delete(userKey);
  
  await message.reply('Your conversation history has been cleared.');
}

async function handleConfigCommand(message: Message, args: string[]) {
  // Check if user has admin permissions
  if (!message.member?.permissions.has('Administrator')) {
    await message.reply('You need to be an administrator to use this command.');
    return;
  }
  
  if (args.length < 2) {
    await message.reply(`Incorrect usage. Example: \`${PREFIX}config rateLimit 50\``);
    return;
  }
  
  const setting = args[0].toLowerCase();
  const value = args[1];
  
  try {
    // Get current settings
    const botSettings = await storage.getBotSettings(message.guild?.id || '0');
    const currentSettings = botSettings?.settings || {};
    
    // Update the specific setting
    const updatedSettings = {
      ...currentSettings,
      [setting]: value
    };
    
    // Save the updated settings
    await storage.updateBotSettings(message.guild?.id || '0', updatedSettings);
    
    await message.reply(`Setting \`${setting}\` has been updated to \`${value}\`.`);
  } catch (error) {
    console.error('Error updating config:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to update config: ${errorMessage}`);
  }
}

async function handleStatsCommand(message: Message) {
  // Check if user has admin permissions
  if (!message.member?.permissions.has('Administrator')) {
    await message.reply('You need to be an administrator to use this command.');
    return;
  }
  
  try {
    // Get statistics
    const conversations = await storage.getConversations(message.guild?.id || '0');
    const totalMessages = conversations.length;
    const errorCount = conversations.filter(c => c.is_error).length;
    const successRate = totalMessages > 0 ? ((totalMessages - errorCount) / totalMessages * 100).toFixed(2) : '100';
    
    const stats = `
**Bot Statistics:**

• Total Messages Processed: ${totalMessages}
• Success Rate: ${successRate}%
• Error Count: ${errorCount}
• Uptime: ${Math.floor(client.uptime ? client.uptime / 3600000 : 0)} hours
    `;
    
    await message.reply(stats);
  } catch (error) {
    console.error('Error getting stats:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to get stats: ${errorMessage}`);
  }
}

async function handleRestartCommand(message: Message) {
  // Check if user has admin permissions
  if (!message.member?.permissions.has('Administrator')) {
    await message.reply('You need to be an administrator to use this command.');
    return;
  }
  
  await message.reply('Restarting the bot...');
  
  // Log out and reconnect
  try {
    await client.destroy();
    await client.login(process.env.DISCORD_TOKEN);
    
    // Check if channel supports the send method
    if ('send' in message.channel) {
      await message.channel.send('Bot has been restarted successfully.');
    } else {
      console.log('Channel does not support send method, cannot send restart confirmation');
    }
  } catch (error) {
    console.error('Error restarting bot:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    // Check if channel supports the send method
    if ('send' in message.channel) {
      await message.channel.send(`Failed to restart the bot: ${errorMessage}`);
    } else {
      console.log('Channel does not support send method, cannot send error message');
    }
  }
}

// Check if Discord API is working
export async function checkDiscordStatus(): Promise<boolean> {
  try {
    return client.isReady();
  } catch (error) {
    console.error('Error checking Discord status:', error);
    return false;
  }
}

// Get a list of servers the bot is connected to
export async function getConnectedServers() {
  try {
    if (!client.isReady()) {
      return [];
    }
    
    return client.guilds.cache.map(guild => ({
      id: guild.id,
      name: guild.name
    }));
  } catch (error) {
    console.error('Error getting connected servers:', error);
    return [];
  }
}

// Handle the rainbow role command - creates a color-changing effect on a role
async function handleRainbowCommand(message: Message, args: string[]) {
  // Check if user has admin permissions
  if (!message.member?.permissions.has('Administrator')) {
    await message.reply('You need to be an administrator to use this command.');
    return;
  }
  
  // Get parameters
  if (args.length < 1) {
    await message.reply(`Please specify a role name. Example: \`${PREFIX}rainbow Admin\` (changes color smoothly). To customize the speed, add a millisecond value: \`${PREFIX}rainbow Admin 500\` (faster) or \`${PREFIX}rainbow Admin 3000\` (slower)`);
    return;
  }
  
  const roleName = args[0];
  // Default interval is 1 second if not specified (smoother transition)
  const interval = args.length > 1 ? parseInt(args[1]) : 1000;
  
  // Validate interval (minimum 500ms to prevent rate limiting)
  if (isNaN(interval) || interval < 500) {
    await message.reply('The interval must be a number greater than or equal to 500 (milliseconds).');
    return;
  }
  
  // Find the role in the guild
  const role = message.guild?.roles.cache.find(r => 
    r.name.toLowerCase() === roleName.toLowerCase()
  );
  
  if (!role) {
    await message.reply(`Could not find a role named "${roleName}". Please check the role name and try again.`);
    return;
  }
  
  const guildRoleKey = `${message.guild?.id}:${role.id}`;
  
  // Check if this role already has a rainbow effect running
  if (activeRainbowRoles.has(guildRoleKey)) {
    // Stop the existing timer
    clearInterval(activeRainbowRoles.get(guildRoleKey));
    activeRainbowRoles.delete(guildRoleKey);
    await message.reply(`Rainbow effect for the role "${role.name}" has been stopped.`);
    return;
  }
  
  try {
    // Start the rainbow effect
    let colorIndex = 0;
    
    // Create an interval to change the role color
    const intervalId = setInterval(async () => {
      try {
        // Update the role color
        await role.setColor(rainbowColors[colorIndex]);
        
        // Move to the next color (loop back to start when we reach the end)
        colorIndex = (colorIndex + 1) % rainbowColors.length;
      } catch (error) {
        console.error('Error updating rainbow role color:', error);
        // If there's an error, stop the interval
        clearInterval(intervalId);
        activeRainbowRoles.delete(guildRoleKey);
      }
    }, interval);
    
    // Store the interval ID so we can stop it later if needed
    activeRainbowRoles.set(guildRoleKey, intervalId);
    
    // Send confirmation message
    await message.reply(`🌈 Rainbow effect started for the role "${role.name}"! The color will change every ${interval / 1000} seconds.\n\nTo stop the effect, use the same command again: \`${PREFIX}rainbow ${roleName}\``);
    
  } catch (error) {
    console.error('Error starting rainbow role effect:', error);
    throw new Error(`Failed to start rainbow effect: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
