# W Counter Bot

A sophisticated Discord bot that counts occurrences of "W" in chat messages with animated responses and mascots.

## Features

- 🔤 **W Counting**: Counts every occurrence of 'W' (case insensitive) in messages
- 🌐 **Server-wide Tracking**: Counts W's across all channels in a server
- 📊 **Comprehensive Statistics**: Track both channel-specific and server-wide totals
- 🎯 **Milestone Celebrations**: Special animations when reaching W count milestones
- 🏆 **Server Leaderboards**: Compare W counts across servers
- 💾 **Persistent Storage**: Counter data is saved between bot restarts
- 🤖 **Customizable Mascot**: Multiple mascot styles with animations
- 💬 **Slash Commands**: Easy to use with Discord's slash commands

## Commands

The bot provides the following slash commands:

- `/count` - Shows the W count for the current channel with an animation
- `/total` - Shows the total W count across all channels in the server
- `/reset` - Resets both the channel and total W counters to 0
- `/topservers` - Displays a leaderboard of the top 10 servers with the most W's
- `/mascot` - Displays the bot's mascot with different style options
  - Options: `default`, `happy`, `cool`, `w_counter`

## Setup Instructions

1. **Prerequisites**:
   - Node.js 16.x or higher
   - A Discord bot token
   - Discord bot application with message content intent

2. **Environment Variables**:
   Create a `.env` file with the following:
   ```
   W_COUNTER_TOKEN=your_discord_bot_token
   W_COUNTER_CLIENT_ID=your_discord_application_id
   ```

3. **Installation**:
   ```bash
   # Install dependencies
   npm install
   
   # Deploy slash commands
   node deploy-commands.js
   
   # Start the bot
   node start-bot.js
   ```

## How It Works

1. The bot counts every 'W' or 'w' that appears in messages
2. For single W's, it sends a simple message with the count
3. For multiple W's in one message, it plays a fun animation
4. When reaching milestones (every 25 W's), it displays a special celebration
5. All counts are saved to persistent storage so they aren't lost on restart
6. Data is automatically saved every 5 minutes and on bot shutdown

## Best Practices

- The bot can track W counts in multiple servers simultaneously
- Use `/total` to see the cumulative count across all channels
- Use `/reset` if you want to start a fresh count
- Use `/topservers` to see how your server compares to others

## Mascot

The W Counter Bot features a mascot named "Aisha" with different styles:
- Default: General friendly style
- Happy: Excited and energetic
- Cool: Confident and stylish
- W Counter: W-themed special style

Each style has unique animations and appearances for different bot responses.

## Credits

- Bot mascot and animations designed by the AI Discord Team
- Developed with discord.js