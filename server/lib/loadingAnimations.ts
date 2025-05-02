import { ChatInputCommandInteraction } from 'discord.js';

// ASCII art animations for different bot activities
export const botMascotFrames = [
  "( ^-^)",
  "( ^.^)",
  "( ^-^)",
  "( ^o^)",
];

export const workingFrames = [
  "⚙️ Working |",
  "⚙️ Working /",
  "⚙️ Working -",
  "⚙️ Working \\",
];

export const strainFrames = [
  "🌱 Growing |",
  "🌿 Growing /",
  "☘️ Growing -",
  "🍀 Growing \\",
];

export const thinkingFrames = [
  "🤔 Thinking...",
  "🧠 Thinking...",
  "💭 Thinking...",
  "✨ Thinking...",
];

export const vrchatFrames = [
  "🎮 VRChat |",
  "🌐 VRChat /",
  "🕹️ VRChat -",
  "🎯 VRChat \\",
];

/**
 * Get loading frames based on command type
 * @param command - The command being executed
 * @returns Array of loading animation frames
 */
export function getLoadingFrames(command: string): string[] {
  switch (command.toLowerCase()) {
    case 'ask':
    case 'chat':
    case 'continue':
      return thinkingFrames;
    case 'strain':
    case 'strain-recommend':
    case 'strain-import':
    case 'strain-announce':
      return strainFrames;
    case 'vrchat':
    case 'link-vrchat':
    case 'verify-vrchat':
    case 'vrchat-role':
      return vrchatFrames;
    default:
      return workingFrames;
  }
}

/**
 * Creates a loading animation for Discord interactions
 * @param interaction - The Discord interaction object
 * @param command - The command being executed
 * @returns Function to stop the animation
 */
export function createLoadingAnimation(interaction: any, command: string) {
  // If already deferred, no need for animation
  if (!interaction || !interaction.editReply) {
    return () => {};
  }

  const frames = getLoadingFrames(command);
  let frameIndex = 0;
  
  // Create an interval to update the loading animation
  const intervalId = setInterval(async () => {
    try {
      await interaction.editReply({
        content: frames[frameIndex] + ' ' + botMascotFrames[frameIndex],
      });
      frameIndex = (frameIndex + 1) % frames.length;
    } catch (error) {
      // If there's an error, stop the animation
      clearInterval(intervalId);
    }
  }, 1500); // Update every 1.5 seconds to stay within Discord's rate limits
  
  // Return a function to stop the animation
  return () => {
    clearInterval(intervalId);
  };
}