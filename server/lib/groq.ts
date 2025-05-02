import { OpenAI } from 'openai';
import type { ChatMessage } from './openai';
import { Conversation } from '@shared/schema';

// Initialize Groq API client (compatible with OpenAI client)
const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY || '',
  baseURL: 'https://api.groq.com/openai/v1',
});

// Default model to use for chat completions
const DEFAULT_MODEL = 'llama3-70b-8192'; // One of Groq's most capable models

/**
 * Handle Groq API errors with descriptive messages
 * @param error - The error from the Groq API
 * @returns Error with a descriptive message
 */
function handleGroqError(error: any): Error {
  console.error('Groq API Error:', error);
  
  if (error.response) {
    const status = error.response.status;
    const data = error.response.data;
    
    // Check for common error types
    if (status === 401) {
      return new Error('Invalid Groq API key. Please check your API key and try again.');
    } else if (status === 429) {
      return new Error('Groq API rate limit exceeded. Please wait and try again later.');
    } else if (status === 500) {
      return new Error('Groq API server error. The service might be experiencing issues.');
    } else if (data && data.error) {
      return new Error(`Groq API error: ${data.error.message}`);
    }
  }
  
  return new Error('Error communicating with Groq API: ' + (error.message || 'Unknown error'));
}

/**
 * Chat with the Groq API using a model similar to ChatGPT
 * @param messages - Array of chat messages
 * @param model - Groq model to use
 * @param temperature - Controls randomness (0 to 1)
 * @param maxTokens - Maximum tokens to generate
 * @returns The AI's response text
 */
export async function chatWithGroq(
  messages: ChatMessage[],
  model: string = DEFAULT_MODEL,
  temperature: number = 0.7,
  maxTokens: number = 1024
): Promise<string> {
  try {
    const response = await groq.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    });
    
    return response.choices[0]?.message?.content || 'No response generated';
  } catch (error) {
    throw handleGroqError(error);
  }
}

/**
 * Process an ask command using the Groq API
 * @param question - The user's question
 * @param context - Previous conversation context
 * @returns AI's response
 */
export async function askCommand(
  question: string,
  context: Conversation[] = []
): Promise<string> {
  // Build message history from context
  const messages: ChatMessage[] = [];
  
  // Add system message with instructions
  messages.push({
    role: 'system',
    content: `You are a helpful assistant in a Discord server. Answer questions directly and accurately.
    If you don't know something, admit it instead of making up information.
    Keep responses concise but complete.`
  });
  
  // Add conversation context
  for (const message of context) {
    if (message.message) {
      messages.push({
        role: 'user',
        content: message.message
      });
    }
    
    if (message.response) {
      messages.push({
        role: 'assistant',
        content: message.response
      });
    }
  }
  
  // Add the current question
  messages.push({
    role: 'user',
    content: question
  });
  
  // Use a slightly lower temperature for more factual responses
  return await chatWithGroq(messages, DEFAULT_MODEL, 0.5);
}

/**
 * Process a chat command using the Groq API
 * @param message - The user's message
 * @param context - Previous conversation context
 * @returns AI's response
 */
export async function chatCommand(
  message: string,
  context: Conversation[] = []
): Promise<string> {
  // Build message history from context
  const messages: ChatMessage[] = [];
  
  // Add system message with instructions
  messages.push({
    role: 'system',
    content: `You are a friendly and helpful assistant in a Discord server.
    Be conversational but concise. If asked about topics you're not sure about,
    acknowledge the limitations of your knowledge.`
  });
  
  // Add conversation context
  for (const msg of context) {
    if (msg.message) {
      messages.push({
        role: 'user',
        content: msg.message
      });
    }
    
    if (msg.response) {
      messages.push({
        role: 'assistant',
        content: msg.response
      });
    }
  }
  
  // Add the current message
  messages.push({
    role: 'user',
    content: message
  });
  
  // Use a slightly higher temperature for more creative chat responses
  return await chatWithGroq(messages, DEFAULT_MODEL, 0.8);
}

/**
 * Check if the Groq API is available and working
 * @returns True if the API is working, false otherwise
 */
export async function checkGroqStatus(): Promise<boolean> {
  try {
    // Simple test prompt to check if the API is responsive
    const response = await groq.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [{ role: 'user', content: 'Hello' }],
      max_tokens: 5
    });
    
    return !!response.choices.length;
  } catch (error) {
    console.error('Groq API status check failed:', error);
    return false;
  }
}