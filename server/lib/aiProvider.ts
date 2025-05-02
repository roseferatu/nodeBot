import { Conversation } from "@shared/schema";
import { 
  chatWithGPT, 
  askCommand as askWithOpenAI, 
  chatCommand as chatWithOpenAI, 
  checkOpenAIStatus,
  generateImage,
  ImageSize,
  ImageQuality
} from "./openai";
import { askCommand as askWithGroq, chatCommand as chatWithGroq, checkGroqStatus } from "./groq";

/**
 * AI Provider configuration
 * This object controls which AI provider to use and in what order to try them
 */
export const aiConfig = {
  // Enable or disable specific providers
  providers: {
    openai: true,
    groq: true
  },
  
  // Order to try providers (first one is tried first)
  order: ['groq', 'openai'] as const,
  
  // Default provider to use (if null, will use first available in order)
  defaultProvider: null as string | null,
  
  // Image generation is only available through OpenAI
  imageGeneration: {
    enabled: true
  }
};

/**
 * Helper function to convert Conversation[] to ChatMessage[]
 * @param context - Conversation context from database
 * @returns ChatMessage array for OpenAI/Groq APIs
 */
function conversationsToMessages(context: Conversation[]): { role: string; content: string }[] {
  const messages: { role: string; content: string }[] = [];
  
  for (const convo of context) {
    if (convo.message) {
      messages.push({
        role: 'user',
        content: convo.message
      });
    }
    
    if (convo.response) {
      messages.push({
        role: 'assistant',
        content: convo.response
      });
    }
  }
  
  return messages;
}

/**
 * Handle an ask command using the best available AI provider
 * @param question - User's question
 * @param context - Conversation context
 * @returns AI response
 */
export async function askCommand(
  question: string, 
  context: Conversation[] = []
): Promise<string> {
  // Convert context to chat messages
  const messages = conversationsToMessages(context);
  
  // Get the preferred AI provider
  const provider = await getBestProvider();
  
  // Use the appropriate provider
  if (provider === 'groq') {
    try {
      return await askWithGroq(question, messages);
    } catch (error) {
      console.error("Error using Groq for ask command:", error);
      // Fallback to OpenAI if Groq fails
      if (aiConfig.providers.openai) {
        return await askWithOpenAI(question, messages);
      } else {
        throw error; // Re-throw if no fallback available
      }
    }
  } else {
    try {
      // Default to OpenAI
      return await askWithOpenAI(question, messages);
    } catch (error) {
      console.error("Error using OpenAI for ask command:", error);
      // Fallback to Groq if OpenAI fails
      if (aiConfig.providers.groq) {
        return await askWithGroq(question, messages);
      } else {
        throw error; // Re-throw if no fallback available
      }
    }
  }
}

/**
 * Handle a chat command using the best available AI provider
 * @param message - User's message
 * @param context - Conversation context
 * @returns AI response
 */
export async function chatCommand(
  message: string, 
  context: Conversation[] = []
): Promise<string> {
  // Convert context to chat messages
  const messages = conversationsToMessages(context);
  
  // Get the preferred AI provider
  const provider = await getBestProvider();
  
  // Use the appropriate provider
  if (provider === 'groq') {
    try {
      return await chatWithGroq(message, messages);
    } catch (error) {
      console.error("Error using Groq for chat command:", error);
      // Fallback to OpenAI if Groq fails
      if (aiConfig.providers.openai) {
        return await chatWithOpenAI(message, messages);
      } else {
        throw error; // Re-throw if no fallback available
      }
    }
  } else {
    try {
      // Default to OpenAI
      return await chatWithOpenAI(message, messages);
    } catch (error) {
      console.error("Error using OpenAI for chat command:", error);
      // Fallback to Groq if OpenAI fails
      if (aiConfig.providers.groq) {
        return await chatWithGroq(message, messages);
      } else {
        throw error; // Re-throw if no fallback available
      }
    }
  }
}

/**
 * Determine the best AI provider to use
 * @returns The provider name to use
 */
async function getBestProvider(): Promise<string> {
  // If a default is set and enabled, use it
  if (aiConfig.defaultProvider) {
    const providerKey = aiConfig.defaultProvider as keyof typeof aiConfig.providers;
    if (aiConfig.providers[providerKey]) {
      return aiConfig.defaultProvider;
    }
  }
  
  // Otherwise, check availability in order
  for (const provider of aiConfig.order) {
    if (!aiConfig.providers[provider]) continue;
    
    // Check if this provider is working
    const isAvailable = provider === 'openai' 
      ? await checkOpenAIStatus()
      : provider === 'groq'
        ? await checkGroqStatus()
        : false;
        
    if (isAvailable) {
      return provider;
    }
  }
  
  // If no provider is available, use the first enabled one as a fallback
  for (const provider of aiConfig.order) {
    if (aiConfig.providers[provider]) {
      return provider;
    }
  }
  
  // Ultimate fallback
  return 'groq';
}

/**
 * Continue a conversation with the bot using the same AI provider
 * @param lastResponse - The last response from the AI
 * @returns Continued AI response
 */
export async function continueConversation(lastResponse: string): Promise<string> {
  // Get the preferred AI provider
  const provider = await getBestProvider();
  
  // Try the preferred provider first (should be Groq now)
  if (provider === 'groq') {
    try {
      return await chatWithGroq(
        `Please continue your previous response.`, 
        [{ role: "assistant", content: lastResponse }]
      );
    } catch (error) {
      console.error("Error using Groq for continuation:", error);
      
      // Fall back to OpenAI if available
      if (aiConfig.providers.openai) {
        try {
          return await chatWithGPT(
            `Please continue your last response: "${lastResponse}"`, 
            [{ role: "assistant", content: lastResponse }]
          );
        } catch (fallbackError) {
          console.error("Error using OpenAI fallback for continuation:", fallbackError);
          throw fallbackError;
        }
      } else {
        throw error;
      }
    }
  } else {
    // Use OpenAI with Groq as fallback
    try {
      return await chatWithGPT(
        `Please continue your last response: "${lastResponse}"`, 
        [{ role: "assistant", content: lastResponse }]
      );
    } catch (error) {
      console.error("Error using OpenAI for continuation:", error);
      
      // Fall back to Groq if available
      if (aiConfig.providers.groq) {
        try {
          return await chatWithGroq(
            `Please continue your previous response.`, 
            [{ role: "assistant", content: lastResponse }]
          );
        } catch (fallbackError) {
          console.error("Error using Groq fallback for continuation:", fallbackError);
          throw fallbackError;
        }
      } else {
        throw error;
      }
    }
  }
}

/**
 * Generate an image from a text prompt
 * @param prompt - Text prompt describing the image to generate
 * @param size - Image size (default: 1024x1024)
 * @param quality - Image quality (default: standard)
 * @returns Array of image URLs
 */
export async function generateImageCommand(
  prompt: string,
  size: ImageSize = '1024x1024',
  quality: ImageQuality = 'standard'
): Promise<{url: string}[]> {
  // Make sure image generation is enabled in the config
  if (!aiConfig.imageGeneration.enabled) {
    throw new Error("Image generation is disabled. Enable it in the AI configuration.");
  }
  
  // Image generation is only available through OpenAI's DALL-E
  // There's no fallback for this feature yet
  try {
    // Validate OpenAI is available for image generation
    const isOpenAIAvailable = await checkOpenAIStatus();
    
    if (!isOpenAIAvailable && !aiConfig.providers.openai) {
      throw new Error("OpenAI service is unavailable and required for image generation.");
    }
    
    // Call the OpenAI image generation function
    return await generateImage(prompt, size, quality);
  } catch (error) {
    console.error("Error generating image:", error);
    throw error;
  }
}