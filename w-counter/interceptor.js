// W Counter Bot Message Interceptor
// This is a standalone file to help debug issues with the W Counter bot's message detection
const { Client, GatewayIntentBits, WebhookClient } = require('discord.js');
require('dotenv').config();

console.log('Starting W Counter message interceptor...');

// Create a new client just for message detection with ALL possible intents
const client = new Client({
  intents: 32767 // This is a magic number for ALL available intents
});

// Fallback debug webhook in case direct messaging isn't working
let debugWebhook = null;
const WEBHOOK_URL = process.env.DEBUG_WEBHOOK_URL || '';

// Create a debug log file
const fs = require('fs');
const debugLogPath = './interceptor-messages.log';

// Clear the debug log
fs.writeFileSync(debugLogPath, '--- Interceptor Started ---\n');

// Initialize the webhook if URL is available
if (WEBHOOK_URL) {
  try {
    debugWebhook = new WebhookClient({ url: WEBHOOK_URL });
    console.log('Webhook initialized successfully');
  } catch (error) {
    console.error('Error initializing webhook:', error);
  }
}

// Log to multiple places to ensure we catch logs
function debugLog(message) {
  // Log to console
  console.log(`[W INTERCEPTOR] ${message}`);
  
  // Log to file
  try {
    fs.appendFileSync(debugLogPath, `${new Date().toISOString()} - ${message}\n`);
  } catch (error) {
    console.error('Error writing to debug log:', error);
  }
  
  // Log to webhook if available
  if (debugWebhook) {
    try {
      debugWebhook.send(`[W INTERCEPTOR] ${message}`).catch(error => {
        console.error('Error sending webhook message:', error);
      });
    } catch (error) {
      console.error('Error sending webhook message:', error);
    }
  }
}

// When the client is ready, run this code
client.once('ready', () => {
  debugLog(`Interceptor ready! Logged in as ${client.user.tag}`);
  
  // Send a heartbeat message to track the bot's status
  setInterval(() => {
    debugLog(`HEARTBEAT at ${new Date().toISOString()}`);
  }, 30000); // Every 30 seconds
});

// Direct raw message handler (lowest level)
client.on('raw', async packet => {
  // Only process MESSAGE_CREATE events
  if (packet.t === 'MESSAGE_CREATE') {
    try {
      const data = packet.d;
      
      // Log any message data we receive
      debugLog(`RAW MESSAGE: "${data.content}" from ${data.author.username}#${data.author.discriminator}`);
      
      // Check for 'w' in any message
      if (data.content && data.content.toLowerCase().includes('w')) {
        debugLog(`W DETECTED in message: "${data.content}" from ${data.author.username}#${data.author.discriminator}`);
      }
    } catch (error) {
      debugLog(`Error processing raw message: ${error.message}`);
    }
  }
});

// Listen for messages (higher level API)
client.on('messageCreate', message => {
  try {
    // For every message, log it
    debugLog(`MESSAGE: "${message.content}" from ${message.author.tag} in ${message.guild?.name || 'DM'}`);
    
    // Check for 'w' in any message
    if (message.content && message.content.toLowerCase().includes('w')) {
      debugLog(`W DETECTED in message: "${message.content}" from ${message.author.tag}`);
    }
  } catch (error) {
    debugLog(`Error processing message: ${error.message}`);
  }
});

// Handle errors
client.on('error', error => {
  debugLog(`Discord client error: ${error.message}`);
});

// Login to Discord
client.login(process.env.W_COUNTER_TOKEN)
  .then(() => {
    debugLog('W Interceptor logged in successfully');
  })
  .catch(error => {
    debugLog(`Login error: ${error.message}`);
  });