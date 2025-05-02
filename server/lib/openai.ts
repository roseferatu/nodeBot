import OpenAI from "openai";
import { storage } from "../storage";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Define available image sizes
export const IMAGE_SIZES = ['1024x1024', '1024x1792', '1792x1024'] as const;
export type ImageSize = typeof IMAGE_SIZES[number];

// Define image quality options
export const IMAGE_QUALITY = ['standard', 'hd'] as const;
export type ImageQuality = typeof IMAGE_QUALITY[number];

// Helper function to handle OpenAI errors consistently
function handleOpenAIError(error: any): Error {
  console.error("Error in OpenAI API call:", error);
  
  if (error.code === 'insufficient_quota' || (error.status === 429 && error.error?.type === 'insufficient_quota')) {
    return new Error("OpenAI API quota exceeded. Please check your OpenAI account billing details or try again later.");
  } else if (error.status === 429) {
    return new Error("OpenAI API rate limit reached. Please try again in a few minutes.");
  } else if (error.status === 401 || error.status === 403) {
    return new Error("Authentication error with OpenAI API. Please check your API key.");
  } else {
    return new Error(`Failed to get a response from ChatGPT: ${error.message || 'Unknown error'}`);
  }
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// Basic conversation with the model
export async function chatWithGPT(
  prompt: string,
  conversationHistory: ChatMessage[] = []
): Promise<string> {
  try {
    // Prepare messages for the API call
    const messages: ChatMessage[] = [
      {
        role: "system",
        content: "You are a helpful Discord bot assistant. Provide concise, accurate information. Format your responses nicely for Discord using markdown when appropriate."
      },
      ...conversationHistory,
      { role: "user", content: prompt }
    ];

    // Make the API call
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages,
      max_tokens: 1000,
    });

    return response.choices[0].message.content || "I couldn't generate a response.";
  } catch (error) {
    throw handleOpenAIError(error);
  }
}

// Command-specific versions
export async function askCommand(
  question: string,
  conversationHistory: ChatMessage[] = []
): Promise<string> {
  try {
    const messages: ChatMessage[] = [
      {
        role: "system",
        content: "You are a helpful Discord bot assistant. Provide direct, factual answers to questions. Be concise and accurate. Format your responses nicely for Discord using markdown for lists and highlights when appropriate."
      },
      ...conversationHistory,
      { role: "user", content: question }
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages,
      max_tokens: 800,
    });

    return response.choices[0].message.content || "I couldn't generate a response.";
  } catch (error) {
    throw handleOpenAIError(error);
  }
}

export async function chatCommand(
  message: string,
  conversationHistory: ChatMessage[] = []
): Promise<string> {
  try {
    const messages: ChatMessage[] = [
      {
        role: "system",
        content: "You are a friendly and conversational Discord bot. Engage in natural conversation. You can be creative, helpful, and informative. Format your responses nicely for Discord using markdown when appropriate."
      },
      ...conversationHistory,
      { role: "user", content: message }
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages,
      max_tokens: 1000,
    });

    return response.choices[0].message.content || "I couldn't generate a response.";
  } catch (error) {
    throw handleOpenAIError(error);
  }
}

// Generate an image using DALL-E
export async function generateImage(
  prompt: string,
  size: ImageSize = '1024x1024',
  quality: ImageQuality = 'standard',
  n: number = 1
): Promise<{url: string}[]> {
  try {
    // Enhance the prompt with some general quality improvements
    const enhancedPrompt = `High quality, detailed image of: ${prompt}`;
    
    // Call OpenAI Image API
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: enhancedPrompt,
      n,
      size,
      quality,
      response_format: "url",
    });
    
    // Return the image urls with safe handling of undefined values
    if (!response.data) {
      throw new Error("No image data returned from the API");
    }
    
    return response.data
      .filter(item => item.url) // Filter out any items with undefined URLs
      .map(item => ({ url: item.url as string })); // Cast to string as we've filtered out undefined
  } catch (error: any) {
    throw handleOpenAIError(error);
  }
}

// Check if OpenAI API is working
export async function checkOpenAIStatus(): Promise<boolean> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: "Hello" }],
      max_tokens: 5,
    });
    
    return !!response.choices[0].message.content;
  } catch (error: any) {
    // For status checks, we just log the error and return false
    // This provides better UI feedback without crashing the application
    
    if (error.code === 'insufficient_quota' || (error.status === 429 && error.error?.type === 'insufficient_quota')) {
      console.error("OpenAI API quota exceeded. Please check your OpenAI account billing details.");
    } else if (error.status === 429) {
      console.error("OpenAI API rate limit reached. Please try again in a few minutes.");
    } else if (error.status === 401 || error.status === 403) {
      console.error("Authentication error with OpenAI API. Please check your API key.");
    } else {
      console.error("Error checking OpenAI status:", error);
    }
    
    return false;
  }
}
